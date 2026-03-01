# Mithrandir — Tolkien Universe Reference Platform

## Full Technical Specification

**Version:** 2.0
**Date:** February 2026
**Target Environment:** macOS (M2 Max Mac Studio, 64GB RAM)
**Development Tool:** Claude Code
**Runtime Cost:** £0 — fully local, no cloud APIs

---

## 1. Project Overview

**Mithrandir** is a private, fully local RAG (Retrieval-Augmented Generation) application that ingests a personal collection of Tolkien works in EPUB and PDF format, creating a searchable, AI-powered knowledge base. Users can ask natural language questions about Middle-earth lore and receive cited, sourced answers drawn directly from the original texts.

This is a personal reference tool — no data leaves the machine, no API costs, no copyright concerns.

### 1.1 Core Capabilities (Implemented)

- **Conversational queries** with streaming SSE responses and source citations (book, chapter, excerpt, relevance score)
- **Character profiles** with genealogy data, aliases, family trees, appearances across works, and name variants
- **Character relationship graph** — interactive force-directed graph (react-force-graph-2d) with race-coloured nodes, parent/spouse edges, race toggle filters
- **Timeline browser** showing events across all Ages with source references, age filter tabs, expandable details
- **Cross-reference search** — filter RAG queries by character and/or location mentions (uses ChromaDB `where_document` text search)
- **Interactive map** — Middle-earth map with positioned location pins, zoom/pan, click for detail panels with corpus mentions
- **Power Battle** — pick two characters and get a RAG-powered streaming analysis of who would win, with textual evidence citations
- **Library management** — drag-drop EPUB/PDF upload, auto-matching to 27-book catalogue, per-book ingestion with SSE progress tracking

### 1.2 Not Yet Implemented (from original spec)

- Contradiction finder (compare passages across HoME volumes)
- Image gallery (extracted maps and illustrations)
- Deep search mode / exhaustive cross-reference
- Model switcher UI (currently hardcoded to qwen3:8b)
- Statistics dashboard
- Export search results as markdown

### 1.3 Target Corpus — Complete Book Catalogue

The app maintains a master catalogue of 27 Tolkien works (originally 25, expanded to 27), organised by the fictional chronological era they cover. Each book has a status: `missing`, `uploaded`, `ingesting`, `ready`, or `error`. This powers the Library page.

**Current corpus: 27 books ingested, ~4.9 million words, ~33,600 chunks.**

The catalogue is hardcoded into the app as seed data. The user does NOT need all 25 books — the app works with whatever subset they own. Priority tiers help the user know which books matter most.

#### TIER 1 — ESSENTIAL (start here)

| # | Book | Era Covered | Est. Words | Format Priority |
|---|------|------------|-----------|----------------|
| 1 | The Hobbit | Third Age (TA 2941) | 95,000 | EPUB |
| 2 | The Fellowship of the Ring | Third Age (TA 3018-3019) | 187,000 | EPUB |
| 3 | The Two Towers | Third Age (TA 3019) | 156,000 | EPUB |
| 4 | The Return of the King | Third Age (TA 3019) + Appendices (all Ages) | 137,000 | EPUB |
| 5 | The Silmarillion | Creation → end of First Age + Second Age summary | 130,000 | EPUB |
| 6 | Unfinished Tales | All Ages (fragments and essays) | 120,000 | EPUB |

#### TIER 2 — EXPANDED NARRATIVES

| # | Book | Era Covered | Est. Words | Format Priority |
|---|------|------------|-----------|----------------|
| 7 | The Children of Húrin (2007) | First Age (FA 460-499) | 68,000 | EPUB |
| 8 | Beren and Lúthien (2017) | First Age (FA 460-467) — all versions | 45,000 | EPUB |
| 9 | The Fall of Gondolin (2018) | First Age (FA 510) — all versions | 40,000 | EPUB |
| 10 | The Adventures of Tom Bombadil | Third Age (Shire poems) | 8,000 | EPUB |

#### TIER 3 — THE HISTORY OF MIDDLE-EARTH (12 volumes)

| # | Book | HoME Vol | Era Covered | Est. Words |
|---|------|----------|------------|-----------|
| 11 | The Book of Lost Tales, Part One | I | Creation & Valinor (earliest drafts) | 110,000 |
| 12 | The Book of Lost Tales, Part Two | II | First Age tales (earliest drafts) | 120,000 |
| 13 | The Lays of Beleriand | III | First Age (verse: Túrin & Beren) | 130,000 |
| 14 | The Shaping of Middle-earth | IV | Creation → First Age (early Silmarillion drafts) | 115,000 |
| 15 | The Lost Road and Other Writings | V | Númenor + Etymologies (languages) | 125,000 |
| 16 | The Return of the Shadow | VI | LOTR early drafts (Books I-II) | 130,000 |
| 17 | The Treason of Isengard | VII | LOTR drafts (Books II-III) | 135,000 |
| 18 | The War of the Ring | VIII | LOTR drafts (Books III-V) | 140,000 |
| 19 | Sauron Defeated | IX | LOTR ending drafts + Notion Club + Númenor fall | 130,000 |
| 20 | Morgoth's Ring | X | Later Silmarillion drafts + Athrabeth + Laws & Customs | 145,000 |
| 21 | The War of the Jewels | XI | Later First Age drafts + Grey Annals | 140,000 |
| 22 | The Peoples of Middle-earth | XII | LOTR Appendices drafts + "The New Shadow" | 135,000 |

#### TIER 4 — REFERENCE & LETTERS

| # | Book | Era Covered | Est. Words | Format Priority |
|---|------|------------|-----------|----------------|
| 23 | The Letters of J.R.R. Tolkien (expanded ed. 2023) | Cross-era (authorial commentary) | 200,000 | EPUB or PDF |
| 24 | The Nature of Middle-earth (2021) | Cross-era (philosophical essays on Elvish nature, time) | 90,000 | EPUB or PDF |
| 25 | Tales from the Perilous Realm | Mixed (Smith of Wootton Major, Farmer Giles, etc.) | 40,000 | EPUB |

### 1.3 Library Onboarding System

On first launch (or if the corpus is empty), the app shows a **Library Onboarding** screen instead of the chat. This is NOT a one-time wizard — it's a persistent view accessible from the sidebar that always shows the state of the user's library.

**Behaviour:**
1. App displays all 25 books grouped by tier, each showing status: ⬜ Missing / 📥 Uploaded / ⚙️ Ingesting / ✅ Ready / ❌ Error
2. User drags EPUB/PDF files onto a book's row (or uses a file picker)
3. App matches the uploaded file to the correct catalogue entry (by filename or user selection)
4. Ingestion starts automatically on upload (or user can batch-trigger)
5. Progress bar shows per-book ingestion status (parsing → chunking → embedding → done)
6. Once ≥1 book is ready, the chat interface unlocks with a message: *"I have read [Book Title]. Ask me anything."*
7. As more books are added, the app's knowledge grows — answers cite all available sources
8. User can re-ingest a book (e.g., if they get a better quality EPUB later)
9. User can remove a book from the corpus (deletes chunks from ChromaDB + metadata)

**File matching logic:**
- First try: match filename against known titles (fuzzy match)
- If ambiguous: show a dropdown asking "Which book is this?" with the catalogue list
- Store the mapping so re-uploads of the same filename are automatic

