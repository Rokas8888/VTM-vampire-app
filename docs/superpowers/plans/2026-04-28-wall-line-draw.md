# Wall Line Draw + Stair Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the glitchy per-cell wall drag with a lock-and-preview line draw, and fix stair model offset.

**Architecture:** All changes are in `SceneMap3D.jsx`. The wall data model (`walls.h` / `walls.v` in cells) is unchanged. Only the input system changes: new refs track wall line state, a new `applyWallLine` callback commits the whole stroke at mouseup, and `paintCell` no longer handles walls. The stair fix wraps stair tiles in a `<group>` so the local-space Z offset stays correct under rotation.

**Tech Stack:** React, React Three Fiber, existing grid/cell data model.

---

## File Map

| File | Change |
|---|---|
| `frontend/src/components/gm/SceneMap3D.jsx` | All changes — stair fix + wall line draw |

---

## Task 1: Stair Offset Fix

**Files:**
- Modify: `frontend/src/components/gm/SceneMap3D.jsx` (lines ~225–250)

- [ ] **Step 1: Add STAIR_URLS constant**

After line 226 (`const FLOOR_URLS = new Set(...)`), add:

```js
const STAIR_URLS = new Set(Object.values(ASSET_CATEGORIES.Stairs));
```

- [ ] **Step 2: Modify the Tile component**

Replace the entire `Tile` function (lines 232–250) with:

```jsx
function Tile({ url, x, z, rotY = 0, scale = SCALE }) {
  const { scene } = useGLTF(url);
  const isLit   = url.includes("torch_lit") || url.includes("candle_lit") || url.includes("candle_thin_lit") || url.includes("candle_triple");
  const isStair = STAIR_URLS.has(url);
  const cloned  = useMemo(() => {
    const c = scene.clone(true);
    c.traverse(ch => {
      if (ch.isMesh) {
        ch.castShadow    = true;
        ch.receiveShadow = true;
        if (isLit && ch.material?.emissive) {
          ch.material = ch.material.clone();
          ch.material.emissiveIntensity = 1.8;
        }
      }
    });
    return c;
  }, [scene, isLit]);

  if (isStair) {
    return (
      <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
        <primitive object={cloned} position={[0, 0, -TILE * 0.5]} scale={[scale, scale, scale]} />
      </group>
    );
  }
  return <primitive object={cloned} position={[x, 0, z]} rotation={[0, rotY, 0]} scale={[scale, scale, scale]} />;
}
```

The `position={[0, 0, -TILE * 0.5]}` is in the group's local space, so it shifts the stair backward before rotation is applied — the stairs stay centered for all four rotation states.

- [ ] **Step 3: Build and verify stairs**

```bash
cd C:/Users/Surface/Documents/my-vampire-app
docker compose up --build -d frontend
```

Open `http://localhost:5173/scene-3d`. Select any stair from the Stairs category, place it. Stairs should sit centered inside the cell. Rotate with R — should stay centered at all angles.

---

## Task 2: Wall Line Draw

**Files:**
- Modify: `frontend/src/components/gm/SceneMap3D.jsx` (lines ~225–607)

This task replaces the `dragDir`/`dirLocked` wall painting system with a lock-and-preview line draw. Changes are surgical — only the wall input path changes.

- [ ] **Step 1: Add module-level wallLineCells helper**

After line 229 (`const isEmpty = ...`), add:

```js
function wallLineCells(startCol, startRow, endIdx, dir) {
  const endCol = endIdx % GRID;
  const endRow = Math.floor(endIdx / GRID);
  const cells  = new Set();
  if (dir === "h") {
    const minC = Math.min(startCol, endCol), maxC = Math.max(startCol, endCol);
    for (let c = minC; c <= maxC; c++) cells.add(startRow * GRID + c);
  } else {
    const minR = Math.min(startRow, endRow), maxR = Math.max(startRow, endRow);
    for (let r = minR; r <= maxR; r++) cells.add(r * GRID + startCol);
  }
  return cells;
}
```

- [ ] **Step 2: Replace normal-drag refs (remove dragDir + dirLocked, add three new refs)**

Find this block (lines ~400–404):

```js
  // normal drag state
  const dragging  = useRef(false);
  const dragDir   = useRef("h");
  const dragStart = useRef(null);
  const dirLocked = useRef(false);
```

Replace with:

```js
  // normal drag state
  const dragging        = useRef(false);
  const dragStart       = useRef(null);
  const wallLineDir     = useRef(null);   // "h" | "v" | null — locked on first off-origin cell
  const wallLineCurrent = useRef(null);   // last cell idx entered during wall drag
  const isWallDrag      = useRef(false);  // whether current drag is a wall line
```

- [ ] **Step 3: Add applyWallLine callback**

After the closing of `applyRectangle` (after line 529), add:

