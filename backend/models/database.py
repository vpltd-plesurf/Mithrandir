"""SQLite database module with async operations."""

import aiosqlite
from config import SQLITE_PATH

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    catalogue_id INTEGER NOT NULL UNIQUE,
    title TEXT NOT NULL,
    short_title TEXT,
    author TEXT DEFAULT 'J.R.R. Tolkien',
    editor TEXT,
    publication_year INTEGER,
    tier INTEGER NOT NULL,
    tier_label TEXT,
    era_covered TEXT,
    estimated_words INTEGER,
    actual_words INTEGER,
    format TEXT,
    format_priority TEXT DEFAULT 'epub',
    file_path TEXT,
    file_hash TEXT,
    original_filename TEXT,
    total_chapters INTEGER,
    chunk_count INTEGER DEFAULT 0,
    images_extracted INTEGER DEFAULT 0,
    status TEXT DEFAULT 'missing',
    error_message TEXT,
    ingested_at DATETIME,
    uploaded_at DATETIME
);

CREATE TABLE IF NOT EXISTS chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER REFERENCES books(id),
    chapter_number INTEGER,
    title TEXT,
    word_count INTEGER,
    chunk_count INTEGER,
    UNIQUE(book_id, chapter_number)
);

CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    canonical_name TEXT NOT NULL,
    race TEXT,
    gender TEXT,
    birth_year TEXT,
    death_year TEXT,
    father_id INTEGER REFERENCES characters(id),
    mother_id INTEGER REFERENCES characters(id),
    spouse_ids TEXT,
    description TEXT,
    first_appearance_book TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS character_aliases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER REFERENCES characters(id),
    alias TEXT NOT NULL,
    language TEXT,
    context TEXT
);

CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    region TEXT,
    type TEXT,
    description TEXT,
    latitude REAL,
    longitude REAL,
    destroyed_in TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age TEXT,
    year TEXT,
    year_sortable INTEGER,
    description TEXT,
    source_book TEXT,
    source_chapter TEXT,
    characters_involved TEXT,
    locations_involved TEXT
);

CREATE TABLE IF NOT EXISTS ingestion_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER REFERENCES books(id),
    started_at DATETIME,
    completed_at DATETIME,
    chunks_created INTEGER,
    images_extracted INTEGER,
    errors TEXT,
    status TEXT
);
"""


async def get_db() -> aiosqlite.Connection:
    """Get an async database connection."""
    db = await aiosqlite.connect(str(SQLITE_PATH))
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db


async def init_db():
    """Initialize database tables and seed catalogue."""
    SQLITE_PATH.parent.mkdir(parents=True, exist_ok=True)

    db = await get_db()
    try:
        await db.executescript(SCHEMA_SQL)
        await db.commit()

        # Seed book catalogue if empty
        cursor = await db.execute("SELECT COUNT(*) FROM books")
        row = await cursor.fetchone()
        if row[0] == 0:
            await _seed_book_catalogue(db)
        else:
            await _sync_book_catalogue(db)

    finally:
        await db.close()


async def _seed_book_catalogue(db: aiosqlite.Connection):
    """Seed the books table with all 25 Tolkien works."""
    from data.book_catalogue import BOOK_CATALOGUE

    for book in BOOK_CATALOGUE:
        await db.execute(
            """INSERT INTO books (catalogue_id, title, short_title, editor,
               publication_year, tier, tier_label, era_covered, estimated_words, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'missing')""",
            (
                book["catalogue_id"],
                book["title"],
                book["short_title"],
                book.get("editor"),
                book.get("publication_year"),
                book["tier"],
                book["tier_label"],
                book.get("era_covered"),
                book.get("estimated_words"),
            ),
        )
    await db.commit()


async def _sync_book_catalogue(db: aiosqlite.Connection):
    """Sync the books table with the current catalogue.

    Inserts any new catalogue entries and removes obsolete ones
    (only if their status is 'missing' — never delete ingested books).
    """
    from data.book_catalogue import BOOK_CATALOGUE

    catalogue_ids = {b["catalogue_id"] for b in BOOK_CATALOGUE}

    # Insert missing catalogue entries
    for book in BOOK_CATALOGUE:
        cursor = await db.execute(
            "SELECT id FROM books WHERE catalogue_id = ?",
            (book["catalogue_id"],),
        )
        if await cursor.fetchone() is None:
            await db.execute(
                """INSERT INTO books (catalogue_id, title, short_title, editor,
                   publication_year, tier, tier_label, era_covered, estimated_words, status)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'missing')""",
                (
                    book["catalogue_id"],
                    book["title"],
                    book["short_title"],
                    book.get("editor"),
                    book.get("publication_year"),
                    book["tier"],
                    book["tier_label"],
                    book.get("era_covered"),
                    book.get("estimated_words"),
                ),
            )

    # Remove catalogue entries that no longer exist (only if status is 'missing')
    cursor = await db.execute("SELECT catalogue_id, status FROM books")
    rows = await cursor.fetchall()
    for row in rows:
        if row[0] not in catalogue_ids and row[1] == "missing":
            await db.execute(
                "DELETE FROM books WHERE catalogue_id = ?", (row[0],)
            )

    await db.commit()


async def get_all_books() -> list[dict]:
    """Return all books as dicts."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM books ORDER BY tier, catalogue_id"
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        await db.close()


