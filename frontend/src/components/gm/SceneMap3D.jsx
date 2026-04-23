import { useState, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";

const GRID = 12;
const TILE = 2;
const HALF = GRID / 2;
const CAM_H = 22;

useGLTF.preload("/dungeon/floor.gltf");
useGLTF.preload("/dungeon/waal.gltf");
useGLTF.preload("/dungeon/door.gltf");

// ── camera pan controller ─────────────────────────────────────────────────────
function CameraController({ offset }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(offset[0], CAM_H, offset[1]);
    camera.lookAt(offset[0], 0, offset[1]);
  }, [offset, camera]);
  return null;
}

// ── tile meshes ───────────────────────────────────────────────────────────────
function FloorMesh({ x, z }) {
  const { scene } = useGLTF("/dungeon/floor.gltf");
  return <primitive object={scene.clone(true)} position={[x, 0, z]} />;
}
function WallMesh({ x, z, axis }) {
  const { scene } = useGLTF("/dungeon/waal.gltf");
  return <primitive object={scene.clone(true)} position={[x, 0, z]} rotation={[0, axis === "y" ? Math.PI / 2 : 0, 0]} />;
}
function DoorMesh({ x, z }) {
  const { scene } = useGLTF("/dungeon/door.gltf");
  return <primitive object={scene.clone(true)} position={[x, 0, z]} />;
}

// ── single cell ───────────────────────────────────────────────────────────────
function Cell({ idx, col, row, type, axis, activeTool, onPaint }) {
  const [hov, setHov] = useState(false);
  const x = (col - HALF + 0.5) * TILE;
  const z = (row - HALF + 0.5) * TILE;

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[x, 0.05, z]}
        onPointerDown={(e) => { e.stopPropagation(); onPaint(idx, col, row); }}
        onPointerEnter={(e) => { e.stopPropagation(); setHov(true);  }}
        onPointerLeave={() => setHov(false)}
      >
        <planeGeometry args={[TILE, TILE]} />
        <meshBasicMaterial transparent opacity={hov ? 0.25 : 0} color="#8b0000" />
      </mesh>

      {type === "floor" && <FloorMesh x={x} z={z} />}
      {type === "wall"  && <WallMesh  x={x} z={z} axis={axis} />}
      {type === "door"  && <DoorMesh  x={x} z={z} />}
    </group>
  );
}

// ── scene ─────────────────────────────────────────────────────────────────────
function Scene({ grid, axes, offset, onPaint }) {
  return (
    <>
      <CameraController offset={offset} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 14, 5]} intensity={1.0} castShadow />
      <gridHelper args={[GRID * TILE, GRID, "#2a1a1a", "#1a1a1a"]} position={[0, 0, 0]} />
      {grid.map((type, idx) => (
        <Cell
          key={idx}
          idx={idx}
          col={idx % GRID}
          row={Math.floor(idx / GRID)}
          type={type}
          axis={axes[idx] || "x"}
          activeTool="?"
          onPaint={onPaint}
        />
      ))}
    </>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────
const TOOLS = ["floor", "wall-x", "wall-y", "door", "eraser"];

export default function SceneMap3D() {
  const [grid,   setGrid]   = useState(() => Array(GRID * GRID).fill("floor"));
  const [axes,   setAxes]   = useState(() => Array(GRID * GRID).fill("x"));
  const [tool,   setTool]   = useState("floor");
  const [offset, setOffset] = useState([0, 0]);
  const painting = useRef(false);

  const paint = (idx) => {
    setGrid(prev => {
      const next = [...prev];
      if (tool === "eraser")  next[idx] = "floor";
      else if (tool === "wall-x" || tool === "wall-y") next[idx] = "wall";
      else next[idx] = tool;
      return next;
    });
    if (tool === "wall-x" || tool === "wall-y") {
      setAxes(prev => { const n=[...prev]; n[idx] = tool === "wall-x" ? "x" : "y"; return n; });
    }
  };

  const pan = (dx, dz) => setOffset(([x, z]) => [x + dx * TILE, z + dz * TILE]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }} className="bg-void">

      {/* Toolbar */}
      <div className="border-b border-void-border bg-void-light px-4 py-2 shrink-0 flex items-center gap-2 flex-wrap">
        <h1 className="font-gothic text-blood text-lg tracking-widest mr-2">Scene Maker</h1>

        {TOOLS.map(t => (
          <button key={t} onClick={() => setTool(t)}
            className={`px-3 py-1 rounded border text-xs font-gothic tracking-widest uppercase transition-all ${
              tool === t
                ? "border-blood text-blood bg-blood-dark/30"
                : "border-void-border text-gray-500 hover:border-gray-400 hover:text-gray-300"
            }`}>
            {t === "wall-x" ? "Wall —" : t === "wall-y" ? "Wall |" : t}
          </button>
        ))}

        <button onClick={() => setGrid(Array(GRID*GRID).fill("floor"))}
          className="px-3 py-1 border border-void-border text-gray-500 hover:border-blood hover:text-blood text-xs font-gothic tracking-widest uppercase rounded ml-2">
          Clear
        </button>

        {/* Pan */}
        <div className="ml-auto flex flex-col items-center gap-0.5">
          <button onClick={() => pan(0,-1)} className="w-7 h-5 border border-void-border text-gray-400 hover:text-white text-xs rounded leading-none">▲</button>
          <div className="flex gap-0.5">
            <button onClick={() => pan(-1,0)} className="w-7 h-5 border border-void-border text-gray-400 hover:text-white text-xs rounded leading-none">◀</button>
            <button onClick={() => pan(1,0)}  className="w-7 h-5 border border-void-border text-gray-400 hover:text-white text-xs rounded leading-none">▶</button>
          </div>
          <button onClick={() => pan(0,1)} className="w-7 h-5 border border-void-border text-gray-400 hover:text-white text-xs rounded leading-none">▼</button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1 }}>
        <Canvas
          shadows
          camera={{ position: [0, CAM_H, 0.001], fov: 50, near: 0.1, far: 300 }}
          style={{ background: "#0a0a0a" }}
        >
          <Scene grid={grid} axes={axes} offset={offset} onPaint={paint} />
        </Canvas>
      </div>
    </div>
  );
}
