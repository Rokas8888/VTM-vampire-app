# Vampire Scriptorium

A self-hosted companion app for **Vampire: The Masquerade 5th Edition** tabletop RPG sessions.

Players create and manage their vampire characters, Game Masters organise groups and run sessions, and the Admin keeps everything running. The app runs on your local PC and is accessible to anyone with the link via Cloudflare Tunnel — no port forwarding or server required.

---

## Quick Start (Docker)

**Requirements:** Docker Desktop

```bash
# 1. Start everything
docker-compose up --build

# 2. Seed the V5 game data (clans, disciplines, powers, etc.)
docker-compose exec backend python -m app.seed.load_game_data

# 3. Create your admin account
docker-compose exec backend python -c "
from app.database import SessionLocal
from app.models.user import User, UserRole
from passlib.context import CryptContext
db = SessionLocal()
pwd = CryptContext(schemes=['bcrypt'])
db.add(User(username='admin', email='admin@local.com', hashed_password=pwd.hash('changeme'), role=UserRole.admin, is_active=True))
db.commit()
print('Admin created.')
db.close()
"
```

App is now running at:
- **Frontend:** http://localhost:5173
- **API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

---

## Sharing With Players (Cloudflare Tunnel)

Cloudflare Tunnel gives you a free public HTTPS URL with no account needed.

### Windows

```powershell
# Download cloudflared
winget install Cloudflare.cloudflared

# Start a tunnel pointing at the frontend
cloudflared tunnel --url http://localhost:5173
```

### Linux / Mac

```bash
# Download
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared

# Start tunnel
./cloudflared tunnel --url http://localhost:5173
```

You'll get a URL like `https://random-words.trycloudflare.com` — share that with your players. The tunnel stays alive as long as the command is running. No sign-up, no configuration.

> **Important:** Keep `docker-compose up` running while the tunnel is active. Stop the tunnel when your session is over.

---

## After Code Changes

The app runs in Docker — HMR does not work. After any code change:

```bash
docker-compose up --build
```

---

## User Roles

| Role | How to create | What they can do |
|------|--------------|-----------------|
| **Player** | Self-register (select Player) | Create vampire characters, track stats, roll dice |
| **Game Master** | Self-register (select Game Master) | Manage groups, view all characters, create monsters |
| **Admin** | CLI command (see Quick Start) | Manage all users, seed game data, view system stats |

---

## Development (without Docker)

```bash
# Terminal 1 — Backend
cd backend
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python -m app.seed.load_game_data
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

Requires Python 3.11+, Node 18+, and a running PostgreSQL instance. Set `DATABASE_URL` in `backend/.env`.
