# Synology Deployment Setup

Mithrandir runs as two Docker containers on the Synology NAS (192.168.1.125):
- **mithrandir-frontend** — Next.js UI → http://192.168.1.125:3001
- **mithrandir-backend** — FastAPI → http://192.168.1.125:8000/docs

Ollama (LLM + embeddings) runs on the Mac (192.168.1.72) and is reached over the local network.

Also running on the NAS:
- **windsmeres-libram** — Wow Planner → http://192.168.1.125:3000

---

## 1. Allow Ollama to accept network connections (Mac)

By default Ollama only listens on localhost. Run this once, then restart Ollama:

```bash
launchctl setenv OLLAMA_HOST "0.0.0.0:11434"
```

Then restart the Ollama app. If Ollama isn't in the menu bar, start it from the terminal:
```bash
OLLAMA_HOST=0.0.0.0:11434 ollama serve
```

Verify the NAS can reach it:
```bash
curl http://192.168.1.72:11434/api/tags
```

Models required (must be pulled on the Mac):
```bash
ollama pull deepseek-r1:14b
ollama pull mxbai-embed-large
```

---

## 2. Synology directory structure

```
/volume1/docker/mithrandir/
├── .env          # environment variables
├── books/        # upload EPUBs and PDFs here
├── data/         # ChromaDB + SQLite (auto-created, persisted between restarts)
└── (source files extracted by deploy script)
```

---

## 3. .env file on the Synology

Create at `/volume1/docker/mithrandir/.env`:

```
OLLAMA_BASE_URL=http://192.168.1.72:11434
CHAT_MODEL=deepseek-r1:14b
EMBEDDING_MODEL=mxbai-embed-large
```

To create from Mac:
```bash
scp /Users/paullesurf/Mithrandir/.env.synology paullesurf@192.168.1.125:/volume1/docker/mithrandir/.env
```

---

## 4. GitHub repository

- Repo: https://github.com/vpltd-plesurf/Mithrandir (public)
- Deploy key: `DEPLOY_KEY` secret in GitHub Actions settings
- SSH public key is in `/var/services/homes/PaulLesurf/.ssh/authorized_keys` on the NAS
- Private key stored at `~/.ssh/synology_deploy` on the Mac

---

## 5. Deploying

Every push to `main` auto-deploys via GitHub Actions (SSH → Synology → docker compose up).

For a manual deploy (e.g. first time or after NAS restart):
```bash
ssh paullesurf@192.168.1.125
cd /volume1/docker/mithrandir
curl -L https://github.com/vpltd-plesurf/Mithrandir/archive/refs/heads/main.zip -o app.zip
python3 -m zipfile -e app.zip .
cp -rf Mithrandir-main/* .
rm -rf Mithrandir-main app.zip
sudo docker compose up -d --build
```

> Note: use `cp -rf` not `mv` if directories already exist from a previous deploy.

---

## 6. Copying book data to the NAS

SCP doesn't work on this Synology (SFTP subsystem disabled). Use tar over SSH:

```bash
# Copy ChromaDB + SQLite data
tar czf - -C /Users/paullesurf/Mithrandir/backend data | ssh paullesurf@192.168.1.125 "tar xzf - -C /volume1/docker/mithrandir/"

# Copy books library
tar czf - -C /Users/paullesurf/Mithrandir books | ssh paullesurf@192.168.1.125 "tar xzf - -C /volume1/docker/mithrandir/"
```

Then restart the backend:
```bash
ssh paullesurf@192.168.1.125 "sudo docker restart mithrandir-backend"
```

---

## 7. Adding new books

1. Upload the EPUB or PDF to `/volume1/docker/mithrandir/books/` via Synology File Station
2. Restart the backend: `sudo docker restart mithrandir-backend`
3. The backend scans the books directory on startup and indexes any new files
