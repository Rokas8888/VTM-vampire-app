# Scene Maker Save / Load — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist scene maker state to the database per GM group so scenes survive page refreshes.

**Prerequisite:** Plan A (scene maker frontend overhaul) must be complete first. This plan builds on the new cell data structure (cells with `rotY` fields) and assumes `SceneMap3D.jsx` is already refactored.

**Architecture:** New `scenes` table (one row per group, JSONB data column). Two FastAPI endpoints (GET + PUT). `SceneMap3D` fetches on mount and saves on button click. Route changes from `/scene-3d` to `/scene-3d/:groupId`. GM Dashboard gets an "Open Scene Maker" link per group.

**Tech Stack:** FastAPI, SQLAlchemy, PostgreSQL (JSONB), Alembic, React, react-router-dom (existing).

---

## File Map

| File | Change |
|---|---|
| `backend/app/models/scene.py` | Create — SQLAlchemy model |
| `backend/app/routers/scenes.py` | Create — GET + PUT endpoints |
| `backend/app/main.py` | Modify — register scenes router |
| `backend/alembic/versions/023_scenes_table.py` | Create — migration |
| `frontend/src/App.jsx` | Modify — route `/scene-3d` → `/scene-3d/:groupId` |
| `frontend/src/pages/GMDashboardPage.jsx` | Modify — add Scene Maker button |
| `frontend/src/components/gm/SceneMap3D.jsx` | Modify — useParams, fetch on mount, save button |

---

## Task 1: Backend — Scene Model

**Files:**
- Create: `backend/app/models/scene.py`

- [ ] **Step 1: Create the SQLAlchemy model**

Create `backend/app/models/scene.py`:

```python
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.database import Base


class Scene(Base):
    __tablename__ = "scenes"

    id         = Column(Integer, primary_key=True)
    group_id   = Column(Integer, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False, unique=True)
    name       = Column(String(100), nullable=False, default="Untitled Scene")
    data       = Column(JSONB, nullable=False, default=list)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

- [ ] **Step 2: Verify the import works**

```bash
cd C:/Users/Surface/Documents/my-vampire-app
docker compose exec backend python -c "from app.models.scene import Scene; print('OK')"
```

Expected: `OK`

---

## Task 2: Backend — Alembic Migration

**Files:**
- Create: `backend/alembic/versions/023_scenes_table.py`

- [ ] **Step 1: Create the migration file**

Create `backend/alembic/versions/023_scenes_table.py`:

```python
"""create scenes table

Revision ID: 023
Revises: 022
Create Date: 2026-04-27
"""
from alembic import op