**Onboarding UI wireframe:**
```
┌─────────────────────────────────────────────────────────────┐
│  🧙 MITHRANDIR — Library                                    │
│                                                             │
│  Your collection: 6 of 25 books ready                       │
│  ████████░░░░░░░░░░░░░░░░░░░░░░ 24%                        │
│                                                             │
│  Drop EPUB or PDF files anywhere to add them                │
│                                                             │
│  ─── TIER 1: ESSENTIAL ─────────────────────────────────    │
│                                                             │
│  ✅ The Hobbit                      95,012 words  Ready     │
│  ✅ The Fellowship of the Ring     187,234 words  Ready     │
│  ✅ The Two Towers                 156,198 words  Ready     │
│  ✅ The Return of the King         137,445 words  Ready     │
│  ✅ The Silmarillion               130,115 words  Ready     │
│  ⚙️ Unfinished Tales               ████████░░ 78%  Ingesting│
│                                                             │
│  ─── TIER 2: EXPANDED NARRATIVES ───────────────────────    │
│                                                             │
│  ⬜ The Children of Húrin            —          Drop file   │
│  ⬜ Beren and Lúthien                —          Drop file   │
│  ⬜ The Fall of Gondolin             —          Drop file   │
│  ⬜ The Adventures of Tom Bombadil   —          Drop file   │
│                                                             │
│  ─── TIER 3: HISTORY OF MIDDLE-EARTH ──────────────────    │
│                                                             │
│  ⬜ I.   The Book of Lost Tales 1    —          Drop file   │
│  ⬜ II.  The Book of Lost Tales 2    —          Drop file   │
│  ...                                                        │
│                                                             │
│  ─── TIER 4: REFERENCE & LETTERS ──────────────────────    │
│                                                             │
│  ⬜ The Letters of J.R.R. Tolkien    —          Drop file   │
│  ⬜ The Nature of Middle-earth       —          Drop file   │
│  ⬜ Tales from the Perilous Realm    —          Drop file   │
│                                                             │
│  [Start Chatting →]  (enabled when ≥1 book is ready)       │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Architecture

### 2.1 High-Level Stack

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│       Next.js 15 + Tailwind CSS v4              │
│     Dark fantasy theme (parchment/leather)       │
│         Port 3001 (localhost only)               │
├─────────────────────────────────────────────────┤
│                   BACKEND                        │
│           Python 3.13 + FastAPI                  │
│           Port 8000 (localhost)                  │
├──────────┬──────────┬───────────────────────────┤
│ ChromaDB │ SQLite   │ Ollama                    │
│ Vectors  │ Metadata │ LLM + Embeddings          │
│ embedded │ File DB  │ Port 11434                │
└──────────┴──────────┴───────────────────────────┘
```

### 2.2 Technology Choices (Actual)

| Component | Technology | Notes |
|-----------|-----------|-------|
| **LLM** | Ollama (`qwen3:8b`) | Best speed/quality balance for streaming; priority list falls back through larger models if available |
| **Embeddings** | Ollama (`mxbai-embed-large`) | 1024-dim embeddings, cosine similarity |
| **Vector DB** | ChromaDB (PersistentClient, embedded) | No separate server, file-based at `backend/data/chroma_db/` |
| **Metadata DB** | SQLite via aiosqlite | Async, zero config |
| **Backend** | Python 3.13 + FastAPI + uvicorn | SSE streaming via `sse-starlette` |
| **Frontend** | Next.js 15 (App Router, Turbopack) + React 19 | Port 3001, proxied API calls to backend |
| **Styling** | Tailwind CSS v4 | Dark fantasy theme with CSS custom properties |
| **Graph** | react-force-graph-2d | Canvas-based d3 force simulation for character relationships |
| **Fonts** | Cinzel (headings), Crimson Text (body), Inter (UI), JetBrains Mono (code) | Google Fonts with `next/font` |

### 2.3 Claude Code Integration Notes

Claude Code should detect Ollama automatically if it's running on `localhost:11434`. The spec is designed so Claude Code can:

1. Read this document as the project brief
2. Set up the Python backend with `uv` or `pip` (virtual env)
3. Set up the Next.js frontend with `npm`/`pnpm`
4. Connect to the user's existing Ollama installation
5. Build each phase incrementally

**Important:** The user already has Ollama installed and running on their Mac Studio. Claude Code should NOT try to install Ollama — it should verify the connection to `http://localhost:11434` and list available models.

---

## 3. Data Ingestion Pipeline

### 3.1 File Format Priority

**EPUB (preferred):** EPUBs are HTML/XML under the hood. Text extraction is clean, chapter boundaries are preserved, footnotes stay intact, and images can be extracted separately.

**PDF (fallback only):** Use only for books not available in EPUB. PDF extraction is lossy — footnotes get jumbled, columns merge, headers/footers contaminate text. Use `pymupdf` (fitz) for best results.

### 3.2 Ingestion Architecture

```
books/
├── epub/
│   ├── the-hobbit.epub
│   ├── fellowship-of-the-ring.epub
│   ├── two-towers.epub
│   ├── return-of-the-king.epub
│   ├── silmarillion.epub
│   ├── unfinished-tales.epub
│   ├── home-01-book-of-lost-tales-1.epub
│   ├── home-02-book-of-lost-tales-2.epub
│   └── ... (remaining volumes)
├── pdf/
│   └── (fallback files only)
└── images/
    └── (extracted maps and illustrations)
```

### 3.3 Ingestion Steps

```python
# Pseudocode for ingestion pipeline

# Step 1: Parse EPUB
from ebooklib import epub
from bs4 import BeautifulSoup

def parse_epub(filepath: str) -> list[Chapter]:
    book = epub.read_epub(filepath)
    chapters = []
    for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
        soup = BeautifulSoup(item.get_body_content(), 'html.parser')
        text = soup.get_text(separator='\n', strip=True)
        title = extract_chapter_title(soup)  # from <h1>, <h2>, etc.
        chapters.append(Chapter(
            book_title=book.get_metadata('DC', 'title')[0][0],
            chapter_title=title,
            text=text,
            file_name=item.get_name()
        ))
    return chapters

# Step 2: Chunk text
# Use RecursiveCharacterTextSplitter or semantic chunking
# Chunk size: 512 tokens with 50 token overlap
# Preserve paragraph boundaries where possible

# Step 3: Generate embeddings via Ollama
import ollama
response = ollama.embed(model="mxbai-embed-large", input=chunk_text)
embedding = response["embeddings"][0]

# Step 4: Store in ChromaDB with rich metadata
collection.add(
    ids=[chunk_id],
    embeddings=[embedding],
    documents=[chunk_text],
    metadatas=[{
        "book": "The Silmarillion",
        "chapter": "Of the Coming of the Elves",
        "chunk_index": 3,
        "characters_mentioned": ["Oromë", "Ingwë", "Finwë", "Elwë"],
        "locations_mentioned": ["Cuiviénen", "Valinor"],
        "age": "First Age",
        "source_file": "silmarillion.epub"
    }]
)

# Step 5: Extract and save images
for item in book.get_items_of_type(ebooklib.ITEM_IMAGE):
    save_image(item, output_dir="data/images/")
```

### 3.4 PDF Fallback Pipeline

