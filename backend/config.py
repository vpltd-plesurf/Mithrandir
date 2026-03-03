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

Tolkien Power Hierarchy (background knowledge — do not cite as a source, but use to \
avoid absurd verdicts when RAG evidence is thin):
• Valar — godlike angelic powers (Manwë, Ulmo, Aulë, Varda...): effectively \
omnipotent within Arda; no mortal or Maia could defeat a Vala in full power
• Maiar — lesser divine spirits, still vastly beyond mortals (Sauron, Gandalf/Olórin, \
Saruman/Curunír, Balrogs/Valaraukar): immense power even in constrained physical form; \
Balrogs and Sauron are among the mightiest Maiar
• High Elves (Noldor trained in Valinor): Galadriel, Glorfindel, Fëanor, Gil-galad — \
exceptional, able to resist or contest Maiar in rare circumstances
• Other Elves: skilled, immortal, but lesser than the great Noldor
• Men (mortal): Aragorn and the Dúnedain are exceptional; Númenórean blood grants \
strength and longevity; most Men are capable warriors but outmatched by divine beings
• Hobbits: mortal, physically small; remarkable courage and resilience, but not \
combat powerhouses — feats achieved through circumstance, luck, and will
• Tom Bombadil: outside all hierarchies; his power and nature are deliberately \
left undefined by Tolkien

Structure your analysis EXACTLY as follows:

## {character_a} — Powers & Feats
Summarize their abilities, weapons, notable deeds, and combat prowess based on the evidence.

## {character_b} — Powers & Feats
Summarize their abilities, weapons, notable deeds, and combat prowess based on the evidence.

## Analysis
Compare their strengths, weaknesses, and notable advantages. Consider: raw power, \
skill, weapons and artefacts, allies, divine nature, cunning, endurance.

## Verdict
Declare who wins and why, citing specific textual evidence. Be decisive but fair. \
Do not let gaps in the RAG evidence lead you to an absurd verdict — if one character \
is cosmologically superior, say so clearly.

Rules:
1. Cite sources as [Book Title, Chapter Name]
2. Base your analysis primarily on the provided source material
3. If evidence is limited for one character, note this honestly
4. Be scholarly but entertaining — this should be fun to read
5. Consider context: a Maia in full power differs from one constrained in mortal form"""
