"""Battle endpoint: compare two characters' powers using RAG evidence."""

import asyncio
import json
import re

from fastapi import APIRouter, Query
from sse_starlette.sse import EventSourceResponse

from ollama_client import async_client as ollama_client
from config import EMBEDDING_MODEL, CHAT_MODEL, BATTLE_SYSTEM_PROMPT
from models.vectorstore import get_collection
from query.context_builder import build_context
from query.citation_formatter import format_citations

router = APIRouter(prefix="/api/battle", tags=["battle"])

# Known aliases for major characters — expands embedding search coverage
_ALIASES: dict[str, list[str]] = {
    "gandalf": ["mithrandir", "grey pilgrim", "grey wanderer", "olórin", "olorin", "white rider", "stormcrow", "tharkûn"],
    "sauron": ["dark lord", "necromancer", "annatar", "gorthaur", "lord of gifts"],
    "aragorn": ["strider", "elessar", "thorongil", "elfstone", "dúnadan", "wingfoot"],
    "frodo": ["ring-bearer", "ringbearer", "mr. baggins"],
    "saruman": ["curunír", "curunir", "white wizard", "white hand"],
    "galadriel": ["lady of lórien", "lady of the galadhrim"],
    "morgoth": ["melkor", "dark enemy", "black foe", "bauglir"],
    "elrond": ["half-elven", "lord of rivendell"],
    "legolas": ["prince of mirkwood"],
    "boromir": ["captain of gondor", "captain of the white tower"],
    "éowyn": ["eowyn", "white lady", "dernhelm"],
    "eowyn": ["éowyn", "white lady", "dernhelm"],
    "bilbo": ["old burglar", "barrel-rider"],
    "sam": ["samwise", "samwise gamgee"],
    "samwise": ["sam gamgee", "sam"],
    "tom bombadil": ["bombadil", "oldest", "master"],
    "bombadil": ["tom bombadil", "oldest", "master"],
    "balrog": ["durin's bane", "flame of udûn", "flame of udun", "valaraukar"],
    "túrin": ["turin", "turambar", "mormegil", "black sword", "neithan"],
    "turin": ["túrin", "turambar", "mormegil", "black sword"],
    "lúthien": ["luthien", "tinúviel", "tinuviel"],
    "luthien": ["lúthien", "tinúviel", "tinuviel"],
    "fëanor": ["feanor", "curufinwë"],
    "feanor": ["fëanor", "curufinwë"],
    "fingolfin": ["nolofinwë"],
    "ungoliant": ["gloomweaver"],
}


def _get_search_terms(name: str) -> str:
    """Return name plus known aliases as a single search string."""
    aliases = _ALIASES.get(name.lower().strip(), [])
    return " ".join([name] + aliases)


def _strip_think_tags(text: str) -> str:
    """Remove <think>...</think> blocks from qwen3 output."""
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


async def _embed(text: str) -> list[float]:
    resp = await ollama_client.embed(model=EMBEDDING_MODEL, input=[text])
    return resp["embeddings"][0]


async def _search_character_evidence(collection, name: str, n_results: int = 8):
    """Search ChromaDB for passages about a character using multiple queries.

    Runs two complementary queries (powers-focused + combat-focused), merges
    and deduplicates results, and returns the top n_results by relevance.
    No strict name filter — embedding similarity does the heavy lifting.
    """
    terms = _get_search_terms(name)

    queries = [
        f"{terms} powers abilities divine nature feats strength endurance weapons artefacts",
        f"{terms} battle combat fight victory defeat enemy slew killed defeated",
    ]

    seen_keys: set[str] = set()
    merged: list[tuple[str, dict, float]] = []  # (doc, meta, distance)

    for query_text in queries:
        embedding = await _embed(query_text)
        results = collection.query(query_embeddings=[embedding], n_results=n_results)

        if not results or not results.get("documents") or not results["documents"][0]:
            continue

        docs = results["documents"][0]
        metas = results["metadatas"][0]
        dists = results["distances"][0] if results.get("distances") else [1.0] * len(docs)

        for doc, meta, dist in zip(docs, metas, dists):
            key = doc[:200]
            if key not in seen_keys:
                seen_keys.add(key)
                merged.append((doc, meta, dist))

    # Sort by distance (most relevant first), keep top n_results
    merged.sort(key=lambda x: x[2])
    merged = merged[:n_results]

    # Reformat into ChromaDB-like structure for build_context
    return {
        "documents": [[d for d, _, _ in merged]],
        "metadatas": [[m for _, m, _ in merged]],
        "distances": [[dist for _, _, dist in merged]],
    }


@router.get("/stream")
async def battle_stream(
    character_a: str = Query(..., description="First character name"),
    character_b: str = Query(..., description="Second character name"),
):
    """Stream a battle analysis comparing two characters via SSE."""

    async def event_generator():
        collection = get_collection()

        # Search both characters in parallel
        results_a, results_b = await asyncio.gather(
            _search_character_evidence(collection, character_a),
            _search_character_evidence(collection, character_b),
        )

        context_a, sources_a = build_context(results_a)
        context_b, sources_b = build_context(results_b)

        if not context_a and not context_b:
            yield {
                "event": "token",
                "data": "I don't have enough textual evidence about either character to conduct a battle analysis.",
            }
            yield {"event": "sources", "data": json.dumps([])}
            yield {"event": "done", "data": ""}
            return

        context_parts = []
        if context_a:
            context_parts.append(f"=== Evidence about {character_a} ===\n\n{context_a}")
        else:
            context_parts.append(f"=== Evidence about {character_a} ===\n\n(Limited textual evidence available)")
        if context_b:
            context_parts.append(f"=== Evidence about {character_b} ===\n\n{context_b}")
        else:
            context_parts.append(f"=== Evidence about {character_b} ===\n\n(Limited textual evidence available)")

        combined_context = "\n\n".join(context_parts)

        system_prompt = BATTLE_SYSTEM_PROMPT.format(
            character_a=character_a,
            character_b=character_b,
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": f"Source material from Tolkien's works:\n\n{combined_context}\n\n---\n\nCompare these two combatants: **{character_a}** vs **{character_b}**. Who would win in battle?",
            },
        ]

        stream = await ollama_client.chat(model=CHAT_MODEL, messages=messages, stream=True)

        full_response = ""
        in_think_block = False

        async for chunk in stream:
            token = chunk["message"]["content"]
            full_response += token

            if "<think>" in full_response and not in_think_block:
                in_think_block = True
            if in_think_block:
                if "</think>" in full_response:
                    full_response = _strip_think_tags(full_response)
                    in_think_block = False
                    if full_response:
                        yield {"event": "token", "data": full_response}
                        full_response = ""
                continue

            if token:
                yield {"event": "token", "data": token}

        all_sources = format_citations(sources_a) + format_citations(sources_b)
        for i, src in enumerate(all_sources):
            src["index"] = i + 1

        yield {"event": "sources", "data": json.dumps(all_sources)}
        yield {"event": "done", "data": ""}

    return EventSourceResponse(event_generator())
