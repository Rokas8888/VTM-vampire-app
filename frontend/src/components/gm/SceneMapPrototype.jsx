import { useState, useCallback } from "react";

const CELL_SIZE    = 48;
const DEFAULT_COLS = 24;
const DEFAULT_ROWS = 20;

// ── SVG tile components (all scalable via size prop) ──────────────────────────

function FloorTile({ size = 48 }) {
  const h  = size / 2;
  const cr = size / 48;
  return (
    <svg width={size} height={size} xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      {/* mortar */}
      <rect width={size} height={size} fill="#161614"/>
      {/* four stone slabs */}
      <rect x={1}   y={1}   width={h-2} height={h-2} fill="#2e2c29" rx={cr}/>
      <rect x={h+1} y={1}   width={h-2} height={h-2} fill="#2b2927" rx={cr}/>
      <rect x={1}   y={h+1} width={h-2} height={h-2} fill="#2c2b2e" rx={cr}/>
      <rect x={h+1} y={h+1} width={h-2} height={h-2} fill="#2a2829" rx={cr}/>
      {/* top-left slab edge highlights */}
      <line x1={2}   y1={2}   x2={h-2} y2={2}   stroke="#3c3a37" strokeWidth={cr*0.8} opacity="0.7"/>
      <line x1={2}   y1={2}   x2={2}   y2={h-2} stroke="#3c3a37" strokeWidth={cr*0.8} opacity="0.7"/>
      {/* crack on bottom-right slab */}
      <path d={`M${h+h*0.3} ${h+h*0.2} L${h+h*0.45} ${h+h*0.48} L${h+h*0.4} ${h+h*0.72}`}
        stroke="#181716" strokeWidth={cr*0.9} fill="none"/>
    </svg>
  );
}

function WallTile({ size = 48 }) {
  const r = (v) => Math.round(v * size / 48);
  return (
    <svg width={size} height={size} xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      {/* mortar background */}
      <rect width={size} height={size} fill="#0b0b0b"/>
      {/* row 0 — 2 full bricks */}
      <rect x={r(1)}  y={r(1)}  width={r(22)} height={r(9)} fill="#1d1511" rx={r(1)}/>
      <rect x={r(25)} y={r(1)}  width={r(22)} height={r(9)} fill="#1b1310" rx={r(1)}/>
      {/* row 1 — offset (half-brick at edges) */}
      <rect x={r(1)}  y={r(11)} width={r(10)} height={r(9)} fill="#191311" rx={r(1)}/>
      <rect x={r(13)} y={r(11)} width={r(22)} height={r(9)} fill="#1c1511" rx={r(1)}/>
      <rect x={r(37)} y={r(11)} width={r(10)} height={r(9)} fill="#181210" rx={r(1)}/>
      {/* row 2 */}
      <rect x={r(1)}  y={r(21)} width={r(22)} height={r(9)} fill="#1b1311" rx={r(1)}/>
      <rect x={r(25)} y={r(21)} width={r(22)} height={r(9)} fill="#1d1510" rx={r(1)}/>
      {/* row 3 — offset */}
      <rect x={r(1)}  y={r(31)} width={r(10)} height={r(9)} fill="#1c1411" rx={r(1)}/>
      <rect x={r(13)} y={r(31)} width={r(22)} height={r(9)} fill="#1a1310" rx={r(1)}/>
      <rect x={r(37)} y={r(31)} width={r(10)} height={r(9)} fill="#1b1411" rx={r(1)}/>
      {/* row 4 (partial) */}
      <rect x={r(1)}  y={r(41)} width={r(22)} height={r(6)} fill="#1d1511" rx={r(1)}/>
      <rect x={r(25)} y={r(41)} width={r(22)} height={r(6)} fill="#1b1310" rx={r(1)}/>
      {/* top-edge highlights on a couple bricks */}
      <line x1={r(1)}  y1={r(1)}  x2={r(23)} y2={r(1)}  stroke="#2c1e14" strokeWidth={r(0.8)} opacity="0.5"/>
      <line x1={r(13)} y1={r(11)} x2={r(35)} y2={r(11)} stroke="#2c1e14" strokeWidth={r(0.8)} opacity="0.4"/>
    </svg>
  );
}

