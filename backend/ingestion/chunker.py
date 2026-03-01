"""Text chunking with metadata for RAG."""

import re
from dataclasses import dataclass, field

from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import CHUNK_SIZE, CHUNK_OVERLAP, CHUNK_SEPARATORS
from ingestion.epub_parser import ParsedChapter
from ingestion.ner import detect_entities


@dataclass
class Chunk:
    chunk_id: str
    text: str
    book_title: str
    chapter_title: str
    chapter_number: int
    chunk_index: int
    word_count: int
    characters_mentioned: list[str] = field(default_factory=list)
    locations_mentioned: list[str] = field(default_factory=list)


def _slugify(text: str) -> str:
    """Create a URL-safe slug from text."""
    slug = text.lower()
    slug = re.sub(r"[^a-z0-9]+", "_", slug)
    slug = slug.strip("_")
    return slug[:50]


def chunk_chapters(
    chapters: list[ParsedChapter],
    book_title: str,
) -> list[Chunk]:
    """Split chapters into chunks with NER metadata."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=CHUNK_SEPARATORS,
        length_function=len,
    )

    book_slug = _slugify(book_title)
    all_chunks = []

    for chapter in chapters:
        texts = splitter.split_text(chapter.text)

        for idx, text in enumerate(texts):
            # Run NER on each chunk
            entities = detect_entities(text)

            chunk_id = f"{book_slug}_ch{chapter.chapter_number:02d}_chunk_{idx:03d}"

            all_chunks.append(
                Chunk(
                    chunk_id=chunk_id,
                    text=text,
                    book_title=book_title,
                    chapter_title=chapter.chapter_title,
                    chapter_number=chapter.chapter_number,
                    chunk_index=idx,
                    word_count=len(text.split()),
                    characters_mentioned=entities["characters"],
                    locations_mentioned=entities["locations"],
                )
            )

    return all_chunks
