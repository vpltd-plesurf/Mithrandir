"""Build LLM context from ChromaDB query results."""

import json


def build_context(
    results: dict,
) -> tuple[str, list[dict]]:
    """Build a numbered context string from ChromaDB query results.

    Args:
        results: ChromaDB query() return value.

    Returns:
        Tuple of (context_string, list_of_source_dicts).
    """
    if not results or not results.get("documents") or not results["documents"][0]:
        return "", []

    documents = results["documents"][0]
    metadatas = results["metadatas"][0]
    distances = results["distances"][0] if results.get("distances") else [0.0] * len(documents)

    # Build source list and deduplicate
    sources = []
    seen_ids = set()

    for i, (doc, meta, dist) in enumerate(zip(documents, metadatas, distances)):
        # ChromaDB cosine distance: 0 = identical, 2 = opposite
        # Convert to similarity score (0-1)
        relevance = max(0.0, 1.0 - dist / 2.0)

        # Deduplicate by checking for high text overlap
        doc_key = doc[:200]
        if doc_key in seen_ids:
            continue
        seen_ids.add(doc_key)

        sources.append({
            "index": len(sources) + 1,
            "book": meta.get("book", "Unknown"),
            "chapter": meta.get("chapter", "Unknown"),
            "chapter_number": meta.get("chapter_number", 0),
            "chunk_index": meta.get("chunk_index", 0),
            "text": doc,
            "excerpt": doc[:200] + "..." if len(doc) > 200 else doc,
            "relevance_score": round(relevance, 3),
            "characters": json.loads(meta.get("characters", "[]")),
            "locations": json.loads(meta.get("locations", "[]")),
        })

    # Sort by book, chapter, chunk for narrative coherence
    sources.sort(key=lambda s: (s["book"], s["chapter_number"], s["chunk_index"]))

    # Re-number after sorting
    for i, s in enumerate(sources):
        s["index"] = i + 1

    # Build context string
    context_parts = []
    for s in sources:
        context_parts.append(
            f"[Source {s['index']}: {s['book']}, {s['chapter']}]\n{s['text']}"
        )

    context = "\n\n---\n\n".join(context_parts)
    return context, sources
