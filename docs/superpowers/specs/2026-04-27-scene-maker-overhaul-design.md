# Scene Maker Overhaul — Design Spec
Date: 2026-04-27
Component: `frontend/src/components/gm/SceneMap3D.jsx`

---

## Summary

Full overhaul of the 3D Scene Maker in 6 sequential steps:
1. Design revert (strip gothic CSS → VTM app design system)
2. Asset search / filter
3. Undo/redo + object rotation + ghost preview (bundled — all touch cell/grid logic)
4. Better fill tools (rectangle fill + section erase)
5. Post-processing visual quality (SSAO + Bloom + lighting)
6. Save / load scene to database

---

## Step 1 — Design Revert

### What
Remove all Session 16 gothic styling from `SceneMap3D.jsx` and replace with the app's standard design system.

### Remove
- The entire `GOTHIC_CSS` constant and `<style>{GOTHIC_CSS}</style>` injection
- The `CornerOrn` SVG component and all 4 corner ornament `<div>` elements
- All `sm-*` className references
- Google Fonts import for Cormorant Garamond and UnifrakturCook
- The fraktur `𝔙` branding character and "Storyteller's Atelier" subtitle
- All inline CSS using CSS variables (`--gold`, `--blood`, `--ink`, etc.)

### Replace with
Standard Tailwind classes matching the rest of the app:
- Backgrounds: `bg-void` (`#0a0a0a`), `bg-void-light` (`#141414`), `bg-void-mid` (`#1e1e1e`)
- Borders: `border-void-border` (`#2a2a2a`)
- Text: `text-gray-200`, `text-gray-400`, `text-gray-600`
- Accent: `text-blood` (`#DC143C`), `bg-blood-dark` (`#8B0000`)
- Headers: `font-gothic` (Cinzel), body: `font-body` (Inter)
- Buttons: `vtm-btn` for Place/Clear, `vtm-btn-secondary` for Erase

### Result
The scene maker looks identical in visual style to the GM Dashboard, Monster Panel, and all other app pages.

---

## Step 2 — Asset Search / Filter

### What
A text input at the top of the left asset panel that filters the 203-model list in real time.

### Behaviour
- Typing filters all asset names case-insensitively across all categories
- Categories with no matching items are hidden entirely
- Categories with matches expand automatically and show only matching items
- Clearing the input restores the full list with the previous active category
- When a search is active, the first matching item across all categories is auto-selected as the active brush

### State
```js
const [searchTerm, setSearchTerm] = useState("");
```

### Filtering logic
```js
const filteredCategories = Object.fromEntries(
  Object.entries(ASSET_CATEGORIES)
    .map(([cat, items]) => [
      cat,
      Object.fromEntries(
        Object.entries(items).filter(([name]) =>
          name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    ])
    .filter(([, items]) => Object.keys(items).length > 0)
);
```

### UI
- Input sits at the top of the left panel, below the "Assets" header
- Styled as `vtm-input` (matches rest of app form inputs)
- Small `×` clear button on the right side when text is present

---

## Step 3 — Undo / Redo + Rotation + Ghost Preview

These three features are bundled because they all modify the same cell data structure and grid state logic.

### 3A — Cell Data Structure Change

Current cell shape:
```js
{ floor: {url}, walls: {h: {url}, v: {url}}, object: {url} }
```

New cell shape (adds `rotY` to each slot):
```js
{
  floor:  { url, rotY: 0 },
  walls:  { h: { url, rotY: 0 }, v: { url, rotY: 0 } },
  object: { url, rotY: 0 }
}
```

The `Tile` component already accepts a `rotY` prop — it just needs to read `cell.object.rotY` etc. instead of a hardcoded default.

### 3B — Object Rotation (R key)

**State:** `const [brushRotation, setBrushRotation] = useState(0)`

**Behaviour:**
- Press R to cycle: 0 → π/2 → π → 3π/2 → 0
- The current brush rotation is shown in the topbar status label (e.g. "Placing · 90°")
- Rotation applies to whatever slot is being painted (floor, wall, or object)
- Walls (h/v) ignore brush rotation — their orientation is determined by drag direction, not R key

**Keyboard listener:** added to the existing `useEffect` that listens for `pointerup`.

### 3C — Undo / Redo (Ctrl+Z / Ctrl+Y)

**State (refs, not useState — avoids re-renders):**
```js
const undoStack = useRef([]);  // past grid states
const redoStack = useRef([]);  // future grid states (cleared on new action)
const MAX_HISTORY = 40;
```

**On every grid mutation** (paintCell, eraseCell, fillFloor, rectangle fill, clear all):
1. Push a shallow copy of the current grid to `undoStack`
2. If `undoStack.length > MAX_HISTORY`, shift the oldest entry
3. Clear `redoStack`

**Ctrl+Z:** Pop from `undoStack`, push current grid to `redoStack`, set grid to popped state.
**Ctrl+Y:** Pop from `redoStack`, push current grid to `undoStack`, set grid to popped state.

**Keyboard listener:** added to the same `useEffect`.

### 3D — Ghost Preview

**State:** `const [hoveredIdx, setHoveredIdx] = useState(null)`

**Behaviour:**
- When cursor enters a grid cell (without mouse button held), record `hoveredIdx`
- When cursor leaves the grid entirely, set `hoveredIdx = null`
- In Place mode with an asset selected: render a translucent copy of the selected asset at `hoveredIdx`
- In Erase mode or with no asset: no ghost rendered

**Ghost tile rendering:**
```jsx
{tool === "place" && activeUrl && hoveredIdx !== null && (
  <GhostTile url={activeUrl} idx={hoveredIdx} rotY={brushRotation} />
)}
```