```python
import fitz  # pymupdf

def parse_pdf(filepath: str) -> list[Chapter]:
    doc = fitz.open(filepath)
    chapters = []
    current_chapter = ""
    current_text = []

    for page in doc:
        text = page.get_text("text")
        # Detect chapter headings (typically ALL CAPS or larger font)
        # This requires heuristics per book
        current_text.append(text)

    # Also extract images
    for page in doc:
        for img_index, img in enumerate(page.get_images()):
            xref = img[0]
            base_image = doc.extract_image(xref)
            save_image(base_image, output_dir="data/images/")

    return chapters
```

### 3.5 Chunking Strategy

The chunking strategy is critical for RAG quality. For Tolkien's prose:

- **Chunk size:** 512 tokens (roughly 2-3 paragraphs of Tolkien's dense prose)
- **Overlap:** 64 tokens (ensures no context is lost at boundaries)
- **Splitter:** `RecursiveCharacterTextSplitter` from LangChain, with separators: `["\n\n", "\n", ". ", " "]`
- **Metadata preserved per chunk:** book, chapter, page/section, chunk index, detected character names, detected location names

### 3.6 Named Entity Pre-Processing

Before embedding, run a Tolkien-specific NER pass on each chunk to extract:

- **Characters:** Match against a master list of ~800+ Tolkien character names including variants (e.g., Gandalf = Mithrandir = Olórin = Tharkûn = Incánus)
- **Locations:** Match against master location list (~500+ places)
- **Events:** Key events like "Battle of Unnumbered Tears", "Kinslaying at Alqualondë"
- **Ages:** First Age, Second Age, Third Age, Fourth Age, Years of the Trees, etc.

Store these as metadata on each chunk for filtering queries like "show me all mentions of Gandalf in The Silmarillion."

**Implementation:** Use a custom dictionary-based NER (not spaCy — overkill for known entities). Build JSON lookup files:

```json
// data/entities/characters.json
{
  "gandalf": {
    "canonical_name": "Gandalf",
    "aliases": ["Mithrandir", "Olórin", "Tharkûn", "Incánus", "The Grey Pilgrim", "Gandalf the Grey", "Gandalf the White", "The White Rider"],
    "race": "Maia",
    "appears_in": ["The Hobbit", "The Lord of the Rings", "The Silmarillion", "Unfinished Tales"]
  }
}
```

---

## 4. RAG Query Pipeline

### 4.1 Query Flow

```
User Question
    │
    ▼
[Query Analysis] — detect intent, extract entities, determine scope
    │
    ▼
[Embed Query] — ollama.embed(model="mxbai-embed-large", input=query)
    │
    ▼
[Vector Search] — ChromaDB similarity search, top-k=8
    │
    ├── Optional: metadata filter (specific book, age, character)
    │
    ▼
[Re-rank] — score retrieved chunks by relevance (optional, improves quality)
    │
    ▼
[Context Assembly] — combine top chunks into prompt context
    │
    ▼
[LLM Generation] — Ollama chat with system prompt + context + question
    │
    ▼
[Citation Formatting] — attach source references to response
    │
    ▼
Response with citations
```

### 4.2 System Prompt

```
You are Mithrandir, a scholarly assistant with deep knowledge of
J.R.R. Tolkien's works. You answer questions about Middle-earth
using ONLY the provided source material. 

Rules:
1. Always cite your sources: [Book Title, Chapter Name]
2. If the source material doesn't contain the answer, say so clearly
3. When sources contradict each other, note ALL versions and which
   book each comes from
4. Distinguish between published works (The Silmarillion) and
   earlier drafts (History of Middle-earth volumes)
5. Use the Elvish names and terms as Tolkien wrote them, with
   diacritical marks (é, ë, ú, etc.)
6. Be conversational but scholarly — like a wise loremaster
```

### 4.3 Query Types & Handling

| Query Type | Example | Strategy |
|-----------|---------|----------|
| **Factual** | "Who was Gil-galad's father?" | Vector search + direct answer with citations |
| **Cross-reference** | "Every mention of Gondolin" | Metadata filter on location + exhaustive retrieval |
| **Contradiction** | "Did Tolkien change Gil-galad's parentage?" | Search across HoME volumes + compare |
| **Timeline** | "What happened in SA 3319?" | Timeline DB lookup + vector search for context |
| **Character profile** | "Tell me about Fëanor" | Character DB + aggregated vector search |
| **Comparison** | "How do the Silmarils differ from the Rings?" | Multi-topic vector search + synthesis |

---

## 5. Database Schemas

### 5.1 SQLite — Structured Metadata

```sql
-- Books catalogue (pre-seeded with all 25 Tolkien works)
CREATE TABLE books (
    id INTEGER PRIMARY KEY,
    catalogue_id INTEGER NOT NULL,     -- fixed ID 1-25, matches the master catalogue
    title TEXT NOT NULL,
    short_title TEXT,                  -- e.g. "HoME I" for History vol 1
    author TEXT DEFAULT 'J.R.R. Tolkien',
    editor TEXT,                       -- Christopher Tolkien for HoME
    publication_year INTEGER,
    tier INTEGER NOT NULL,             -- 1=Essential, 2=Expanded, 3=HoME, 4=Reference
    tier_label TEXT,                   -- "Essential", "Expanded Narratives", etc.
    era_covered TEXT,                  -- "First Age", "Third Age (TA 2941)", etc.
    estimated_words INTEGER,           -- from catalogue
    actual_words INTEGER,              -- counted after ingestion
    format TEXT,                       -- 'epub' or 'pdf' (of the uploaded file)
    format_priority TEXT DEFAULT 'epub', -- preferred format
    file_path TEXT,                    -- path to uploaded file (null if missing)
    file_hash TEXT,                    -- SHA256 of uploaded file (for re-upload detection)
    original_filename TEXT,            -- what the user's file was called
    total_chapters INTEGER,
    chunk_count INTEGER DEFAULT 0,
    images_extracted INTEGER DEFAULT 0,
    status TEXT DEFAULT 'missing',     -- missing, uploaded, ingesting, ready, error
    error_message TEXT,                -- if status='error', what went wrong
    ingested_at DATETIME,
    uploaded_at DATETIME,
    UNIQUE(catalogue_id)
);

-- Chapters
CREATE TABLE chapters (
    id INTEGER PRIMARY KEY,
    book_id INTEGER REFERENCES books(id),
    chapter_number INTEGER,
    title TEXT,
    word_count INTEGER,
    chunk_count INTEGER,        -- how many vector chunks this chapter produced
    UNIQUE(book_id, chapter_number)
);

-- Characters
CREATE TABLE characters (
    id INTEGER PRIMARY KEY,
    canonical_name TEXT NOT NULL,
    race TEXT,                  -- Elf, Man, Hobbit, Maia, Vala, Dwarf, etc.
    gender TEXT,
    birth_year TEXT,            -- "FA 1" or "SA 3441" or "TA 2931"
    death_year TEXT,
    father_id INTEGER REFERENCES characters(id),
    mother_id INTEGER REFERENCES characters(id),
    spouse_ids TEXT,            -- JSON array of character IDs
    description TEXT,
    first_appearance_book TEXT,
    notes TEXT
);

-- Character name aliases
CREATE TABLE character_aliases (
    id INTEGER PRIMARY KEY,
    character_id INTEGER REFERENCES characters(id),
    alias TEXT NOT NULL,
    language TEXT,              -- Quenya, Sindarin, Westron, Khuzdul, etc.
    context TEXT                -- "name used in Gondor" etc.
);

-- Locations
CREATE TABLE locations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT,                -- Beleriand, Gondor, Eriador, etc.
    type TEXT,                  -- city, forest, mountain, river, realm, etc.
    description TEXT,
    latitude REAL,              -- for map plotting (relative coordinates)
    longitude REAL,
    destroyed_in TEXT,          -- "War of Wrath" etc.
    notes TEXT
);

-- Timeline events
CREATE TABLE events (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    age TEXT,                   -- "First Age", "Second Age", etc.
    year TEXT,                  -- "FA 472" or "SA 3319" or "TA 3019"
    year_sortable INTEGER,     -- computed: for ordering across ages
    description TEXT,
    source_book TEXT,
    source_chapter TEXT,
    characters_involved TEXT,   -- JSON array
    locations_involved TEXT     -- JSON array
);

-- Ingestion log
CREATE TABLE ingestion_log (
    id INTEGER PRIMARY KEY,
    book_id INTEGER REFERENCES books(id),
    started_at DATETIME,
    completed_at DATETIME,
    chunks_created INTEGER,
    images_extracted INTEGER,
    errors TEXT,
    status TEXT
);
```

### 5.2 ChromaDB — Vector Store

```python
# Collection setup
import chromadb

client = chromadb.PersistentClient(path="./data/chroma_db")

collection = client.get_or_create_collection(
    name="tolkien_corpus",
    metadata={
        "hnsw:space": "cosine",        # cosine similarity
        "hnsw:construction_ef": 200,   # higher = better quality index
        "hnsw:search_ef": 100          # higher = better search quality
    }
)

# Each chunk stored with metadata:
# - id: "silmarillion_ch03_chunk_007"
# - document: the actual text
# - embedding: from mxbai-embed-large
# - metadata:
#     book: "The Silmarillion"
#     chapter: "Of the Coming of the Elves"
#     chunk_index: 7
#     characters: ["Oromë", "Ingwë", "Finwë", "Elwë"]  (JSON string)
#     locations: ["Cuiviénen", "Valinor"]                (JSON string)
#     age: "Years of the Trees"
#     word_count: 387
```

---

## 6. API Endpoints (Implemented)

### 6.1 FastAPI Backend — Routers

**System** (`routers/system.py`):
```
GET  /api/health                        # backend + Ollama + ChromaDB status, model info
```

**Library** (`routers/library.py`):
```
GET  /api/library                       # full catalogue with tiers, statuses
GET  /api/library/stats                 # {books_ready, books_total, total_words, total_chunks}
POST /api/library/upload                # multipart file upload, auto-matches to catalogue
POST /api/library/match                 # confirm file→book match {filename, catalogue_id}
POST /api/library/ingest/{catalogue_id} # trigger ingestion
DELETE /api/library/{catalogue_id}      # remove book from corpus
GET  /api/library/progress              # SSE stream of ingestion progress events
GET  /api/library/{catalogue_id}/preview # first 500 chars of ingested text
```

**Chat/Query** (`routers/chat.py`):
```
POST /api/query                         # non-streaming RAG query
GET  /api/query/stream                  # SSE streaming RAG query
     ?question=...                      # required
     &books=...                         # optional: comma-separated book filter
     &characters=...                    # optional: comma-separated character filter
     &locations=...                     # optional: comma-separated location filter
     &top_k=8                           # optional: number of chunks to retrieve
```

**Characters** (`routers/characters.py`):
```
GET  /api/characters                    # paginated list (?search=&race=&page=&per_page=)
GET  /api/characters/races              # distinct races for filter dropdown
GET  /api/characters/graph              # {nodes: [{id,name,race}], edges: [{source,target,type}]}
GET  /api/characters/{id}              # full profile with aliases, family, spouse
GET  /api/characters/{id}/mentions     # corpus mentions via semantic search
GET  /api/characters/{id}/genealogy    # family tree nodes
```

**Timeline** (`routers/timeline.py`):
```
GET  /api/timeline                      # all events (?age= filter)
GET  /api/timeline/ages                 # distinct ages for filter tabs
```

**Locations** (`routers/locations.py`):
```
GET  /api/locations                     # all locations (?region=&type= filters)
GET  /api/locations/regions             # distinct regions for filter
GET  /api/locations/{id}               # location detail
GET  /api/locations/{id}/mentions      # corpus mentions via semantic search
```

**Battle** (`routers/battle.py`):
```
GET  /api/battle/stream                 # SSE streaming battle analysis
     ?character_a=...                   # first character name
     &character_b=...                   # second character name
```

---

## 7. Frontend Design

### 7.1 Theme: Dark Fantasy / Scholarly

The UI should feel like a Tolkien scholar's study — dark backgrounds, warm amber accents, parchment textures for content areas, and a serif font for lore text.

**Colour Palette:**
- Background: `#1a1611` (very dark brown/black)
- Surface: `#2a2319` (dark leather brown)
- Card: `#342c1f` (aged parchment dark)
- Text Primary: `#e8dcc8` (warm cream)
- Text Secondary: `#a69880` (muted gold)
- Accent: `#c8a45c` (aged gold)
- Accent Hover: `#d4b76a`
- Border: `#4a3f2f` (subtle brown border)
- Link/Citation: `#8fb8c4` (mithril blue)
- Error: `#c45c5c`
- Success: `#5cc47a`

**Typography:**
- Headings: `Cinzel` (Google Font — medieval serif, free)
- Body/Lore text: `Crimson Text` or `EB Garamond` (Google Font — elegant serif)
- UI/System: `Inter` (clean sans-serif for buttons, labels)
- Code/Citations: `JetBrains Mono`

### 7.2 Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  🧙 MITHRANDIR          [Search...]     [⚙ Settings]   │
├────────┬────────────────────────────────────────────────┤
│        │                                                │
│  NAV   │              MAIN CONTENT                      │
│        │                                                │
│ 📚 Library│  [Current view renders here]                │
│ 💬 Ask │                                                │
│ 👤 Chars│                                               │
│ 🗺️ Map  │                                               │
│ 📅 Time │                                               │
│ 🔍 Search│                                              │
│ ⚡ Contra│                                              │
│ 📚 Books │                                              │
│ ⚙ Admin │                                              │
│        │                                                │
├────────┴────────────────────────────────────────────────┤
│  Corpus: 23 books │ 3.35M words │ Ollama: llama3.3:70b │
└─────────────────────────────────────────────────────────┘
```

### 7.3 Key Views (Implemented)

**Library** (`/library`):
- 27-book catalogue grouped by tier, each showing status badge
- Overall progress bar (X of Y books ready)
- Drag-and-drop file upload zone (EPUB/PDF)
- Auto-matching with fuzzy filename hints + EPUB metadata
- Ambiguous matches show modal for user to pick correct book
- Per-book SSE ingestion progress (parsing → chunking → embedding → complete)
- Click book for preview modal (first 500 chars)

**Ask** (`/ask`):
- Chat interface with streaming SSE responses
- User messages right-aligned, assistant left-aligned with bot avatar
- "Thinking..." pulse animation while waiting
- Collapsible source citations per response (book, chapter, excerpt, relevance %)
- Expandable filter panel: book multi-select, character autocomplete, location autocomplete
- Active filter tags shown when panel is collapsed

**Characters** (`/characters`, `/characters/[id]`):
- Grid/Graph toggle in header
- Grid: searchable, race-filterable, paginated character cards
- Graph: interactive force-directed graph (react-force-graph-2d) with:
  - Nodes coloured by race, sized on hover
  - Solid edges for parent, dashed for spouse
  - Race toggle legend (click to show/hide races, All/None buttons)
  - Click node to navigate to detail page
- Detail page: aliases, family links (father, mother, spouse, children), description, expandable corpus mentions

**Timeline** (`/timeline`):
- Vertical timeline with age-coloured dots and connecting line
- Age filter tabs (All Ages, Years of the Trees, First Age, etc.)
- Click event to expand: description + source book/chapter
- Smooth expand/collapse animation

**Locations** (`/map`):
- Map/List toggle
- Map view: Middle-earth map image with positioned pins, zoom (scroll wheel), pan (drag), zoom controls
- Pins coloured by region, inversely scaled with zoom
- Click pin → slide-in detail panel with description + corpus mentions
- Unmappable locations note (Aman, Beleriand, Numenor)
- List view: collapsible region groups, expandable location details with corpus mentions

**Battle** (`/battle`):
- Two side-by-side character selectors with autocomplete search
- "Battle!" button (enabled when both selected)
- Streaming battle analysis with structured sections (Powers & Feats, Analysis, Verdict)
- Source citations after stream completes
- "New Battle" reset button

---

## 8. Project Structure (Actual)

```
Mithrandir/
├── mithrandir-spec.md               # this file
│
├── backend/
│   ├── pyproject.toml               # Python deps (managed with uv)
│   ├── main.py                      # FastAPI app entry + lifespan (seeds, scans)
│   ├── config.py                    # settings, model names, system prompts
│   ├── ingestion/
│   │   ├── epub_parser.py           # EPUB text extraction (ebooklib + BS4)
│   │   ├── pdf_parser.py            # PDF fallback parser (pymupdf)
│   │   ├── chunker.py               # RecursiveCharacterTextSplitter wrapper
│   │   └── pipeline.py              # orchestrates full ingestion with progress SSE
│   ├── query/
│   │   ├── query_engine.py          # RAG query + streaming, filter building
│   │   ├── context_builder.py       # assemble prompt context from chunks
│   │   └── citation_formatter.py    # format source references
│   ├── models/
│   │   ├── schemas.py               # Pydantic models
│   │   ├── database.py              # SQLite init, seeds, CRUD queries
│   │   └── vectorstore.py           # ChromaDB collection management
│   ├── routers/
│   │   ├── system.py                # /api/health
│   │   ├── library.py               # /api/library/* (upload, match, ingest, progress)
│   │   ├── chat.py                  # /api/query, /api/query/stream
│   │   ├── characters.py            # /api/characters/* (list, detail, graph, mentions)
│   │   ├── timeline.py              # /api/timeline/*
│   │   ├── locations.py             # /api/locations/*
│   │   └── battle.py                # /api/battle/stream
│   └── data/
│       ├── book_catalogue.py        # master list of 27 Tolkien books (seed data)
│       ├── entities/
│       │   ├── characters.json      # ~71 characters with aliases, race, gender
│       │   ├── character_relationships.json  # parent/spouse relationships
│       │   ├── locations.json       # ~60 locations with regions, coordinates
│       │   └── events_seed.py       # ~50 timeline events across all Ages
│       ├── chroma_db/               # ChromaDB persistent storage (~33,600 chunks)
│       └── mithrandir.db            # SQLite database
│
├── frontend/
│   ├── package.json
│   ├── next.config.ts
│   ├── app/
│   │   ├── globals.css              # theme variables, scrollbar, animations
│   │   ├── layout.tsx               # root layout with sidebar + error boundary
│   │   ├── page.tsx                 # redirects to /ask or /library
│   │   ├── ask/page.tsx             # chat with filters
│   │   ├── library/page.tsx         # book management + ingestion
│   │   ├── characters/
│   │   │   ├── page.tsx             # grid/graph toggle
│   │   │   └── [id]/page.tsx        # character detail
│   │   ├── map/page.tsx             # map/list toggle with interactive map
│   │   ├── timeline/page.tsx        # vertical timeline with age filters
│   │   └── battle/page.tsx          # power battle comparison
│   ├── components/
│   │   ├── Sidebar.tsx              # navigation with library stats
│   │   ├── ErrorBoundary.tsx        # crash recovery wrapper
│   │   ├── Spinner.tsx              # reusable loading spinner
│   │   ├── ChatMessage.tsx          # user/assistant message bubbles
│   │   ├── ChatInput.tsx            # auto-resizing textarea input
│   │   ├── SourceCitation.tsx       # expandable source list
│   │   ├── CharacterCard.tsx        # character grid card
│   │   ├── CharacterGraph.tsx       # force-directed relationship graph
│   │   ├── MapPin.tsx               # positioned map pin
│   │   ├── LocationDetailPanel.tsx  # slide-in location detail
│   │   ├── BookCard.tsx             # book row in library
│   │   ├── BookDropZone.tsx         # drag-and-drop upload
│   │   ├── BookMatchModal.tsx       # disambiguation dialog
│   │   ├── BookPreviewModal.tsx     # text preview modal
│   │   ├── LibraryProgress.tsx      # overall progress bar
│   │   └── TierSection.tsx          # collapsible tier group
│   ├── lib/
│   │   ├── api.ts                   # fetch wrappers + EventSource helpers
│   │   └── types.ts                 # TypeScript interfaces
│   └── public/
│       └── middle-earth-map.jpg     # map image for location pins
│
└── books/                           # user's EPUB/PDF files
    ├── epub/
    └── pdf/
```

---

## 9. Key Dependencies

### 9.1 Python Backend

```toml
[project]
name = "mithrandir-backend"
requires-python = ">=3.11"

dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.30.0",
    "ollama>=0.4.0",                 # Ollama Python client
    "chromadb>=0.5.0",               # Vector database
    "ebooklib>=0.18",                # EPUB parsing
    "beautifulsoup4>=4.12",          # HTML parsing from EPUBs
    "pymupdf>=1.24.0",              # PDF parsing (fallback)
    "langchain-text-splitters>=0.2", # Text chunking
    "pydantic>=2.0",                # Data validation
    "aiosqlite>=0.20.0",            # Async SQLite
    "python-multipart>=0.0.9",      # File upload support
    "sse-starlette>=2.0",           # Server-sent events for streaming
    "pillow>=10.0",                 # Image processing
    "httpx>=0.27.0",                # HTTP client
]
```

### 9.2 Node Frontend

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "tailwindcss": "^3.4.0",
    "@tailwindcss/typography": "^0.5.0",
    "lucide-react": "^0.400.0",
    "react-markdown": "^9.0.0",
    "d3": "^7.9.0",
    "swr": "^2.2.0"
  }
}
```

