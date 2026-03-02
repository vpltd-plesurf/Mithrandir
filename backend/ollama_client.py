"""Shared Ollama clients configured from OLLAMA_BASE_URL env var."""

import ollama
from config import OLLAMA_BASE_URL

# Sync client — for one-shot calls (embed, list) outside hot streaming paths
client = ollama.Client(host=OLLAMA_BASE_URL)

# Async client — use in async route handlers so the event loop isn't blocked
async_client = ollama.AsyncClient(host=OLLAMA_BASE_URL)
