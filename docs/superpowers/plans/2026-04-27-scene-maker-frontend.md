# Scene Maker Frontend Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the 3D Scene Maker with design consistency, asset search, undo/redo, rotation, ghost preview, rectangle fill, and post-processing visual quality.

**Architecture:** All changes are in `SceneMap3D.jsx`. Tasks are sequential — each one adds state/components on top of the previous. Post-processing is added last as an isolated visual layer. No backend changes in this plan (save/load is Plan B).

**Tech Stack:** React, @react-three/fiber, @react-three/drei, @react-three/postprocessing, TailwindCSS (existing), Cinzel + Inter fonts (existing).

---

## File Map

| File | Change |
|---|---|
| `frontend/src/components/gm/SceneMap3D.jsx` | All tasks — main component |
| `frontend/package.json` | Task 7 only — add `@react-three/postprocessing` |

---

## Task 1: Design Revert — Strip Gothic CSS, Apply VTM Design System

**Files:**
- Modify: `frontend/src/components/gm/SceneMap3D.jsx`

- [ ] **Step 1: Remove the GOTHIC_CSS constant and style injection**

Delete the entire `GOTHIC_CSS` constant (the template literal starting at `const GOTHIC_CSS = \`` that contains all the `.sm-*` rules) and the `<style>{GOTHIC_CSS}</style>` JSX line inside the return.

- [ ] **Step 2: Remove the CornerOrn component and its usage**

Delete the `CornerOrn` component definition (the `const CornerOrn = () => (...)` function). Then inside `<main>`, delete the block that renders the 4 corner ornaments:

```jsx
// DELETE this entire block:
{[["tl","top:10px;left:10px"], ...].map(([k, s]) => (
  <div key={k} style={{ ... }}>
    <CornerOrn />
  </div>
))}
```

- [ ] **Step 3: Replace the main layout div**

Change the outermost `<div className="sm-app" style={{ height: "100vh", display: "grid", ... }}>` to:

```jsx
<div style={{ height: "100vh", display: "grid", gridTemplateRows: "52px 1fr", gridTemplateColumns: "220px 1fr 200px", gridTemplateAreas: `"topbar topbar topbar" "left stage right"`, background: "#0a0a0a", color: "#e0e0e0" }}>
```

- [ ] **Step 4: Replace the topbar**

Replace the entire topbar `<div style={{ gridArea: "topbar", ... }}>...</div>` with:

```jsx
<div className="flex items-center justify-between px-4 border-b border-void-border bg-void-light" style={{ gridArea: "topbar" }}>
  <span className="font-gothic text-blood text-sm tracking-widest">Scene Maker</span>

  <div className="flex items-center gap-2">
    <span className="text-gray-500 text-xs">{activeCategory} · {activeName}</span>
    <div className="w-px h-4 bg-void-border mx-2" />
    {["place", "erase"].map(t => (
      <button key={t} onClick={() => setTool(t)}
        className={`text-xs px-4 py-1.5 font-gothic tracking-wider rounded transition-colors ${
          tool === t
            ? "bg-blood-dark text-white"
            : "border border-void-border text-gray-500 hover:text-gray-300"
        }`}
      >
        {t === "place" ? "Place" : "Erase"}
      </button>
    ))}
    <button
      onClick={() => setGrid(Array(GRID * GRID).fill(null))}
      className="text-xs px-4 py-1.5 font-gothic tracking-wider rounded border border-void-border text-gray-500 hover:text-blood hover:border-blood transition-colors ml-1"
    >
      Clear
    </button>
  </div>

  <span className="text-gray-600 text-xs font-gothic">
    {tool === "erase" ? "Erasing"
      : isFloor ? "Painting floor"
      : isWall  ? "Drawing wall"
      : activeUrl ? "Placing object"
      : "Select an asset"}
  </span>
</div>
```

- [ ] **Step 5: Replace the left panel (Assets)**

Replace the entire `<aside className="sm-panel-scroll" style={{ gridArea: "left", ... }}>` with:

