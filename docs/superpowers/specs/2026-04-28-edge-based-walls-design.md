# Edge-Based Wall System — Design Spec

**Date:** 2026-04-28  
**Status:** Approved

---

## Problem

The current wall system stores walls as tile-type cells inside `grid[]`. This means:
- A wall occupies an entire cell, blocking floor placement in that cell
- Walls can only align to cell centers, never to the boundary between two cells
- The visual result is a thick block rather than a thin dividing wall
- Line-draw direction detection is ambiguous and glitchy

## Solution

Move walls off the cell grid entirely. Walls live on the **edges between cells** — the shared boundary between two adjacent tiles. Two independent edge arrays replace wall cells:

- `hEdges` — horizontal wall segments (run left-to-right, divide rows from each other)
- `vEdges` — vertical wall segments (run top-to-bottom, divide columns from each other)

The cell grid `grid[]` keeps only floors and placed objects. The wall panel category is removed from the asset picker — walls are exclusively placed by the edge line-draw tool.

---

## Data Model

### Arrays

| Array | Size | Index formula | Description |
|---|---|---|---|
| `grid` | 784 | `r*28 + c`, r/c ∈ [0,27] | Floors and objects (unchanged) |
| `hEdges` | 812 | `r*28 + c`, r ∈ [0,28], c ∈ [0,27] | Horizontal edges. Row r is the boundary below row r-1 and above row r. |
| `vEdges` | 812 | `r*29 + c`, r ∈ [0,27], c ∈ [0,28] | Vertical edges. Column c is the boundary right of col c-1 and left of col c. |

All values are booleans (`true` = wall present, `false`/undefined = empty). Arrays are initialized as `new Array(812).fill(false)`.

### World Positions

Given `GRID=28`, `TILE=0.09`, `HALF=(GRID*TILE)/2`:

| Edge type | World X | World Z | rotY |
|---|---|---|---|
| `hEdges[i]`, r=`Math.floor(i/28)`, c=`i%28` | `(c+0.5)*TILE - HALF` | `r*TILE - HALF` | `0` |
| `vEdges[i]`, r=`Math.floor(i/29)`, c=`i%29` | `c*TILE - HALF` | `(r+0.5)*TILE - HALF` | `Math.PI/2` |

### Save Format

```json
{
  "grid": [...784 cells...],
  "hEdges": [...812 bools...],
  "vEdges": [...812 bools...]
}
```

Backward compatibility: scenes saved without `hEdges`/`vEdges` load fine — missing arrays default to all-false. Any existing wall cells in `grid[]` from the old system are stripped on load (Walls category no longer appears in grid).

---

## Hit Detection & Edge Snapping

On `pointermove` over the floor plane, `event.point` gives world X/Z. Convert to fractional grid position, then determine the nearest edge zone within the hovered cell:

```js
const col = (point.x + HALF) / TILE;   // fractional, 0..28
const row = (point.z + HALF) / TILE;   // fractional, 0..28
const cellCol = Math.floor(col);        // 0..27
const cellRow = Math.floor(row);        // 0..27
const fracX = col - cellCol;            // 0..1 within cell
const fracZ = row - cellRow;

// Snap zones: 30% of cell width from each edge
const nearLeft   = fracX < 0.3;   // vEdge at (cellRow, cellCol)
const nearRight  = fracX > 0.7;   // vEdge at (cellRow, cellCol+1)
const nearTop    = fracZ < 0.3;   // hEdge at (cellRow, cellCol)
const nearBottom = fracZ > 0.7;   // hEdge at (cellRow+1, cellCol)
```

Priority when two zones overlap (corner): prefer the axis with the smaller fractional distance to the boundary. If mouse is in the center 40% of the cell, no edge is targeted and no wall action is taken.

The snap target is stored as `{ type: "h"|"v", idx: number }`.

---

## Wall Line Draw

### State & Refs