async def get_book_by_catalogue_id(catalogue_id: int) -> dict | None:
    """Return a single book by catalogue_id."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM books WHERE catalogue_id = ?", (catalogue_id,)
        )
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()


async def update_book_status(
    catalogue_id: int,
    status: str,
    error_message: str | None = None,
    **kwargs,
):
    """Update a book's status and optional fields."""
    db = await get_db()
    try:
        fields = ["status = ?"]
        values: list = [status]

        if error_message is not None:
            fields.append("error_message = ?")
            values.append(error_message)

        for key, value in kwargs.items():
            fields.append(f"{key} = ?")
            values.append(value)

        values.append(catalogue_id)
        await db.execute(
            f"UPDATE books SET {', '.join(fields)} WHERE catalogue_id = ?",
            values,
        )
        await db.commit()
    finally:
        await db.close()


async def create_chapter(
    book_id: int,
    chapter_number: int,
    title: str,
    word_count: int,
    chunk_count: int,
):
    """Insert a chapter record."""
    db = await get_db()
    try:
        await db.execute(
            """INSERT OR REPLACE INTO chapters
               (book_id, chapter_number, title, word_count, chunk_count)
               VALUES (?, ?, ?, ?, ?)""",
            (book_id, chapter_number, title, word_count, chunk_count),
        )
        await db.commit()
    finally:
        await db.close()


async def delete_chapters_for_book(book_id: int):
    """Delete all chapters for a book."""
    db = await get_db()
    try:
        await db.execute("DELETE FROM chapters WHERE book_id = ?", (book_id,))
        await db.commit()
    finally:
        await db.close()


async def log_ingestion(
    book_id: int,
    started_at: str,
    completed_at: str | None,
    chunks_created: int,
    images_extracted: int,
    errors: str | None,
    status: str,
):
    """Log an ingestion run."""
    db = await get_db()
    try:
        await db.execute(
            """INSERT INTO ingestion_log
               (book_id, started_at, completed_at, chunks_created,
                images_extracted, errors, status)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                book_id,
                started_at,
                completed_at,
                chunks_created,
                images_extracted,
                errors,
                status,
            ),
        )
        await db.commit()
    finally:
        await db.close()


async def get_library_stats() -> dict:
    """Return summary statistics about the library."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT COUNT(*) FROM books")
        total = (await cursor.fetchone())[0]

        cursor = await db.execute(
            "SELECT COUNT(*) FROM books WHERE status = 'ready'"
        )
        ready = (await cursor.fetchone())[0]

        cursor = await db.execute(
            "SELECT COALESCE(SUM(actual_words), 0) FROM books WHERE status = 'ready'"
        )
        total_words = (await cursor.fetchone())[0]

        cursor = await db.execute(
            "SELECT COALESCE(SUM(chunk_count), 0) FROM books WHERE status = 'ready'"
        )
        total_chunks = (await cursor.fetchone())[0]

        return {
            "books_ready": ready,
            "books_total": total,
            "total_words": total_words,
            "total_chunks": total_chunks,
        }
    finally:
        await db.close()


