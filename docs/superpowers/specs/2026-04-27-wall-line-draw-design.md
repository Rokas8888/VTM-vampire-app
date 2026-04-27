# Wall Line Draw — Design Spec
Date: 2026-04-27
Component: `frontend/src/components/gm/SceneMap3D.jsx`

---

## Summary

Replace the current glitchy wall drag (per-cell direction-flipping) with a lock-and-preview line draw:
- Mousedown anchors the start
- First drag movement locks the axis (H or V) permanently for that stroke
- A red highlight preview shows all cells that will receive a wall
- Mouseup commits the entire line in one undo step

Also fixes stair model offset (KayKit stair origins are at the base of the lower step, not cell center).

---

## Wall Line Draw

### Input Flow

1. User selects any wall asset (Walls or Doors category). `isWall === true`.
2. **Mousedown** on a cell:
   - Set `isWallDrag.current = true`
   - Record `dragStart = { col, row, idx }`
   - Set `wallLineDir.current = null` (unlocked)
   - Set `wallLineCurrent.current = idx`
   - Show single-cell red preview: `setHighlightCells(new Set([idx]))`
   - Do NOT paint anything yet
3. **Pointermove → handleEnter** on each cell entered while dragging:
   - Compute `dc = col - dragStart.col`, `dr = row - dragStart.row`
   - If direction not yet locked and `(dc !== 0 || dr !== 0)`: lock `wallLineDir = abs(dc) >= abs(dr) ? "h" : "v"`
   - Update `wallLineCurrent = idx`
   - Recompute preview cells along the locked axis and call `setHighlightCells`
4. **Pointerup**:
   - If `isWallDrag.current`: call `applyWallLine(startIdx, endIdx, dir)`, clear state
   - Else: existing clear logic

### Direction Lock Rules

- Determined on the first cell that differs from the start cell
- `abs(dc) >= abs(dr)` → horizontal (`"h"`) — wall runs left/right, occupies the top edge of each cell in the same row
- `abs(dr) > abs(dc)` → vertical (`"v"`) — wall runs up/down, occupies the left edge of each cell in the same column
- Once locked, direction never changes for that stroke, regardless of further mouse movement
- If mouse never leaves the start cell: single-cell wall placed at mouseup

### Preview Cell Computation

```js
function wallLineCells(startCol, startRow, endIdx, dir) {
  const endCol = endIdx % GRID;
  const endRow = Math.floor(endIdx / GRID);
  const cells = new Set();
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

### applyWallLine

```js
const applyWallLine = useCallback((startIdx, endIdx, dir) => {
  if (!activeUrl) return;
  const cells = wallLineCells(startIdx % GRID, Math.floor(startIdx / GRID), endIdx, dir ?? "h");
  applyGrid(prev => {
    const next = [...prev];
    cells.forEach(i => {
      const cur = next[i] ? { ...next[i], walls: { ...next[i].walls } } : mkCell();
      if (dir === "h") cur.walls.h = { url: activeUrl, rotY: 0 };
      else              cur.walls.v = { url: activeUrl, rotY: 0 };
      next[i] = cur;
    });
    return next;
  });
  setHighlightCells(new Set());
}, [activeUrl, applyGrid]);
```

### Refs Added

| Ref | Type | Purpose |
|---|---|---|
| `wallLineDir` | `null \| "h" \| "v"` | Locked axis for current wall stroke |
| `wallLineCurrent` | `number \| null` | Last cell index entered during wall drag |
| `isWallDrag` | `boolean` | Whether current drag is a wall line (so pointerup knows what to commit) |

### Refs Removed

| Ref | Why removed |
|---|---|
| `dragDir` | Replaced by `wallLineDir` |
| `dirLocked` | Replaced by null-check on `wallLineDir` |

### paintCell Change

Remove the `dir` parameter — walls no longer call `paintCell` during drag. Non-wall assets (floors, objects) still call `paintCell` during drag, but they never needed `dir`.

```js
// Before
const paintCell = (idx, dir) => { ... }

// After
const paintCell = (idx) => { ... }
```

### pointerup Logic

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

---

## Stair Model Offset Fix

### Problem

KayKit stair models have their local origin at the base of the lower step (one corner), not the cell center. When placed at `position={[x, 0, z]}`, they extend outside the cell boundary.

### Fix

Wrap stair tiles in a `<group>` that positions and rotates the group, then offset the primitive by `-TILE * 0.5` in local Z so the stairs center in the cell regardless of rotation.

```jsx
const STAIR_URLS = new Set(Object.values(ASSET_CATEGORIES.Stairs));

function Tile({ url, x, z, rotY = 0, scale = SCALE }) {
  const { scene } = useGLTF(url);
  const isLit   = url.includes("torch_lit") || url.includes("candle_lit") || ...;
  const isStair = STAIR_URLS.has(url);
  const cloned  = useMemo(() => { ... }, [scene, isLit]);

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

The `-TILE * 0.5` offset is in local Z (before rotation), so it stays correct for all four rotation states (0°, 90°, 180°, 270°).

---

## What Does NOT Change

- Cell data model: `walls: { h, v }` unchanged
- `walls.h` position rendering: `z - TILE * 0.5` unchanged
- `walls.v` position rendering: `x - TILE * 0.5` unchanged
- Shift+drag rectangle fill/erase: unchanged
- Undo/redo: unchanged — `pushHistory()` is called once at mousedown, covering the whole stroke
- Floor and object placement: unchanged

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/components/gm/SceneMap3D.jsx` | All changes — wall line draw + stair fix |
