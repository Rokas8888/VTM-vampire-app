# Edge-Based Wall System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cell-based wall system with an edge-based system where walls sit on boundaries between cells, drawn with a dedicated lock-and-preview line tool.

**Architecture:** Two boolean arrays (`hEdges[812]`, `vEdges[812]`) replace wall slots in `grid[]` cells. A new "wall" tool mode detects which cell edge the cursor is near (`snapToEdge`), locks direction on first drag, and renders a red preview; mouseup commits all previewed edges in one undo step. `EdgeWalls` renders committed walls; `EdgePreview` renders the drag preview. The backend `data` field accepts any JSON (was array-only) to hold `{grid, hEdges, vEdges}`.

**Tech Stack:** React 18, @react-three/fiber, @react-three/drei, Three.js, FastAPI/Pydantic, PostgreSQL JSONB

---

## File Map

| File | Change |
|---|---|
| `frontend/src/components/gm/SceneMap3D.jsx` | Main changes — new helpers, state, components, event handlers |
| `backend/app/routers/scenes.py` | `data: List[Any]` → `data: Any` in both Pydantic schemas |

---

### Task 1: Add module-level helper functions

**Files:**
- Modify: `frontend/src/components/gm/SceneMap3D.jsx` (after the `wallLineCells` function, around line 234)

Context: `GRID=28`, `TILE=0.09`, `HALF=(GRID*TILE)/2`. hEdge index = `row*GRID + col`, stride=28. vEdge index = `row*(GRID+1) + col`, stride=29.

- [ ] **Step 1: Remove the old `wallLineCells` function and replace with `snapToEdge` + `wallLineEdges`**

Find and replace the entire `wallLineCells` block (lines ~234–246):

```jsx
// OLD — delete this entire function:
function wallLineCells(startCol, startRow, endIdx, dir) {
  ...
}
```

Replace with these two functions:

```jsx
function snapToEdge(point, cellIdx) {
  const cellCol = cellIdx % GRID;
  const cellRow = Math.floor(cellIdx / GRID);
  const fracX   = (point.x + HALF) / TILE - cellCol;
  const fracZ   = (point.z + HALF) / TILE - cellRow;
  const dLeft = fracX, dRight = 1 - fracX, dTop = fracZ, dBottom = 1 - fracZ;
  const minDist = Math.min(dLeft, dRight, dTop, dBottom);
  if (minDist > 0.4) return null;
  if (minDist === dLeft)   return { type: "v", idx: cellRow * (GRID + 1) + cellCol };
  if (minDist === dRight)  return { type: "v", idx: cellRow * (GRID + 1) + cellCol + 1 };
  if (minDist === dTop)    return { type: "h", idx: cellRow * GRID + cellCol };
  return                          { type: "h", idx: (cellRow + 1) * GRID + cellCol };
}

function wallLineEdges(anchorIdx, currentIdx, axis) {
  if (axis === "h") {
    const row = Math.floor(anchorIdx / GRID);
    const c0  = anchorIdx % GRID, c1 = currentIdx % GRID;
    const result = [];
    for (let c = Math.min(c0, c1); c <= Math.max(c0, c1); c++) result.push(row * GRID + c);
    return result;
  } else {
    const col = anchorIdx % (GRID + 1);
    const r0  = Math.floor(anchorIdx / (GRID + 1)), r1 = Math.floor(currentIdx / (GRID + 1));
    const result = [];
    for (let r = Math.min(r0, r1); r <= Math.max(r0, r1); r++) result.push(r * (GRID + 1) + col);
    return result;
  }
}
```

- [ ] **Step 2: Add `PANEL_CATEGORIES` constant (after `STAIR_URLS` line ~229)**

Find:
```jsx
const WALL_URLS  = new Set([...Object.values(ASSET_CATEGORIES.Walls), ...Object.values(ASSET_CATEGORIES.Doors)]);
const FLOOR_URLS = new Set(Object.values(ASSET_CATEGORIES.Floors));
const STAIR_URLS = new Set(Object.values(ASSET_CATEGORIES.Stairs));
```

Replace with:
```jsx
const WALL_URLS  = new Set([...Object.values(ASSET_CATEGORIES.Walls), ...Object.values(ASSET_CATEGORIES.Doors)]);
const FLOOR_URLS = new Set(Object.values(ASSET_CATEGORIES.Floors));
const STAIR_URLS = new Set(Object.values(ASSET_CATEGORIES.Stairs));

// Left panel shows all categories except Walls (walls use dedicated edge tool)
const PANEL_CATEGORIES = Object.fromEntries(
  Object.entries(ASSET_CATEGORIES).filter(([cat]) => cat !== "Walls")
);
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/gm/SceneMap3D.jsx
git commit -m "feat: add snapToEdge and wallLineEdges helpers, add PANEL_CATEGORIES"
```

---

### Task 2: Add edge state and refs

**Files:**
- Modify: `frontend/src/components/gm/SceneMap3D.jsx` (inside `SceneMap3D` component, around line 407 state declarations)

- [ ] **Step 1: Add hEdges/vEdges state and refs**

Find these lines in the state declarations block (~line 407–420):
```jsx
  const gridRef        = useRef(grid);
  const undoStack      = useRef([]);
  const redoStack      = useRef([]);
  const autoSaveTimer  = useRef(null);
  const lastSavedGrid  = useRef(null);
```

