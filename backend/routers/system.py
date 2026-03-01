"""System endpoints: health check, model listing."""

from fastapi import APIRouter
from ollama_client import client as ollama_client

from config import OLLAMA_BASE_URL, EMBEDDING_MODEL, CHAT_MODEL

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/health")
async def health_check():
    """Check backend, Ollama, and database status."""
    from models.database import get_library_stats

    ollama_status = "disconnected"
    models = []
    try:
        model_list = ollama_client.list()
        models = [m.model for m in model_list.models]
        ollama_status = "connected"
    except Exception:
        pass

    stats = await get_library_stats()

    return {
        "status": "ok",
        "ollama": ollama_status,
        "models": models,
        "embedding_model": EMBEDDING_MODEL,
        "chat_model": CHAT_MODEL,
        "books_ready": stats["books_ready"],
        "books_total": stats["books_total"],
    }


@router.get("/models")
async def list_models():
    """List available Ollama models."""
    try:
        model_list = ollama_client.list()
        models = []
        for m in model_list.models:
            models.append({
                "name": m.model,
                "size": m.size,
            })
        return {"models": models}
    except Exception as e:
        return {"models": [], "error": str(e)}
