"""Shared Ollama client configured from OLLAMA_BASE_URL env var."""

import ollama
from config import OLLAMA_BASE_URL

client = ollama.Client(host=OLLAMA_BASE_URL)
