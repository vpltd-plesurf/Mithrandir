# Phase 4: Polish/UX + Power Battle Feature

## Context

Phases 1-3 are complete: Library, Ask/Chat (streaming RAG), Characters (grid + graph), Timeline, Map, Cross-Reference Search. The user wants two things: (1) UI polish pass across the app, and (2) a fun "Power Battle" feature where two characters can be compared/pitted against each other using RAG evidence from the corpus.

---

## Sub-Phase 4A: UI Polish

Audit found several improvements across all pages. Nothing is broken, but there are consistency and UX gaps.

### Sidebar
- **`frontend/components/Sidebar.tsx`** — Add Battle nav item (Swords icon from lucide-react). Sidebar is otherwise fine.

### Error boundaries
- **`frontend/app/layout.tsx`** — Wrap `{children}` in an error boundary component so crashes show a recoverable error UI instead of a white screen.
- **New `frontend/components/ErrorBoundary.tsx`** — Class component that catches render errors, shows "Something went wrong" with a retry button.

### Loading states consistency
Several pages use plain text "Loading..." — replace with a subtle animated spinner consistent with the theme:
- **New `frontend/components/Spinner.tsx`** — Small pulsing ring spinner in accent color with optional label text. Reusable.
- Apply in: `CharacterGraph.tsx`, `characters/page.tsx`, `characters/[id]/page.tsx`, `timeline/page.tsx`, `map/page.tsx`, `ask/page.tsx`, `library/page.tsx`

### Transitions / Animation
- **Character detail page** (`characters/[id]/page.tsx`) — Add `animate-fadeIn` class to sections so content fades in when loaded.
- **Timeline** (`timeline/page.tsx`) — Add smooth expand/collapse transition on event detail (currently pops in/out instantly).
- **`frontend/app/globals.css`** — Add `@keyframes fadeIn` and `.animate-fadeIn` utility.

### Empty states
- **Characters grid** (when search returns no results) — Currently shows plain "No characters found." Add a subtle icon (Search icon + text).
- **Timeline** (no events) — Add a Clock icon with the empty message.

### Focus/keyboard
- **ChatInput** (`frontend/components/ChatInput.tsx`) — Add visible `focus:ring` on the input container when focused, matching accent color.
- **Sidebar nav links** — Add `focus-visible:ring-2 focus-visible:ring-accent` for keyboard navigation.

### Minor visual
- **Chat messages** — The assistant "Thinking..." pulse dot could use a slightly larger size and smoother animation.
- **Source citations** — Expand/collapse chevron rotation transition.

---

## Sub-Phase 4B: Power Battle Feature

### Concept
Users pick two characters from the database, and the system uses RAG to find corpus evidence about each character's powers, feats, and abilities, then streams a structured battle analysis comparing them. The LLM judges who would win based on textual evidence.

### Backend

**New `backend/routers/battle.py`:**

```
POST /api/battle/stream
  Body: { "character_a": "Gandalf", "character_b": "Sauron" }
  Returns: SSE stream
```

The endpoint:
1. Takes two character names
2. Searches ChromaDB for passages about each character's powers/feats/abilities (2 separate searches, ~6 chunks each)
3. Builds a combined context with labeled sections: "Evidence about [Character A]:" and "Evidence about [Character B]:"
4. Streams an LLM response using a battle-specific system prompt
5. After the LLM stream, sends sources for both characters
6. Sends a final "done" event

**Battle system prompt** (add to `backend/config.py`):
```
You are a Middle-earth battle analyst. Given textual evidence about two characters,
provide a detailed power comparison and determine who would likely prevail in combat.

Structure your analysis as:
1. **[Character A] — Powers & Feats**: Summarize their abilities based on the evidence
2. **[Character B] — Powers & Feats**: Summarize their abilities based on the evidence
3. **Analysis**: Compare their strengths, weaknesses, and notable advantages
4. **Verdict**: Who wins and why, citing specific evidence

Be scholarly but entertaining. Cite sources as [Book Title, Chapter].
If evidence is limited for one character, note this honestly.
```

**`backend/main.py`** — Register battle router.

**`backend/models/schemas.py`** — Add `BattleRequest` model: `character_a: str, character_b: str`.

### Frontend

**New `frontend/app/battle/page.tsx`:**
- Header: "Power Battle" with crossed swords icon
- Two character selector panels side by side:
  - Each has an autocomplete input (reuse pattern from Ask page character filter)
  - Selected character shows name, race, avatar circle
- "BATTLE!" button in center (disabled until both selected, accent colored)
- Below: streaming result area (same streaming pattern as Ask page)
  - Uses ChatMessage-style rendering for the markdown response
  - Sources shown at bottom after stream completes
- "New Battle" button to reset

**`frontend/lib/api.ts`** — Add:
```typescript
export function battleStream(characterA: string, characterB: string): EventSource
```
Pattern: POST body as query params on GET endpoint (same as queryStream), or use fetch + ReadableStream for POST. Since we already use EventSource (GET-only) pattern, use GET with query params for consistency.

Actually — switch to `GET /api/battle/stream?character_a=X&character_b=Y` to match the existing SSE pattern with EventSource.

**`frontend/lib/types.ts`** — No new types needed beyond what exists (reuse Source, CharacterSummary).

**`frontend/components/Sidebar.tsx`** — Add "Battle" nav item with `Swords` icon from lucide-react.

---

## Implementation Order

```
4A (Polish)  — do first, small targeted changes across files
4B (Battle)  — do second, new feature with clear scope
```

## Files Modified (4A)
- `frontend/app/globals.css` — fadeIn animation
- `frontend/app/layout.tsx` — error boundary wrapper
- `frontend/components/Sidebar.tsx` — Battle nav, focus styles
- `frontend/components/ChatInput.tsx` — focus ring
- `frontend/components/ChatMessage.tsx` — thinking animation tweak
- `frontend/components/SourceCitation.tsx` — chevron transition
- New: `frontend/components/Spinner.tsx`
- New: `frontend/components/ErrorBoundary.tsx`
- Multiple pages: swap "Loading..." text for Spinner component

## Files Created/Modified (4B)
- New: `backend/routers/battle.py`
- `backend/config.py` — BATTLE_SYSTEM_PROMPT
- `backend/main.py` — register battle router
- `backend/models/schemas.py` — BattleRequest
- New: `frontend/app/battle/page.tsx`
- `frontend/lib/api.ts` — battleStream()
- `frontend/components/Sidebar.tsx` — Battle nav item (done in 4A)

## Verification

**4A:**
- All pages load with spinner instead of plain text
- Error boundary: temporarily throw in a component, verify recovery UI
- Tab through sidebar with keyboard — focus rings visible
- Timeline expand/collapse has smooth transition
- Chat input shows accent ring on focus

**4B:**
- Navigate to /battle
- Search and select two characters (e.g. "Gandalf" vs "Balrog")
- Click Battle, verify streaming response appears with structured analysis
- Sources appear after stream completes
- "New Battle" resets the page
- Try edge cases: same character vs itself, obscure characters with little evidence