```jsx
<aside style={{ gridArea: "left", borderRight: "1px solid #2a2a2a", background: "#0a0a0a", overflowY: "auto", overflowX: "hidden" }}>
  <div className="px-3 py-3 border-b border-void-border sticky top-0 bg-void z-10">
    <div className="font-gothic text-blood text-xs tracking-widest uppercase mb-2">Assets</div>
  </div>

  {Object.entries(ASSET_CATEGORIES).map(([cat, items]) => (
    <div key={cat}>
      <button
        className={`w-full text-left px-3 py-2 font-gothic text-xs tracking-wider uppercase transition-colors border-l-2 ${
          activeCategory === cat
            ? "text-blood border-blood bg-void-light"
            : "text-gray-500 border-transparent hover:text-gray-300"
        }`}
        onClick={() => { setActiveCategory(cat); setActiveName(Object.keys(items)[0]); setTool("place"); }}
      >
        {cat}
      </button>
      {activeCategory === cat && (
        <div className="pb-1">
          {Object.keys(items).map(name => (
            <button
              key={name}
              className={`block w-full text-left px-4 py-1 text-xs transition-colors border-l-2 ${
                activeName === name
                  ? "text-blood border-blood-dark bg-void-mid"
                  : "text-gray-500 border-transparent hover:text-gray-300"
              }`}
              onClick={() => { setActiveName(name); setTool("place"); }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  ))}
  <div className="h-6" />
</aside>
```

- [ ] **Step 6: Replace the right panel (Atmosphere)**

Replace the entire `<aside className="sm-panel-scroll" style={{ gridArea: "right", ... }}>` with:

```jsx
<aside style={{ gridArea: "right", borderLeft: "1px solid #2a2a2a", background: "#0a0a0a", overflowY: "auto", overflowX: "hidden" }}>
  <div className="px-3 py-3 border-b border-void-border sticky top-0 bg-void z-10">
    <div className="font-gothic text-blood text-xs tracking-widest uppercase">Atmosphere</div>
  </div>

  <div className="px-3 py-3 flex flex-col gap-5">

    <div>
      <div className="font-gothic text-gray-500 text-xs uppercase tracking-wider mb-2">Time of Night</div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>Hour</span>
        <span className="text-gray-300">{hourLabel}</span>
      </div>
      <input type="range" min={0} max={23} step={1} value={hour}
        onChange={e => setHour(Number(e.target.value))}
        className="w-full accent-blood cursor-pointer"
      />
    </div>

    <div>
      <div className="font-gothic text-gray-500 text-xs uppercase tracking-wider mb-2">Fog Density</div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>Density</span>
        <span className="text-gray-300">{Math.round(fogDensity * 100)}%</span>
      </div>
      <input type="range" min={0} max={60} step={1} value={Math.round(fogDensity * 100)}
        onChange={e => setFogDensity(Number(e.target.value) / 100)}
        className="w-full accent-blood cursor-pointer"
      />
    </div>

    <div>
      <div className="font-gothic text-gray-500 text-xs uppercase tracking-wider mb-2">Sky / HDRI</div>
      {Object.entries(HDRI_PRESETS).map(([label, val]) => (
        <button
          key={label}
          className={`block w-full text-left px-3 py-1 text-xs transition-colors border-l-2 ${
            (hdri ?? "none") === (val ?? "none")
              ? "text-blood border-blood-dark bg-void-mid"
              : "text-gray-500 border-transparent hover:text-gray-300"
          }`}
          onClick={() => setHdri(val)}
        >
          {label}
        </button>
      ))}
    </div>

  </div>
</aside>
```

- [ ] **Step 7: Replace the bottom bar inside `<main>`**

Delete the old bottom controls bar `<div style={{ position: "absolute", bottom: 12, ... }}>` and the Scene title overlay `<div style={{ position: "absolute", top: 14, ... }}>`. Replace with a single clean bottom bar:

```jsx
<div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-center gap-3 bg-void-light border border-void-border rounded px-4 py-1.5">
  {isFloor && (
    <button onClick={fillFloor}
      className="text-xs font-gothic tracking-wider border border-void-border text-gray-400 hover:text-gray-200 px-3 py-1 rounded transition-colors">
      Fill Floor
    </button>
  )}
  <span className="text-gray-600 text-xs">Left-click place · Right-click delete · Middle-drag pan · Scroll zoom</span>
</div>
```

- [ ] **Step 8: Remove the "Scene in progress" pulse dot**

This was in the topbar — already gone since we replaced the topbar in Step 4.

Also remove any remaining `className="sm-*"` references. Search for `sm-` in the file to confirm none remain.

- [ ] **Step 9: Visual test**

```bash
# In frontend directory
docker compose up --build -d frontend
```

Open `http://localhost:5173/scene-3d`. Confirm:
- Black background, Cinzel headers, blood-red accents
- No gold colours, no Cormorant font, no corner ornaments
- Asset list on left, atmosphere on right
- Place/Erase/Clear buttons work

---

## Task 2: Asset Search / Filter

