"""ChromaDB vector store singleton."""

from __future__ import annotations

from typing import Any

import chromadb
from config import CHROMA_PATH, COLLECTION_NAME

_client: Any = None
collection: Any = None


def init_vectorstore():
    """Initialize ChromaDB persistent client and collection."""
    global _client, collection

    CHROMA_PATH.mkdir(parents=True, exist_ok=True)

    _client = chromadb.PersistentClient(path=str(CHROMA_PATH))
    collection = _client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={
            "hnsw:space": "cosine",
            "hnsw:construction_ef": 200,
            "hnsw:search_ef": 100,
        },
    )


def get_collection() -> chromadb.Collection:
    """Return the tolkien_corpus collection."""
    if collection is None:
        raise RuntimeError("Vector store not initialized. Call init_vectorstore() first.")
    return collection


def delete_book_chunks(book_title: str) -> int:
    """Delete all chunks for a given book. Returns count deleted."""
    coll = get_collection()
    # Get IDs of chunks belonging to this book
    results = coll.get(where={"book": book_title})
    if results["ids"]:
        coll.delete(ids=results["ids"])
        return len(results["ids"])
    return 0