Replace with:
```jsx
  const gridRef        = useRef(grid);
  const hEdgesRef      = useRef(new Array(812).fill(false));
  const vEdgesRef      = useRef(new Array(812).fill(false));
  const undoStack      = useRef([]);
  const redoStack      = useRef([]);
  const autoSaveTimer  = useRef(null);
  const lastSavedGrid  = useRef(null);
```

Find these lines in the state declarations block (around line 407–420):
```jsx
  const [grid,           setGrid]           = useState(() => Array(GRID * GRID).fill(null));
  const [tool,           setTool]           = useState("place");
```

Replace with:
```jsx
  const [grid,           setGrid]           = useState(() => Array(GRID * GRID).fill(null));
  const [hEdges,         setHEdges]         = useState(() => new Array(812).fill(false));
  const [vEdges,         setVEdges]         = useState(() => new Array(812).fill(false));
  const [hoveredEdge,    setHoveredEdge]    = useState(null);
  const [previewEdges,   setPreviewEdges]   = useState([]);
  const [tool,           setTool]           = useState("place");
```

- [ ] **Step 2: Add applyHEdges and applyVEdges callbacks**

Find the `applyGrid` useCallback (around line 441):
```jsx
  const applyGrid = useCallback((updater) => {
    setGrid(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      gridRef.current = next;
      return next;
    });
  }, []);
```

After it (still inside SceneMap3D), add:
```jsx
  const applyHEdges = useCallback((arr) => {
    hEdgesRef.current = arr;
    setHEdges(arr);
  }, []);

  const applyVEdges = useCallback((arr) => {
    vEdgesRef.current = arr;
    setVEdges(arr);
  }, []);
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/gm/SceneMap3D.jsx
git commit -m "feat: add hEdges/vEdges state, refs, and apply callbacks"
```

---

### Task 3: Update undo/redo to snapshot edges

**Files:**
- Modify: `frontend/src/components/gm/SceneMap3D.jsx` (~line 450–469)

- [ ] **Step 1: Update `pushHistory`**

Find:
```jsx
  const pushHistory = useCallback(() => {
    undoStack.current = [...undoStack.current.slice(-39), [...gridRef.current]];
    redoStack.current = [];
  }, []);
```

Replace with:
```jsx
  const pushHistory = useCallback(() => {
    undoStack.current = [...undoStack.current.slice(-39), {
      grid:   [...gridRef.current],
      hEdges: [...hEdgesRef.current],
      vEdges: [...vEdgesRef.current],
    }];
    redoStack.current = [];
  }, []);
```

- [ ] **Step 2: Update `undo`**

Find:
```jsx
  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current[undoStack.current.length - 1];
    undoStack.current = undoStack.current.slice(0, -1);
    redoStack.current = [...redoStack.current, [...gridRef.current]];
    applyGrid([...prev]);
  }, [applyGrid]);
```

Replace with:
```jsx
  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current[undoStack.current.length - 1];
    undoStack.current = undoStack.current.slice(0, -1);
    redoStack.current = [...redoStack.current, {
      grid:   [...gridRef.current],
      hEdges: [...hEdgesRef.current],
      vEdges: [...vEdgesRef.current],
    }];
    applyGrid([...prev.grid]);
    applyHEdges([...prev.hEdges]);
    applyVEdges([...prev.vEdges]);
  }, [applyGrid, applyHEdges, applyVEdges]);
```

- [ ] **Step 3: Update `redo`**

Find:
```jsx
  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current[redoStack.current.length - 1];
    redoStack.current = redoStack.current.slice(0, -1);
    undoStack.current = [...undoStack.current, [...gridRef.current]];
    applyGrid([...next]);
  }, [applyGrid]);
```

Replace with:
```jsx
  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current[redoStack.current.length - 1];
    redoStack.current = redoStack.current.slice(0, -1);
    undoStack.current = [...undoStack.current, {
      grid:   [...gridRef.current],
      hEdges: [...hEdgesRef.current],
      vEdges: [...vEdgesRef.current],
    }];
    applyGrid([...next.grid]);
    applyHEdges([...next.hEdges]);
    applyVEdges([...next.vEdges]);
  }, [applyGrid, applyHEdges, applyVEdges]);
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/gm/SceneMap3D.jsx
git commit -m "feat: update undo/redo to snapshot hEdges and vEdges"
```

---

### Task 4: Add edge drag refs and callbacks

**Files:**
- Modify: `frontend/src/components/gm/SceneMap3D.jsx`

- [ ] **Step 1: Replace old wall drag refs with edge drag refs**

Find the drag refs block (~line 429–438):
```jsx
  // normal drag state
  const dragging        = useRef(false);
  const dragStart       = useRef(null);
  const wallLineDir     = useRef(null);   // "h" | "v" | null — locked on first off-origin cell
  const wallLineCurrent = useRef(null);   // last cell idx entered during wall drag
  const isWallDrag      = useRef(false);  // whether current drag is a wall line
```

Replace with:
```jsx
  // normal drag state
  const dragging    = useRef(false);
  const dragStart   = useRef(null);

  // edge wall drag state
  const wallAnchor  = useRef(null);   // { type: "h"|"v", idx: number } — snap target at mousedown
  const wallAxis    = useRef(null);   // "h" | "v" — locked for entire drag
  const wallPreview = useRef([]);     // [{ type, idx }, ...] — edges to commit on mouseup
```