**Files:**
- Modify: `frontend/src/components/gm/SceneMap3D.jsx`

- [ ] **Step 1: Add searchTerm state**

In the state block near the top of `SceneMap3D`:

```jsx
const [searchTerm, setSearchTerm] = useState("");
```

- [ ] **Step 2: Add filtered categories computation**

After the existing `activeUrl`, `isWall`, `isFloor` derivations, add:

```jsx
const filteredCategories = searchTerm.trim()
  ? Object.fromEntries(
      Object.entries(ASSET_CATEGORIES)
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
  : ASSET_CATEGORIES;
```

- [ ] **Step 3: Add search input to the left panel**

Inside the left panel `<aside>`, right below the "Assets" header div and above `Object.entries(ASSET_CATEGORIES).map(...)`:

```jsx
<div className="px-3 pb-2 border-b border-void-border">
  <div className="relative">
    <input
      type="text"
      value={searchTerm}
      onChange={e => setSearchTerm(e.target.value)}
      placeholder="Search assets..."
      className="w-full bg-void-mid border border-void-border rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blood"
    />
    {searchTerm && (
      <button
        onClick={() => setSearchTerm("")}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
      >
        ×
      </button>
    )}
  </div>
</div>
```

- [ ] **Step 4: Use filteredCategories in the asset list**

In the left panel, change `Object.entries(ASSET_CATEGORIES).map(...)` to `Object.entries(filteredCategories).map(...)`.

When a search is active and `activeCategory` has no results, auto-select the first matching category. Add this effect:

```jsx
useEffect(() => {
  if (!searchTerm.trim()) return;
  const cats = Object.keys(filteredCategories);
  if (cats.length > 0 && !filteredCategories[activeCategory]) {
    const firstCat = cats[0];
    setActiveCategory(firstCat);
    setActiveName(Object.keys(filteredCategories[firstCat])[0]);
  }
}, [searchTerm]);
```

- [ ] **Step 5: Test**

Open `http://localhost:5173/scene-3d`. Type "torch" in the search box — only Lighting category with torch items should show. Type "chair" — only Furniture with chair. Clear the input — full list returns.

---

## Task 3: Cell Data Structure + Object Rotation (R Key)

**Files:**
- Modify: `frontend/src/components/gm/SceneMap3D.jsx`

- [ ] **Step 1: Add brushRotation state**

```jsx
const [brushRotation, setBrushRotation] = useState(0);
```

- [ ] **Step 2: Update paintCell to store rotY on each placed item**

Replace the existing `paintCell` function:

```jsx
const paintCell = (idx, dir) => {
  if (!activeUrl || tool === "erase") return;
  setGrid(prev => {
    const next = [...prev];
    const cur  = next[idx] ? { ...next[idx], walls: { ...next[idx].walls } } : mkCell();
    if (isFloor) {
      cur.floor = { url: activeUrl, rotY: brushRotation };
      next[idx] = cur;
      return next;
    }
    if (isWall) {
      if (dir === "h") cur.walls.h = { url: activeUrl, rotY: 0 };
      else              cur.walls.v = { url: activeUrl, rotY: 0 };
      next[idx] = isEmpty(cur) ? null : cur;
      return next;
    }
    cur.object = { url: activeUrl, rotY: brushRotation };
    next[idx] = cur;
    return next;
  });
};
```

Note: Walls ignore `brushRotation` — their orientation is controlled by drag direction (h/v).

- [ ] **Step 3: Update CellMeshes to read rotY from cell data**

Replace the existing `CellMeshes` component:

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

- [ ] **Step 4: Add R key listener for rotation cycling**

Inside the existing `useEffect` that adds the `pointerup` listener, add an R key handler alongside it:

```jsx
useEffect(() => {
  const up = () => { dragging.current = false; dragStart.current = null; dirLocked.current = false; };
  const onKey = (e) => {
    if (e.target.tagName === "INPUT") return;
    if (e.key === "r" || e.key === "R") {
      setBrushRotation(prev => {
        const steps = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
        const idx = steps.findIndex(v => Math.abs(v - prev) < 0.01);
        return steps[(idx + 1) % 4];
      });
    }
  };
  window.addEventListener("pointerup", up);
  window.addEventListener("keydown", onKey);
  return () => {
    window.removeEventListener("pointerup", up);
    window.removeEventListener("keydown", onKey);
  };
}, []);
```

- [ ] **Step 5: Show rotation in the topbar status label**

Update the topbar status span (bottom-right of topbar) to include rotation:

