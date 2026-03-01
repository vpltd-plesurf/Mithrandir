"""Chat/query endpoints with streaming support."""

import json

from fastapi import APIRouter, Query
from sse_starlette.sse import EventSourceResponse

from models.schemas import QueryRequest
from query.query_engine import query, query_stream

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/query")
async def query_endpoint(request: QueryRequest):
    """Non-streaming RAG query. Returns full answer with citations."""
    filters = None
    if request.filters:
        filters = request.filters.model_dump(exclude_none=True)

    result = await query(
        question=request.question,
        filters=filters,
        top_k=request.top_k,
    )
    return result


@router.get("/query/stream")
async def query_stream_endpoint(
    question: str = Query(..., description="The question to ask"),
    books: str | None = Query(None, description="Comma-separated book titles to filter"),
    characters: str | None = Query(None, description="Comma-separated character names to filter"),
    locations: str | None = Query(None, description="Comma-separated location names to filter"),
    top_k: int = Query(8, description="Number of results to retrieve"),
):
    """Streaming RAG query via Server-Sent Events."""
    filters: dict | None = None
    if books or characters or locations:
        filters = {}
        if books:
            filters["books"] = [b.strip() for b in books.split(",")]
        if characters:
            filters["characters"] = [c.strip() for c in characters.split(",")]
        if locations:
            filters["locations"] = [loc.strip() for loc in locations.split(",")]

    async def event_generator():
        async for event in query_stream(
            question=question,
            filters=filters,
            top_k=top_k,
        ):
            evt = event["event"]
            data = event["data"]

            if isinstance(data, (list, dict)):
                data = json.dumps(data)

            yield {"event": evt, "data": data}

    return EventSourceResponse(event_generator())
