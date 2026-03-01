"""Battle endpoint: compare two characters' powers using RAG evidence."""

import json
import re

from fastapi import APIRouter, Query
from sse_starlette.sse import EventSourceResponse

import ollama as ollama_client
from config import EMBEDDING_MODEL, CHAT_MODEL, BATTLE_SYSTEM_PROMPT
from models.vectorstore import get_collection
from query.context_builder import build_context
from query.citation_formatter import format_citations

router = APIRouter(prefix="/api/battle", tags=["battle"])


def _strip_think_tags(text: str) -> str:
    """Remove <think>...</think> blocks from qwen3 output."""
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


def _search_character_evidence(collection, name: str, n_results: int = 6):
    """Search ChromaDB for passages about a character's powers and feats."""
    query_text = f"{name} powers abilities feats strength combat"
    embed_response = ollama_client.embed(model=EMBEDDING_MODEL, input=[query_text])
    query_embedding = embed_response["embeddings"][0]

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        where_document={"$contains": name},
    )
    return results


@router.get("/stream")
async def battle_stream(
    character_a: str = Query(..., description="First character name"),
    character_b: str = Query(..., description="Second character name"),
):
    """Stream a battle analysis comparing two characters via SSE."""

    async def event_generator():
        collection = get_collection()

        # Search for evidence about each character
        results_a = _search_character_evidence(collection, character_a)
        results_b = _search_character_evidence(collection, character_b)

        # Build context sections
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

        # Combined context with labeled sections
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

        # Build prompt with character names inserted into system prompt
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

        # Stream from LLM
        stream = ollama_client.chat(model=CHAT_MODEL, messages=messages, stream=True)

        full_response = ""
        in_think_block = False

        for chunk in stream:
            token = chunk["message"]["content"]
            full_response += token

            # Handle <think> blocks
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

        # Combine and deduplicate sources
        all_sources = format_citations(sources_a) + format_citations(sources_b)
        # Re-index
        for i, src in enumerate(all_sources):
            src["index"] = i + 1

        yield {"event": "sources", "data": json.dumps(all_sources)}
        yield {"event": "done", "data": ""}

    return EventSourceResponse(event_generator())