- [ ] **Step 2: Add `applyEdgeLine` and `eraseEdge` callbacks**

Find the `applyWallLine` useCallback and replace it entirely with the two new callbacks:

Find:
```jsx
  const applyWallLine = useCallback((startIdx, endIdx, dir) => {
    if (!activeUrl) return;
    const startCol = startIdx % GRID, startRow = Math.floor(startIdx / GRID);
    const resolvedDir = dir ?? "h";
    const cells = wallLineCells(startCol, startRow, endIdx, resolvedDir);
    applyGrid(prev => {
      const next = [...prev];
      cells.forEach(i => {
        const cur = next[i] ? { ...next[i], walls: { ...next[i].walls } } : mkCell();
        if (resolvedDir === "h") cur.walls.h = { url: activeUrl, rotY: 0 };
        else                      cur.walls.v = { url: activeUrl, rotY: 0 };
        next[i] = cur;
      });
      return next;
    });
    setHighlightCells(new Set());
  }, [activeUrl, applyGrid]);
```

Replace with:
```jsx
  const applyEdgeLine = useCallback((edgeList) => {
    if (!edgeList || edgeList.length === 0) return;
    const hIdxs = edgeList.filter(e => e.type === "h").map(e => e.idx);
    const vIdxs = edgeList.filter(e => e.type === "v").map(e => e.idx);
    if (hIdxs.length > 0) {
      const next = [...hEdgesRef.current];
      hIdxs.forEach(i => { next[i] = true; });
      applyHEdges(next);
    }
    if (vIdxs.length > 0) {
      const next = [...vEdgesRef.current];
      vIdxs.forEach(i => { next[i] = true; });
      applyVEdges(next);
    }
    setPreviewEdges([]);
    wallPreview.current = [];
  }, [applyHEdges, applyVEdges]);

  const eraseEdge = useCallback((edge) => {
    if (!edge) return;
    if (edge.type === "h") {
      const next = [...hEdgesRef.current];
      next[edge.idx] = false;
      applyHEdges(next);
    } else {
      const next = [...vEdgesRef.current];
      next[edge.idx] = false;
      applyVEdges(next);
    }
  }, [applyHEdges, applyVEdges]);
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/gm/SceneMap3D.jsx
git commit -m "feat: add applyEdgeLine and eraseEdge callbacks, replace wall drag refs"
```

---

### Task 5: Add Wall Draw tool button and update panel

**Files:**
- Modify: `frontend/src/components/gm/SceneMap3D.jsx`

- [ ] **Step 1: Update the tool buttons in the topbar**

Find:
```jsx
          {["place", "erase"].map(t => (
            <button key={t} onClick={() => setTool(t)}
              className={`text-xs px-4 py-1.5 font-gothic tracking-wider rounded transition-colors ${
                tool === t ? "bg-blood-dark text-white" : "border border-void-border text-gray-500 hover:text-gray-300"
              }`}
            >
              {t === "place" ? "Place" : "Erase"}
            </button>
          ))}
```

Replace with:
```jsx
          {[
            { id: "place", label: "Place" },
            { id: "erase", label: "Erase" },
            { id: "wall",  label: "Draw Walls" },
          ].map(({ id, label }) => (
            <button key={id} onClick={() => setTool(id)}
              className={`text-xs px-4 py-1.5 font-gothic tracking-wider rounded transition-colors ${
                tool === id ? "bg-blood-dark text-white" : "border border-void-border text-gray-500 hover:text-gray-300"
              }`}
            >
              {label}
            </button>
          ))}
```

- [ ] **Step 2: Update the topbar status hint**

Find:
```jsx
        <span className="text-gray-600 text-xs font-gothic">
          {tool === "erase" ? "Erasing"
            : isFloor ? `Painting floor · ${Math.round(brushRotation * 180 / Math.PI)}°`
            : isWall  ? "Drawing wall"
            : activeUrl ? `Placing · ${Math.round(brushRotation * 180 / Math.PI)}° (R to rotate)`
            : "Select an asset"}
        </span>
```

Replace with:
```jsx
        <span className="text-gray-600 text-xs font-gothic">
          {tool === "erase" ? "Erasing"
            : tool === "wall" ? "Draw Walls · click edge to start line"
            : isFloor ? `Painting floor · ${Math.round(brushRotation * 180 / Math.PI)}°`
            : activeUrl ? `Placing · ${Math.round(brushRotation * 180 / Math.PI)}° (R to rotate)`
            : "Select an asset"}
        </span>
```

- [ ] **Step 3: Update the left panel to use PANEL_CATEGORIES**

Find the left panel categories render (starts around `{Object.entries(filteredCategories).map`):
```jsx
        {Object.entries(filteredCategories).map(([cat, items]) => (
```

This comes from `filteredCategories` which is built from `ASSET_CATEGORIES`. Update the `filteredCategories` computation to use `PANEL_CATEGORIES` instead. Find the `filteredCategories` useMemo/const (around line 476):

```jsx
  const filteredCategories = searchTerm.trim()
    ? Object.fromEntries(
        Object.entries(ASSET_CATEGORIES)
          .map(([cat, items]) => [
```

