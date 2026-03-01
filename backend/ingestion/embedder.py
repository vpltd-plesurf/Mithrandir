"""Embedding pipeline using Ollama mxbai-embed-large."""

from typing import Callable

import ollama as ollama_client

from config import EMBEDDING_MODEL, EMBEDDING_BATCH_SIZE

# mxbai-embed-large has a 512-token context window.
# Truncate to ~1800 chars as a safety net (well under 512 tokens).
MAX_EMBED_CHARS = 1800


def _truncate(text: str) -> str:
    """Truncate text to fit within the embedding model's context window."""
    if len(text) <= MAX_EMBED_CHARS:
        return text
    # Truncate at last space before limit to avoid splitting words
    truncated = text[:MAX_EMBED_CHARS]
    last_space = truncated.rfind(" ")
    if last_space > MAX_EMBED_CHARS // 2:
        return truncated[:last_space]
    return truncated


def embed_texts(
    texts: list[str],
    progress_callback: Callable[[int, int], None] | None = None,
) -> list[list[float]]:
    """Embed a list of texts in batches using Ollama.

    Args:
        texts: List of text strings to embed.
        progress_callback: Optional callback(processed, total) for progress.

    Returns:
        List of embedding vectors.
    """
    all_embeddings = []
    total = len(texts)

    for i in range(0, total, EMBEDDING_BATCH_SIZE):
        batch = [_truncate(t) for t in texts[i : i + EMBEDDING_BATCH_SIZE]]
        response = ollama_client.embed(model=EMBEDDING_MODEL, input=batch)
        all_embeddings.extend(response["embeddings"])

        if progress_callback:
            progress_callback(min(i + EMBEDDING_BATCH_SIZE, total), total)

    return all_embeddings