# --- Character functions ---


async def seed_characters():
    """Seed the characters table from entities/characters.json, inserting any missing entries."""
    import json
    from config import ENTITIES_DIR

    db = await get_db()
    try:
        chars_file = ENTITIES_DIR / "characters.json"
        if not chars_file.exists():
            return

        with open(chars_file) as f:
            chars_data = json.load(f)

        # Get existing character names
        cursor = await db.execute("SELECT canonical_name FROM characters")
        existing = {row[0] for row in await cursor.fetchall()}

        inserted = 0
        for key, data in chars_data.items():
            name = data["canonical_name"]
            if name in existing:
                continue

            cursor = await db.execute(
                """INSERT INTO characters (canonical_name, race)
                   VALUES (?, ?)""",
                (name, data.get("race")),
            )
            char_id = cursor.lastrowid

            for alias in data.get("aliases", []):
                await db.execute(
                    "INSERT INTO character_aliases (character_id, alias) VALUES (?, ?)",
                    (char_id, alias),
                )
            inserted += 1

        if inserted > 0:
            await db.commit()
    finally:
        await db.close()


async def get_characters(
    search: str | None = None,
    race: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    """Return paginated character list with optional filters."""
    db = await get_db()
    try:
        conditions = []
        params: list = []

        if search:
            conditions.append(
                "(c.canonical_name LIKE ? OR EXISTS "
                "(SELECT 1 FROM character_aliases ca WHERE ca.character_id = c.id AND ca.alias LIKE ?))"
            )
            params.extend([f"%{search}%", f"%{search}%"])

        if race:
            conditions.append("c.race = ?")
            params.append(race)

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        # Count total
        cursor = await db.execute(
            f"SELECT COUNT(*) FROM characters c {where}", params
        )
        total = (await cursor.fetchone())[0]

        # Fetch page
        offset = (page - 1) * per_page
        cursor = await db.execute(
            f"""SELECT c.* FROM characters c {where}
                ORDER BY c.canonical_name
                LIMIT ? OFFSET ?""",
            params + [per_page, offset],
        )
        rows = await cursor.fetchall()

        characters = []
        for row in rows:
            char = dict(row)
            # Fetch aliases
            alias_cursor = await db.execute(
                "SELECT alias FROM character_aliases WHERE character_id = ?",
                (char["id"],),
            )
            alias_rows = await alias_cursor.fetchall()
            char["aliases"] = [r[0] for r in alias_rows]
            characters.append(char)

        return {"characters": characters, "total": total, "page": page, "per_page": per_page}
    finally:
        await db.close()


async def get_character(character_id: int) -> dict | None:
    """Return a single character with aliases and family."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM characters WHERE id = ?", (character_id,)
        )
        row = await cursor.fetchone()
        if not row:
            return None

        char = dict(row)

        # Aliases
        cursor = await db.execute(
            "SELECT alias, language, context FROM character_aliases WHERE character_id = ?",
            (character_id,),
        )
        char["aliases"] = [dict(r) for r in await cursor.fetchall()]

        # Father
        if char.get("father_id"):
            cursor = await db.execute(
                "SELECT id, canonical_name FROM characters WHERE id = ?",
                (char["father_id"],),
            )
            r = await cursor.fetchone()
            char["father"] = dict(r) if r else None
        else:
            char["father"] = None

        # Mother
        if char.get("mother_id"):
            cursor = await db.execute(
                "SELECT id, canonical_name FROM characters WHERE id = ?",
                (char["mother_id"],),
            )
            r = await cursor.fetchone()
            char["mother"] = dict(r) if r else None
        else:
            char["mother"] = None

        # Children (where this character is father or mother)
        cursor = await db.execute(
            "SELECT id, canonical_name FROM characters WHERE father_id = ? OR mother_id = ?",
            (character_id, character_id),
        )
        char["children"] = [dict(r) for r in await cursor.fetchall()]

        # Spouses
        spouse_ids_str = char.get("spouse_ids") or ""
        spouses = []
        if spouse_ids_str:
            for sid_str in spouse_ids_str.split(","):
                sid_str = sid_str.strip()
                if sid_str:
                    try:
                        sid = int(sid_str)
                        cursor = await db.execute(
                            "SELECT id, canonical_name FROM characters WHERE id = ?", (sid,)
                        )
                        r = await cursor.fetchone()
                        if r:
                            spouses.append(dict(r))
                    except ValueError:
                        pass
        char["spouse"] = spouses

        return char
    finally:
        await db.close()


async def get_character_races() -> list[str]:
    """Return distinct character races."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT DISTINCT race FROM characters WHERE race IS NOT NULL ORDER BY race"
        )
        return [row[0] for row in await cursor.fetchall()]
    finally:
        await db.close()