---

## 10. Ollama Model Configuration

### 10.1 Required Models

Pull these before first run:

```bash
# Embedding model (REQUIRED — used for all vector operations)
ollama pull mxbai-embed-large

# Chat model (choose ONE based on your preference)
# Option A: Best quality (uses ~40GB RAM, slower)
ollama pull llama3.3:70b

# Option B: Good quality, faster (uses ~20GB RAM)
ollama pull qwen2.5:32b

# Option C: Fast, decent quality (uses ~5GB RAM)
ollama pull llama3.2:8b
```

### 10.2 Model Selection Logic

The app should auto-detect available models and let the user switch. Default priority:

1. `llama3.3:70b` — if available, use as primary
2. `qwen2.5:32b` — solid alternative
3. `qwen3:8b` — user already has this installed
4. Any other available chat model

### 10.3 Ollama Connection

```python
import ollama

# Test connection
def check_ollama():
    try:
        models = ollama.list()
        return {"status": "connected", "models": [m.model for m in models.models]}
    except Exception as e:
        return {"status": "disconnected", "error": str(e)}

# Generate embedding
def embed_text(text: str) -> list[float]:
    response = ollama.embed(model="mxbai-embed-large", input=text)
    return response["embeddings"][0]

# Chat with context
def query_with_context(question: str, context: str, model: str = "llama3.3:70b"):
    response = ollama.chat(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}
        ],
        stream=True
    )
    for chunk in response:
        yield chunk["message"]["content"]
```

