"""Ingestion pipeline orchestrator."""

import asyncio
import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from config import BOOKS_DIR, IMAGES_DIR
from ingestion.epub_parser import ParsedChapter, parse_epub, extract_images
from ingestion.pdf_parser import parse_pdf, extract_images_from_pdf
from ingestion.chunker import chunk_chapters, Chunk
from ingestion.embedder import embed_texts
from models.database import (
    get_book_by_catalogue_id,
    update_book_status,
    create_chapter,
    delete_chapters_for_book,
    log_ingestion,
)
from models.vectorstore import get_collection, delete_book_chunks


# Progress callback type: (catalogue_id, title, stage, progress, detail, chunks_created, chunks_est)
ProgressCallback = Callable[[int, str, str, float, str, int, int], None]

# Global progress queue for SSE
progress_queue: asyncio.Queue | None = None


def get_progress_queue() -> asyncio.Queue:
    global progress_queue
    if progress_queue is None:
        progress_queue = asyncio.Queue()
    return progress_queue


async def _send_progress(
    catalogue_id: int,
    title: str,
    stage: str,
    progress: float,
    detail: str = "",
    chunks_created: int = 0,
    chunks_estimate: int = 0,
):
    """Send progress update to the SSE queue."""
    q = get_progress_queue()
    await q.put({
        "catalogue_id": catalogue_id,
        "title": title,
        "stage": stage,
        "progress": round(progress, 3),
        "detail": detail,
        "chunks_created": chunks_created,
        "chunks_total_estimate": chunks_estimate,
    })


def compute_file_hash(filepath: Path) -> str:
    """Compute SHA256 hash of a file."""
    sha = hashlib.sha256()
    with open(filepath, "rb") as f:
        for block in iter(lambda: f.read(65536), b""):
            sha.update(block)
    return sha.hexdigest()


