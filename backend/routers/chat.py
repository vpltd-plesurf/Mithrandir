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

    history = [m.model_dump() for m in request.history] if request.history else None

    result = await query(
        question=request.question,
        filters=filters,
        top_k=request.top_k,
        history=history,
    )
    return result


@router.get("/query/stream")
async def query_stream_get(q: str = Query(..., description="URL-encoded JSON query body")):
    """Streaming RAG query via GET SSE. Query body is URL-encoded JSON in ?q=."""
    try:
        data = json.loads(q)
        request = QueryRequest(**data)
    except Exception:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid query parameter")

    filters = request.filters.model_dump(exclude_none=True) if request.filters else None
    history = [m.model_dump() for m in request.history] if request.history else None

    async def event_generator():
        async for event in query_stream(
            question=request.question,
            filters=filters,
            top_k=request.top_k,
            history=history,
        ):
            evt = event["event"]
            d = event["data"]
            if isinstance(d, (list, dict)):
                d = json.dumps(d)
            yield {"event": evt, "data": d}

    return EventSourceResponse(event_generator())


@router.post("/query/stream")
async def query_stream_endpoint(request: QueryRequest):
    """Streaming RAG query via Server-Sent Events."""
    filters: dict | None = None
    if request.filters:
        f = request.filters.model_dump(exclude_none=True)
        if f:
            filters = f

    history = [m.model_dump() for m in request.history] if request.history else None

    async def event_generator():
        async for event in query_stream(
            question=request.question,
            filters=filters,
            top_k=request.top_k,
            history=history,
        ):
            evt = event["event"]
            data = event["data"]

            if isinstance(data, (list, dict)):
                data = json.dumps(data)

            yield {"event": evt, "data": data}

    return EventSourceResponse(event_generator())