Replace `ASSET_CATEGORIES` with `PANEL_CATEGORIES` in two places inside that block:
```jsx
  const filteredCategories = searchTerm.trim()
    ? Object.fromEntries(
        Object.entries(PANEL_CATEGORIES)
          .map(([cat, items]) => [
            cat,
            Object.fromEntries(
              Object.entries(items).filter(([name]) =>
                name.toLowerCase().includes(searchTerm.toLowerCase())
              )
            ),
          ])
          .filter(([, items]) => Object.keys(items).length > 0)
      )
    : PANEL_CATEGORIES;
```

- [ ] **Step 4: Remove the `isWall` derived value**

Find:
```jsx
  const activeUrl = ASSET_CATEGORIES[activeCategory]?.[activeName] ?? null;
  const isWall    = activeUrl && WALL_URLS.has(activeUrl);
  const isFloor   = activeUrl && FLOOR_URLS.has(activeUrl);
```

Replace with:
```jsx
  const activeUrl = ASSET_CATEGORIES[activeCategory]?.[activeName] ?? null;
  const isFloor   = activeUrl && FLOOR_URLS.has(activeUrl);
```

- [ ] **Step 5: Update `paintCell` to remove isWall check**

Find:
```jsx
  const paintCell = (idx) => {
    if (!activeUrl || tool === "erase" || isWall) return;
```

Replace with:
```jsx
  const paintCell = (idx) => {
    if (!activeUrl || tool === "erase") return;
```

- [ ] **Step 6: Update `applyRectangle` to remove isWall check**

Find inside `applyRectangle`:
```jsx
    } else if (activeUrl && !isWall) {
```

Replace with:
```jsx
    } else if (activeUrl) {
```

- [ ] **Step 7: Update `ghostElement` to remove isWall reference**

Find:
```jsx
        <GhostTile url={activeUrl} x={x} z={z} rotY={isWall ? 0 : brushRotation} />
```

Replace with:
```jsx
        <GhostTile url={activeUrl} x={x} z={z} rotY={brushRotation} />
```

And update the `ghostElement` useMemo condition to also hide ghost in wall tool mode. Find:
```jsx
  const ghostElement = useMemo(() => {
    if (tool !== "place" || !activeUrl || hoveredIdx === null) return null;
```

This is already correct — `tool !== "place"` means ghost won't show in wall mode. ✓

- [ ] **Step 8: Update Clear button to also clear edges**

Find the Clear button onClick:
```jsx
            onClick={() => { pushHistory(); applyGrid(Array(GRID * GRID).fill(null)); }}
```

Replace with:
```jsx
            onClick={() => {
              pushHistory();
              applyGrid(Array(GRID * GRID).fill(null));
              applyHEdges(new Array(812).fill(false));
              applyVEdges(new Array(812).fill(false));
            }}
```

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/gm/SceneMap3D.jsx
git commit -m "feat: add wall draw tool button, remove Walls from panel, update clear"
```

---

### Task 6: Update HitPlane event signatures

**Files:**
- Modify: `frontend/src/components/gm/SceneMap3D.jsx` — `HitPlane` component (~line 311)

- [ ] **Step 1: Update HitPlane to pass event to onDelete and onHover**

Find the `HitPlane` component:
```jsx
function HitPlane({ x, z, idx, onDown, onDelete, onEnter, onHover, highlighted }) {
  const [hov, setHov] = useState(false);
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.03, z]}
      onPointerDown={e => { e.stopPropagation(); if (e.button === 2) onDelete(idx); else if (e.button === 0) onDown(e, idx); }}
      onPointerEnter={e => { e.stopPropagation(); setHov(true); onHover(idx); if (e.buttons === 1) onEnter(idx); }}
      onPointerLeave={() => { setHov(false); onHover(null); }}
    >
```

Replace with:
```jsx
function HitPlane({ x, z, idx, onDown, onDelete, onEnter, onHover, highlighted }) {
  const [hov, setHov] = useState(false);
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.03, z]}
      onPointerDown={e => { e.stopPropagation(); if (e.button === 2) onDelete(e, idx); else if (e.button === 0) onDown(e, idx); }}
      onPointerEnter={e => { e.stopPropagation(); setHov(true); onHover(e, idx); if (e.buttons === 1) onEnter(idx); }}
      onPointerLeave={() => { setHov(false); onHover(null, null); }}
    >
```

Changes: `onDelete(idx)` → `onDelete(e, idx)`, `onHover(idx)` → `onHover(e, idx)`, `onHover(null)` → `onHover(null, null)`. `onEnter(idx)` stays the same.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/gm/SceneMap3D.jsx
git commit -m "feat: update HitPlane to pass event to onDelete and onHover"
```

---

### Task 7: Rewrite drag event handlers

**Files:**
- Modify: `frontend/src/components/gm/SceneMap3D.jsx` — `handleDown`, `handleEnter`, and add `handleHover`/`handleDelete`; update the `up` and `onKey` listeners

- [ ] **Step 1: Replace `handleDown`**

Find the `handleDown` function (~line 607):
```jsx
  const handleDown = (e, idx) => {
    if (e.shiftKey) {
      shiftDragStart.current = idx;
      shiftDragEnd.current   = idx;
      setHighlightCells(new Set([idx]));
      return;
    }
    pushHistory();
    if (tool === "erase") { eraseCell(idx); return; }
    dragging.current  = true;
    dragStart.current = { col: idx % GRID, row: Math.floor(idx / GRID), idx };
    if (isWall) {
      isWallDrag.current      = true;
      wallLineDir.current     = null;
      wallLineCurrent.current = idx;
      setHighlightCells(new Set([idx]));
    } else {
      isWallDrag.current = false;
      paintCell(idx);
    }
  };
```