---

## 11. Seed Data

### 11.1 Character Seed Data (partial — expand during development)

The `backend/data/entities/characters.json` file should be seeded with at least the major characters. This enables NER tagging during ingestion and powers the Characters view. A starter set:

**Valar:** Manwë, Varda, Ulmo, Aulë, Yavanna, Mandos (Námo), Nienna, Oromë, Tulkas, Morgoth (Melkor)

**Major Elves:** Fëanor, Fingolfin, Finarfin, Galadriel, Elrond, Gil-galad, Thingol, Lúthien, Turgon, Glorfindel, Legolas, Celebrimbor

**Major Men:** Aragorn, Beren, Túrin, Tuor, Húrin, Isildur, Elendil, Faramir, Éowyn, Théoden, Denethor

**Hobbits:** Frodo, Bilbo, Sam, Merry, Pippin

**Dwarves:** Gimli, Thorin, Durin, Balin

**Maiar/Istari:** Gandalf, Saruman, Sauron, Radagast, Balrog (various)

**Others:** Tom Bombadil, Goldberry, Treebeard, Shelob, Smaug, Glaurung, Ancalagon

### 11.2 Timeline Seed Data

Pre-populate major events across all Ages. The ingestion pipeline will discover more, but having anchors helps:

- **Years of the Trees:** Awakening of Elves, Creation of Silmarils, Darkening of Valinor
- **First Age:** Flight of the Noldor, major battles (Dagor-nuin-Giliath through War of Wrath), Fall of Gondolin, Quest for the Silmaril
- **Second Age:** Founding of Númenor, Forging of the Rings, Fall of Númenor, Last Alliance
- **Third Age:** Key dates from Appendix B of LotR, War of the Ring events
- **Fourth Age:** Coronation of Aragorn, departure of Ring-bearers

