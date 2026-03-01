# Synology Deployment Setup

Mithrandir runs as two Docker containers on the Synology NAS:
- **mithrandir-frontend** — Next.js UI on port 3001
- **mithrandir-backend** — FastAPI on port 8000

Ollama (LLM + embeddings) stays on your Mac and is reached over the local network.

---

## 1. Allow Ollama to accept network connections (Mac)

By default Ollama only listens on localhost. Run this once, then restart Ollama:

```bash
# Set via launchctl (persists across reboots)
launchctl setenv OLLAMA_HOST "0.0.0.0:11434"
# Then restart Ollama from the menu bar or:
pkill ollama && ollama serve
```

Find your Mac's local IP (you'll need it in step 3):

```bash
ipconfig getifaddr en0
```

---

## 2. Create the directory on the Synology

SSH into your NAS:

```bash
ssh admin@192.168.1.125
mkdir -p /volume1/docker/mithrandir/data
mkdir -p /volume1/docker/mithrandir/books
```

The `books/` folder is where you upload your EPUB and PDF files.
Books added here are automatically scanned by the backend on startup.

---

## 3. Create the .env file on the Synology

```bash
nano /volume1/docker/mithrandir/.env
```

Paste (replacing the IP with your Mac's actual local IP from step 1):

```
OLLAMA_BASE_URL=http://192.168.1.72:11434
CHAT_MODEL=deepseek-r1:14b
EMBEDDING_MODEL=mxbai-embed-large
```

---

## 4. Set up GitHub repository

1. Create a new **private** GitHub repo named `Mithrandir` under `vpltd-plesurf`
2. Initialise and push this project:

```bash
cd /Users/paullesurf/Mithrandir
git init
git add .
git commit -m "Initial commit"
git remote add origin git@github.com:vpltd-plesurf/Mithrandir.git
git push -u origin main
```

---

## 5. Add the DEPLOY_KEY GitHub secret

This is the same SSH key already used by Wow Planner. In the new repo:

- Go to **Settings → Secrets and variables → Actions**
- Add secret: `DEPLOY_KEY` — paste your private SSH key (the one whose public key is in the NAS `~/.ssh/authorized_keys`)

---

## 6. First manual deploy

Before GitHub Actions takes over, deploy manually once to verify everything works:

```bash
ssh admin@192.168.1.125
cd /volume1/docker/mithrandir
curl -L https://github.com/vpltd-plesurf/Mithrandir/archive/refs/heads/main.zip -o app.zip
python3 -m zipfile -e app.zip .
mv Mithrandir-main/* .
rm -rf Mithrandir-main app.zip
sudo docker compose up -d --build
```

---

## 7. Access the app

- Frontend: http://192.168.1.125:3001
- Backend API: http://192.168.1.125:8000/docs

---

## Uploading books

Copy EPUBs or PDFs to the NAS books folder:

```bash
scp ~/path/to/book.epub admin@192.168.1.125:/volume1/docker/mithrandir/books/
```

Then restart the backend to trigger indexing:

```bash
ssh admin@192.168.1.125
sudo docker restart mithrandir-backend
```

---

## Ongoing deploys

After the initial setup, every push to `main` on GitHub will automatically deploy to the Synology via GitHub Actions.
