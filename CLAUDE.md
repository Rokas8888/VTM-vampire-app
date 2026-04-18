\# VTM-GG — Vampire: The Masquerade Companion App



\## What This App Is



A self-hosted web application for managing \*\*Vampire: The Masquerade 5th Edition\*\* tabletop RPG sessions. It runs on the owner's local PC but is accessible to anyone with the link (via Cloudflare Tunnel). Think of it as a digital game table — players create and manage their vampire characters, Game Masters organize groups and run sessions, and the Admin keeps everything running.



\## Three User Roles



\### 🧛 Player

\- \*\*Registration:\*\* Creates an account → immediately enters a guided, step-by-step \*\*Character Creation Wizard\*\* (10 steps, enforcing V5 rulebook rules)

\- \*\*Character Sheet:\*\* Views and edits their vampire character — stats, skills, disciplines, items, weapons, biography, haven, notes

\- \*\*Info Popups:\*\* Every game element (clan, discipline, merit, flaw, etc.) has a clickable popup with full description and rules — players can learn as they build

\- \*\*Experience Tracking:\*\* Track total/spent XP, spend XP to improve character

\- \*\*Dice Roller:\*\* Roll V5 dice pools with hunger dice, see results with success/critical/messy critical/bestial failure detection

\- \*\*Player Directory:\*\* A separate dashboard where players can browse other players' characters — filterable by Clan, Name, and Generation/Level. Cards show basic info only (name, clan, generation, humanity). Click to view full character sheet (read-only).



\### 🎭 Game Master (GM)

\- \*\*Registration:\*\* Creates an account → goes straight to the GM Dashboard (no character created)

\- \*\*Group Management:\*\* Create groups, search registered players, add/remove them

\- \*\*Character Grid View:\*\* See all group members' characters in an adaptive grid layout:

&#x20; - 1-2 characters → side by side

&#x20; - 3-4 characters → 2×2 grid

&#x20; - 5-6 characters → 2×3 grid

&#x20; - 7+ characters → 2×N grid, scrollable

&#x20; - Each card shows: Name, Clan, Generation, Health/Willpower bars, Hunger dots, Humanity, Blood Potency, top skills

&#x20; - Click any card → drill down to full character sheet (read-only)

\- \*\*Monster Creator:\*\* Create and manage monsters/NPCs for each group — name, type, health, simplified attributes, attack, special abilities, notes

\- \*\*Two Tabs per Group:\*\* Players | Monsters

\- \*\*Dice Roller:\*\* Same as player, plus visible to the group



\### ⚙️ Admin

\- \*\*NOT selectable during registration\*\* — created only via backend CLI command

\- \*\*User Management:\*\* View all users, change roles, deactivate accounts

\- \*\*Group Overview:\*\* See all groups and their members

\- \*\*Character Overview:\*\* Browse all characters in the system

\- \*\*System Stats:\*\* User count, group count, character count, etc.

\- \*\*Game Data Management:\*\* Seed/reset the game reference data (clans, disciplines, merits, etc.)



\---



\## Tech Stack



| Layer | Technology | Why |

|-------|-----------|-----|

| \*\*Backend\*\* | Python 3.11+ / FastAPI | Fast, modern Python API framework |

| \*\*Frontend\*\* | React 18+ / Vite / TailwindCSS | Responsive UI with utility-first styling |

| \*\*Database\*\* | PostgreSQL + SQLAlchemy ORM | Relational data (characters, groups, users) |

| \*\*Migrations\*\* | Alembic | Database schema version control |

| \*\*Auth\*\* | JWT (access + refresh tokens) / bcrypt | Secure, stateless authentication |

| \*\*Public Access\*\* | Cloudflare Tunnel | Free public URL from localhost, no port forwarding needed |

| \*\*Containerization\*\* | Docker Compose | One-command setup for DB + backend + frontend |



\---



\## Character Creation Wizard (10 Steps)



The heart of the app. When a player registers, they're guided through building a valid V5 character:



| Step | What Happens | Key Rules |

|------|-------------|-----------|

| 1. Core Concept | Name, Concept, Ambition, Desire | Name + Concept required |

| 2. Clan | Pick from 16 clans (with info popups) | Sets available Disciplines and Bane |

| 3. Predator Type | Pick hunting style (16 options) | Auto-applies: +1 Discipline dot, +1 Specialty, Advantages/Flaws |

| 4. Attributes | Distribute 9 attributes (Physical/Social/Mental) | Exactly: one at 4, one at 1, three at 3, four at 2 |

| 5. Skills | Distribute 27 skills | Choose: Jack of All Trades / Balanced / Specialist distribution |

| 6. Disciplines | Pick 2 clan Disciplines, assign 3 dots, choose powers | Can swap higher power for lower, not vice versa |