---

## 12. Build Phases — Completion Status

### Phase 1: Foundation ✅
- [x] Project scaffolding (Python backend + Next.js frontend)
- [x] Ollama connection verification
- [x] SQLite database setup with schemas
- [x] Seed book catalogue (27 books, status: missing)
- [x] ChromaDB initialization
- [x] Library onboarding page — list all books, drag-drop upload, status indicators
- [x] File matching — auto-detect which book was uploaded (filename hints + EPUB metadata + fuzzy match)
- [x] EPUB parser (ebooklib + BeautifulSoup)
- [x] PDF fallback parser (pymupdf)
- [x] Text chunker with metadata (1024 chars, 128 overlap)
- [x] Embedding pipeline (Ollama mxbai-embed-large, batch size 32)
- [x] Per-book ingestion with SSE progress tracking
- [x] Basic `/api/query` endpoint
- [x] Chat UI with streaming responses
- [x] **Result:** 27 books ingested, ~4.9M words, ~33,600 chunks

### Phase 2: Core RAG + Reference Features ✅
- [x] Streaming SSE responses (token-by-token)
- [x] Query filters (by book, character, location)
- [x] Source citations with expandable excerpts and relevance scores
- [x] Dark fantasy theme (Cinzel/Crimson Text fonts, warm brown/gold palette)
- [x] Sidebar navigation with library stats
- [x] Character profiles (grid + detail pages with aliases, family, mentions)
- [x] Character search and race filtering
- [x] Timeline (vertical, age-grouped, expandable events)
- [x] Location database with regions
- [x] Font/readability improvements (18px base, bumped text sizes)
- [x] Catalogue updates (removed non-Middle-earth book, added 2 missing works)

### Phase 3: Visual Features ✅
- [x] Interactive Middle-earth map with zoom/pan and positioned pins
- [x] Location detail panels with corpus mentions
- [x] Map/List toggle for locations
- [x] Character relationship graph (react-force-graph-2d, 71 nodes, 35 edges)
- [x] Race toggle filters on graph
- [x] Cross-reference search (character/location filters on Ask page using `where_document`)

### Phase 4: Polish + Battle ✅
- [x] Reusable Spinner component replacing plain "Loading..." text
- [x] ErrorBoundary for crash recovery
- [x] CSS animations (fadeIn, expandIn)
- [x] Source citation chevron rotation transition
- [x] Focus ring styles (ChatInput, sidebar nav)
- [x] Better empty states with icons
- [x] Power Battle feature — RAG-powered character comparison with streaming analysis

### Future (Not Yet Implemented)
- [ ] Contradiction finder (compare passages across HoME volumes)
- [ ] Deep search mode (exhaustive retrieval)
- [ ] Model switcher UI
- [ ] Statistics dashboard
- [ ] Chat history persistence
- [ ] Image gallery (extracted maps and illustrations)
- [ ] Keyboard shortcuts
- [ ] Launch script (`start.sh`)

---

## 13. Launch Script

```bash
#!/bin/bash
# start.sh — Launch Mithrandir

echo "🧙 Starting Mithrandir..."

# Check Ollama
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "❌ Ollama is not running. Please start Ollama first."
    echo "   Run: ollama serve"
    exit 1
fi

echo "✅ Ollama connected"

# Check embedding model
if ! ollama list | grep -q "mxbai-embed-large"; then
    echo "⬇️  Pulling embedding model..."
    ollama pull mxbai-embed-large
fi

# Start backend
echo "🚀 Starting backend on :8000..."
cd backend
source .venv/bin/activate 2>/dev/null || python -m venv .venv && source .venv/bin/activate
pip install -q -e . 2>/dev/null
uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start frontend
echo "🚀 Starting frontend on :3000..."
cd ../frontend
npm install --silent 2>/dev/null
npm run dev &
FRONTEND_PID=$!

echo ""
echo "🧙 Mithrandir is ready!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
```

---

## 14. Library Onboarding System

### 15.1 Book Catalogue Seed Data

On first run, the app populates the `books` table with all 25 entries (status: `missing`). This is the master catalogue — it never changes, only the status fields update as the user adds books.