```js
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

- [ ] **Step 4: Update paintCell — remove dir parameter and wall branch**

Find `paintCell` (lines ~471–491):

```js
  const paintCell = (idx, dir) => {
    if (!activeUrl || tool === "erase") return;
    applyGrid(prev => {
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

Replace with:

```js
  const paintCell = (idx) => {
    if (!activeUrl || tool === "erase" || isWall) return;
    applyGrid(prev => {
      const next = [...prev];
      const cur  = next[idx] ? { ...next[idx], walls: { ...next[idx].walls } } : mkCell();
      if (isFloor) {
        cur.floor = { url: activeUrl, rotY: brushRotation };
      } else {
        cur.object = { url: activeUrl, rotY: brushRotation };
      }
      next[idx] = cur;
      return next;
    });
  };
```

- [ ] **Step 5: Update handleDown**

Find `handleDown` (lines ~532–545):

```js
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
    dirLocked.current = false;
    dragStart.current = { col: idx % GRID, row: Math.floor(idx / GRID), idx };
    paintCell(idx, dragDir.current);
  };
```

Replace with:

```js
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

- [ ] **Step 6: Update handleEnter**

Find `handleEnter` (lines ~547–571):

```js
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

Replace with:

```js
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

- [ ] **Step 7: Update the pointerup handler and useEffect deps**

Find the `up` function inside the `useEffect` (lines ~575–586):

```js
    const up = () => {
      if (shiftDragStart.current !== null && shiftDragEnd.current !== null) {
        applyRectangle(shiftDragStart.current, shiftDragEnd.current);
      } else {
        setHighlightCells(new Set());
        shiftDragStart.current = null;
        shiftDragEnd.current   = null;
      }
      dragging.current  = false;
      dragStart.current = null;
      dirLocked.current = false;
    };
```

Replace with:

```js
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

Also update the `useEffect` dependency array on line 607 — add `applyWallLine`:

```js
  }, [undo, redo, applyRectangle, applyWallLine]);
```

- [ ] **Step 8: Build**

```bash
cd C:/Users/Surface/Documents/my-vampire-app
docker compose up --build -d frontend
```

Expected: Vite ready in logs, no build errors.

```bash
docker compose logs frontend 2>&1 | tail -5
```

Expected: `VITE v5.x.x  ready in XXX ms`

- [ ] **Step 9: Manual integration test**

Open `http://localhost:5173/scene-3d`.

**Wall line draw:**
1. Select "Walls → Stone" from the left panel
2. Click a cell and drag horizontally across 5 cells — red highlight should show a horizontal row of 5 cells while dragging
3. Release — 5 horizontal wall segments appear in a straight line
4. Ctrl+Z — all 5 walls disappear at once (single undo step)
5. Click a cell and drag vertically — red highlight shows a vertical column
6. Release — vertical wall segments appear
7. Click a single cell without dragging — one wall placed
8. Select "Doors → Doorway", drag a line — doorway models appear in a line

**Shift+rectangle (verify unchanged):**
9. Select "Floors → Stone Tile"
10. Hold Shift, drag a rectangle — floor tiles fill the rectangle on release

**Non-wall drag (verify unchanged):**
11. Select "Furniture → Chair" — place by clicking/dragging, models appear immediately on each cell entered

**Stairs (verify fix):**
12. Select "Stairs → Stairs" — place one. Stairs should sit centered inside the cell
13. Press R to rotate — stairs should stay centered at 0°, 90°, 180°, 270°

- [ ] **Step 10: Commit**

```bash
cd C:/Users/Surface/Documents/my-vampire-app
git add frontend/src/components/gm/SceneMap3D.jsx
git commit -m "feat: wall line draw + stair offset fix

- Replace glitchy per-cell wall drag with lock-and-preview line draw
- Mousedown anchors start; first move locks axis (H or V) permanently
- Red highlight preview shows all cells before committing
- Mouseup commits entire line as one undo step via applyWallLine
- Remove dragDir + dirLocked refs; add wallLineDir, wallLineCurrent, isWallDrag
- paintCell no longer handles walls (walls only written via applyWallLine)
- Stair models centered in cell: wrapped in <group> with local Z offset -TILE*0.5

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- ✅ Mousedown anchors start, shows single-cell preview → Step 5 (handleDown, wall branch)
- ✅ Direction locks on first off-origin cell → Step 6 (handleEnter, wallLineDir logic)
- ✅ Preview highlight updates as you drag → Step 6 (setHighlightCells with wallLineCells)
- ✅ Mouseup commits in one batch → Step 7 (up handler calls applyWallLine)
- ✅ Single undo step for whole stroke → pushHistory called once in handleDown
- ✅ Single-cell case (no drag) → `wallLineCurrent ?? dragStart.idx` fallback in up handler
- ✅ Non-wall assets unaffected → isWallDrag.current = false path, paintCell as before
- ✅ Shift+rectangle unaffected → early-return in up handler before wall line logic
- ✅ Stair fix → Task 1

**Placeholder scan:** None found. All steps have complete code.

**Type consistency:** `wallLineCells(startCol, startRow, endIdx, dir)` — same signature used in both handleEnter (Step 6) and applyWallLine (Step 3). `applyWallLine(startIdx, endIdx, dir)` called consistently in up handler (Step 7). `paintCell(idx)` — no dir parameter, called without dir in handleDown and handleEnter.
