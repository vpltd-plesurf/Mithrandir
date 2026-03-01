"""Library endpoints: book catalogue, upload, ingestion, progress."""

import asyncio
import json
import re
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, Form, UploadFile, HTTPException
from sse_starlette.sse import EventSourceResponse

from config import BOOKS_DIR
from models.database import (
    get_all_books,
    get_book_by_catalogue_id,
    get_library_stats,
    update_book_status,
    delete_chapters_for_book,
)
from models.vectorstore import delete_book_chunks
from data.book_catalogue import BOOK_CATALOGUE
from ingestion.pipeline import ingest_book, compute_file_hash, get_progress_queue

router = APIRouter(prefix="/api/library", tags=["library"])


@router.get("")
async def get_library():
    """Return all 25 books grouped by tier with current status."""
    books = await get_all_books()
    tiers: dict = {}
    for book in books:
        tier = book["tier"]
        if tier not in tiers:
            tiers[tier] = {
                "tier": tier,
                "tier_label": book["tier_label"],
                "books": [],
            }
        tiers[tier]["books"].append(book)

    return {
        "tiers": list(tiers.values()),
        "books": books,
    }


@router.get("/stats")
async def library_stats():
    """Return summary statistics about the library."""
    return await get_library_stats()


@router.post("/upload")
async def upload_book(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    catalogue_id: int | None = Form(None),
):
    """Upload a book file, match it to the catalogue, and trigger ingestion."""
    import logging
    import traceback
    logger = logging.getLogger("mithrandir.upload")

    try:
        return await _handle_upload(background_tasks, file, catalogue_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed: {e}\n{traceback.format_exc()}")
        raise HTTPException(500, f"Upload failed: {e}")


async def _handle_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile,
    catalogue_id: int | None,
):
    if not file.filename:
        raise HTTPException(400, "No filename provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in (".epub", ".pdf"):
        raise HTTPException(400, f"Unsupported file type: {ext}. Use EPUB or PDF.")

    # Save file
    subdir = "epub" if ext == ".epub" else "pdf"
    save_dir = BOOKS_DIR / subdir
    save_dir.mkdir(parents=True, exist_ok=True)
    save_path = save_dir / file.filename

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(400, "Uploaded file is empty")
    save_path.write_bytes(content)

    file_hash = compute_file_hash(save_path)

    # Match to catalogue
    if catalogue_id is not None:
        # User specified which book this is
        book = await get_book_by_catalogue_id(catalogue_id)
        if not book:
            raise HTTPException(404, f"Catalogue ID {catalogue_id} not found")

        await update_book_status(
            catalogue_id,
            "uploaded",
            file_path=str(save_path),
            file_hash=file_hash,
            original_filename=file.filename,
            format=ext.lstrip("."),
            uploaded_at=datetime.now(timezone.utc).isoformat(),
        )
        # Auto-trigger ingestion
        background_tasks.add_task(_run_ingest, catalogue_id)

        return {
            "matched": True,
            "catalogue_id": catalogue_id,
            "title": book["title"],
            "confidence": 1.0,
            "candidates": [],
            "filename": file.filename,
        }

    # Try auto-matching by filename
    matches = match_file_to_catalogue(file.filename)

    # Also try EPUB metadata (internal title) — use whichever gives a better match
    if ext == ".epub":
        meta_matches = match_by_epub_metadata(save_path)
        if meta_matches:
            best_file = matches[0]["confidence"] if matches else 0
            best_meta = meta_matches[0]["confidence"]
            if best_meta > best_file:
                matches = meta_matches

    if matches and matches[0]["confidence"] > 0.7:
        best = matches[0]
        cat_id = best["catalogue_id"]
        await update_book_status(
            cat_id,
            "uploaded",
            file_path=str(save_path),
            file_hash=file_hash,
            original_filename=file.filename,
            format=ext.lstrip("."),
            uploaded_at=datetime.now(timezone.utc).isoformat(),
        )
        # Auto-trigger ingestion
        background_tasks.add_task(_run_ingest, cat_id)

        return {
            "matched": True,
            "catalogue_id": cat_id,
            "title": best["title"],
            "confidence": best["confidence"],
            "candidates": matches,
            "filename": file.filename,
        }

    # Ambiguous — return candidates for user to pick
    return {
        "matched": False,
        "catalogue_id": None,
        "title": None,
        "confidence": matches[0]["confidence"] if matches else 0,
        "candidates": matches,
        "filename": file.filename,
    }


@router.post("/match")
async def confirm_match(
    body: dict,
    background_tasks: BackgroundTasks,
):
    """Confirm a file-to-book match and trigger ingestion."""
    filename = body.get("filename")
    catalogue_id = body.get("catalogue_id")

    if not filename or not catalogue_id:
        raise HTTPException(400, "filename and catalogue_id required")

    # Find the file
    for subdir in ["epub", "pdf"]:
        path = BOOKS_DIR / subdir / filename
        if path.exists():
            file_hash = compute_file_hash(path)
            await update_book_status(
                catalogue_id,
                "uploaded",
                file_path=str(path),
                file_hash=file_hash,
                original_filename=filename,
                format=subdir,
                uploaded_at=datetime.now(timezone.utc).isoformat(),
            )
            background_tasks.add_task(_run_ingest, catalogue_id)
            return {"status": "ok", "catalogue_id": catalogue_id}

    raise HTTPException(404, f"File not found: {filename}")


@router.post("/ingest/{catalogue_id}")
async def trigger_ingest(catalogue_id: int, background_tasks: BackgroundTasks):
    """Manually trigger ingestion for a specific book."""
    book = await get_book_by_catalogue_id(catalogue_id)
    if not book:
        raise HTTPException(404, "Book not found")
    if not book["file_path"]:
        raise HTTPException(400, "No file uploaded for this book")

    background_tasks.add_task(_run_ingest, catalogue_id)
    return {"status": "ingestion_started", "catalogue_id": catalogue_id}


@router.delete("/{catalogue_id}")
async def remove_book(catalogue_id: int):
    """Remove a book from the corpus."""
    book = await get_book_by_catalogue_id(catalogue_id)
    if not book:
        raise HTTPException(404, "Book not found")

    # Delete chunks from ChromaDB
    if book["status"] == "ready":
        deleted = delete_book_chunks(book["title"])

    # Delete chapters
    await delete_chapters_for_book(book["id"])

    # Reset book status
    await update_book_status(
        catalogue_id,
        "missing",
        file_path=None,
        file_hash=None,
        original_filename=None,
        format=None,
        actual_words=None,
        total_chapters=None,
        chunk_count=0,
        images_extracted=0,
        ingested_at=None,
        uploaded_at=None,
        error_message=None,
    )

    return {"status": "removed", "catalogue_id": catalogue_id}


@router.get("/{catalogue_id}/preview")
async def preview_book(catalogue_id: int, chars: int = 3000):
    """Return the first N characters of a book's parsed text for verification."""
    book = await get_book_by_catalogue_id(catalogue_id)
    if not book:
        raise HTTPException(404, "Book not found")
    if not book["file_path"]:
        raise HTTPException(400, "No file uploaded for this book")

    filepath = Path(book["file_path"])
    if not filepath.exists():
        raise HTTPException(404, "File not found on disk")

    # Parse the first chapters
    fmt = book["format"] or filepath.suffix.lstrip(".")
    try:
        if fmt == "epub":
            from ingestion.epub_parser import parse_epub
            chapters = parse_epub(filepath)
        else:
            from ingestion.pdf_parser import parse_pdf
            chapters = parse_pdf(filepath)
    except Exception as e:
        raise HTTPException(500, f"Parse error: {e}")

    # Collect text up to the character limit
    preview_text = ""
    preview_chapters = []
    for ch in chapters:
        preview_chapters.append({
            "title": ch.chapter_title,
            "excerpt": ch.text[:500].strip(),
        })
        preview_text += ch.text + "\n\n"
        if len(preview_text) >= chars:
            break

    return {
        "catalogue_id": catalogue_id,
        "title": book["title"],
        "filename": filepath.name,
        "format": fmt,
        "chapters": preview_chapters[:5],
        "preview": preview_text[:chars],
    }


@router.get("/progress")
async def ingestion_progress():
    """SSE endpoint for real-time ingestion progress."""

    async def event_generator():
        q = get_progress_queue()
        while True:
            try:
                data = await asyncio.wait_for(q.get(), timeout=30.0)
                yield {"event": "progress", "data": json.dumps(data)}
            except asyncio.TimeoutError:
                # Send heartbeat to keep connection alive
                yield {"event": "heartbeat", "data": "{}"}

    return EventSourceResponse(event_generator())


async def _run_ingest(catalogue_id: int):
    """Background task wrapper for ingestion."""
    try:
        await ingest_book(catalogue_id)
    except Exception as e:
        # Error already handled in pipeline, but log here too
        import traceback
        traceback.print_exc()


_ROMAN_MAP = {"i": "1", "ii": "2", "iii": "3", "iv": "4", "v": "5",
              "vi": "6", "vii": "7", "viii": "8", "ix": "9", "x": "10",
              "xi": "11", "xii": "12"}


def _normalize_text(text: str) -> str:
    """Normalize text for matching: lowercase, strip punctuation, collapse spaces, convert Roman numerals."""
    clean = re.sub(r"[_\-.\(\)\[\],;:'\"]", " ", text.lower())
    clean = re.sub(r"\.(epub|pdf)$", "", clean).strip()
    clean = re.sub(r"\s+", " ", clean)
    # Convert standalone Roman numerals to Arabic
    words = clean.split()
    words = [_ROMAN_MAP.get(w, w) for w in words]
    return " ".join(words)


def match_file_to_catalogue(filename: str) -> list[dict]:
    """Match a filename to the book catalogue using fuzzy matching."""
    clean = _normalize_text(filename)

    matches = []
    for book in BOOK_CATALOGUE:
        best_score = 0.0

        # Check filename hints — score by longest matching hint (more specific = better)
        matching_hints = [
            _normalize_text(hint)
            for hint in book["filename_hints"]
            if _normalize_text(hint) in clean
        ]
        if matching_hints:
            longest = max(len(h) for h in matching_hints)
            # Base 0.80, bonus up to 0.19 for longer hints (max ~40 chars)
            best_score = 0.80 + min(longest / 200, 0.19)

        # Check if the full title is a substring of the filename (strongest signal)
        # Use word-boundary check to avoid "The Hobbit" matching "The History of The Hobbit"
        norm_title = _normalize_text(book["title"])
        if re.search(r'(?:^|\s)' + re.escape(norm_title) + r'(?:\s|$)', clean):
            best_score = max(best_score, 0.96)

        # Fuzzy match on title
        ratio = SequenceMatcher(None, clean, norm_title).ratio()
        best_score = max(best_score, ratio)

        if best_score > 0.4:
            matches.append({
                "catalogue_id": book["catalogue_id"],
                "title": book["title"],
                "confidence": round(best_score, 3),
            })

    matches.sort(key=lambda x: x["confidence"], reverse=True)
    return matches[:5]


def match_by_epub_metadata(filepath: Path) -> list[dict]:
    """Try to match a book by reading its EPUB metadata (title field).

    Uses exact title comparison against the catalogue for reliable matching,
    avoiding false positives from substring matching (e.g. 'The Hobbit' inside
    'The History of The Hobbit').
    """
    try:
        from ebooklib import epub
        book = epub.read_epub(str(filepath), options={"ignore_ncx": True})
        titles = book.get_metadata("DC", "title")
        epub_title = titles[0][0].strip() if titles else ""
        if not epub_title:
            return []

        norm_epub = _normalize_text(epub_title)
        matches = []

        for cat in BOOK_CATALOGUE:
            norm_cat = _normalize_text(cat["title"])
            # Exact match (after normalization)
            if norm_epub == norm_cat:
                matches.append({
                    "catalogue_id": cat["catalogue_id"],
                    "title": cat["title"],
                    "confidence": 0.99,
                })
                continue

            # EPUB title contains the full catalogue title (check word boundaries)
            if re.search(r'(?:^|\s)' + re.escape(norm_cat) + r'(?:\s|$)', norm_epub):
                # Penalize if the EPUB title is much longer (likely a different book)
                length_ratio = len(norm_cat) / len(norm_epub) if norm_epub else 0
                score = 0.80 * length_ratio  # shorter match in longer title = lower score
                if score > 0.5:
                    matches.append({
                        "catalogue_id": cat["catalogue_id"],
                        "title": cat["title"],
                        "confidence": round(score, 3),
                    })

        matches.sort(key=lambda x: x["confidence"], reverse=True)
        return matches[:5]
    except Exception:
        return []