function DoorTile({ size = 48 }) {
  const r = (v) => Math.round(v * size / 48);
  const plankYs = [10, 20, 30, 40];
  return (
    <svg width={size} height={size} xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      {/* outer background / mortar */}
      <rect width={size} height={size} fill="#0b0b0b"/>
      {/* left stone wall */}
      <rect x={0}     y={0} width={r(11)} height={size} fill="#1a1310"/>
      <rect x={r(1)}  y={r(2)}  width={r(9)} height={r(11)} fill="#1e1612" rx={r(1)}/>
      <rect x={r(1)}  y={r(19)} width={r(9)} height={r(11)} fill="#1c1410" rx={r(1)}/>
      <rect x={r(1)}  y={r(36)} width={r(9)} height={r(10)} fill="#1e1612" rx={r(1)}/>
      {/* right stone wall */}
      <rect x={r(37)} y={0} width={r(11)} height={size} fill="#1c1512"/>
      <rect x={r(38)} y={r(2)}  width={r(9)} height={r(11)} fill="#1e1612" rx={r(1)}/>
      <rect x={r(38)} y={r(19)} width={r(9)} height={r(11)} fill="#1c1410" rx={r(1)}/>
      <rect x={r(38)} y={r(36)} width={r(9)} height={r(10)} fill="#1e1612" rx={r(1)}/>
      {/* door recess */}
      <rect x={r(11)} y={0} width={r(26)} height={size} fill="#211408"/>
      {/* door panel */}
      <rect x={r(13)} y={r(2)} width={r(22)} height={size-r(4)} fill="#3e2814" rx={r(1)}/>
      {/* wood plank lines */}
      {plankYs.map(y => (
        <line key={y} x1={r(14)} y1={r(y)} x2={r(34)} y2={r(y)} stroke="#2e1e0e" strokeWidth={r(1)}/>
      ))}
      {/* centre seam */}
      <line x1={r(24)} y1={r(3)} x2={r(24)} y2={size-r(3)} stroke="#2e1e0e" strokeWidth={r(0.5)} opacity="0.5"/>
      {/* brass knob */}
      <circle cx={r(30)} cy={r(24)} r={r(3)}   fill="#7a5c12"/>
      <circle cx={r(29.5)} cy={r(23.5)} r={r(1.3)} fill="#c49a20" opacity="0.8"/>
      {/* frame edges */}
      <line x1={r(11)} y1={0} x2={r(11)} y2={size} stroke="#3a2410" strokeWidth={r(1)}/>
      <line x1={r(37)} y1={0} x2={r(37)} y2={size} stroke="#3a2410" strokeWidth={r(1)}/>
    </svg>
  );
}

function WindowTile({ size = 48 }) {
  const r = (v) => Math.round(v * size / 48);
  return (
    <svg width={size} height={size} xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      {/* background */}
      <rect width={size} height={size} fill="#0b0b0b"/>
      {/* left stone wall */}
      <rect x={0}     y={0} width={r(14)} height={size} fill="#1a1310"/>
      <rect x={r(1)}  y={r(2)}  width={r(12)} height={r(11)} fill="#1e1612" rx={r(1)}/>
      <rect x={r(1)}  y={r(19)} width={r(12)} height={r(11)} fill="#1c1410" rx={r(1)}/>
      <rect x={r(1)}  y={r(36)} width={r(12)} height={r(10)} fill="#1e1612" rx={r(1)}/>
      {/* right stone wall */}
      <rect x={r(34)} y={0} width={r(14)} height={size} fill="#1c1512"/>
      <rect x={r(35)} y={r(2)}  width={r(12)} height={r(11)} fill="#1e1612" rx={r(1)}/>
      <rect x={r(35)} y={r(19)} width={r(12)} height={r(11)} fill="#1c1410" rx={r(1)}/>
      <rect x={r(35)} y={r(36)} width={r(12)} height={r(10)} fill="#1e1612" rx={r(1)}/>
      {/* window void */}
      <rect x={r(14)} y={0} width={r(20)} height={size} fill="#0d1525"/>
      {/* glass pane */}
      <rect x={r(15)} y={r(3)} width={r(18)} height={size-r(6)} fill="#0e1c38"/>
      {/* inner glow / shine strip */}
      <rect x={r(16)} y={r(4)} width={r(3)}  height={size-r(10)} fill="#1e3258" opacity="0.45"/>
      {/* cross glazing bars */}
      <rect x={r(15)} y={r(23)} width={r(18)} height={r(2)} fill="#13223c"/>
      <rect x={r(23)} y={r(3)}  width={r(2)}  height={size-r(6)} fill="#13223c"/>
      {/* frame edges */}
      <line x1={r(14)} y1={0} x2={r(14)} y2={size} stroke="#1c2840" strokeWidth={r(1)}/>
      <line x1={r(34)} y1={0} x2={r(34)} y2={size} stroke="#1c2840" strokeWidth={r(1)}/>
    </svg>
  );
}