async def seed_character_relationships():
    """Populate father_id, mother_id, and spouse_ids from character_relationships.json."""
    import json
    from pathlib import Path

    rels_file = Path(__file__).parent.parent / "data" / "entities" / "character_relationships.json"
    if not rels_file.exists():
        return

    with open(rels_file) as f:
        rels_data = json.load(f)

    db = await get_db()
    try:
        # Build name -> id lookup
        cursor = await db.execute("SELECT id, canonical_name FROM characters")
        name_to_id = {row[1]: row[0] for row in await cursor.fetchall()}

        for rel in rels_data:
            char_name = rel.get("character")
            if not char_name or char_name not in name_to_id:
                continue
            char_id = name_to_id[char_name]

            # Father
            father_name = rel.get("father")
            if father_name and father_name in name_to_id:
                await db.execute(
                    "UPDATE characters SET father_id = ? WHERE id = ? AND father_id IS NULL",
                    (name_to_id[father_name], char_id),
                )

            # Mother
            mother_name = rel.get("mother")
            if mother_name and mother_name in name_to_id:
                await db.execute(
                    "UPDATE characters SET mother_id = ? WHERE id = ? AND mother_id IS NULL",
                    (name_to_id[mother_name], char_id),
                )

            # Spouses
            spouse_names = rel.get("spouses", [])
            if spouse_names:
                spouse_ids = [str(name_to_id[s]) for s in spouse_names if s in name_to_id]
                if spouse_ids:
                    # Only set if currently empty
                    cursor = await db.execute(
                        "SELECT spouse_ids FROM characters WHERE id = ?", (char_id,)
                    )
                    row = await cursor.fetchone()
                    if row and not row[0]:
                        await db.execute(
                            "UPDATE characters SET spouse_ids = ? WHERE id = ?",
                            (",".join(spouse_ids), char_id),
                        )

        await db.commit()
    finally:
        await db.close()


async def get_character_graph() -> dict:
    """Return all characters and relationships as graph data (nodes + edges)."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT id, canonical_name, race, father_id, mother_id, spouse_ids FROM characters ORDER BY id"
        )
        rows = await cursor.fetchall()

        nodes = []
        edges = []
        seen_spouse_pairs: set[tuple[int, int]] = set()

        for row in rows:
            row = dict(row)
            nodes.append({
                "id": row["id"],
                "name": row["canonical_name"],
                "race": row["race"],
            })

            # Parent -> child edges
            if row.get("father_id"):
                edges.append({
                    "source": row["father_id"],
                    "target": row["id"],
                    "type": "parent",
                })
            if row.get("mother_id"):
                edges.append({
                    "source": row["mother_id"],
                    "target": row["id"],
                    "type": "parent",
                })

            # Spouse edges (deduplicated)
            spouse_ids_str = row.get("spouse_ids") or ""
            if spouse_ids_str:
                for sid_str in spouse_ids_str.split(","):
                    sid_str = sid_str.strip()
                    if sid_str:
                        try:
                            sid = int(sid_str)
                            pair = (min(row["id"], sid), max(row["id"], sid))
                            if pair not in seen_spouse_pairs:
                                seen_spouse_pairs.add(pair)
                                edges.append({
                                    "source": row["id"],
                                    "target": sid,
                                    "type": "spouse",
                                })
                        except ValueError:
                            pass

        return {"nodes": nodes, "edges": edges}
    finally:
        await db.close()


# --- Event / Timeline functions ---


async def seed_events():
    """Seed the events table if empty."""
    db = await get_db()
    try:
        cursor = await db.execute("SELECT COUNT(*) FROM events")
        if (await cursor.fetchone())[0] > 0:
            return

        from data.events_seed import EVENTS_SEED

        for event in EVENTS_SEED:
            await db.execute(
                """INSERT INTO events (name, age, year, year_sortable, description,
                   source_book, source_chapter, characters_involved, locations_involved)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    event["name"],
                    event["age"],
                    event["year"],
                    event["year_sortable"],
                    event.get("description"),
                    event.get("source_book"),
                    event.get("source_chapter"),
                    event.get("characters_involved"),
                    event.get("locations_involved"),
                ),
            )
        await db.commit()
    finally:
        await db.close()