Replace with:
```jsx
  const handleDown = (e, idx) => {
    if (e.shiftKey) {
      shiftDragStart.current = idx;
      shiftDragEnd.current   = idx;
      setHighlightCells(new Set([idx]));
      return;
    }
    pushHistory();
    if (tool === "erase") { eraseCell(idx); return; }
    if (tool === "wall") {
      const edge = snapToEdge(e.point, idx);
      if (!edge) return;
      wallAnchor.current = edge;
      wallAxis.current   = edge.type;
      wallPreview.current = [edge];
      setPreviewEdges([edge]);
      return;
    }
    dragging.current  = true;
    dragStart.current = { col: idx % GRID, row: Math.floor(idx / GRID), idx };
    paintCell(idx);
  };
```

- [ ] **Step 2: Replace `handleEnter`**

Find the `handleEnter` function (~line 629):
```jsx
  const handleEnter = (idx) => {
    if (shiftDragStart.current !== null) {
      shiftDragEnd.current = idx;
      const c1 = shiftDragStart.current % GRID, r1 = Math.floor(shiftDragStart.current / GRID);
      const c2 = idx % GRID,                    r2 = Math.floor(idx / GRID);
      const minC = Math.min(c1, c2), maxC = Math.max(c1, c2);
      const minR = Math.min(r1, r2), maxR = Math.max(r1, r2);
      const cells = new Set();
      for (let r = minR; r <= maxR; r++)
        for (let c = minC; c <= maxC; c++)
          cells.add(r * GRID + c);
      setHighlightCells(cells);
      return;
    }
    if (tool === "erase") { eraseCell(idx); return; }
    if (!dragging.current || !dragStart.current) return;

    if (isWallDrag.current) {
      const col = idx % GRID, row = Math.floor(idx / GRID);
      const dc = col - dragStart.current.col, dr = row - dragStart.current.row;
      if (!wallLineDir.current && (dc !== 0 || dr !== 0)) {
        wallLineDir.current = Math.abs(dc) >= Math.abs(dr) ? "h" : "v";
      }
      wallLineCurrent.current = idx;
      if (wallLineDir.current) {
        setHighlightCells(wallLineCells(dragStart.current.col, dragStart.current.row, idx, wallLineDir.current));
      }
      return;
    }

    paintCell(idx);
  };
```

Replace with:
```jsx
  const handleEnter = (idx) => {
    if (shiftDragStart.current !== null) {
      shiftDragEnd.current = idx;
      const c1 = shiftDragStart.current % GRID, r1 = Math.floor(shiftDragStart.current / GRID);
      const c2 = idx % GRID,                    r2 = Math.floor(idx / GRID);
      const minC = Math.min(c1, c2), maxC = Math.max(c1, c2);
      const minR = Math.min(r1, r2), maxR = Math.max(r1, r2);
      const cells = new Set();
      for (let r = minR; r <= maxR; r++)
        for (let c = minC; c <= maxC; c++)
          cells.add(r * GRID + c);
      setHighlightCells(cells);
      return;
    }
    if (tool === "erase") { eraseCell(idx); return; }

    if (tool === "wall" && wallAnchor.current) {
      const cellCol = idx % GRID, cellRow = Math.floor(idx / GRID);
      let currentEdgeIdx;
      if (wallAxis.current === "h") {
        const anchorRow = Math.floor(wallAnchor.current.idx / GRID);
        currentEdgeIdx = anchorRow * GRID + cellCol;
      } else {
        const anchorCol = wallAnchor.current.idx % (GRID + 1);
        currentEdgeIdx = cellRow * (GRID + 1) + anchorCol;
      }
      const edgeIdxs = wallLineEdges(wallAnchor.current.idx, currentEdgeIdx, wallAxis.current);
      const preview  = edgeIdxs.map(i => ({ type: wallAxis.current, idx: i }));
      setPreviewEdges(preview);
      wallPreview.current = preview;
      return;
    }

    if (!dragging.current || !dragStart.current) return;
    paintCell(idx);
  };
```

- [ ] **Step 3: Add `handleHover` and `handleDelete` functions**

After `handleEnter`, add these two new functions:

```jsx
  const handleHover = (e, idx) => {
    setHoveredIdx(idx);
    if (tool === "wall" && idx !== null && e) {
      setHoveredEdge(snapToEdge(e.point, idx));
    } else {
      setHoveredEdge(null);
    }
  };

  const handleDelete = (e, idx) => {
    if (tool === "wall") {
      const edge = snapToEdge(e.point, idx);
      if (!edge) return;
      pushHistory();
      eraseEdge(edge);
    } else {
      eraseCell(idx);
    }
  };
```

- [ ] **Step 4: Update the `up` handler inside the keyboard/pointerup useEffect**