async def ingest_book(catalogue_id: int) -> dict:
    """Run the full ingestion pipeline for a book.

    Returns summary dict with chunk_count, word_count, etc.
    """
    book = await get_book_by_catalogue_id(catalogue_id)
    if not book:
        raise ValueError(f"Book with catalogue_id {catalogue_id} not found")

    title = book["title"]
    file_path = book["file_path"]
    if not file_path:
        raise ValueError(f"No file uploaded for {title}")

    filepath = Path(file_path)
    if not filepath.exists():
        raise ValueError(f"File not found: {file_path}")

    fmt = filepath.suffix.lower().lstrip(".")
    started_at = datetime.now(timezone.utc).isoformat()

    try:
        # Update status
        await update_book_status(catalogue_id, "ingesting")
        await _send_progress(catalogue_id, title, "parsing", 0.05, f"Parsing {fmt.upper()} file...")

        # If re-ingesting, clean up old data
        if book["chunk_count"] and book["chunk_count"] > 0:
            delete_book_chunks(title)
            await delete_chapters_for_book(book["id"])

        # Step 1: Parse
        chapters: list[ParsedChapter]
        if fmt == "epub":
            chapters = await asyncio.to_thread(parse_epub, filepath)
        elif fmt == "pdf":
            chapters = await asyncio.to_thread(parse_pdf, filepath)
        else:
            raise ValueError(f"Unsupported format: {fmt}")

        if not chapters:
            raise ValueError(f"No chapters found in {filepath.name}")

        total_words = sum(ch.word_count for ch in chapters)
        await _send_progress(
            catalogue_id, title, "parsing", 0.15,
            f"Found {len(chapters)} chapters, {total_words:,} words"
        )

        # Step 2: Chunk
        await _send_progress(catalogue_id, title, "chunking", 0.2, "Splitting into chunks...")
        chunks = await asyncio.to_thread(chunk_chapters, chapters, title)
        chunks_total = len(chunks)
        await _send_progress(
            catalogue_id, title, "chunking", 0.3,
            f"Created {chunks_total} chunks",
            chunks_created=0, chunks_estimate=chunks_total,
        )

        # Step 3: Save chapters to SQLite
        for ch in chapters:
            ch_chunks = [c for c in chunks if c.chapter_number == ch.chapter_number]
            await create_chapter(
                book_id=book["id"],
                chapter_number=ch.chapter_number,
                title=ch.chapter_title,
                word_count=ch.word_count,
                chunk_count=len(ch_chunks),
            )

        # Step 4: Embed
        await _send_progress(
            catalogue_id, title, "embedding", 0.35,
            "Generating embeddings...",
            chunks_created=0, chunks_estimate=chunks_total,
        )

        chunk_texts = [c.text for c in chunks]
        embedded_count = 0

        def on_embed_progress(processed: int, total: int):
            nonlocal embedded_count
            embedded_count = processed
            frac = 0.35 + (processed / total) * 0.55
            # We can't await here since this is called from a sync context
            # Just track the count — we'll update progress after

        embeddings = await asyncio.to_thread(embed_texts, chunk_texts, on_embed_progress)

        await _send_progress(
            catalogue_id, title, "embedding", 0.9,
            f"Embedded {len(embeddings)} chunks",
            chunks_created=len(embeddings), chunks_estimate=chunks_total,
        )

        # Step 5: Store in ChromaDB
        await _send_progress(
            catalogue_id, title, "indexing", 0.92,
            "Storing in vector database..."
        )

        collection = get_collection()
        batch_size = 100
        for i in range(0, len(chunks), batch_size):
            batch_chunks = chunks[i : i + batch_size]
            batch_embeddings = embeddings[i : i + batch_size]

            collection.add(
                ids=[c.chunk_id for c in batch_chunks],
                embeddings=batch_embeddings,
                documents=[c.text for c in batch_chunks],
                metadatas=[
                    {
                        "book": c.book_title,
                        "chapter": c.chapter_title,
                        "chapter_number": c.chapter_number,
                        "chunk_index": c.chunk_index,
                        "characters": json.dumps(c.characters_mentioned),
                        "locations": json.dumps(c.locations_mentioned),
                        "word_count": c.word_count,
                    }
                    for c in batch_chunks
                ],
            )

        # Step 6: Extract images
        images_dir = IMAGES_DIR / _slugify(title)
        images_count = 0
        try:
            if fmt == "epub":
                images = await asyncio.to_thread(extract_images, filepath, images_dir)
            else:
                images = await asyncio.to_thread(extract_images_from_pdf, filepath, images_dir)
            images_count = len(images)
        except Exception:
            pass  # Image extraction is best-effort

        # Step 7: Update database
        await update_book_status(
            catalogue_id,
            "ready",
            format=fmt,
            actual_words=total_words,
            total_chapters=len(chapters),
            chunk_count=chunks_total,
            images_extracted=images_count,
            ingested_at=datetime.now(timezone.utc).isoformat(),
        )

        completed_at = datetime.now(timezone.utc).isoformat()
        await log_ingestion(
            book_id=book["id"],
            started_at=started_at,
            completed_at=completed_at,
            chunks_created=chunks_total,
            images_extracted=images_count,
            errors=None,
            status="complete",
        )

        await _send_progress(
            catalogue_id, title, "complete", 1.0,
            f"Done! {chunks_total} chunks, {total_words:,} words",
            chunks_created=chunks_total, chunks_estimate=chunks_total,
        )

        return {
            "catalogue_id": catalogue_id,
            "title": title,
            "chapters": len(chapters),
            "chunks": chunks_total,
            "words": total_words,
            "images": images_count,
        }

    except Exception as e:
        error_msg = str(e)
        await update_book_status(catalogue_id, "error", error_message=error_msg)
        await log_ingestion(
            book_id=book["id"],
            started_at=started_at,
            completed_at=datetime.now(timezone.utc).isoformat(),
            chunks_created=0,
            images_extracted=0,
            errors=error_msg,
            status="error",
        )
        await _send_progress(
            catalogue_id, title, "error", 0.0, f"Error: {error_msg}"
        )
        raise


def _slugify(text: str) -> str:
    """Create a filesystem-safe slug."""
    import re
    slug = text.lower()
    slug = re.sub(r"[^a-z0-9]+", "_", slug)
    return slug.strip("_")[:60]
