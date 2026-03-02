"""Chat/query endpoints with streaming support."""

import json
import uuid

from fastapi import APIRouter, Query, HTTPException
from sse_starlette.sse import EventSourceResponse

from models.schemas import QueryRequest
from query.query_engine import query, query_stream

router = APIRouter(prefix="/api", tags=["chat"])

# One-time-use token store: token → query params
# Tokens are popped on first use, so each token works exactly once.
_pending_queries: dict[str, dict] = {}


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


@router.post("/query/prepare")
async def prepare_query(request: QueryRequest):
    """Store query params and return a one-time token for the SSE stream."""
    token = str(uuid.uuid4())
    _pending_queries[token] = {
        "question": request.question,
        "filters": request.filters.model_dump(exclude_none=True) if request.filters else None,
        "top_k": request.top_k,
        "history": [m.model_dump() for m in request.history] if request.history else None,
    }
    return {"token": token}


@router.get("/query/stream")
async def query_stream_get(token: str = Query(..., description="One-time token from /query/prepare")):
    """Streaming RAG query via SSE. Consumes the token from /query/prepare."""
    data = _pending_queries.pop(token, None)
    if not data:
        raise HTTPException(status_code=404, detail="Token not found or already used")

    filters = data["filters"]
    history = data["history"]

    async def event_generator():
        async for event in query_stream(
            question=data["question"],
            filters=filters,
            top_k=data["top_k"],
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