```jsx
<span className="text-gray-600 text-xs font-gothic">
  {tool === "erase" ? "Erasing"
    : isFloor ? `Painting floor · ${Math.round(brushRotation * 180 / Math.PI)}°`
    : isWall  ? "Drawing wall"
    : activeUrl ? `Placing object · ${Math.round(brushRotation * 180 / Math.PI)}° (R to rotate)`
    : "Select an asset"}
</span>
```

- [ ] **Step 6: Test**

Open `/scene-3d`. Place a chair — it should appear. Press R — the status label updates to 90°. Place another chair — it appears rotated 90°. Press R three more times to cycle back to 0°.

---

## Task 4: Undo / Redo (Ctrl+Z / Ctrl+Y)

**Files:**
- Modify: `frontend/src/components/gm/SceneMap3D.jsx`

- [ ] **Step 1: Add a gridRef that mirrors grid state**

After the `const [grid, setGrid] = useState(...)` line, add:

```jsx
const gridRef = useRef(grid);
```

Then replace the raw `setGrid` calls throughout the component with a wrapper that keeps `gridRef` in sync. Add this function right after the state declarations:

```jsx
const applyGrid = useCallback((updater) => {
  setGrid(prev => {
    const next = typeof updater === "function" ? updater(prev) : updater;
    gridRef.current = next;
    return next;
  });
}, []);
```

Replace every occurrence of `setGrid(` in the component with `applyGrid(`. There are currently 3 places: inside `paintCell`, inside `eraseCell`, and the clear-all button's `onClick`.

- [ ] **Step 2: Add undo and redo stacks**

After the `gridRef` declaration:

```jsx
const undoStack = useRef([]);
const redoStack = useRef([]);
```

- [ ] **Step 3: Add pushHistory helper**

```jsx
const pushHistory = useCallback(() => {
  undoStack.current = [...undoStack.current.slice(-39), [...gridRef.current]];
  redoStack.current = [];
}, []);
```

- [ ] **Step 4: Call pushHistory at the start of each user action**

In `handleDown` — push before any paint/erase:

```jsx
const handleDown = (idx) => {
  pushHistory();                       // ← add this line
  if (tool === "erase") { eraseCell(idx); return; }
  dragging.current = true; dirLocked.current = false;
  dragStart.current = { col: idx % GRID, row: Math.floor(idx / GRID), idx };
  paintCell(idx, dragDir.current);
};
```

In `fillFloor` — push before fill:

```jsx
const fillFloor = () => {
  if (!isFloor) return;
  pushHistory();                       // ← add this line
  const url = activeUrl;
  applyGrid(prev => prev.map(cell => {
    const c = cell ? { ...cell, walls: { ...cell?.walls } } : mkCell();
    c.floor = { url, rotY: brushRotation };
    return c;
  }));
};
```

In the Clear All button onClick:

```jsx
onClick={() => { pushHistory(); applyGrid(Array(GRID * GRID).fill(null)); }}
```

- [ ] **Step 5: Add undo and redo functions**

```jsx
const undo = useCallback(() => {
  if (undoStack.current.length === 0) return;
  const prev = undoStack.current[undoStack.current.length - 1];
  undoStack.current = undoStack.current.slice(0, -1);
  redoStack.current = [...redoStack.current, [...gridRef.current]];
  applyGrid([...prev]);
}, [applyGrid]);

const redo = useCallback(() => {
  if (redoStack.current.length === 0) return;
  const next = redoStack.current[redoStack.current.length - 1];
  redoStack.current = redoStack.current.slice(0, -1);
  undoStack.current = [...undoStack.current, [...gridRef.current]];
  applyGrid([...next]);
}, [applyGrid]);
```

- [ ] **Step 6: Add Ctrl+Z / Ctrl+Y to the keyboard listener**

Inside the `onKey` handler from Task 3, add:

```jsx
if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); }
```

Add `undo` and `redo` to the `useEffect` dependency array: `}, [undo, redo]);`

- [ ] **Step 7: Test**

Place a wall. Press Ctrl+Z — wall disappears. Press Ctrl+Y — wall comes back. Paint a floor area by dragging — one drag = one undo step (not cell-by-cell).

---

## Task 5: Ghost Preview (Translucent Asset on Hover)

**Files:**
- Modify: `frontend/src/components/gm/SceneMap3D.jsx`

- [ ] **Step 1: Add hoveredIdx state**

```jsx
const [hoveredIdx, setHoveredIdx] = useState(null);
```