Find the `up` function inside the useEffect (~line 664):
```jsx
    const up = () => {
      if (shiftDragStart.current !== null && shiftDragEnd.current !== null) {
        applyRectangle(shiftDragStart.current, shiftDragEnd.current);
        return;
      }
      if (isWallDrag.current && dragStart.current) {
        applyWallLine(
          dragStart.current.idx,
          wallLineCurrent.current ?? dragStart.current.idx,
          wallLineDir.current
        );
      }
      dragging.current        = false;
      dragStart.current       = null;
      isWallDrag.current      = false;
      wallLineDir.current     = null;
      wallLineCurrent.current = null;
      setHighlightCells(new Set());
    };
```

Replace with:
```jsx
    const up = () => {
      if (shiftDragStart.current !== null && shiftDragEnd.current !== null) {
        applyRectangle(shiftDragStart.current, shiftDragEnd.current);
        return;
      }
      if (wallAnchor.current && wallPreview.current.length > 0) {
        applyEdgeLine(wallPreview.current);
      }
      wallAnchor.current  = null;
      wallAxis.current    = null;
      wallPreview.current = [];
      setPreviewEdges([]);
      dragging.current  = false;
      dragStart.current = null;
      setHighlightCells(new Set());
    };
```

- [ ] **Step 5: Update the useEffect dependency array for the keyboard/pointerup effect**

Find:
```jsx
  }, [undo, redo, applyRectangle, applyWallLine]);
```

Replace with:
```jsx
  }, [undo, redo, applyRectangle, applyEdgeLine]);
```

- [ ] **Step 6: Update Scene usage in JSX — pass new handlers**

Find the `<Scene` JSX block (~line 872):
```jsx
            <Scene
              grid={grid}
              onDown={handleDown}
              onDelete={eraseCell}
              onEnter={handleEnter}
              onHover={setHoveredIdx}
              ghost={ghostElement}
              highlightCells={highlightCells}
              hdri={hdri}
              fogDensity={fogDensity}
              hour={hour}
            />
```

Replace with:
```jsx
            <Scene
              grid={grid}
              hEdges={hEdges}
              vEdges={vEdges}
              previewEdges={previewEdges}
              hoveredEdge={hoveredEdge}
              onDown={handleDown}
              onDelete={handleDelete}
              onEnter={handleEnter}
              onHover={handleHover}
              ghost={ghostElement}
              highlightCells={highlightCells}
              hdri={hdri}
              fogDensity={fogDensity}
              hour={hour}
            />
```

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/gm/SceneMap3D.jsx
git commit -m "feat: rewrite drag handlers for edge-based wall draw"
```

---

### Task 8: Add EdgeWalls and EdgePreview components, update CellMeshes and Scene

**Files:**
- Modify: `frontend/src/components/gm/SceneMap3D.jsx`

- [ ] **Step 1: Update `CellMeshes` to stop rendering wall slots**

Find the `CellMeshes` component:
```jsx
function CellMeshes({ cell, x, z }) {
  if (!cell) return null;
  return (
    <group>
      {cell.floor    && <Suspense fallback={null}><Tile url={cell.floor.url}    x={x} z={z} rotY={cell.floor.rotY ?? 0} /></Suspense>}
      {cell.walls?.h && <Suspense fallback={null}><Tile url={cell.walls.h.url}  x={x} z={z - TILE * 0.5} rotY={0} /></Suspense>}
      {cell.walls?.v && <Suspense fallback={null}><Tile url={cell.walls.v.url}  x={x - TILE * 0.5} z={z} rotY={Math.PI / 2} /></Suspense>}
      {cell.object   && <Suspense fallback={null}><Tile url={cell.object.url}   x={x} z={z} rotY={cell.object.rotY ?? 0} /></Suspense>}
    </group>
  );
}
```

Replace with:
```jsx
function CellMeshes({ cell, x, z }) {
  if (!cell) return null;
  return (
    <group>
      {cell.floor  && <Suspense fallback={null}><Tile url={cell.floor.url}  x={x} z={z} rotY={cell.floor.rotY ?? 0} /></Suspense>}
      {cell.object && <Suspense fallback={null}><Tile url={cell.object.url} x={x} z={z} rotY={cell.object.rotY ?? 0} /></Suspense>}
    </group>
  );
}
```

- [ ] **Step 2: Add `EdgeWalls` component**

After the `CellMeshes` function, add:

```jsx
// ── edge walls ────────────────────────────────────────────────────────────────
function EdgeWalls({ hEdges, vEdges }) {
  const wallUrl = ASSET_CATEGORIES.Walls["Stone"];
  return (
    <>
      {hEdges.map((on, i) => {
        if (!on) return null;
        const r = Math.floor(i / GRID), c = i % GRID;
        return (
          <Suspense key={`h${i}`} fallback={null}>
            <Tile url={wallUrl} x={(c + 0.5) * TILE - HALF} z={r * TILE - HALF} rotY={0} />
          </Suspense>
        );
      })}
      {vEdges.map((on, i) => {
        if (!on) return null;
        const r = Math.floor(i / (GRID + 1)), c = i % (GRID + 1);
        return (
          <Suspense key={`v${i}`} fallback={null}>
            <Tile url={wallUrl} x={c * TILE - HALF} z={(r + 0.5) * TILE - HALF} rotY={Math.PI / 2} />
          </Suspense>
        );
      })}
    </>
  );
}
```

- [ ] **Step 3: Add `EdgePreview` component**

After `EdgeWalls`, add:

```jsx
// ── edge preview (drag highlight + hover hint) ────────────────────────────────
function EdgePreview({ previewEdges, hoveredEdge }) {
  const edgeToWorld = (type, idx) => {
    if (type === "h") {
      const r = Math.floor(idx / GRID), c = idx % GRID;
      return { x: (c + 0.5) * TILE - HALF, z: r * TILE - HALF, w: TILE, d: TILE * 0.1 };
    }
    const r = Math.floor(idx / (GRID + 1)), c = idx % (GRID + 1);
    return { x: c * TILE - HALF, z: (r + 0.5) * TILE - HALF, w: TILE * 0.1, d: TILE };
  };
  return (
    <>
      {previewEdges.map(({ type, idx }) => {
        const { x, z, w, d } = edgeToWorld(type, idx);
        return (
          <mesh key={`pre-${type}${idx}`} position={[x, 0.02, z]}>
            <boxGeometry args={[w, 0.006, d]} />
            <meshBasicMaterial color="#DC143C" transparent opacity={0.85} />
          </mesh>
        );
      })}
      {hoveredEdge && previewEdges.length === 0 && (() => {
        const { x, z, w, d } = edgeToWorld(hoveredEdge.type, hoveredEdge.idx);
        return (
          <mesh position={[x, 0.02, z]}>
            <boxGeometry args={[w, 0.006, d]} />
            <meshBasicMaterial color="#ffdd44" transparent opacity={0.5} />
          </mesh>
        );
      })()}
    </>
  );
}
```

- [ ] **Step 4: Update the `Scene` component to accept and render edges**

Find the `Scene` function signature:
```jsx
function Scene({ grid, onDown, onDelete, onEnter, onHover, ghost, highlightCells, hdri, fogDensity, hour }) {
```

Replace with:
```jsx
function Scene({ grid, hEdges, vEdges, previewEdges, hoveredEdge, onDown, onDelete, onEnter, onHover, ghost, highlightCells, hdri, fogDensity, hour }) {
```

Find the closing `{ghost}` line and the `</>` that closes Scene's return:
```jsx
      {ghost}
    </>
  );
}
```

Replace with:
```jsx
      <EdgeWalls hEdges={hEdges} vEdges={vEdges} />
      <EdgePreview previewEdges={previewEdges} hoveredEdge={hoveredEdge} />
      {ghost}
    </>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/gm/SceneMap3D.jsx
