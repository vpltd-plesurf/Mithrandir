#!/usr/bin/env bash
set -euo pipefail

# Mithrandir - Tolkien RAG Platform
# Launch script: starts backend + frontend, handles cleanup on exit

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    echo "Shutting down Mithrandir..."
    [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null && wait "$FRONTEND_PID" 2>/dev/null
    [[ -n "$BACKEND_PID" ]] && kill "$BACKEND_PID" 2>/dev/null && wait "$BACKEND_PID" 2>/dev/null
    echo "Goodbye."
}
trap cleanup EXIT INT TERM

# ── Check Ollama ──────────────────────────────────────────────
echo "Checking Ollama..."
if ! command -v ollama &>/dev/null; then
    echo "ERROR: ollama not found. Install from https://ollama.com"
    exit 1
fi

if ! curl -sf http://localhost:11434/api/tags &>/dev/null; then
    echo "ERROR: Ollama is not running. Start it with: ollama serve"
    exit 1
fi
echo "  Ollama is running."

# ── Check embedding model ────────────────────────────────────
EMBED_MODEL="mxbai-embed-large"
if ! ollama list 2>/dev/null | grep -q "$EMBED_MODEL"; then
    echo "  Pulling embedding model ($EMBED_MODEL)..."
    ollama pull "$EMBED_MODEL"
fi
echo "  Embedding model ready."

# ── Ensure directories exist ─────────────────────────────────
mkdir -p "$ROOT_DIR/books/epub" "$ROOT_DIR/books/pdf"

# ── Install backend deps if needed ───────────────────────────
echo "Setting up backend..."
cd "$BACKEND_DIR"
if [ ! -d ".venv" ]; then
    uv venv
    uv pip install -e .
fi
echo "  Backend ready."

# ── Install frontend deps if needed ──────────────────────────
echo "Setting up frontend..."
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    npm install
fi
echo "  Frontend ready."

# ── Start backend ────────────────────────────────────────────
echo ""
echo "Starting backend on http://localhost:8000 ..."
cd "$BACKEND_DIR"
uv run uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend to be ready
echo -n "  Waiting for backend"
for i in $(seq 1 30); do
    if curl -sf http://localhost:8000/api/health &>/dev/null; then
        echo " ready."
        break
    fi
    echo -n "."
    sleep 1
    if [ "$i" -eq 30 ]; then
        echo " TIMEOUT - backend didn't start."
        exit 1
    fi
done

# ── Start frontend ───────────────────────────────────────────
echo "Starting frontend on http://localhost:3000 ..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to be ready
echo -n "  Waiting for frontend"
for i in $(seq 1 30); do
    if curl -sf http://localhost:3000 &>/dev/null; then
        echo " ready."
        break
    fi
    echo -n "."
    sleep 1
    if [ "$i" -eq 30 ]; then
        echo " TIMEOUT - frontend didn't start."
        exit 1
    fi
done

# ── Ready ─────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo "  Mithrandir is running!"
echo "  Open http://localhost:3000 in your browser"
echo ""
echo "  Tip: Place EPUB/PDF files in books/epub/ or"
echo "       books/pdf/ — they will be auto-detected."
echo ""
echo "  Press Ctrl+C to stop."
echo "═══════════════════════════════════════════════════"
echo ""

# Wait for either process to exit
wait
