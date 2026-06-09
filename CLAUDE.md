# VTM-GG — Vampire: The Masquerade Companion App

> **This file is RULES ONLY — kept lean on purpose** (token discipline; see Obsidian `Claude/Agent Workflow — Health & Quality`).
> Full reference (app overview, 10-step wizard, full API list, project structure, setup/run) lives in the repo history and Obsidian `Projects/VTM App/VTM App — CLAUDE`.

## MANDATORY WORKFLOW — overrides all defaults

Every user request goes through a manager first:
- VTM work → invoke `/vtm-manager` (Alex)
- Cross-project → invoke `/manager` (Victor)

Engaging the team — **ONE CLI, everyone a Skill on Sonnet:**
- New features → invoke `/po` (Sam)
- Architecture / hard decisions → invoke `/architect` (Jim)
- Frontend → invoke `/vtm-frontend` (Maya)
- Backend → invoke `/vtm-backend` (Dmitri)
- Deploys / Pi ops → invoke `/vtm-devops` (Tomas)
- After any frontend change → invoke `/vtm-qa` (Lina)

**MODEL ROUTING:** All personas are invoked via the **Skill tool** in the SAME conversation and run on **Sonnet**. **NEVER use the Agent/Task tool to dispatch subagents — they spawn separate CLI processes that crash.** The `~/.claude/agents/` folder is intentionally empty. (See global `~/.claude/CLAUDE.md` Rule 11.)

**Base Claude must never write frontend or backend code directly — always route through the manager.**

**Token discipline:** batch hand-offs — one manager turn dispatches BE → FE → QA in sequence, no manager↔dev ping-pong. For files **> ~600 lines**, use Grep + targeted offset reads, not full re-reads.

## What this app is

Self-hosted web app for running **Vampire: The Masquerade 5e** tabletop sessions. Three roles — **Player** (10-step character wizard + sheet), **GM** (groups, character grid, live session mode, monsters, 3D scene maker), **Admin** (users, stats, game-data seeding). Stack: FastAPI + React/Vite/TailwindCSS + PostgreSQL, Docker Compose, hosted on a Raspberry Pi.

## Key technical constraints (operational rules)

- **HMR does not work** — always `docker compose up --build -d` after any code change
- **`docker compose`** (with space) on Pi — hyphen `docker-compose` is NOT installed
- **bcrypt pinned 3.2.2** — passlib incompatible with 4.x; do not upgrade
- **SQLAlchemy 2.0** — class-bound attributes for joinedload (`joinedload(Character.clan)`, not `"clan"`)
- **Retainers** are Character rows (`is_retainer=True`, `parent_character_id`, `retainer_level`)
- **Cannot reseed game data** while characters exist — use direct SQL UPDATE
- **Access tokens 8h** (docker-compose.yml); **CORS** `allow_origins=["*"]`, `allow_credentials=False`
- **DB:** user=`vtm`, db=`vtmdb`
- **Latest migration: 033** (custom merits/flaws/backgrounds) — run `alembic upgrade head` after any backend deploy with new migrations
- **Ritual disciplines:** Blood Sorcery (id=36), Oblivion (id=41)

## V5 rules enforced in code

- **Creation** — Attributes: one 4, one 1, three 3, four 2 · Skills: 27 pts per chosen template
- **Derived** — Health = 3 + Stamina · Willpower = Resolve + Composure · Blood Potency: Childer 0 / Neonate 1 / Ancillae 2
- **XP** — attribute ×5, skill ×3, discipline in-clan ×5 / out-of-clan ×7, extra power 3 (in) / 5 (out), ritual first L1 free then level ×3
- **Advantages** — 7 points + exactly 2 points of flaws

## Rules for Claude

- **The user is a beginner** — explain steps clearly, don't skip setup details
- **Keep code simple and readable** — clarity over cleverness; comment business logic + V5 rule enforcement
- **Always ask before big or irreversible actions** — DB resets, major refactors, deleting files
- **Build incrementally, test as you go** — verify endpoints before building UI on top
- **Read the full file before editing** — carve-out: files > ~600 lines → Grep + targeted reads instead

## Deploy (only when the user explicitly asks)

| Changed | Command on Pi (in `/home/rockas/VTM-vampire-app`) |
|---|---|
| Frontend only | `git pull && docker compose up --build -d frontend` |
| Backend + migrations | `git pull && docker compose up --build -d && docker compose exec backend alembic upgrade head` |

- Live: `http://78.61.63.26:5173` · Local code: `C:\Users\Surface\Documents\my-vampire-app` · Repo: `github.com/Rokas8888/VTM-vampire-app`
- **Always test localhost first.** Pi has 2GB RAM — prefer frontend-only builds; full builds can OOM.