```js
const wallAnchor = useRef(null);    // { type, idx } — where drag started
const wallAxis   = useRef(null);    // "h" | "v" — locked on first move
const wallPreview = useRef([]);     // array of edge indices currently highlighted
```

### Interaction Flow

1. **mousedown** on snapped edge: set `wallAnchor` + `wallAxis`. Do not paint yet.
2. **mousemove** while anchor set: compute `wallLineEdges(anchorIdx, currentIdx, axis)` → array of all edge indices between anchor and current along the locked axis. Store in `wallPreview`. Update red highlight overlay.
3. **mouseup**: commit all `wallPreview` indices to the edge array, push single undo snapshot `{grid, hEdges, vEdges}`. Clear anchor/preview refs.
4. **right-click** on snapped edge: toggle that single edge off. Pushes undo snapshot.

### `wallLineEdges(fromIdx, toIdx, axis)` helper

```js
function wallLineEdges(fromIdx, toIdx, axis) {
  const stride = axis === "h" ? GRID : GRID + 1;
  const fromR = Math.floor(fromIdx / stride), fromC = fromIdx % stride;
  const toR   = Math.floor(toIdx   / stride), toC   = toIdx   % stride;
  const minR = Math.min(fromR, toR), maxR = Math.max(fromR, toR);
  const minC = Math.min(fromC, toC), maxC = Math.max(fromC, toC);
  const result = [];
  for (let r = minR; r <= maxR; r++)
    for (let c = minC; c <= maxC; c++)
      result.push(r * stride + c);
  return result;
}
```

The anchor axis is locked for the entire drag — you cannot mix h and v edges in a single drag.

---

## Rendering

### EdgeWalls Component

```jsx
function EdgeWalls({ hEdges, vEdges }) {
  const wallUrl = ASSET_CATEGORIES.Walls["wall_narrow"];
  return <>
    {hEdges.map((on, i) => {
      if (!on) return null;
      const r = Math.floor(i / GRID), c = i % GRID;
      return <Tile key={`h${i}`} url={wallUrl}
        x={(c + 0.5) * TILE - HALF} y={0} z={r * TILE - HALF} rotY={0} />;
    })}
    {vEdges.map((on, i) => {
      if (!on) return null;
      const r = Math.floor(i / (GRID + 1)), c = i % (GRID + 1);
      return <Tile key={`v${i}`} url={wallUrl}
        x={c * TILE - HALF} y={0} z={(r + 0.5) * TILE - HALF} rotY={Math.PI / 2} />;
    })}
  </>;
}
```

`EdgeWalls` replaces the current inline wall-cell rendering inside `CellMeshes`. It sits alongside `CellMeshes` in the `Scene` component, receiving `hEdges` and `vEdges` as props.

### Preview Highlight

During drag, a thin red plane (or wireframe box) is rendered at each previewed edge index, offset slightly above Y=0 so it renders over the floor without z-fighting.

---

## What Stays the Same

- `grid[]` — floors and all object categories unchanged
- Shift+drag rectangle fill/erase — applies to `grid[]` only (floors/objects)
- Ghost preview on hover — unchanged for object placement
- R key rotation — unchanged
- Undo/redo — snapshots now include `{grid, hEdges, vEdges}`
- Auto-save and manual save — save format gains the two edge arrays
- HDRI, fog, atmosphere, time-of-night controls — untouched

### Removed

- "Walls" asset category removed from the left panel asset picker. Walls are now exclusively placed via the edge line-draw tool. The wall model used is always `wall_narrow`.

---

## Undo/Redo

Undo snapshots change from `grid[]` copy to:

```js
{ grid: [...grid], hEdges: [...hEdges], vEdges: [...vEdges] }
```

Undo restores all three arrays. Existing push/pop logic is otherwise unchanged.

---

## Migration from Old Wall Cells

On scene load, any cell in `grid[]` whose asset URL matches a Walls category model is silently ignored (not rendered and not restored). The `hEdges`/`vEdges` arrays from the DB are used instead. This is a one-way migration — old wall cell data is discarded on next save.