async def get_events(age: str | None = None) -> list[dict]:
    """Return events, optionally filtered by age, ordered by year_sortable."""
    db = await get_db()
    try:
        if age:
            cursor = await db.execute(
                "SELECT * FROM events WHERE age = ? ORDER BY year_sortable",
                (age,),
            )
        else:
            cursor = await db.execute(
                "SELECT * FROM events ORDER BY year_sortable"
            )
        return [dict(row) for row in await cursor.fetchall()]
    finally:
        await db.close()



# --- Location functions ---


async def seed_locations():
    """Seed the locations table from entities/locations.json if empty."""
    import json
    from config import ENTITIES_DIR

    db = await get_db()
    try:
        cursor = await db.execute("SELECT COUNT(*) FROM locations")
        if (await cursor.fetchone())[0] > 0:
            return

        locs_file = ENTITIES_DIR / "locations.json"
        if not locs_file.exists():
            return

        with open(locs_file) as f:
            locs_data = json.load(f)

        for key, data in locs_data.items():
            await db.execute(
                "INSERT INTO locations (name, region, type, latitude, longitude) VALUES (?, ?, ?, ?, ?)",
                (data["canonical_name"], data.get("region"), data.get("type"),
                 data.get("map_x"), data.get("map_y")),
            )

        await db.commit()
    finally:
        await db.close()


async def sync_location_coordinates():
    """Update location coordinates from locations.json for locations that have NULL coordinates."""
    import json
    from pathlib import Path

    locs_file = Path(__file__).parent.parent / "data" / "entities" / "locations.json"
    if not locs_file.exists():
        return

    with open(locs_file) as f:
        locs_data = json.load(f)

    db = await get_db()
    try:
        for key, data in locs_data.items():
            map_x = data.get("map_x")
            map_y = data.get("map_y")
            if map_x is not None and map_y is not None:
                await db.execute(
                    "UPDATE locations SET latitude = ?, longitude = ? WHERE name = ? AND latitude IS NULL",
                    (map_x, map_y, data["canonical_name"]),
                )
        await db.commit()
    finally:
        await db.close()


async def get_locations(region: str | None = None, loc_type: str | None = None) -> list[dict]:
    """Return all locations, optionally filtered."""
    db = await get_db()
    try:
        conditions = []
        params: list = []
        if region:
            conditions.append("region = ?")
            params.append(region)
        if loc_type:
            conditions.append("type = ?")
            params.append(loc_type)

        where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        cursor = await db.execute(
            f"SELECT * FROM locations {where} ORDER BY region, name", params
        )
        return [dict(row) for row in await cursor.fetchall()]
    finally:
        await db.close()


async def get_location(location_id: int) -> dict | None:
    """Return a single location."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT * FROM locations WHERE id = ?", (location_id,)
        )
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()


async def get_location_regions() -> list[str]:
    """Return distinct location regions."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT DISTINCT region FROM locations WHERE region IS NOT NULL ORDER BY region"
        )
        return [row[0] for row in await cursor.fetchall()]
    finally:
        await db.close()


async def get_event_ages() -> list[str]:
    """Return distinct event ages in chronological order."""
    db = await get_db()
    try:
        cursor = await db.execute(
            "SELECT age, MIN(year_sortable) as min_year FROM events GROUP BY age ORDER BY min_year"
        )
        return [row[0] for row in await cursor.fetchall()]
    finally:
        await db.close()
