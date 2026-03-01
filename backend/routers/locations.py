"""Location endpoints: list, detail, mentions."""

from fastapi import APIRouter, HTTPException, Query

from models.database import get_locations, get_location, get_location_regions
from models.vectorstore import get_collection

router = APIRouter(prefix="/api/locations", tags=["locations"])


@router.get("")
async def list_locations(
    region: str | None = None,
    type: str | None = None,
):
    """Return all locations, optionally filtered by region or type."""
    locations = await get_locations(region=region, loc_type=type)
    return {"locations": locations, "total": len(locations)}


@router.get("/regions")
async def list_regions():
    """Return distinct location regions."""
    regions = await get_location_regions()
    return {"regions": regions}


@router.get("/{location_id}")
async def get_location_detail(location_id: int):
    """Return a single location."""
    loc = await get_location(location_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return loc


@router.get("/{location_id}/mentions")
async def get_location_mentions(
    location_id: int,
    limit: int = Query(20, ge=1, le=100),
):
    """Return text chunks mentioning this location from the corpus."""
    loc = await get_location(location_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    name = loc["name"]
    collection = get_collection()

    try:
        import ollama
        from config import EMBEDDING_MODEL
        response = ollama.embed(model=EMBEDDING_MODEL, input=name)
        embedding = response["embeddings"][0]

        results = collection.query(
            query_embeddings=[embedding],
            n_results=limit,
            include=["documents", "metadatas", "distances"],
        )
    except Exception:
        return {"location": name, "mentions": []}

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

    return {"location": name, "mentions": mentions}
