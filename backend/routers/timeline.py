"""Timeline endpoints: events across all Ages."""

from fastapi import APIRouter, Query

from models.database import get_events, get_event_ages

router = APIRouter(prefix="/api/timeline", tags=["timeline"])


@router.get("")
async def list_events(age: str | None = None):
    """Return all events, optionally filtered by age."""
    events = await get_events(age=age)
    return {"events": events, "total": len(events)}


@router.get("/ages")
async def list_ages():
    """Return distinct ages in chronological order."""
    ages = await get_event_ages()
    return {"ages": ages}