- [ ] **Step 2: Add GhostTile component**

Add this new component above `CellMeshes`, after the `Tile` component:

```jsx
function GhostTile({ url, x, z, rotY = 0 }) {
  const { scene } = useGLTF(url);
  const ghost = useMemo(() => {
    const c = scene.clone(true);
    c.traverse(ch => {
      if (ch.isMesh) {
        ch.material = ch.material.clone();
        ch.material.transparent = true;
        ch.material.opacity = 0.4;
        ch.material.depthWrite = false;
      }
    });
    return c;
  }, [scene]);
  return (
    <primitive
      object={ghost}
      position={[x, 0.002, z]}
      rotation={[0, rotY, 0]}
      scale={[SCALE, SCALE, SCALE]}
    />
  );
}
```

- [ ] **Step 3: Update HitPlane to fire onPointerEnter unconditionally**

In the existing `HitPlane` component, `onPointerEnter` currently only fires `onEnter` during drag (`if (e.buttons === 1) onEnter(idx)`). Add a separate `onHover` prop:

```jsx
function HitPlane({ x, z, idx, onDown, onDelete, onEnter, onHover }) {
  const [hov, setHov] = useState(false);
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.03, z]}
      onPointerDown={e => { e.stopPropagation(); if (e.button === 2) onDelete(idx); else if (e.button === 0) onDown(idx); }}
      onPointerEnter={e => { e.stopPropagation(); setHov(true); onHover(idx); if (e.buttons === 1) onEnter(idx); }}
      onPointerLeave={() => { setHov(false); onHover(null); }}
    >
      <planeGeometry args={[TILE, TILE]} />
      <meshBasicMaterial transparent opacity={hov ? 0.2 : 0} color="#7a1418" depthWrite={false} />
    </mesh>
  );
}
```

- [ ] **Step 4: Thread onHover through Scene to SceneMap3D**

Update the `Scene` component signature and the `HitPlane` usage inside it:

```jsx
function Scene({ grid, onDown, onDelete, onEnter, onHover, hdri, fogDensity, hour }) {
  return (
    <>
      {/* ... existing content ... */}
      {grid.map((cell, idx) => {
        const col = idx % GRID, row = Math.floor(idx / GRID);
        const x = (col + 0.5) * TILE - HALF, z = (row + 0.5) * TILE - HALF;
        return (
          <group key={idx}>
            <CellMeshes cell={cell} x={x} z={z} />
            <HitPlane x={x} z={z} idx={idx} onDown={onDown} onDelete={onDelete} onEnter={onEnter} onHover={onHover} />
          </group>
        );
      })}
    </>
  );
}
```

- [ ] **Step 5: Pass onHover from SceneMap3D and render the ghost**

In the `<Scene>` JSX call, add `onHover={setHoveredIdx}`:

```jsx
<Scene grid={grid} onDown={handleDown} onDelete={eraseCell} onEnter={handleEnter} onHover={setHoveredIdx} hdri={hdri} fogDensity={fogDensity} hour={hour} />
```

Then add the ghost render inside `Scene`, after the grid `.map(...)` but still inside the `<>` fragment. Add this to `Scene`'s props and rendering:

Update `Scene` to accept `ghost` (the ghost element pre-built in `SceneMap3D`):

```jsx
function Scene({ grid, onDown, onDelete, onEnter, onHover, ghost, hdri, fogDensity, hour }) {
  return (
    <>
      {/* ... fog, lights, hdri, grid, gridHelper, plane ... */}
      {grid.map(...)}
      {ghost}
    </>
  );
}
```

In `SceneMap3D`, compute the ghost element before the Canvas:

```jsx
const ghostElement = useMemo(() => {
  if (tool !== "place" || !activeUrl || hoveredIdx === null) return null;
  const col = hoveredIdx % GRID, row = Math.floor(hoveredIdx / GRID);
  const x = (col + 0.5) * TILE - HALF, z = (row + 0.5) * TILE - HALF;
  return (
    <Suspense fallback={null}>
      <GhostTile url={activeUrl} x={x} z={z} rotY={isWall ? 0 : brushRotation} />
    </Suspense>
  );
}, [tool, activeUrl, hoveredIdx, brushRotation, isWall]);
```

Pass it: `<Scene ... ghost={ghostElement} />`

- [ ] **Step 6: Test**

Open `/scene-3d`. Select any asset. Move mouse over the grid — a translucent version of the asset appears. Click to place — solid version appears. Switch to Erase mode — ghost disappears.

---