```python
# backend/data/book_catalogue.py

BOOK_CATALOGUE = [
    # TIER 1: ESSENTIAL
    {
        "catalogue_id": 1,
        "title": "The Hobbit",
        "short_title": "The Hobbit",
        "editor": None,
        "publication_year": 1937,
        "tier": 1,
        "tier_label": "Essential",
        "era_covered": "Third Age (TA 2941)",
        "estimated_words": 95000,
        "filename_hints": ["hobbit", "the_hobbit", "the-hobbit"]
    },
    {
        "catalogue_id": 2,
        "title": "The Fellowship of the Ring",
        "short_title": "FOTR",
        "editor": None,
        "publication_year": 1954,
        "tier": 1,
        "tier_label": "Essential",
        "era_covered": "Third Age (TA 3018-3019)",
        "estimated_words": 187000,
        "filename_hints": ["fellowship", "fotr", "fellowship_of_the_ring"]
    },
    {
        "catalogue_id": 3,
        "title": "The Two Towers",
        "short_title": "TTT",
        "editor": None,
        "publication_year": 1954,
        "tier": 1,
        "tier_label": "Essential",
        "era_covered": "Third Age (TA 3019)",
        "estimated_words": 156000,
        "filename_hints": ["two_towers", "ttt", "two-towers"]
    },
    {
        "catalogue_id": 4,
        "title": "The Return of the King",
        "short_title": "ROTK",
        "editor": None,
        "publication_year": 1955,
        "tier": 1,
        "tier_label": "Essential",
        "era_covered": "Third Age (TA 3019) + Appendices (all Ages)",
        "estimated_words": 137000,
        "filename_hints": ["return_of_the_king", "rotk", "return-of-the-king"]
    },
    {
        "catalogue_id": 5,
        "title": "The Silmarillion",
        "short_title": "The Silmarillion",
        "editor": "Christopher Tolkien",
        "publication_year": 1977,
        "tier": 1,
        "tier_label": "Essential",
        "era_covered": "Creation → end of First Age + Second Age summary",
        "estimated_words": 130000,
        "filename_hints": ["silmarillion", "the_silmarillion"]
    },
    {
        "catalogue_id": 6,
        "title": "Unfinished Tales",
        "short_title": "UT",
        "editor": "Christopher Tolkien",
        "publication_year": 1980,
        "tier": 1,
        "tier_label": "Essential",
        "era_covered": "All Ages (fragments and essays)",
        "estimated_words": 120000,
        "filename_hints": ["unfinished_tales", "unfinished-tales"]
    },
    # TIER 2: EXPANDED NARRATIVES
    {
        "catalogue_id": 7,
        "title": "The Children of Húrin",
        "short_title": "Children of Húrin",
        "editor": "Christopher Tolkien",
        "publication_year": 2007,
        "tier": 2,
        "tier_label": "Expanded Narratives",
        "era_covered": "First Age (FA 460-499)",
        "estimated_words": 68000,
        "filename_hints": ["children_of_hurin", "turin", "hurin"]
    },
    {
        "catalogue_id": 8,
        "title": "Beren and Lúthien",
        "short_title": "Beren & Lúthien",
        "editor": "Christopher Tolkien",
        "publication_year": 2017,
        "tier": 2,
        "tier_label": "Expanded Narratives",
        "era_covered": "First Age (FA 460-467) — all versions",
        "estimated_words": 45000,
        "filename_hints": ["beren", "luthien", "beren_and_luthien"]
    },
    {
        "catalogue_id": 9,
        "title": "The Fall of Gondolin",
        "short_title": "Fall of Gondolin",
        "editor": "Christopher Tolkien",
        "publication_year": 2018,
        "tier": 2,
        "tier_label": "Expanded Narratives",
        "era_covered": "First Age (FA 510) — all versions",
        "estimated_words": 40000,
        "filename_hints": ["gondolin", "fall_of_gondolin"]
    },
    {
        "catalogue_id": 10,
        "title": "The Adventures of Tom Bombadil",
        "short_title": "Tom Bombadil",
        "editor": None,
        "publication_year": 1962,
        "tier": 2,
        "tier_label": "Expanded Narratives",
        "era_covered": "Third Age (Shire poems)",
        "estimated_words": 8000,
        "filename_hints": ["tom_bombadil", "bombadil"]
    },
    # TIER 3: THE HISTORY OF MIDDLE-EARTH
    {
        "catalogue_id": 11,
        "title": "The Book of Lost Tales, Part One",
        "short_title": "HoME I",
        "editor": "Christopher Tolkien",
        "publication_year": 1983,
        "tier": 3,
        "tier_label": "The History of Middle-earth",
        "era_covered": "Creation & Valinor (earliest drafts)",
        "estimated_words": 110000,
        "filename_hints": ["lost_tales_1", "lost_tales_part_one", "home_01", "home_1", "bolt1"]
    },
    {
        "catalogue_id": 12,
        "title": "The Book of Lost Tales, Part Two",
        "short_title": "HoME II",
        "editor": "Christopher Tolkien",
        "publication_year": 1984,
        "tier": 3,
        "tier_label": "The History of Middle-earth",
        "era_covered": "First Age tales (earliest drafts)",
        "estimated_words": 120000,
        "filename_hints": ["lost_tales_2", "lost_tales_part_two", "home_02", "home_2", "bolt2"]
    },
    {
        "catalogue_id": 13,
        "title": "The Lays of Beleriand",
        "short_title": "HoME III",
        "editor": "Christopher Tolkien",
        "publication_year": 1985,
        "tier": 3,
        "tier_label": "The History of Middle-earth",
        "era_covered": "First Age (verse: Túrin & Beren)",
        "estimated_words": 130000,
        "filename_hints": ["lays_of_beleriand", "beleriand", "home_03", "home_3"]
    },
    {
        "catalogue_id": 14,
        "title": "The Shaping of Middle-earth",
        "short_title": "HoME IV",
        "editor": "Christopher Tolkien",
        "publication_year": 1986,
        "tier": 3,
        "tier_label": "The History of Middle-earth",
        "era_covered": "Creation → First Age (early Silmarillion drafts)",
        "estimated_words": 115000,
        "filename_hints": ["shaping_of_middle_earth", "shaping", "home_04", "home_4"]
    },
    {
        "catalogue_id": 15,
        "title": "The Lost Road and Other Writings",
        "short_title": "HoME V",
        "editor": "Christopher Tolkien",
        "publication_year": 1987,
        "tier": 3,
        "tier_label": "The History of Middle-earth",
        "era_covered": "Númenor + Etymologies (languages)",
        "estimated_words": 125000,
        "filename_hints": ["lost_road", "home_05", "home_5"]
    },
    {
        "catalogue_id": 16,
        "title": "The Return of the Shadow",
        "short_title": "HoME VI",
        "editor": "Christopher Tolkien",
        "publication_year": 1988,
        "tier": 3,
        "tier_label": "The History of Middle-earth",
        "era_covered": "LOTR early drafts (Books I-II)",
        "estimated_words": 130000,
        "filename_hints": ["return_of_the_shadow", "home_06", "home_6"]
    },
    {
        "catalogue_id": 17,
        "title": "The Treason of Isengard",
        "short_title": "HoME VII",
        "editor": "Christopher Tolkien",
        "publication_year": 1989,
        "tier": 3,
        "tier_label": "The History of Middle-earth",
        "era_covered": "LOTR drafts (Books II-III)",
        "estimated_words": 135000,
        "filename_hints": ["treason_of_isengard", "home_07", "home_7"]
    },
    {
        "catalogue_id": 18,
        "title": "The War of the Ring",
        "short_title": "HoME VIII",
        "editor": "Christopher Tolkien",
        "publication_year": 1990,
        "tier": 3,
        "tier_label": "The History of Middle-earth",
        "era_covered": "LOTR drafts (Books III-V)",
        "estimated_words": 140000,
        "filename_hints": ["war_of_the_ring", "home_08", "home_8"]
    },
    {
        "catalogue_id": 19,
        "title": "Sauron Defeated",
        "short_title": "HoME IX",
        "editor": "Christopher Tolkien",
        "publication_year": 1992,
        "tier": 3,
        "tier_label": "The History of Middle-earth",
        "era_covered": "LOTR ending drafts + Notion Club + Númenor fall",
        "estimated_words": 130000,
        "filename_hints": ["sauron_defeated", "home_09", "home_9"]
    },
    {
        "catalogue_id": 20,
        "title": "Morgoth's Ring",
        "short_title": "HoME X",
        "editor": "Christopher Tolkien",
        "publication_year": 1993,
        "tier": 3,
        "tier_label": "The History of Middle-earth",
        "era_covered": "Later Silmarillion drafts + Athrabeth + Laws & Customs",
        "estimated_words": 145000,
        "filename_hints": ["morgoths_ring", "morgoth", "home_10"]
    },
    {
        "catalogue_id": 21,
        "title": "The War of the Jewels",
        "short_title": "HoME XI",
        "editor": "Christopher Tolkien",
        "publication_year": 1994,
        "tier": 3,
        "tier_label": "The History of Middle-earth",
        "era_covered": "Later First Age drafts + Grey Annals",
        "estimated_words": 140000,
        "filename_hints": ["war_of_the_jewels", "home_11"]
    },
    {
        "catalogue_id": 22,
        "title": "The Peoples of Middle-earth",
        "short_title": "HoME XII",
        "editor": "Christopher Tolkien",
        "publication_year": 1996,
        "tier": 3,
        "tier_label": "The History of Middle-earth",
        "era_covered": "LOTR Appendices drafts + The New Shadow",
        "estimated_words": 135000,
        "filename_hints": ["peoples_of_middle_earth", "home_12"]
    },
    # TIER 4: REFERENCE & LETTERS
    {
        "catalogue_id": 23,
        "title": "The Letters of J.R.R. Tolkien",
        "short_title": "Letters",
        "editor": "Humphrey Carpenter",
        "publication_year": 2023,
        "tier": 4,
        "tier_label": "Reference & Letters",
        "era_covered": "Cross-era (authorial commentary)",
        "estimated_words": 200000,
        "filename_hints": ["letters", "tolkien_letters"]
    },
    {
        "catalogue_id": 24,
        "title": "The Nature of Middle-earth",
        "short_title": "Nature of ME",
        "editor": "Carl F. Hostetter",
        "publication_year": 2021,
        "tier": 4,
        "tier_label": "Reference & Letters",
        "era_covered": "Cross-era (philosophical essays)",
        "estimated_words": 90000,
        "filename_hints": ["nature_of_middle_earth", "nature"]
    },
    {
        "catalogue_id": 25,
        "title": "Tales from the Perilous Realm",
        "short_title": "Perilous Realm",
        "editor": None,
        "publication_year": 2008,
        "tier": 4,
        "tier_label": "Reference & Letters",
        "era_covered": "Mixed (Smith of Wootton Major, Farmer Giles, etc.)",
        "estimated_words": 40000,
        "filename_hints": ["perilous_realm", "smith_of_wootton", "farmer_giles"]
    },
]
```