**GhostTile component:**
- Clones the GLTF scene (same as Tile)
- Traverses all meshes and sets `material.transparent = true`, `material.opacity = 0.4`, `material.depthWrite = false`
- Rendered above real tiles (slight Y offset +0.001)

**HitPlane change:** `onPointerEnter` fires `setHoveredIdx` even when no button is held. Existing drag logic only calls `paintCell` when `dragging.current === true`.

---

## Step 4 — Better Fill Tools

### Rectangle Fill / Rectangle Erase

**Trigger:** Hold Shift while dragging.

**State (refs):**
```js
const shiftDragStart = useRef(null);  // { col, row } of shift-drag start
const [highlightedCells, setHighlightedCells] = useState(new Set());
```

**Behaviour:**
- Shift+pointerdown on a cell: record `shiftDragStart = { col, row }`
- Shift+pointermove: compute bounding box from start to current cell, update `highlightedCells` set (re-render hit planes with a highlight colour)
- Shift+pointerup: apply the selected asset (or erase) to every cell in the bounding box

**Visual feedback:** Hit planes in the highlighted set render with `opacity=0.35` and `color="#DC143C"` (blood red) instead of the usual hover colour.

**Fill Floor button** stays unchanged — it fills the entire grid with the selected floor tile.

---

## Step 5 — Post-Processing Visual Quality

### Package
```
@react-three/postprocessing
```
This wraps `postprocessing` (by vanruesc) with React Three Fiber bindings.

### SSAO (Ambient Occlusion)

Makes surfaces look grounded — subtle darkening where objects meet the floor and walls.

```jsx
import { EffectComposer, SSAO, Bloom } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

// Inside Canvas:
<EffectComposer>
  <SSAO
    blendFunction={BlendFunction.MULTIPLY}
    samples={16}
    radius={0.04}
    intensity={20}
    luminanceInfluence={0.5}
    color="black"
  />
  <Bloom
    luminanceThreshold={1}
    luminanceSmoothing={0.9}
    mipmapBlur
    intensity={0.6}
  />
</EffectComposer>
```

### Bloom

Selective glow. Only objects whose material emissiveIntensity exceeds 1.0 receive bloom. The KayKit torch and candle models have emissive maps — we set their emissiveIntensity to 1.5 in the Tile component via `scene.traverse` for `url.includes("torch_lit")` or `url.includes("candle_lit")`.

### Lighting improvements

In `AtmosphereLights`:
- Increase `shadow-mapSize-width` and `-height` from 1024 → 2048
- Add a cool fill light (blue-grey, low intensity) from the opposite direction to the key light
- Hemisphere sky colour shifted from flat red to a more atmospheric deep purple-blue for night scenes

---

## Step 6 — Save / Load Scene

### Backend

**New table: `scenes`**
```sql
CREATE TABLE scenes (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL DEFAULT 'Untitled Scene',
  data JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE UNIQUE INDEX scenes_group_id_key ON scenes(group_id);
```
One scene per group (can be extended to multiple later).

**Alembic migration:** `023_scenes_table.py`

**New router:** `backend/app/routers/scenes.py`
- `GET /api/scenes/{group_id}` — returns scene data or 404 if none
- `PUT /api/scenes/{group_id}` — upsert scene (create or update). Body: `{ name, data }`

**Auth:** GM role required. Group membership checked.

**New Pydantic schemas:**
```python
class SceneSave(BaseModel):
    name: str
    data: list  # the grid array as JSON

class SceneResponse(BaseModel):
    id: int
    group_id: int
    name: str
    data: list
    updated_at: datetime
```

### Routing change

Route changes from `/scene-3d` → `/scene-3d/:groupId` in `App.jsx`.

`SceneMap3D` reads `const { groupId } = useParams()` — no prop changes needed.

The GM Dashboard gets an **"Open Scene Maker"** button per group (alongside the existing group controls) that navigates to `/scene-3d/{group.id}`.

### Frontend

**On mount:** `GET /api/scenes/{groupId}` — if found, load the grid from `response.data`. If 404 (no saved scene yet), start with an empty grid as normal.

**Save button** in topbar:
- Triggers `PUT /api/scenes/{groupId}` with current grid
- Shows a brief "Saved ✓" confirmation toast (reuse the app's existing toast pattern)
- Disabled while saving

**Auto-save:** Debounced 30s after last grid change. Silently saves in background (no toast for auto-save).

**Scene name:** Editable inline text in the topbar. Click to edit, Enter/blur to confirm. Sent with every save.

---

## What Does NOT Change

- The 28×28 grid size and tile dimensions
- The KayKit asset library (203 models, all categories)
- The HDRI/atmosphere controls on the right panel
- The OrbitControls (pan + zoom behaviour)
- The routing (`/scene-3d` stays)
- The 3D canvas Camera position and FOV

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/components/gm/SceneMap3D.jsx` | All Steps 1–5 |
| `frontend/package.json` | Add `@react-three/postprocessing` |
| `backend/app/routers/scenes.py` | New — Step 6 |
| `backend/app/models/scene.py` | New — Step 6 |
| `backend/app/schemas/scene.py` | New — Step 6 |
| `backend/app/main.py` | Register scenes router |
| `frontend/src/App.jsx` | Update route to `/scene-3d/:groupId` |
| `frontend/src/pages/GMDashboardPage.jsx` | Add "Open Scene Maker" button per group |
| `backend/alembic/versions/023_scenes_table.py` | New migration — Step 6 |

---

## Out of Scope

- Multiple named scenes per group (future)
- Character tokens on the map (separate backlog item)
- Player live view (separate backlog item)
- Fog of war (stretch goal)
- Mobile support for the scene maker