## Task 6: Rectangle Fill / Rectangle Erase (Shift+Drag)

**Files:**
- Modify: `frontend/src/components/gm/SceneMap3D.jsx`

- [ ] **Step 1: Add shift drag state**

```jsx
const shiftDragStart = useRef(null);
const [highlightCells, setHighlightCells] = useState(new Set());
```

- [ ] **Step 2: Add applyRectangle helper**

```jsx
const applyRectangle = useCallback((startIdx, endIdx) => {
  const c1 = startIdx % GRID, r1 = Math.floor(startIdx / GRID);
  const c2 = endIdx   % GRID, r2 = Math.floor(endIdx   / GRID);
  const minC = Math.min(c1, c2), maxC = Math.max(c1, c2);
  const minR = Math.min(r1, r2), maxR = Math.max(r1, r2);
  const indices = [];
  for (let r = minR; r <= maxR; r++)
    for (let c = minC; c <= maxC; c++)
      indices.push(r * GRID + c);

  if (tool === "erase") {
    pushHistory();
    applyGrid(prev => {
      const next = [...prev];
      indices.forEach(i => { next[i] = null; });
      return next;
    });
  } else if (activeUrl) {
    pushHistory();
    applyGrid(prev => {
      const next = [...prev];
      indices.forEach(i => {
        const cur = next[i] ? { ...next[i], walls: { ...next[i].walls } } : mkCell();
        if (isFloor)        cur.floor    = { url: activeUrl, rotY: brushRotation };
        else if (!isWall)   cur.object   = { url: activeUrl, rotY: brushRotation };
        next[i] = cur;
      });
      return next;
    });
  }
  setHighlightCells(new Set());
  shiftDragStart.current = null;
}, [tool, activeUrl, isFloor, isWall, brushRotation, applyGrid, pushHistory]);
```

- [ ] **Step 3: Update HitPlane to accept and show highlight state**

Add a `highlighted` prop to `HitPlane`:

```jsx
function HitPlane({ x, z, idx, onDown, onDelete, onEnter, onHover, highlighted }) {
  const [hov, setHov] = useState(false);
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.03, z]}
      onPointerDown={e => { e.stopPropagation(); if (e.button === 2) onDelete(idx); else if (e.button === 0) onDown(idx); }}
      onPointerEnter={e => { e.stopPropagation(); setHov(true); onHover(idx); if (e.buttons === 1) onEnter(idx); }}
      onPointerLeave={() => { setHov(false); onHover(null); }}
    >
      <planeGeometry args={[TILE, TILE]} />
      <meshBasicMaterial
        transparent
        opacity={highlighted ? 0.35 : hov ? 0.2 : 0}
        color={highlighted ? "#DC143C" : "#7a1418"}
        depthWrite={false}
      />
    </mesh>
  );
}
```

Pass `highlighted={highlightCells.has(idx)}` when rendering HitPlane inside `Scene`. Update `Scene` to accept and thread `highlightCells`:

```jsx
function Scene({ grid, onDown, onDelete, onEnter, onHover, ghost, highlightCells, hdri, fogDensity, hour }) {
  return (
    <>
      {/* ... */}
      {grid.map((cell, idx) => {
        const col = idx % GRID, row = Math.floor(idx / GRID);
        const x = (col + 0.5) * TILE - HALF, z = (row + 0.5) * TILE - HALF;
        return (
          <group key={idx}>
            <CellMeshes cell={cell} x={x} z={z} />
            <HitPlane x={x} z={z} idx={idx}
              onDown={onDown} onDelete={onDelete} onEnter={onEnter} onHover={onHover}
              highlighted={highlightCells.has(idx)}
            />
          </group>
        );
      })}
      {ghost}
    </>
  );
}
```

Pass `highlightCells={highlightCells}` in the `<Scene>` JSX call.

- [ ] **Step 4: Wire shift+drag into handleDown and handleEnter**

Update `handleDown`:

```jsx
const handleDown = (idx) => {
  if (e?.shiftKey) {                   // shift+click starts rectangle
    shiftDragStart.current = idx;
    setHighlightCells(new Set([idx]));
    return;
  }
  pushHistory();
  if (tool === "erase") { eraseCell(idx); return; }
  dragging.current = true; dirLocked.current = false;
  dragStart.current = { col: idx % GRID, row: Math.floor(idx / GRID), idx };
  paintCell(idx, dragDir.current);
};
```

Wait — `handleDown` doesn't receive `e` currently. Update `HitPlane`'s `onPointerDown` to pass the event, and `handleDown` to accept it:

