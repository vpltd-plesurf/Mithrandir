# Mithrandir - TODO

## Status

### Phase 1 — Complete
- [x] 25/25 books uploaded and ingested (4,090,731 words, 27,868 chunks)
- [x] EPUB/PDF parsing, chunking (1024 chars), dictionary NER (55 chars, 60 locations)
- [x] Embedding via mxbai-embed-large, stored in ChromaDB (cosine similarity)
- [x] SQLite metadata with full Tolkien catalogue (27 books)
- [x] Library UI: drag-drop upload, tier grouping, progress bars, book preview modal
- [x] Smart book matching: filename hints, Roman numeral conversion, EPUB metadata fallback
- [x] Startup scanner auto-ingests pre-placed files in `books/` directory
- [x] RAG query engine with streaming SSE, think-tag stripping for qwen3
- [x] Chat UI with streaming tokens and collapsible source citations
- [x] Launch script (`start.sh`)

### Speed fix — Complete
- [x] Switched from `qwen3:30b-a3b` to `qwen3:8b` (3-4x faster, fully local)
- [x] Reduced `TOP_K` from 8 to 4 (halves prompt size)
- [x] Added "Thinking..." indicator before first token arrives
- Result: ~15 seconds per answer (was 2-5 minutes)

### Phase 2 — Complete
- [x] **Font/readability**: base font 18px, bumped text sizes across entire app
- [x] **Catalogue updates**: removed Tales from the Perilous Realm, added The History of The Hobbit, Bilbo's Last Song, The Road Goes Ever On (27 total)
- [x] **Catalogue sync**: `_sync_book_catalogue()` runs on startup to add/remove books
- [x] **Book matching fix**: rewrote EPUB metadata matcher to use exact title comparison
- [x] **Characters backend**: paginated list, search, race filter, mentions from corpus, genealogy
- [x] **Characters frontend**: searchable grid, race filter, detail page with aliases/family/mentions
- [x] **Timeline backend**: 33 events across all Ages, age filter, chronological ordering
- [x] **Timeline frontend**: vertical timeline grouped by age, age filter tabs, expandable details
- [x] **Locations backend**: regions, types, expandable mentions from corpus
- [x] **Locations frontend**: region-grouped list, collapsible regions, location detail with mentions
- [x] **Query filters**: collapsible filter panel on Ask page with book multi-select

### Known issues fixed
- `onnxruntime` no macOS x86_64 wheels — excluded via uv override in pyproject.toml
- Chunk size 2048 -> 1024 chars (mxbai-embed-large 512-token context limit)
- Uploads go direct to backend:8000 (Next.js proxy body size limit)
- File matching: Roman numerals (I->1), normalized hints, EPUB metadata reading
- Chat model: `qwen3:32b` renamed to `qwen3:30b-a3b` in Ollama
- Token SSE parsing: plain string not JSON
- Zero-byte file guard in upload handler and startup scanner
- "The History of The Hobbit" matching as "The Hobbit" — fixed EPUB metadata matcher

### Environment
- Python 3.13 (x86_64 macOS), uv, FastAPI
- Node 25, Next.js 15.5.12 (Turbopack), Tailwind v4
- Ollama: qwen3:8b (chat), mxbai-embed-large (embed)
- Frontend port: 3001 (3000 in use by another service)
- Backend port: 8000

### Launch
```bash
./start.sh
# Or manually:
cd /Users/paullesurf/Mithrandir/backend && uv run uvicorn main:app --host 0.0.0.0 --port 8000 &
cd /Users/paullesurf/Mithrandir/frontend && npx next dev --turbopack -p 3001 &
# Open http://localhost:3001
```

### Phase 3 (future ideas)
- Contradictions tracker
- Visual Middle-earth map with positioned pins
- Relationship graph visualization for characters
- Reading order recommendations
- Cross-reference search (find passages that mention multiple entities)
