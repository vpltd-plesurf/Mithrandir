"""EPUB file parser using ebooklib + BeautifulSoup."""

from dataclasses import dataclass
from pathlib import Path

import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup


@dataclass
class ParsedChapter:
    book_title: str
    chapter_title: str
    chapter_number: int
    text: str
    word_count: int


def parse_epub(filepath: Path) -> list[ParsedChapter]:
    """Parse an EPUB file into a list of chapters with text content."""
    book = epub.read_epub(str(filepath), options={"ignore_ncx": True})

    # Get book title from metadata
    title_meta = book.get_metadata("DC", "title")
    book_title = title_meta[0][0] if title_meta else filepath.stem

    chapters = []
    chapter_number = 0

    for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
        content = item.get_body_content()
        if not content:
            continue

        soup = BeautifulSoup(content, "lxml")
        text = soup.get_text(separator="\n", strip=True)

        # Skip empty or very short items (covers, copyright, etc.)
        if len(text) < 100:
            continue

        # Extract chapter title from first heading
        chapter_title = _extract_heading(soup)
        if not chapter_title:
            # Use item filename as fallback
            name = item.get_name()
            chapter_title = Path(name).stem.replace("_", " ").replace("-", " ").title()

        chapter_number += 1
        word_count = len(text.split())

        chapters.append(
            ParsedChapter(
                book_title=book_title,
                chapter_title=chapter_title,
                chapter_number=chapter_number,
                text=text,
                word_count=word_count,
            )
        )

    return chapters


def _extract_heading(soup: BeautifulSoup) -> str | None:
    """Extract the first heading from HTML content."""
    for tag in ["h1", "h2", "h3", "h4"]:
        heading = soup.find(tag)
        if heading:
            text = heading.get_text(strip=True)
            if text and len(text) < 200:
                return text
    return None


def extract_images(filepath: Path, output_dir: Path) -> list[Path]:
    """Extract images (maps, illustrations) from an EPUB file."""
    output_dir.mkdir(parents=True, exist_ok=True)
    book = epub.read_epub(str(filepath), options={"ignore_ncx": True})
    saved = []

    for item in book.get_items_of_type(ebooklib.ITEM_IMAGE):
        name = Path(item.get_name()).name
        # Skip tiny images (icons, bullets)
        content = item.get_content()
        if len(content) < 5000:
            continue

        out_path = output_dir / name
        out_path.write_bytes(content)
        saved.append(out_path)

    return saved