### 15.2 File Matching Algorithm

When the user uploads a file, the app needs to figure out which book it is:

```python
from difflib import SequenceMatcher
import re

def match_file_to_catalogue(filename: str, catalogue: list) -> list[dict]:
    """
    Returns a ranked list of possible matches.
    If top match confidence > 0.7, auto-assign.
    If < 0.7, return top 5 for user to pick.
    """
    clean = re.sub(r'[_\-\.\(\)]', ' ', filename.lower())
    clean = re.sub(r'\.(epub|pdf)$', '', clean).strip()

    matches = []
    for book in catalogue:
        # Check filename hints first (exact substring match = high confidence)
        hint_match = any(hint in clean for hint in book["filename_hints"])
        if hint_match:
            matches.append({"catalogue_id": book["catalogue_id"],
                          "title": book["title"],
                          "confidence": 0.95})
            continue

        # Fuzzy match on title
        ratio = SequenceMatcher(None, clean, book["title"].lower()).ratio()
        if ratio > 0.4:
            matches.append({"catalogue_id": book["catalogue_id"],
                          "title": book["title"],
                          "confidence": ratio})

    matches.sort(key=lambda x: x["confidence"], reverse=True)
    return matches[:5]
```

### 15.3 Ingestion Progress Tracking

Each book's ingestion is tracked with granular progress, broadcast to the frontend via SSE:

```python
# Progress events sent during ingestion
{
    "catalogue_id": 5,
    "title": "The Silmarillion",
    "stage": "chunking",          # parsing | chunking | embedding | indexing | complete | error
    "progress": 0.45,             # 0.0 to 1.0
    "detail": "Chunking chapter 8 of 24: Of the Coming of the Elves",
    "chunks_created": 342,
    "chunks_total_estimate": 760
}
```

### 15.4 First Launch Behaviour

```
1. App starts → checks SQLite for books table
2. If table empty → seed with BOOK_CATALOGUE (all 25 books, status: 'missing')
3. Check books/ directory for any pre-placed files → auto-match and mark as 'uploaded'
4. If no books have status 'ready' → show Library page as default
5. If ≥1 book is 'ready' → show Ask/Chat page as default, Library in sidebar
6. Sidebar always shows: "📚 Library (6/25)" with count of ready books
```

---

## 15. Notes for Claude Code

1. **Ollama is pre-installed.** Don't try to install it. Just verify connection to `http://localhost:11434`.

2. **Use `uv` for Python if available**, fall back to `pip` with venv. The user's Mac has Python 3.12+.

3. **Start with Phase 1.** Get one book ingested and queryable before building the UI.

4. **The `books/` directory** is where uploaded files are stored after the user drops them via the Library UI. The app should also scan this directory on startup for any pre-placed files and auto-match them to the catalogue.

5. **Library onboarding is the entry point.** On first launch with no books ingested, the app should default to the Library page. The chat/ask view should show a friendly message pointing to the Library until at least one book is ready.

6. **ChromaDB PersistentClient** — use file-based persistence at `backend/data/chroma_db/`. No Docker needed for ChromaDB.

7. **EPUB preferred over PDF.** The parser should try EPUB first, fall back to PDF only if no EPUB exists.

8. **Streaming responses** are important for UX — Tolkien answers can be long. Use Server-Sent Events.

9. **SSE EventSource connections must go directly to the backend** (port 8000), not through the Next.js rewrite proxy. The Next.js proxy mangles SSE streams causing socket hang-ups and 500 errors. In `frontend/lib/api.ts`, `queryStream` and `battleStream` use `BACKEND_DIRECT` (`http://localhost:8000/api`) while all regular JSON API calls use `API_BASE` (`/api`) through the proxy.

10. **The character/location seed data** doesn't need to be exhaustive at build time. The NER module will discover entities during ingestion and add them to the database.

11. **All data stays local.** No external API calls, no telemetry, no cloud storage.

12. **Test with The Hobbit first** — it's the shortest and simplest book, perfect for proving the pipeline works before ingesting 3+ million words.

---

*"All we have to decide is what to do with the time that is given us."*
— Gandalf, The Fellowship of the Ring