function StairsTile({ size = 48 }) {
  const r  = (v) => Math.round(v * size / 48);
  const steps = 6;
  const sh = 48 / steps;          // step height in unscaled units
  return (
    <svg width={size} height={size} xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      <rect width={size} height={size} fill="#111018"/>
      {Array.from({ length: steps }, (_, i) => {
        const y       = r(i * sh);
        const h       = r(sh) - 1;
        const indent  = r(i * 2);
        const light   = 8 + i * 5;          // gets lighter going "down"
        return (
          <rect key={i} x={indent} y={y} width={size - indent * 2} height={h}
            fill={`hsl(248,8%,${light}%)`}/>
        );
      })}
      {/* shadow line at each step edge */}
      {Array.from({ length: steps - 1 }, (_, i) => {
        const y      = r((i + 1) * sh) - 1;
        const indent = r(i * 2);
        return (
          <line key={i} x1={indent} y1={y} x2={size - indent} y2={y}
            stroke="#07050e" strokeWidth={r(1.5)}/>
        );
      })}
      {/* down-arrow */}
      <path
        d={`M${r(20)} ${r(28)} L${r(24)} ${r(35)} L${r(28)} ${r(28)}`}
        stroke="#7060c8" strokeWidth={r(1.5)} fill="none"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.9"
      />
    </svg>
  );
}

// ── Cell type registry ────────────────────────────────────────────────────────
const CELL_TYPES = {
  floor:   { label: "Floor",   icon: "·", Tile: FloorTile  },
  wall:    { label: "Wall",    icon: "█", Tile: WallTile   },
  door:    { label: "Door",    icon: "▭", Tile: DoorTile   },
  window:  { label: "Window",  icon: "◫", Tile: WindowTile },
  stairs:  { label: "Stairs",  icon: "↕", Tile: StairsTile },
};

const TOOLS = [
  ...Object.entries(CELL_TYPES).map(([key, val]) => ({ key, ...val })),
  { key: "eraser", label: "Eraser", icon: "✕", Tile: null },
];

// ── Toolbar button ────────────────────────────────────────────────────────────
function ToolButton({ tool, active, onClick }) {
  const { Tile, icon } = tool;
  return (
    <button
      onClick={onClick}
      title={tool.label}
      className={`flex items-center gap-2 px-3 py-2 rounded border text-xs font-gothic tracking-wider transition-all ${
        active
          ? "border-blood text-blood bg-blood-dark/30 shadow-sm shadow-blood/30"
          : "border-void-border text-gray-500 hover:border-gray-500 hover:text-gray-300"
      }`}
    >
      <div className="w-6 h-6 rounded-sm overflow-hidden shrink-0 border border-black/50">
        {Tile
          ? <Tile size={24}/>
          : <div className="w-6 h-6 bg-void flex items-center justify-center text-gray-500 text-sm">{icon}</div>
        }
      </div>
      <span className="text-[10px] uppercase tracking-widest">{tool.label}</span>
    </button>
  );
}

