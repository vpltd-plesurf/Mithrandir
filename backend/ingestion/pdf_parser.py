"""PDF file parser using pymupdf (fallback for books not available as EPUB)."""

import re
from dataclasses import dataclass
from pathlib import Path

import fitz  # pymupdf

from ingestion.epub_parser import ParsedChapter


# Patterns that suggest a chapter heading
CHAPTER_PATTERNS = [
    re.compile(r"^chapter\s+\w+", re.IGNORECASE),
    re.compile(r"^CHAPTER\s+\w+"),
    re.compile(r"^[IVXLC]+\.\s+\w+"),  # Roman numerals
    re.compile(r"^Part\s+(One|Two|Three|Four|Five|\d+|[IVXLC]+)", re.IGNORECASE),
    re.compile(r"^BOOK\s+\w+", re.IGNORECASE),
]


def parse_pdf(filepath: Path) -> list[ParsedChapter]:
    """Parse a PDF file into chapters."""
    doc = fitz.open(str(filepath))
    book_title = doc.metadata.get("title", "") or filepath.stem

    pages_text: list[str] = []
    for page in doc:
        pages_text.append(page.get_text("text"))

    # Try to detect chapter boundaries
    chapters = _split_into_chapters(pages_text, book_title)

    if not chapters:
        # Fallback: treat entire document as one chapter
        full_text = "\n\n".join(pages_text)
        word_count = len(full_text.split())
        chapters = [
            ParsedChapter(
                book_title=book_title,
                chapter_title="Full Text",
                chapter_number=1,
                text=full_text,
                word_count=word_count,
            )
        ]

    doc.close()
    return chapters


def _split_into_chapters(
    pages_text: list[str], book_title: str
) -> list[ParsedChapter]:
    """Attempt to split pages into chapters based on heading detection."""
    chapter_breaks: list[tuple[int, str]] = []

    for i, page_text in enumerate(pages_text):
        lines = page_text.strip().split("\n")
        for line in lines[:5]:  # Check first 5 lines of each page
            line = line.strip()
            if not line:
                continue
            for pattern in CHAPTER_PATTERNS:
                if pattern.match(line):
                    chapter_breaks.append((i, line))
                    break

    if len(chapter_breaks) < 2:
        return []

    chapters = []
    for idx, (start_page, heading) in enumerate(chapter_breaks):
        end_page = (
            chapter_breaks[idx + 1][0]
            if idx + 1 < len(chapter_breaks)
            else len(pages_text)
        )
        text = "\n\n".join(pages_text[start_page:end_page])
        word_count = len(text.split())

        if word_count < 50:
            continue

        chapters.append(
            ParsedChapter(
                book_title=book_title,
                chapter_title=heading,
                chapter_number=idx + 1,
                text=text,
                word_count=word_count,
            )
        )

    return chapters


def extract_images_from_pdf(filepath: Path, output_dir: Path) -> list[Path]:
    """Extract images from a PDF file."""
    output_dir.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(str(filepath))
    saved = []

    for page_num, page in enumerate(doc):
        for img_idx, img in enumerate(page.get_images()):
            xref = img[0]
            base_image = doc.extract_image(xref)
            if not base_image or len(base_image["image"]) < 5000:
                continue

            ext = base_image.get("ext", "png")
            name = f"page{page_num + 1}_img{img_idx + 1}.{ext}"
            out_path = output_dir / name
            out_path.write_bytes(base_image["image"])
            saved.append(out_path)

    doc.close()
    return saved
