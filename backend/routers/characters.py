"""Character endpoints: list, detail, mentions, genealogy."""

from fastapi import APIRouter, HTTPException, Query

from models.database import get_characters, get_character, get_character_races, get_character_graph
from models.vectorstore import get_collection

router = APIRouter(prefix="/api/characters", tags=["characters"])


@router.get("")
async def list_characters(
    search: str | None = None,
    race: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """Return paginated character list with optional search and race filter."""
    return await get_characters(search=search, race=race, page=page, per_page=per_page)


@router.get("/races")
async def list_races():
    """Return distinct character races for filter dropdowns."""
    races = await get_character_races()
    return {"races": races}


@router.get("/graph")
async def character_graph():
    """Return all characters and relationships as a graph (nodes + edges)."""
    return await get_character_graph()


@router.get("/{character_id}")
async def get_character_detail(character_id: int):
    """Return full character profile with aliases and family."""
    char = await get_character(character_id)
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    return char


@router.get("/{character_id}/mentions")
async def get_character_mentions(
    character_id: int,
    limit: int = Query(20, ge=1, le=100),
):
    """Return text chunks mentioning this character from the corpus."""
    char = await get_character(character_id)
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    name = char["canonical_name"]
    collection = get_collection()

    # Search by embedding the character name for semantic relevance
    try:
        from ollama_client import client as ollama
        from config import EMBEDDING_MODEL
        response = ollama.embed(model=EMBEDDING_MODEL, input=name)
        embedding = response["embeddings"][0]

        results = collection.query(
            query_embeddings=[embedding],
            n_results=limit,
            include=["documents", "metadatas", "distances"],
        )
    except Exception:
        return {"character": name, "mentions": []}

    mentions = []
    if results["documents"] and results["documents"][0]:
        for i, doc in enumerate(results["documents"][0]):
            meta = results["metadatas"][0][i] if results["metadatas"] else {}
            distance = results["distances"][0][i] if results["distances"] else 1.0
            mentions.append({
                "book": meta.get("book", "Unknown"),
                "chapter": meta.get("chapter"),
                "excerpt": doc[:300] if doc else "",
                "relevance_score": round(max(0, 1 - distance), 3),
            })

    return {"character": name, "mentions": mentions}


@router.get("/{character_id}/genealogy")
async def get_character_genealogy(character_id: int):
    """Return family tree data for this character."""
    char = await get_character(character_id)
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    nodes = []
    if char.get("father"):
        nodes.append({**char["father"], "relationship": "father"})
    if char.get("mother"):
        nodes.append({**char["mother"], "relationship": "mother"})
    for child in char.get("children", []):
        nodes.append({**child, "relationship": "child"})

    return {
        "character": {"id": char["id"], "canonical_name": char["canonical_name"]},
        "family": nodes,
    }
