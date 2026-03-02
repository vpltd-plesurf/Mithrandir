"""RAG query engine — embed, search, generate, cite."""

import re
from typing import AsyncGenerator

from ollama_client import async_client as ollama_client

from config import EMBEDDING_MODEL, CHAT_MODEL, SYSTEM_PROMPT, TOP_K
from models.vectorstore import get_collection
from query.context_builder import build_context
from query.citation_formatter import format_citations


def _strip_think_tags(text: str) -> str:
    """Remove <think>...</think> blocks from qwen3 output."""
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()


async def query(
    question: str,
    filters: dict | None = None,
    top_k: int = TOP_K,
    history: list[dict] | None = None,
) -> dict:
    """Run a RAG query and return the full response with citations.

    Returns dict with 'answer' and 'sources' keys.
    """
    collection = get_collection()

    # Step 1: Embed the question
    embed_response = await ollama_client.embed(model=EMBEDDING_MODEL, input=[question])
    query_embedding = embed_response["embeddings"][0]

    # Step 2: Build ChromaDB filters
    where_filter, where_doc_filter = _build_filters(filters)

    # Step 3: Vector search
    search_kwargs = {
        "query_embeddings": [query_embedding],
        "n_results": top_k,
    }
    if where_filter:
        search_kwargs["where"] = where_filter
    if where_doc_filter:
        search_kwargs["where_document"] = where_doc_filter

    results = collection.query(**search_kwargs)

    # Step 4: Build context
    context, sources = build_context(results)

    if not context:
        return {
            "answer": "I don't have enough information in the ingested texts to answer that question. Try adding more books to the library.",
            "sources": [],
        }

    # Step 5: Generate answer
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *[{"role": m["role"], "content": m["content"]} for m in (history or [])[-6:]],
        {
            "role": "user",
            "content": f"Context from Tolkien's works:\n\n{context}\n\n---\n\nQuestion: {question}",
        },
    ]

    response = await ollama_client.chat(model=CHAT_MODEL, messages=messages)
    answer = _strip_think_tags(response["message"]["content"])

    return {
        "answer": answer,
        "sources": format_citations(sources),
    }


async def query_stream(
    question: str,
    filters: dict | None = None,
    top_k: int = TOP_K,
    history: list[dict] | None = None,
) -> AsyncGenerator[dict, None]:
    """Stream a RAG query response token by token.

    Yields dicts with 'event' and 'data' keys:
    - {"event": "status", "data": "searching"|"reasoning"|"answering"}
    - {"event": "token", "data": "text"}
    - {"event": "sources", "data": [...]}
    - {"event": "done", "data": ""}
    """
    yield {"event": "status", "data": "searching"}

    collection = get_collection()

    # Step 1: Embed the question
    embed_response = await ollama_client.embed(model=EMBEDDING_MODEL, input=[question])
    query_embedding = embed_response["embeddings"][0]

    # Step 2: Build filters
    where_filter, where_doc_filter = _build_filters(filters)

    # Step 3: Vector search
    search_kwargs = {
        "query_embeddings": [query_embedding],
        "n_results": top_k,
    }
    if where_filter:
        search_kwargs["where"] = where_filter
    if where_doc_filter:
        search_kwargs["where_document"] = where_doc_filter

    results = collection.query(**search_kwargs)

    # Step 4: Build context
    context, sources = build_context(results)

    if not context:
        yield {
            "event": "token",
            "data": "I don't have enough information in the ingested texts to answer that question.",
        }
        yield {"event": "sources", "data": []}
        yield {"event": "done", "data": ""}
        return

    yield {"event": "status", "data": "reasoning"}

    # Step 5: Stream from LLM
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *[{"role": m["role"], "content": m["content"]} for m in (history or [])[-6:]],
        {
            "role": "user",
            "content": f"Context from Tolkien's works:\n\n{context}\n\n---\n\nQuestion: {question}",
        },
    ]

    stream = await ollama_client.chat(model=CHAT_MODEL, messages=messages, stream=True)

    full_response = ""
    in_think_block = False
    answered = False

    async for chunk in stream:
        token = chunk["message"]["content"]
        full_response += token

        # Handle <think> blocks — buffer and skip them
        if "<think>" in full_response and not in_think_block:
            in_think_block = True
        if in_think_block:
            if "</think>" in full_response:
                # Remove the think block and continue
                full_response = _strip_think_tags(full_response)
                in_think_block = False
                # Yield what remains after stripping
                if full_response:
                    yield {"event": "token", "data": full_response}
                    answered = True
                    full_response = ""
            continue

        # Normal token — yield it
        if token:
            if not answered:
                yield {"event": "status", "data": "answering"}
                answered = True
            yield {"event": "token", "data": token}

    # Send sources
    yield {"event": "sources", "data": format_citations(sources)}
    yield {"event": "done", "data": ""}


def _build_filters(filters: dict | None) -> tuple[dict | None, dict | None]:
    """Build ChromaDB where (metadata) and where_document (text) filters.

    Returns (where_filter, where_document_filter).
    - Books go in where (metadata field match).
    - Characters/locations go in where_document (text substring match)
      because the metadata stores them as JSON strings, not native arrays.
    """
    if not filters:
        return None, None

    # Metadata conditions (books)
    where_conditions = []
    books = filters.get("books")
    if books:
        if len(books) == 1:
            where_conditions.append({"book": books[0]})
        else:
            where_conditions.append({"book": {"$in": books}})

    where_filter = None
    if where_conditions:
        where_filter = where_conditions[0] if len(where_conditions) == 1 else {"$and": where_conditions}

    # Document text conditions (characters + locations)
    doc_conditions = []
    characters = filters.get("characters")
    if characters:
        for name in characters:
            doc_conditions.append({"$contains": name})

    locations = filters.get("locations")
    if locations:
        for name in locations:
            doc_conditions.append({"$contains": name})

    where_doc_filter = None
    if doc_conditions:
        if len(doc_conditions) == 1:
            where_doc_filter = doc_conditions[0]
        else:
            # Match chunks containing ANY of the specified names
            where_doc_filter = {"$or": doc_conditions}

    return where_filter, where_doc_filter