```jsx
// In HitPlane:
onPointerDown={e => { e.stopPropagation(); if (e.button === 2) onDelete(idx); else if (e.button === 0) onDown(e, idx); }}

// handleDown signature:
const handleDown = (e, idx) => {
  if (e.shiftKey) {
    shiftDragStart.current = idx;
    setHighlightCells(new Set([idx]));
    return;
  }
  pushHistory();
  if (tool === "erase") { eraseCell(idx); return; }
  dragging.current = true; dirLocked.current = false;
  dragStart.current = { col: idx % GRID, row: Math.floor(idx / GRID), idx };
  paintCell(idx, dragDir.current);
};
```

Update `handleEnter` to update highlight during shift-drag:

```jsx
const handleEnter = (idx) => {
  if (shiftDragStart.current !== null) {
    shiftDragEnd.current = idx;          // track last cell for applyRectangle
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
  const col = idx % GRID, row = Math.floor(idx / GRID);
  const dc = Math.abs(col - dragStart.current.col), dr = Math.abs(row - dragStart.current.row);
  if (dc !== dr) {
    const newDir = dc > dr ? "h" : "v";
    if (!dirLocked.current) { dirLocked.current = true; dragDir.current = newDir; paintCell(dragStart.current.idx, newDir); }
    else dragDir.current = newDir;
  }
  paintCell(idx, dragDir.current);
};
```

Update `pointerup` listener to complete the rectangle:

```jsx
const up = (e) => {
  if (shiftDragStart.current !== null && highlightCells.size > 0) {
    // find the last highlighted cell to pass as endIdx
    const indices = [...highlightCells];
    applyRectangle(shiftDragStart.current, indices[indices.length - 1]);
  }
  dragging.current = false; dragStart.current = null; dirLocked.current = false;
};
```

Because `highlightCells` is state (not a ref), use a ref to track the last hovered idx during shift-drag:

```jsx
const shiftDragEnd = useRef(null);
```

Update `handleEnter` to also set `shiftDragEnd.current = idx` when shift-dragging. Update the `up` handler:

```jsx
const up = () => {
  if (shiftDragStart.current !== null && shiftDragEnd.current !== null) {
    applyRectangle(shiftDragStart.current, shiftDragEnd.current);
  } else {
    setHighlightCells(new Set());
    shiftDragStart.current = null;
  }
  dragging.current = false; dragStart.current = null; dirLocked.current = false;
};
```

- [ ] **Step 5: Update the bottom bar to mention Shift+drag**

Add to the hint text:

```jsx
<span className="text-gray-600 text-xs">
  Left-click place · Right-click delete · Shift+drag fill area · Middle-drag pan · Scroll zoom
</span>
```

- [ ] **Step 6: Test**

Open `/scene-3d`. Select Stone floor. Shift+click and drag — cells highlight in blood-red. Release — they all fill with floor. Switch to Erase, Shift+drag a rectangle — all cells in that area clear.

---

## Task 7: Post-Processing — SSAO + Bloom + Better Lighting

**Files:**
- Modify: `frontend/src/components/gm/SceneMap3D.jsx`
- Modify: `frontend/package.json`

- [ ] **Step 1: Install @react-three/postprocessing**

```bash
cd C:/Users/Surface/Documents/my-vampire-app/frontend
npm install @react-three/postprocessing
```

Expected output: package added without errors.

- [ ] **Step 2: Add the import at the top of SceneMap3D.jsx**

```jsx
import { EffectComposer, SSAO, Bloom } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
```

- [ ] **Step 3: Add emissive boost for lit models in the Tile component**

Update the `Tile` component to boost emissive intensity on torch/candle models:

```jsx
function Tile({ url, x, z, rotY = 0, scale = SCALE }) {
  const { scene } = useGLTF(url);
  const isLit = url.includes("torch_lit") || url.includes("candle_lit") || url.includes("candle_thin_lit") || url.includes("candle_triple");
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse(ch => {
      if (ch.isMesh) {
        ch.castShadow = true;
        ch.receiveShadow = true;
        if (isLit && ch.material?.emissive) {
          ch.material = ch.material.clone();
          ch.material.emissiveIntensity = 1.8;
        }
      }
    });
    return c;
  }, [scene, isLit]);
  return <primitive object={cloned} position={[x, 0, z]} rotation={[0, rotY, 0]} scale={[scale, scale, scale]} />;
}
```

- [ ] **Step 4: Wrap Canvas content with EffectComposer**

