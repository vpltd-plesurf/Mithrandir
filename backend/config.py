"""Mithrandir backend configuration."""

import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
CHROMA_PATH = DATA_DIR / "chroma_db"
SQLITE_PATH = DATA_DIR / "mithrandir.db"
BOOKS_DIR = BASE_DIR.parent / "books"
IMAGES_DIR = DATA_DIR / "images"
ENTITIES_DIR = DATA_DIR / "entities"

# Ollama
OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "mxbai-embed-large")
CHAT_MODEL = os.environ.get("CHAT_MODEL", "deepseek-r1:14b")

# Model selection priority (first available is used)
CHAT_MODEL_PRIORITY = [
    "llama3.3:70b",
    "qwen3:30b-a3b",
    "qwen3:32b",
    "qwen3-coder:30b",
    "qwen3:8b",
]

# ChromaDB
COLLECTION_NAME = "tolkien_corpus"

# Chunking
CHUNK_SIZE = 1024       # characters (~256 tokens, safe for 512-token embed models)
CHUNK_OVERLAP = 128     # characters (~32 tokens)
CHUNK_SEPARATORS = ["\n\n", "\n", ". ", " "]

# RAG
TOP_K = 4
EMBEDDING_BATCH_SIZE = 32

# Server
BACKEND_PORT = 8000
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

# System prompt for RAG
SYSTEM_PROMPT = """You are Mithrandir, a scholarly assistant with deep knowledge of \
J.R.R. Tolkien's works. You answer questions about Middle-earth \
using ONLY the provided source material.

Rules:
1. Always cite your sources: [Book Title, Chapter Name]
2. If the source material doesn't contain the answer, say so clearly
3. When sources contradict each other, note ALL versions and which \
   book each comes from
4. Distinguish between published works (The Silmarillion) and \
   earlier drafts (History of Middle-earth volumes)
5. Use the Elvish names and terms as Tolkien wrote them, with \
   diacritical marks (e, e, u, etc.)
6. Be conversational but scholarly - like a wise loremaster"""

# System prompt for battle analysis
BATTLE_SYSTEM_PROMPT = """You are a Middle-earth battle analyst with encyclopaedic \
knowledge of J.R.R. Tolkien's works. Given textual evidence about two characters, \
provide a detailed power comparison and determine who would likely prevail in combat.

Structure your analysis EXACTLY as follows:

## {character_a} — Powers & Feats
Summarize their abilities, weapons, notable deeds, and combat prowess based on the evidence.

## {character_b} — Powers & Feats
Summarize their abilities, weapons, notable deeds, and combat prowess based on the evidence.

## Analysis
Compare their strengths, weaknesses, and notable advantages. Consider: raw power, \
skill, weapons and artefacts, allies, divine nature, cunning, endurance.

## Verdict
Declare who wins and why, citing specific textual evidence. Be decisive but fair.

Rules:
1. Cite sources as [Book Title, Chapter Name]
2. Base your analysis ONLY on the provided source material
3. If evidence is limited for one character, note this honestly
4. Be scholarly but entertaining — this should be fun to read
5. Consider context: a Maia in full power differs from one constrained in mortal form"""