git commit -m "feat: add EdgeWalls and EdgePreview components, remove old wall cell rendering"
```

---

### Task 9: Update save/load to use {grid, hEdges, vEdges} format

**Files:**
- Modify: `frontend/src/components/gm/SceneMap3D.jsx`
- Modify: `backend/app/routers/scenes.py`

- [ ] **Step 1: Update the fetch-on-mount effect**

Find:
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
  }, [groupId]); // eslint-disable-line react-hooks/exhaustive-deps
```

Replace with:
```jsx
  useEffect(() => {
    if (!groupId) return;
    api.get(`/api/scenes/${groupId}`)
      .then(res => {
        setSceneName(res.data.name);
        const d = res.data.data;
        if (Array.isArray(d)) {
          // old format: grid array only
          if (d.length > 0) applyGrid(d);
        } else if (d && typeof d === "object") {
          // new format: { grid, hEdges, vEdges }
          if (Array.isArray(d.grid)   && d.grid.length > 0)   applyGrid(d.grid);
          if (Array.isArray(d.hEdges) && d.hEdges.length > 0) { hEdgesRef.current = d.hEdges; setHEdges(d.hEdges); }
          if (Array.isArray(d.vEdges) && d.vEdges.length > 0) { vEdgesRef.current = d.vEdges; setVEdges(d.vEdges); }
        }
      })
      .catch(() => {});
  }, [groupId]); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 2: Update the auto-save effect**

Find:
```jsx
  useEffect(() => {
    if (!groupId) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      const current = JSON.stringify(gridRef.current);
      if (current === lastSavedGrid.current) return;
      try {
        await api.put(`/api/scenes/${groupId}`, { name: sceneName, data: gridRef.current });
        lastSavedGrid.current = current;
      } catch {
        // silent fail on auto-save
      }
    }, 30000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [grid, groupId, sceneName]); // eslint-disable-line react-hooks/exhaustive-deps
```

Replace with:
```jsx
  useEffect(() => {
    if (!groupId) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      const saveData = { grid: gridRef.current, hEdges: hEdgesRef.current, vEdges: vEdgesRef.current };
      const current  = JSON.stringify(saveData);
      if (current === lastSavedGrid.current) return;
      try {
        await api.put(`/api/scenes/${groupId}`, { name: sceneName, data: saveData });
        lastSavedGrid.current = current;
      } catch {
        // silent fail on auto-save
      }
    }, 30000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [grid, hEdges, vEdges, groupId, sceneName]); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 3: Update the manual `saveScene` function**

Find:
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

Replace with:
```jsx
  const saveScene = async () => {
    if (!groupId) { toast.error("No group ID — open Scene Maker from your GM dashboard."); return; }
    setSaving(true);
    try {
      const saveData = { grid: gridRef.current, hEdges: hEdgesRef.current, vEdges: vEdgesRef.current };
      await api.put(`/api/scenes/${groupId}`, { name: sceneName, data: saveData });
      lastSavedGrid.current = JSON.stringify(saveData);
      toast.success("Scene saved.");
    } catch {
      toast.error("Failed to save scene.");
    } finally {
      setSaving(false);
    }
  };
```