Inside the `<Canvas>`, after the closing `</Suspense>` tag that wraps `<Scene>`, add:

```jsx
<EffectComposer>
  <SSAO
    blendFunction={BlendFunction.MULTIPLY}
    samples={16}
    radius={0.04}
    intensity={20}
    luminanceInfluence={0.5}
  />
  <Bloom
    luminanceThreshold={1}
    luminanceSmoothing={0.9}
    mipmapBlur
    intensity={0.6}
  />
</EffectComposer>
```

The full Canvas JSX should now look like:

```jsx
<Canvas shadows camera={{ position: [0, 5, 2.5], fov: 50, near: 0.01, far: 200 }}
  style={{ background: "#050308" }}
  onCreated={({ gl }) => { gl.toneMapping = 4; gl.toneMappingExposure = 0.9; }}>
  <OrbitControls enablePan enableZoom enableRotate={false} mouseButtons={{ MIDDLE: 2 }} screenSpacePanning panSpeed={1.5} zoomSpeed={1.2} minDistance={0.5} maxDistance={15} />
  <Suspense fallback={null}>
    <Scene grid={grid} onDown={handleDown} onDelete={eraseCell} onEnter={handleEnter}
      onHover={setHoveredIdx} ghost={ghostElement} highlightCells={highlightCells}
      hdri={hdri} fogDensity={fogDensity} hour={hour} />
  </Suspense>
  <EffectComposer>
    <SSAO blendFunction={BlendFunction.MULTIPLY} samples={16} radius={0.04} intensity={20} luminanceInfluence={0.5} />
    <Bloom luminanceThreshold={1} luminanceSmoothing={0.9} mipmapBlur intensity={0.6} />
  </EffectComposer>
</Canvas>
```

- [ ] **Step 5: Improve AtmosphereLights**

Replace the existing `AtmosphereLights` component:

```jsx
function AtmosphereLights({ fogDensity, hour }) {
  const moonRef  = useRef();
  const fillRef  = useRef();
  const candleRef = useRef();

  const isNight = hour < 6 || hour >= 19;
  const isDusk  = (hour >= 17 && hour < 19) || (hour >= 5 && hour < 7);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (candleRef.current) {
      candleRef.current.intensity = 0.08 * (0.7 + 0.3 * Math.sin(t * 3.1) + 0.15 * Math.sin(t * 7.3));
    }
  });

  return (
    <>
      <hemisphereLight args={[isNight ? 0x1a0a2e : 0x6a4a2a, 0x060408, isNight ? 0.25 : 0.55]} />
      <directionalLight
        ref={moonRef}
        position={[-3, 6, 2]}
        color={isNight ? 0xb8c4d8 : isDusk ? 0xc87040 : 0xffd89a}
        intensity={isNight ? 0.45 : 0.7}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-4} shadow-camera-right={4}
        shadow-camera-top={4}  shadow-camera-bottom={-4}
        shadow-bias={-0.001}
      />
      <directionalLight
        ref={fillRef}
        position={[3, 3, -2]}
        color={0x1a0a2e}
        intensity={isNight ? 0.12 : 0.08}
      />
      <pointLight position={[2, 1.5, -1]} color={0x6a1010} intensity={0.5} distance={8} decay={2} />
      <pointLight ref={candleRef} position={[0, 0.3, 0]} color={0xffb86b} intensity={0.08} distance={3} decay={2} />
    </>
  );
}
```

- [ ] **Step 6: Build and visual test**

```bash
docker compose up --build -d frontend
```

Open `http://localhost:5173/scene-3d`. Place floors and walls. Confirm:
- Objects look grounded (subtle shadow/darkening where surfaces meet) — that's SSAO
- Place a Torch Lit — it should have a warm glow visible when fog is low — that's Bloom
- Lighting has more depth (cool shadows, warmer key light)

If SSAO causes a blank canvas, reduce `intensity` to `10` and `samples` to `8`.

- [ ] **Step 7: Commit all frontend changes**

```bash
cd C:/Users/Surface/Documents/my-vampire-app
git add frontend/src/components/gm/SceneMap3D.jsx frontend/package.json frontend/package-lock.json
git commit -m "feat: scene maker overhaul — design revert, search, undo/redo, rotation, ghost preview, rectangle fill, SSAO+bloom"
```

---

## Deployment

After all tasks pass visual testing:

```bash
# On Raspberry Pi
cd /home/rockas/VTM-vampire-app
git pull
docker compose up --build -d frontend
```

Frontend-only change — no migration needed.
