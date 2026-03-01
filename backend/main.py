"""Mithrandir - Tolkien RAG Backend."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import FRONTEND_URL


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database and vector store on startup, scan for pre-placed files."""
    from models.database import init_db, seed_characters, seed_character_relationships, seed_events, seed_locations, sync_location_coordinates
    from models.vectorstore import init_vectorstore

    await init_db()
    init_vectorstore()
    await seed_characters()
    await seed_character_relationships()
    await seed_events()
    await seed_locations()
    await sync_location_coordinates()

    # Scan books/ directory for pre-placed files
    import asyncio
    asyncio.create_task(_scan_books_dir())

    yield


async def _scan_books_dir():
    """Scan books/ directory for files and auto-match them to the catalogue."""
    import logging
    from pathlib import Path
    from datetime import datetime, timezone

    from config import BOOKS_DIR
    from models.database import get_all_books, get_book_by_catalogue_id, update_book_status
    from routers.library import match_file_to_catalogue
    from ingestion.pipeline import ingest_book, compute_file_hash

    logger = logging.getLogger("mithrandir.scanner")

    books = await get_all_books()
    already_tracked = {
        b["file_path"] for b in books
        if b["file_path"] and b["status"] in ("uploaded", "ingesting", "ready")
    }

    for subdir in ["epub", "pdf"]:
        scan_dir = BOOKS_DIR / subdir
        if not scan_dir.exists():
            continue
        for filepath in scan_dir.iterdir():
            if filepath.suffix.lower() not in (".epub", ".pdf"):
                continue
            if filepath.stat().st_size == 0:
                logger.warning(f"Skipping empty file: {filepath.name}")
                continue
            if str(filepath) in already_tracked:
                continue

            matches = match_file_to_catalogue(filepath.name)

            # Also try EPUB metadata for better matching
            if filepath.suffix.lower() == ".epub":
                from routers.library import match_by_epub_metadata
                meta_matches = match_by_epub_metadata(filepath)
                if meta_matches:
                    best_file = matches[0]["confidence"] if matches else 0
                    if meta_matches[0]["confidence"] > best_file:
                        matches = meta_matches

            if not matches or matches[0]["confidence"] < 0.7:
                logger.info(f"No confident match for {filepath.name}")
                continue

            best = matches[0]
            cat_id = best["catalogue_id"]
            book = await get_book_by_catalogue_id(cat_id)
            if book and book["status"] in ("ingesting", "ready"):
                continue

            logger.info(f"Auto-matched {filepath.name} -> {best['title']} ({best['confidence']:.0%})")
            file_hash = compute_file_hash(filepath)
            await update_book_status(
                cat_id,
                "uploaded",
                file_path=str(filepath),
                file_hash=file_hash,
                original_filename=filepath.name,
                format=filepath.suffix.lstrip("."),
                uploaded_at=datetime.now(timezone.utc).isoformat(),
            )

            try:
                await ingest_book(cat_id)
            except Exception:
                logger.exception(f"Auto-ingestion failed for {filepath.name}")


app = FastAPI(
    title="Mithrandir",
    description="Tolkien Universe Reference Platform",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from routers.system import router as system_router
from routers.library import router as library_router
from routers.chat import router as chat_router
from routers.characters import router as characters_router
from routers.timeline import router as timeline_router
from routers.locations import router as locations_router
from routers.battle import router as battle_router

app.include_router(system_router)
app.include_router(library_router)
app.include_router(chat_router)
app.include_router(characters_router)
app.include_router(timeline_router)
app.include_router(locations_router)
app.include_router(battle_router)