| 7. Advantages | Spend 7 points on Backgrounds + Merits, take 2 points of Flaws | Predator Type bonuses are FREE (don't count) |

| 8. Beliefs | Convictions, Touchstones, Chronicle Tenets | 0-3 Convictions, each paired with a Touchstone |

| 9. Humanity \& Goals | Confirm Humanity (7 ± predator modifier), finalize Ambition | Auto-modified by Predator Type |

| 10. Generation \& Review | Pick age (Childer/Neonate/Ancillae), review full sheet | Auto-calculates Blood Potency, Health, Willpower, XP |



\*\*Features:\*\* Progress bar, save-as-draft at any step, validation before proceeding, edit buttons to jump back to any step from the review page.



\---



\## Info Popup System



Every selectable game element throughout the app has a clickable info popup showing:

\- \*\*Name\*\* and dot rating

\- \*\*Full description\*\* (flavor text)

\- \*\*Mechanical rules\*\* (system text — how it works in game)

\- \*\*Prerequisites\*\* (for Discipline powers)

\- \*\*Source page reference\*\*



This means a player who's never played V:tM before can learn everything they need right inside the app while building their character. Merits, flaws, disciplines, powers, clans, predator types — all browsable with rich detail.



\---



\## V5 Dice Roller



Both Players and GMs get a dice roller that implements the V5 system:

\- \*\*Input:\*\* Number of regular dice + number of hunger dice

\- \*\*Mechanics:\*\* d10 system — 6-9 = success, paired 10s = critical (+2 bonus), hunger die 10 in a critical = messy critical, hunger die 1 on a failure = bestial failure

\- \*\*Visual:\*\* Regular dice shown in black, hunger dice in red

\- \*\*3D Animation:\*\* Dice are fully 3D animated — when rolled, they physically fall, tumble, and land on the table before revealing the result. Use Three.js or Cannon.js for physics-based 3D rendering.

\- \*\*History:\*\* Recent rolls saved and visible



\---



\## Design Theme



Dark gothic aesthetic inspired by V:tM:

\- \*\*Colors:\*\* Deep reds (#8B0000, #DC143C), blacks, dark grays

\- \*\*Fonts:\*\* Serif headers (Cinzel or similar gothic font), sans-serif body (Inter)

\- \*\*Character sheet styling:\*\* Dot ratings as filled/empty circles (●○), health/willpower as box tracks, hunger dice always red

\- \*\*Responsive:\*\* Works on desktop, tablet, and mobile (GM grid optimized for larger screens)

\## Login Screen Design

Full dark gothic atmosphere:

\- \*\*Background:\*\* Dark stone texture or black with subtle fog/mist effect

\- \*\*Blood:\*\* Animated blood dripping down from the top of the screen or along the sides

\- \*\*Logo:\*\* "VTM-GG" in gothic serif font (Cinzel), deep red, centered

\- \*\*Login box:\*\* Semi-transparent dark panel with red border glow

\- \*\*Buttons:\*\* Deep red with hover effect (brighter red or blood drip animation)

\- \*\*Mood:\*\* Think old castle, candlelight, shadows — the feel of the World of Darkness



\---



\## Project Structure



```

vtm-companion/

├── backend/

│   ├── app/

│   │   ├── main.py                 # FastAPI entry point

│   │   ├── config.py               # DB URL, JWT secret, settings

│   │   ├── models/                 # SQLAlchemy models

│   │   │   ├── user.py             # User, RefreshToken

│   │   │   ├── character.py        # Character + all sub-tables

│   │   │   ├── group.py            # Group, GroupMember

│   │   │   └── monster.py          # Monster

│   │   ├── schemas/                # Pydantic request/response schemas

│   │   ├── routers/                # API route modules

│   │   │   ├── auth.py             # Register, login, refresh

│   │   │   ├── characters.py       # CRUD + creation wizard

│   │   │   ├── groups.py           # Group management

│   │   │   ├── monsters.py         # Monster CRUD

│   │   │   ├── admin.py            # Admin endpoints

│   │   │   ├── dice.py             # Dice roller

│   │   │   └── game\_data.py        # Clans, disciplines, merits, etc.

│   │   ├── services/               # Business logic

│   │   │   ├── character\_creation.py

│   │   │   ├── dice\_roller.py

│   │   │   └── validation.py

│   │   ├── middleware/             # Auth, CORS

│   │   └── seed/                  # JSON game data + seed script

│   ├── alembic/                   # DB migrations

│   ├── requirements.txt

│   └── Dockerfile

├── frontend/

│   ├── src/

│   │   ├── components/

│   │   │   ├── auth/              # Login, Register forms

│   │   │   ├── character/         # Wizard steps, sheet view, edit mode

│   │   │   ├── gm/               # Group dashboard, grid, monsters

│   │   │   ├── admin/            # User management panel

│   │   │   └── shared/           # DiceRoller, InfoPopup, DotRating, HealthTrack

│   │   ├── pages/                # Route-level page components

│   │   ├── hooks/                # Custom React hooks

│   │   ├── services/             # API client (axios/fetch)

│   │   ├── store/                # State management (Zustand)

│   │   └── data/                 # Static game data JSON (fallback)

│   ├── package.json

│   ├── vite.config.js

│   └── Dockerfile

├── docker-compose.yml             # PostgreSQL + backend + frontend

├── PROJECT.md                     # ← this file

└── README.md                      # Setup instructions

```



\---



\## Build Phases (Implementation Order)



| Phase | What Gets Built | Result |

|-------|----------------|--------|

| \*\*1. Foundation\*\* | Project scaffolding, PostgreSQL setup, User model, registration/login, JWT auth, role-based routing | Can register and log in |

| \*\*2. Game Data\*\* | Seed all V5 data (clans, disciplines, powers, merits, flaws, predator types), game-data API, InfoPopup component | Can browse all game info |

| \*\*3. Character Creation\*\* | 10-step wizard with validation, draft saving, derived stat auto-calculation | Players can create characters |

| \*\*4. Player Dashboard\*\* | Character sheet view, edit mode, experience tracking, weapons, possessions, biography, haven | Players can manage characters |

| \*\*5. GM Dashboard\*\* | Group CRUD, player search/add, adaptive character grid view, drill-down to full sheets | GMs can organize and view |

| \*\*6. GM Tools\*\* | Monster creator/manager, dice roller (shared component) | GMs have full toolkit |

| \*\*7. Admin Panel\*\* | User management, system overview, game data management | Admins can manage everything |

| \*\*8. Polish\*\* | Dark gothic theme, responsive design, error handling, Cloudflare Tunnel setup docs, loading states | Production-ready |



\---



\## Rules for Claude



\- \*\*I am a beginner\*\* — explain every step clearly, don't skip setup details

\- \*\*Keep code simple and readable\*\* — prefer clarity over cleverness

\- \*\*Use Python for the backend\*\* — FastAPI with type hints

\- \*\*Always ask before doing something big or irreversible\*\* — like database resets, major refactors, or deleting files

\- \*\*Build incrementally\*\* — get each phase working before moving to the next

\- \*\*Test as you go\*\* — verify endpoints work before building UI on top of them

\- \*\*Comment the code\*\* — especially business logic and V5 rule enforcement

\- \*\*Reference the skill files\*\* — the VTM companion skill at `/mnt/skills/user/vtm-companion/` contains the full database schema, character creation rules, and game data. Read those reference files before implementing any game-logic feature.



\---



\## Key API Endpoints



```

Auth:

&#x20; POST /api/auth/register          # Create account (username, email, password, role)

&#x20; POST /api/auth/login             # Get JWT tokens

&#x20; POST /api/auth/refresh           # Refresh access token



Characters:

&#x20; GET  /api/characters/me          # Get current player's character

&#x20; POST /api/characters             # Create character (from wizard)

&#x20; PUT  /api/characters/{id}        # Update character

&#x20; POST /api/characters/draft       # Save wizard draft



Groups:

&#x20; GET  /api/groups                 # List GM's groups

&#x20; POST /api/groups                 # Create group

&#x20; GET  /api/groups/{id}            # Group details + members

&#x20; POST /api/groups/{id}/members    # Add player to group

&#x20; DELETE /api/groups/{id}/members/{uid}  # Remove player



Monsters:

&#x20; POST /api/monsters               # Create monster

&#x20; GET  /api/monsters?group\_id=X    # List monsters in group

&#x20; PUT  /api/monsters/{id}          # Edit monster

&#x20; DELETE /api/monsters/{id}        # Delete monster



Dice:

&#x20; POST /api/dice/roll              # Roll dice

&#x20; GET  /api/dice/history           # Recent rolls



Game Data (read-only):

&#x20; GET /api/game-data/clans

&#x20; GET /api/game-data/disciplines

&#x20; GET /api/game-data/disciplines/{id}/powers

&#x20; GET /api/game-data/predator-types

&#x20; GET /api/game-data/merits

&#x20; GET /api/game-data/flaws

&#x20; GET /api/game-data/backgrounds



Admin:

&#x20; GET /api/admin/users             # All users

&#x20; PUT /api/admin/users/{id}        # Update user (role, active status)

&#x20; GET /api/admin/stats             # System statistics

```



\---



\## Setup (How to Run Locally)



\### Prerequisites

\- Python 3.11+

\- Node.js 18+

\- PostgreSQL 14+ (or use Docker)

\- Git



\### Quick Start with Docker

```bash

git clone <repo-url>

cd vtm-companion

docker-compose up -d

\# App runs at http://localhost:5173

\# API runs at http://localhost:8000

\# Seed game data:

docker-compose exec backend python -m app.seed.load\_game\_data

```



\### Make it Public (anyone with the link can connect)

```bash

\# Install Cloudflare Tunnel

curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared

chmod +x cloudflared



\# Start a free tunnel (no account needed)

./cloudflared tunnel --url http://localhost:5173

\# You'll get a URL like: https://random-words.trycloudflare.com

\# Share that link with your players!

```



\### Development (no Docker)

```bash

\# Terminal 1: Backend

cd backend

python -m venv venv \&\& source venv/bin/activate

pip install -r requirements.txt

alembic upgrade head

python -m app.seed.load\_game\_data

uvicorn app.main:app --reload --port 8000



\# Terminal 2: Frontend

cd frontend

npm install

npm run dev

```