revision = '023'
down_revision = '022'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
        CREATE TABLE IF NOT EXISTS scenes (
            id         SERIAL PRIMARY KEY,
            group_id   INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            name       VARCHAR(100) NOT NULL DEFAULT 'Untitled Scene',
            data       JSONB NOT NULL DEFAULT '[]',
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT scenes_group_id_unique UNIQUE (group_id)
        );
        CREATE INDEX IF NOT EXISTS ix_scenes_group_id ON scenes(group_id);
    """)


def downgrade():
    op.execute("DROP TABLE IF EXISTS scenes;")
```

- [ ] **Step 2: Run the migration**

```bash
docker compose exec backend alembic upgrade head
```

Expected output ends with: `Running upgrade 022 -> 023, create scenes table`

- [ ] **Step 3: Verify the table exists**

```bash
docker compose exec db psql -U vtm -d vtmdb -c "\d scenes"
```

Expected: shows the `scenes` table columns.

---

## Task 3: Backend — Scenes Router

**Files:**
- Create: `backend/app/routers/scenes.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create the router**

Create `backend/app/routers/scenes.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import List, Any
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User, UserRole
from app.models.group import Group
from app.models.scene import Scene

router = APIRouter(prefix="/api/scenes", tags=["scenes"])


class SceneSave(BaseModel):
    name: str
    data: List[Any]   # grid array — list of cell dicts or null


class SceneOut(BaseModel):
    id:         int
    group_id:   int
    name:       str
    data:       List[Any]
    updated_at: datetime

    class Config:
        from_attributes = True


def assert_gm_owns_group(group_id: int, user: User, db: Session) -> Group:
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")
    if user.role not in (UserRole.gm, UserRole.admin):
        raise HTTPException(status_code=403, detail="GM or admin access required.")
    return group


@router.get("/{group_id}", response_model=SceneOut)
def get_scene(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    assert_gm_owns_group(group_id, current_user, db)
    scene = db.query(Scene).filter(Scene.group_id == group_id).first()
    if not scene:
        raise HTTPException(status_code=404, detail="No saved scene for this group.")
    return scene


@router.put("/{group_id}", response_model=SceneOut)
def save_scene(
    group_id: int,
    body: SceneSave,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    assert_gm_owns_group(group_id, current_user, db)
    scene = db.query(Scene).filter(Scene.group_id == group_id).first()
    if scene:
        scene.name = body.name
        scene.data = body.data
    else:
        scene = Scene(group_id=group_id, name=body.name, data=body.data)
        db.add(scene)
    db.commit()
    db.refresh(scene)
    return scene
```

- [ ] **Step 2: Register the router in main.py**

In `backend/app/main.py`, add the import and include:

```python
# Add to imports line:
from app.routers import auth, game_data, characters, groups, monsters, admin, dice, conditions, notes, npcs, resonance, portraits, scenes

# Add after app.include_router(portraits.router):
app.include_router(scenes.router)
```

- [ ] **Step 3: Rebuild backend and test GET (expect 404 since no scene yet)**

```bash
docker compose up --build -d backend
```

Get a GM auth token first (from the login endpoint), then:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/scenes/1
```

Expected: `{"detail":"No saved scene for this group."}`  (404 — correct, no scene saved yet)

- [ ] **Step 4: Test PUT (save a scene)**

```bash
curl -X PUT -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"name":"Test Scene","data":[]}' \
  http://localhost:8000/api/scenes/1
```

Expected: `{"id":1,"group_id":1,"name":"Test Scene","data":[],"updated_at":"..."}`

- [ ] **Step 5: Test GET again (should return the saved scene)**

```bash
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/scenes/1
```

Expected: `{"id":1,"group_id":1,"name":"Test Scene","data":[],"updated_at":"..."}`

---

## Task 4: Frontend — Route Update and GM Dashboard Button

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/pages/GMDashboardPage.jsx`

- [ ] **Step 1: Update the route in App.jsx**

Change the `/scene-3d` route to accept a groupId param:

```jsx
// Before:
<Route path="/scene-3d" element={
  <PrivateRoute allowedRoles={["gm", "admin"]}>
    <Suspense fallback={<div className="min-h-screen bg-void flex items-center justify-center"><p className="font-gothic text-blood animate-pulse">Loading 3D...</p></div>}>
      <SceneMap3D />
    </Suspense>
  </PrivateRoute>
} />

// After:
<Route path="/scene-3d/:groupId" element={
  <PrivateRoute allowedRoles={["gm", "admin"]}>
    <Suspense fallback={<div className="min-h-screen bg-void flex items-center justify-center"><p className="font-gothic text-blood animate-pulse">Loading 3D...</p></div>}>
      <SceneMap3D />
    </Suspense>
  </PrivateRoute>
} />
```

- [ ] **Step 2: Add Scene Maker button to GMDashboardPage**

Find the "⚔ Session Mode" button in `GMDashboardPage.jsx` (around line 797–802). Add the Scene Maker button right after it:

```jsx
<button
  onClick={() => window.open(`/session/${selectedGroup.id}`, "_blank")}
  className="vtm-btn-secondary text-xs py-1.5 px-3"
>
  ⚔ Session Mode
</button>
<button
  onClick={() => window.open(`/scene-3d/${selectedGroup.id}`, "_blank")}
  className="vtm-btn-secondary text-xs py-1.5 px-3"
>
  🗺 Scene Maker
</button>
```

- [ ] **Step 3: Rebuild frontend and verify**

```bash
docker compose up --build -d frontend
```

Open `http://localhost:5173/gm`. Select a group. Confirm "🗺 Scene Maker" button appears next to "⚔ Session Mode". Click it — opens `/scene-3d/{groupId}` in a new tab.

---

## Task 5: Frontend — SceneMap3D Save / Load Integration

**Files:**
- Modify: `frontend/src/components/gm/SceneMap3D.jsx`

- [ ] **Step 1: Add useParams and api import**

At the top of `SceneMap3D.jsx`, add:

```jsx
import { useParams } from "react-router-dom";
import api from "../../services/api";
import { useToast } from "../../store/toastStore";
```

- [ ] **Step 2: Add state and hooks inside SceneMap3D**

At the top of the `SceneMap3D` function body, add:

```jsx
const { groupId } = useParams();
const toast = useToast();
const [sceneName, setSceneName] = useState("Untitled Scene");
const [saving, setSaving] = useState(false);
const [editingName, setEditingName] = useState(false);
```

- [ ] **Step 3: Fetch scene on mount**

Add this effect after the state declarations:

```jsx
useEffect(() => {
  if (!groupId) return;
  api.get(`/api/scenes/${groupId}`)
    .then(res => {
      setSceneName(res.data.name);
      if (Array.isArray(res.data.data) && res.data.data.length > 0) {
        applyGrid(res.data.data);
      }
    })
    .catch(() => {}); // 404 = no saved scene yet, start empty
}, [groupId]);
```

- [ ] **Step 4: Add save function**

```jsx
const saveScene = async () => {
  if (!groupId) { toast.error("No group ID — open Scene Maker from your GM dashboard."); return; }
  setSaving(true);
  try {
    await api.put(`/api/scenes/${groupId}`, { name: sceneName, data: gridRef.current });
    toast.success("Scene saved.");
  } catch {
    toast.error("Failed to save scene.");
  } finally {
    setSaving(false);
  }
};
```

- [ ] **Step 5: Add scene name editor and Save button to the topbar**

In the topbar JSX, replace the static `<span className="font-gothic text-blood text-sm tracking-widest">Scene Maker</span>` with:

```jsx
<div className="flex items-center gap-3">
  <span className="font-gothic text-blood text-sm tracking-widest">Scene Maker</span>
  <div className="w-px h-4 bg-void-border" />
  {editingName ? (
    <input
      autoFocus
      value={sceneName}
      onChange={e => setSceneName(e.target.value)}
      onBlur={() => setEditingName(false)}
      onKeyDown={e => { if (e.key === "Enter") setEditingName(false); }}
      className="bg-void-mid border border-blood rounded px-2 py-0.5 text-xs text-gray-200 font-gothic tracking-wider w-36 focus:outline-none"
    />
  ) : (
    <button
      onClick={() => setEditingName(true)}
      className="text-xs text-gray-400 hover:text-gray-200 font-gothic tracking-wider transition-colors"
      title="Click to rename"
    >
      {sceneName}
    </button>
  )}
</div>
```

And add the Save button to the right side of the topbar controls area (next to Clear):

```jsx
<button
  onClick={saveScene}
  disabled={saving || !groupId}
  className="text-xs px-4 py-1.5 font-gothic tracking-wider rounded bg-blood-dark text-white hover:bg-blood transition-colors disabled:opacity-40 disabled:cursor-not-allowed ml-1"
>
  {saving ? "Saving…" : "Save"}
</button>
```

- [ ] **Step 6: Add auto-save (30 second debounce)**

Add a ref to track whether the grid has changed since the last save:

```jsx
const autoSaveTimer = useRef(null);
const lastSavedGrid = useRef(null);
```

Add this effect after the fetch-on-mount effect:

```jsx
useEffect(() => {
  if (!groupId) return;
  clearTimeout(autoSaveTimer.current);
  autoSaveTimer.current = setTimeout(async () => {
    const current = JSON.stringify(gridRef.current);
    if (current === lastSavedGrid.current) return;  // nothing changed
    try {
      await api.put(`/api/scenes/${groupId}`, { name: sceneName, data: gridRef.current });
      lastSavedGrid.current = current;
    } catch {
      // silent fail on auto-save — user can always click Save manually
    }
  }, 30000);
  return () => clearTimeout(autoSaveTimer.current);
}, [grid, groupId, sceneName]);
```

Update `saveScene` to also sync `lastSavedGrid` after a successful manual save:

```jsx
const saveScene = async () => {
  if (!groupId) { toast.error("No group ID — open Scene Maker from your GM dashboard."); return; }
  setSaving(true);
  try {
    await api.put(`/api/scenes/${groupId}`, { name: sceneName, data: gridRef.current });
    lastSavedGrid.current = JSON.stringify(gridRef.current);
    toast.success("Scene saved.");
  } catch {
    toast.error("Failed to save scene.");
  } finally {
    setSaving(false);
  }
};
```

- [ ] **Step 7: Rebuild frontend**

```bash
docker compose up --build -d frontend
```

- [ ] **Step 8: Full integration test**

1. Open GM Dashboard, select a group, click "🗺 Scene Maker"
2. Scene Maker opens at `/scene-3d/{groupId}`
3. Build a small scene (place some floor tiles and walls)
4. Click "Save" — toast shows "Scene saved."
5. Refresh the page — scene reloads from database
6. Click the scene name ("Untitled Scene") — it becomes an input. Type a new name, press Enter
7. Click Save again — saves with new name
8. Wait 30 seconds, make a small change — auto-save fires silently in the background
9. Verify in database: `docker compose exec db psql -U vtm -d vtmdb -c "SELECT id, group_id, name, updated_at FROM scenes;"`

- [ ] **Step 9: Commit**

```bash
cd C:/Users/Surface/Documents/my-vampire-app
git add backend/app/models/scene.py backend/app/routers/scenes.py backend/app/main.py backend/alembic/versions/023_scenes_table.py frontend/src/App.jsx frontend/src/pages/GMDashboardPage.jsx frontend/src/components/gm/SceneMap3D.jsx
git commit -m "feat: scene maker save/load — scenes table, GET/PUT API, GM dashboard link, frontend integration"
```

---

## Deployment

Both frontend and backend changed, plus a migration:

```bash
# On Raspberry Pi
cd /home/rockas/VTM-vampire-app
git pull
docker compose up --build -d
docker compose exec backend alembic upgrade head
```