- [ ] **Step 4: Update backend scenes.py — change data type from List[Any] to Any**

Open `backend/app/routers/scenes.py`. Find:

```python
class SceneSave(BaseModel):
    name: str
    data: List[Any]


class SceneOut(BaseModel):
    id:         int
    group_id:   int
    name:       str
    data:       List[Any]
    updated_at: datetime
```

Replace with:

```python
class SceneSave(BaseModel):
    name: str
    data: Any


class SceneOut(BaseModel):
    id:         int
    group_id:   int
    name:       str
    data:       Any
    updated_at: datetime
```

The `List` import in `from typing import List, Any` can be cleaned up — remove `List`:

```python
from typing import Any
```

- [ ] **Step 5: Commit both files**

```bash
git add frontend/src/components/gm/SceneMap3D.jsx backend/app/routers/scenes.py
git commit -m "feat: update save/load to use {grid,hEdges,vEdges} format; backend data: Any"
```

---

### Task 10: Rebuild and verify

- [ ] **Step 1: Rebuild frontend and backend**

```bash
docker compose up --build -d
```

Wait for build to finish (usually 60–90 seconds). Check logs:
```bash
docker compose logs frontend --tail=20
docker compose logs backend --tail=20
```

Expected: both containers show "started" / "Application startup complete" with no errors.

- [ ] **Step 2: Open Scene Maker and verify wall tool appears**

Open `http://localhost:5173`, log in as GM, open a group, click "Scene Maker".

Expected: topbar shows **Place | Erase | Draw Walls** buttons. Left panel has no "Walls" category (Doors, Floors, Stairs, Furniture, etc. remain).

- [ ] **Step 3: Verify floor and object placement still work**

1. Click "Place", select Floors → Stone Tile
2. Left-click cells — floor tiles appear
3. Select Props → Key, place it — object appears on floor
4. Shift+drag a rectangle of stone tiles — fills correctly
5. Ctrl+Z — undoes last action

Expected: all placement tools work as before.

- [ ] **Step 4: Verify edge wall draw**

1. Click "Draw Walls"
2. Hover over a cell edge — a faint yellow highlight appears on the nearest edge
3. Click near the top edge of a cell — a red dot/line appears (anchor set)
4. Drag horizontally across several cells — a red line preview appears along the top row of edges
5. Release — stone walls appear along the drawn line
6. Click near the left edge of another cell — anchor set to vertical
7. Drag vertically — red preview appears going up/down
8. Release — stone walls appear vertically

Expected: walls snap to edges, render as stone wall segments between cells.

- [ ] **Step 5: Verify right-click edge erase**

1. In Draw Walls mode, right-click on an existing wall edge (hover until yellow snap shows, then right-click)

Expected: that single wall segment disappears.

- [ ] **Step 6: Verify undo/redo includes edges**

1. Draw a wall line
2. Ctrl+Z — walls disappear
3. Ctrl+Y — walls reappear

Expected: undo/redo works for edge walls.

- [ ] **Step 7: Verify save/load**

1. Draw some walls, place some floors
2. Click Save — "Scene saved." toast appears
3. Close and reopen Scene Maker (navigate away and back)
4. Verify walls and floors load correctly

Expected: both grid cells and edge walls persist across page reload.

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "feat: edge-based wall system complete — draw walls on cell boundaries"
```

---

## Summary of Changes

| Component | What Changed |
|---|---|
| `snapToEdge()` | New helper: given world point + cell idx, returns nearest edge `{type,idx}` or null |
| `wallLineEdges()` | Replaced `wallLineCells()`: returns edge indices along locked axis from anchor to current |
| `PANEL_CATEGORIES` | New constant: ASSET_CATEGORIES minus Walls, used for left panel |
| `hEdges/vEdges` state | Two new bool[812] arrays tracking which edges have walls |
| `hEdgesRef/vEdgesRef` | Mirror refs for undo stack + save (avoid stale closure) |
| `pushHistory/undo/redo` | Snapshots now `{grid,hEdges,vEdges}` |
| `applyEdgeLine` | Commits a list of `{type,idx}` edges to the edge arrays |
| `eraseEdge` | Sets a single edge to false |
| Wall draw tool | "Draw Walls" button added; tool="wall" state drives edge interaction |
| `HitPlane` | `onDelete(e,idx)`, `onHover(e,idx)` — now pass event for world-space snap |
| `handleDown` | Wall tool branch: snap anchor edge, start preview |
| `handleEnter` | Wall tool branch: extend preview along locked axis using cell idx |
| `handleHover` | New: updates `hoveredEdge` for yellow snap hint |
| `handleDelete` | New: routes right-click to edge erase or cell erase based on tool |
| `CellMeshes` | Removed `walls.h` and `walls.v` rendering (old wall cells silently ignored) |
| `EdgeWalls` | New component: renders `wall.gltf.glb` at each true edge position |
| `EdgePreview` | New component: red preview boxes during drag, yellow hover hint |
| `Scene` | Accepts and renders EdgeWalls + EdgePreview |
| Save/load | Frontend sends `{grid,hEdges,vEdges}`; loads old array format for compat |
| `scenes.py` | `data: Any` instead of `data: List[Any]` in both Pydantic schemas |