// ── Grid cell ─────────────────────────────────────────────────────────────────
function Cell({ type, onPaint, onErase }) {
  const { Tile } = CELL_TYPES[type] || CELL_TYPES.floor;
  return (
    <div
      onMouseDown={(e) => { e.preventDefault(); if (e.button === 2) onErase(); else onPaint(); }}
      onMouseEnter={(e) => { if (e.buttons === 1) onPaint(); if (e.buttons === 2) onErase(); }}
      onContextMenu={(e) => e.preventDefault()}
      className="border border-black/20 select-none cursor-crosshair overflow-hidden"
      style={{ width: CELL_SIZE, height: CELL_SIZE, flexShrink: 0 }}
    >
      <Tile size={CELL_SIZE}/>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SceneMapPrototype() {
  const [grid,     setGrid]     = useState(() => Array(DEFAULT_ROWS * DEFAULT_COLS).fill("floor"));
  const [activeTool, setTool]   = useState("wall");
  const [gridCols, setGridCols] = useState(DEFAULT_COLS);
  const [gridRows, setGridRows] = useState(DEFAULT_ROWS);

  const paint = useCallback((row, col) => {
    setGrid((prev) => {
      const next = [...prev];
      next[row * gridCols + col] = activeTool === "eraser" ? "floor" : activeTool;
      return next;
    });
  }, [activeTool, gridCols]);

  const erase = useCallback((row, col) => {
    setGrid((prev) => {
      const next = [...prev];
      next[row * gridCols + col] = "floor";
      return next;
    });
  }, [gridCols]);

  const resizeGrid = useCallback((newRows, newCols) => {
    setGrid((prev) => {
      const next = Array(newRows * newCols).fill("floor");
      for (let r = 0; r < Math.min(gridRows, newRows); r++)
        for (let c = 0; c < Math.min(gridCols, newCols); c++)
          next[r * newCols + c] = prev[r * gridCols + c];
      return next;
    });
  }, [gridRows, gridCols]);

  const handleCols = (e) => {
    const c = Math.max(5, Math.min(50, +e.target.value));
    setGridCols(c);
    resizeGrid(gridRows, c);
  };
  const handleRows = (e) => {
    const r = Math.max(5, Math.min(50, +e.target.value));
    setGridRows(r);
    resizeGrid(r, gridCols);
  };

  return (
    <div className="min-h-screen bg-void text-gray-200 flex flex-col">

      {/* Header */}
      <div className="border-b border-void-border bg-void-light px-6 py-3 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="font-gothic text-blood text-xl tracking-widest">Scene Maker</h1>
          <p className="text-gray-600 text-xs tracking-wider uppercase">Prototype — GM only</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{gridCols} × {gridRows}</span>
          <span className="text-gray-700">|</span>
          <span className="hidden sm:inline">Left-click paint · Right-click erase · Drag to fill</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="border-b border-void-border bg-void-light px-6 py-3 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          {TOOLS.map((tool) => (
            <ToolButton key={tool.key} tool={tool} active={activeTool === tool.key} onClick={() => setTool(tool.key)}/>
          ))}

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-gray-500 border border-void-border rounded px-2 py-1.5">
              <span>W</span>
              <input type="number" min={5} max={50} value={gridCols} onChange={handleCols}
                className="w-10 bg-transparent text-gray-200 text-center focus:outline-none"/>
              <span className="mx-1 text-gray-700">×</span>
              <span>H</span>
              <input type="number" min={5} max={50} value={gridRows} onChange={handleRows}
                className="w-10 bg-transparent text-gray-200 text-center focus:outline-none"/>
            </div>
            <button
              onClick={() => setGrid(Array(gridRows * gridCols).fill("floor"))}
              className="text-xs border border-void-border text-gray-500 hover:border-blood hover:text-blood px-3 py-2 rounded font-gothic tracking-wider transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Grid canvas */}
      <div className="flex-1 overflow-auto p-6">
        <div
          className="inline-block border border-void-border/40 rounded overflow-hidden select-none shadow-2xl"
          style={{ lineHeight: 0 }}
        >
          {Array.from({ length: gridRows }, (_, row) => (
            <div key={row} className="flex">
              {Array.from({ length: gridCols }, (_, col) => (
                <Cell
                  key={col}
                  type={grid[row * gridCols + col]}
                  onPaint={() => paint(row, col)}
                  onErase={() => erase(row, col)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
