import { useState, useRef, useEffect, Suspense, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment } from "@react-three/drei";
import api from "../../services/api";
import { useToast } from "../../store/toastStore";

// ── grid config ───────────────────────────────────────────────────────────────
const GRID  = 28;
const TILE  = 0.09;
const HALF  = (GRID * TILE) / 2;
const SCALE = 0.023;
const P     = "/dungeon/kaykit/";

// ── asset library (203 models) ────────────────────────────────────────────────
const ASSET_CATEGORIES = {
  Walls: {
    "Stone":                P + "wall.gltf.glb",
    "Arched":               P + "wall_arched.gltf.glb",
    "Cracked":              P + "wall_cracked.gltf.glb",
    "Broken":               P + "wall_broken.gltf.glb",
    "Half":                 P + "wall_half.gltf.glb",
    "Sloped":               P + "wall_sloped.gltf.glb",
    "Endcap":               P + "wall_endcap.gltf.glb",
    "Half Endcap":          P + "wall_half_endcap.gltf.glb",
    "Half Endcap Sloped":   P + "wall_half_endcap_sloped.gltf.glb",
    "Corner":               P + "wall_corner.gltf.glb",
    "Corner Small":         P + "wall_corner_small.gltf.glb",
    "Corner Gated":         P + "wall_corner_gated.gltf.glb",
    "T-Split":              P + "wall_Tsplit.gltf.glb",
    "T-Split Sloped":       P + "wall_Tsplit_sloped.gltf.glb",
    "Crossing":             P + "wall_crossing.gltf.glb",
    "Gated":                P + "wall_gated.gltf.glb",
    "Window Open":          P + "wall_window_open.gltf.glb",
    "Window Closed":        P + "wall_window_closed.gltf.glb",
    "Arched Window Open":   P + "wall_archedwindow_open.gltf.glb",
    "Arched Window Gated":  P + "wall_archedwindow_gated.gltf.glb",
    "Pillar Wall":          P + "wall_pillar.gltf.glb",
    "Shelves Wall":         P + "wall_shelves.gltf.glb",
    "Scaffold":             P + "wall_scaffold.gltf.glb",
    "Open Scaffold":        P + "wall_open_scaffold.gltf.glb",
    "Window Scaffold":      P + "wall_window_open_scaffold.gltf.glb",
    "Corner Scaffold":      P + "wall_corner_scaffold.gltf.glb",
    "Doorway Scaffold":     P + "wall_doorway_scaffold.glb",
  },
  Doors: {
    "Doorway":              P + "wall_doorway.glb",
    "Doorway T-Split":      P + "wall_doorway_Tsplit.gltf.glb",
    "Doorway Sides":        P + "wall_doorway_sides.gltf.glb",
  },
  Floors: {
    "Stone Tile":           P + "floor_tile_large.gltf.glb",
    "Stone Tile Small":     P + "floor_tile_small.gltf.glb",
    "Stone Decorated":      P + "floor_tile_small_decorated.gltf.glb",
    "Stone Broken A":       P + "floor_tile_small_broken_A.gltf.glb",
    "Stone Broken B":       P + "floor_tile_small_broken_B.gltf.glb",
    "Stone Corner":         P + "floor_tile_small_corner.gltf.glb",
    "Stone Weeds A":        P + "floor_tile_small_weeds_A.gltf.glb",
    "Stone Weeds B":        P + "floor_tile_small_weeds_B.gltf.glb",
    "Stone Rocks":          P + "floor_tile_large_rocks.gltf.glb",
    "Grate":                P + "floor_tile_grate.gltf.glb",
    "Grate Open":           P + "floor_tile_grate_open.gltf.glb",
    "Grate Large":          P + "floor_tile_big_grate.gltf.glb",
    "Grate Large Open":     P + "floor_tile_big_grate_open.gltf.glb",
    "Grate XL":             P + "floor_tile_extralarge_grates.gltf.glb",
    "Grate XL Open":        P + "floor_tile_extralarge_grates_open.gltf.glb",
    "Spikes":               P + "floor_tile_big_spikes.glb",
    "Wood":                 P + "floor_wood_large.gltf.glb",
    "Wood Dark":            P + "floor_wood_large_dark.gltf.glb",
    "Wood Small":           P + "floor_wood_small.gltf.glb",
    "Wood Small Dark":      P + "floor_wood_small_dark.gltf.glb",
    "Dirt":                 P + "floor_dirt_large.gltf.glb",
    "Dirt Rocky":           P + "floor_dirt_large_rocky.gltf.glb",
    "Dirt A":               P + "floor_dirt_small_A.gltf.glb",
    "Dirt B":               P + "floor_dirt_small_B.gltf.glb",
    "Dirt C":               P + "floor_dirt_small_C.gltf.glb",
    "Dirt D":               P + "floor_dirt_small_D.gltf.glb",
    "Dirt Corner":          P + "floor_dirt_small_corner.gltf.glb",
    "Dirt Weeds":           P + "floor_dirt_small_weeds.gltf.glb",
    "Foundation Front":     P + "floor_foundation_front.gltf.glb",
    "Foundation Back":      P + "floor_foundation_front_and_back.gltf.glb",
    "Foundation Corner":    P + "floor_foundation_corner.gltf.glb",
    "Foundation Diag":      P + "floor_foundation_diagonal_corner.gltf.glb",
    "Foundation Sides":     P + "floor_foundation_front_and_sides.gltf.glb",
    "Foundation All":       P + "floor_foundation_allsides.gltf.glb",
  },
  Stairs: {
    "Stairs":               P + "stairs.gltf.glb",
    "Narrow":               P + "stairs_narrow.gltf.glb",
    "Wide":                 P + "stairs_wide.gltf.glb",
    "Walled":               P + "stairs_walled.gltf.glb",
    "Wall Left":            P + "stairs_wall_left.gltf.glb",
    "Wall Right":           P + "stairs_wall_right.gltf.glb",
    "Wood":                 P + "stairs_wood.gltf.glb",
    "Wood Decorated":       P + "stairs_wood_decorated.gltf.glb",
  },
  Pillars: {
    "Pillar":               P + "pillar.gltf.glb",
    "Pillar Decorated":     P + "pillar_decorated.gltf.glb",
    "Column":               P + "column.gltf.glb",
    "Barrier":              P + "barrier.gltf.glb",
    "Barrier Half":         P + "barrier_half.gltf.glb",
    "Barrier Corner":       P + "barrier_corner.gltf.glb",
    "Barrier Column":       P + "barrier_column.gltf.glb",
    "Barrier Col. Half":    P + "barrier_colum_half.gltf.glb",
  },
  Furniture: {
    "Chair":                P + "chair.gltf.glb",
    "Stool":                P + "stool.gltf.glb",
    "Table Small":          P + "table_small.gltf.glb",
    "Table Small A":        P + "table_small_decorated_A.gltf.glb",
    "Table Small B":        P + "table_small_decorated_B.gltf.glb",
    "Table Medium":         P + "table_medium.gltf.glb",
    "Table Med. Broken":    P + "table_medium_broken.gltf.glb",
    "Table Med. Dec.":      P + "table_medium_decorated_A.gltf.glb",
    "Table Med. Cloth":     P + "table_medium_tablecloth.gltf.glb",
    "Table Med. Cloth D":   P + "table_medium_tablecloth_decorated_B.gltf.glb",
    "Table Long":           P + "table_long.gltf.glb",
    "Table Long Broken":    P + "table_long_broken.gltf.glb",
    "Table Long A":         P + "table_long_decorated_A.gltf.glb",
    "Table Long C":         P + "table_long_decorated_C.gltf.glb",
    "Table Long Cloth":     P + "table_long_tablecloth.gltf.glb",
    "Table Long Cloth D":   P + "table_long_tablecloth_decorated_A.gltf.glb",
    "Shelf Small":          P + "shelf_small.gltf.glb",
    "Shelf Candles":        P + "shelf_small_candles.gltf.glb",
    "Shelf Large":          P + "shelf_large.gltf.glb",
    "Shelves":              P + "shelves.gltf.glb",
    "Bed Frame":            P + "bed_frame.gltf.glb",
    "Bed Floor":            P + "bed_floor.gltf.glb",
    "Bed Decorated":        P + "bed_decorated.gltf.glb",
  },
  Containers: {
    "Barrel Small":         P + "barrel_small.gltf.glb",
    "Barrel Stack":         P + "barrel_small_stack.gltf.glb",
    "Barrel Large":         P + "barrel_large.gltf.glb",
    "Barrel Large Dec.":    P + "barrel_large_decorated.gltf.glb",
    "Keg":                  P + "keg.gltf.glb",
    "Keg Decorated":        P + "keg_decorated.gltf.glb",
    "Box Small":            P + "box_small.gltf.glb",
    "Box Small Dec.":       P + "box_small_decorated.gltf.glb",
    "Box Large":            P + "box_large.gltf.glb",
    "Box Stacked":          P + "box_stacked.gltf.glb",
    "Crates":               P + "crates_stacked.gltf.glb",
    "Chest":                P + "chest.glb",
    "Chest Gold":           P + "chest_gold.glb",
    "Trunk S-A":            P + "trunk_small_A.gltf.glb",
    "Trunk S-B":            P + "trunk_small_B.gltf.glb",
    "Trunk S-C":            P + "trunk_small_C.gltf.glb",
    "Trunk M-A":            P + "trunk_medium_A.gltf.glb",
    "Trunk M-B":            P + "trunk_medium_B.gltf.glb",
    "Trunk M-C":            P + "trunk_medium_C.gltf.glb",
    "Trunk L-A":            P + "trunk_large_A.gltf.glb",
    "Trunk L-B":            P + "trunk_large_B.gltf.glb",
    "Trunk L-C":            P + "trunk_large_C.gltf.glb",
  },
  Lighting: {
    "Torch":                P + "torch.gltf.glb",
    "Torch Lit":            P + "torch_lit.gltf.glb",
    "Torch Mounted":        P + "torch_mounted.gltf.glb",
    "Candle":               P + "candle.gltf.glb",
    "Candle Lit":           P + "candle_lit.gltf.glb",
    "Candle Melted":        P + "candle_melted.gltf.glb",
    "Candle Thin":          P + "candle_thin.gltf.glb",
    "Candle Thin Lit":      P + "candle_thin_lit.gltf.glb",
    "Candle Triple":        P + "candle_triple.gltf.glb",
  },
  Banners: {
    "Blue":                 P + "banner_blue.gltf.glb",
    "Red":                  P + "banner_red.gltf.glb",
    "Green":                P + "banner_green.gltf.glb",
    "Brown":                P + "banner_brown.gltf.glb",
    "White":                P + "banner_white.gltf.glb",
    "Yellow":               P + "banner_yellow.gltf.glb",
    "Pattern A Blue":       P + "banner_patternA_blue.gltf.glb",
    "Pattern A Red":        P + "banner_patternA_red.gltf.glb",
    "Pattern A Green":      P + "banner_patternA_green.gltf.glb",
    "Pattern A White":      P + "banner_patternA_white.gltf.glb",
    "Pattern A Yellow":     P + "banner_patternA_yellow.gltf.glb",
    "Pattern B Blue":       P + "banner_patternB_blue.gltf.glb",
    "Pattern B Red":        P + "banner_patternB_red.gltf.glb",
    "Pattern B Green":      P + "banner_patternB_green.gltf.glb",
    "Pattern B White":      P + "banner_patternB_white.gltf.glb",
    "Pattern C Red":        P + "banner_patternC_red.gltf.glb",
    "Shield Blue":          P + "banner_shield_blue.gltf.glb",
    "Shield Red":           P + "banner_shield_red.gltf.glb",
    "Shield Green":         P + "banner_shield_green.gltf.glb",
    "Shield Gold":          P + "banner_shield_yellow.gltf.glb",
    "Thin Blue":            P + "banner_thin_blue.gltf.glb",
    "Thin Red":             P + "banner_thin_red.gltf.glb",
    "Triple Blue":          P + "banner_triple_blue.gltf.glb",
    "Triple Red":           P + "banner_triple_red.gltf.glb",
  },
  Props: {
    "Sword & Shield":       P + "sword_shield.gltf.glb",
    "Sword Broken":         P + "sword_shield_broken.gltf.glb",
    "Sword Gold":           P + "sword_shield_gold.gltf.glb",
    "Key":                  P + "key.gltf.glb",
    "Keyring":              P + "keyring.gltf.glb",
    "Keyring Hanging":      P + "keyring_hanging.gltf.glb",
    "Coin":                 P + "coin.gltf.glb",
    "Coins Small":          P + "coin_stack_small.gltf.glb",
    "Coins Medium":         P + "coin_stack_medium.gltf.glb",
    "Coins Large":          P + "coin_stack_large.gltf.glb",
    "Plate":                P + "plate.gltf.glb",
    "Plate Small":          P + "plate_small.gltf.glb",
    "Plate Food A":         P + "plate_food_A.gltf.glb",
    "Plate Food B":         P + "plate_food_B.gltf.glb",
    "Plate Stack":          P + "plate_stack.gltf.glb",
    "Bottle A Brown":       P + "bottle_A_brown.gltf.glb",
    "Bottle A Green":       P + "bottle_A_green.gltf.glb",
    "Bottle Labeled Brn":   P + "bottle_A_labeled_brown.gltf.glb",
    "Bottle Labeled Grn":   P + "bottle_A_labeled_green.gltf.glb",
    "Bottle B Brown":       P + "bottle_B_brown.gltf.glb",
    "Bottle B Green":       P + "bottle_B_green.gltf.glb",
    "Bottle C Brown":       P + "bottle_C_brown.gltf.glb",
    "Bottle C Green":       P + "bottle_C_green.gltf.glb",
    "Rubble Half":          P + "rubble_half.gltf.glb",
    "Rubble Large":         P + "rubble_large.gltf.glb",
  },
};

const HDRI_PRESETS = { "None": null, "Night": "night", "Dawn": "dawn", "Forest": "forest", "Warehouse": "warehouse", "Lobby": "lobby", "Apartment": "apartment" };

const ALL_URLS = Object.values(ASSET_CATEGORIES).flatMap(c => Object.values(c));
ALL_URLS.forEach(useGLTF.preload);

const WALL_URLS  = new Set([...Object.values(ASSET_CATEGORIES.Walls), ...Object.values(ASSET_CATEGORIES.Doors)]);
const FLOOR_URLS = new Set(Object.values(ASSET_CATEGORIES.Floors));
const STAIR_URLS = new Set(Object.values(ASSET_CATEGORIES.Stairs));

// Selecting any asset in these categories auto-switches to Draw Walls mode
const WALL_CATS = new Set(["Walls", "Doors"]);
const PANEL_CATEGORIES = ASSET_CATEGORIES;

const mkCell  = () => ({ floor: null, walls: { h: null, v: null }, object: null });
const isEmpty = (c) => !c || (!c.floor && !c.object);

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

// ── 3D tile ───────────────────────────────────────────────────────────────────
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
          ch.material.emissiveIntensity = 1.0;
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

// ── ghost tile (translucent preview) ─────────────────────────────────────────
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
    <primitive object={ghost} position={[x, 0.002, z]} rotation={[0, rotY, 0]} scale={[SCALE, SCALE, SCALE]} />
  );
}

// ── cell meshes ───────────────────────────────────────────────────────────────
function CellMeshes({ cell, x, z }) {
  if (!cell) return null;
  return (
    <group>
      {cell.floor  && <Suspense fallback={null}><Tile url={cell.floor.url}  x={x} z={z} rotY={cell.floor.rotY ?? 0} /></Suspense>}
      {cell.object && <Suspense fallback={null}><Tile url={cell.object.url} x={x} z={z} rotY={cell.object.rotY ?? 0} /></Suspense>}
    </group>
  );
}

// ── edge walls ────────────────────────────────────────────────────────────────
const DEFAULT_WALL_URL = ASSET_CATEGORIES.Walls["Stone"];

function EdgeWalls({ hEdges, vEdges }) {
  return (
    <>
      {hEdges.map((url, i) => {
        if (!url) return null;
        const wallUrl = typeof url === "string" ? url : DEFAULT_WALL_URL;
        const r = Math.floor(i / GRID), c = i % GRID;
        return (
          <Suspense key={`h${i}`} fallback={null}>
            <Tile url={wallUrl} x={(c + 0.5) * TILE - HALF} z={r * TILE - HALF} rotY={0} />
          </Suspense>
        );
      })}
      {vEdges.map((url, i) => {
        if (!url) return null;
        const wallUrl = typeof url === "string" ? url : DEFAULT_WALL_URL;
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

// ── hit plane ─────────────────────────────────────────────────────────────────
function HitPlane({ x, z, idx, onDown, onDelete, onEnter, onHover, highlighted }) {
  const [hov, setHov] = useState(false);
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.03, z]}
      onPointerDown={e => { e.stopPropagation(); if (e.button === 2) onDelete(e, idx); else if (e.button === 0) onDown(e, idx); }}
      onPointerEnter={e => { e.stopPropagation(); setHov(true); onHover(e, idx); if (e.buttons === 1) onEnter(idx); }}
      onPointerLeave={() => { setHov(false); onHover(null, null); }}
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

// ── atmosphere lights ─────────────────────────────────────────────────────────
function AtmosphereLights({ fogDensity, hour }) {
  const fillRef = useRef();

  const isNight = hour < 6 || hour >= 19;
  const isDusk  = (hour >= 17 && hour < 19) || (hour >= 5 && hour < 7);

  return (
    <>
      <hemisphereLight args={[isNight ? 0x1a0a2e : 0x6a4a2a, 0x060408, isNight ? 0.25 : 0.55]} />
      <directionalLight
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
    </>
  );
}

// ── full scene ────────────────────────────────────────────────────────────────
function Scene({ grid, hEdges, vEdges, previewEdges, hoveredEdge, onDown, onDelete, onEnter, onHover, ghost, highlightCells, hdri, fogDensity, hour }) {
  return (
    <>
      <fogExp2 attach="fog" color={0x0a0608} density={fogDensity} />
      <AtmosphereLights fogDensity={fogDensity} hour={hour} />
      {hdri && <Environment preset={hdri} background />}
      <gridHelper args={[GRID * TILE, GRID, "#2a0e0e", "#150606"]} position={[0, 0.001, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[GRID * TILE * 2, GRID * TILE * 2]} />
        <meshStandardMaterial color="#0a0606" roughness={1} />
      </mesh>
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
      <EdgeWalls hEdges={hEdges} vEdges={vEdges} />
      <EdgePreview previewEdges={previewEdges} hoveredEdge={hoveredEdge} />
      {ghost}
    </>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function SceneMap3D() {
  const { groupId } = useParams();
  const toast = useToast();

  const [grid,           setGrid]           = useState(() => Array(GRID * GRID).fill(null));
  const [hEdges,         setHEdges]         = useState(() => new Array(812).fill(null));
  const [vEdges,         setVEdges]         = useState(() => new Array(812).fill(null));
  const [hoveredEdge,    setHoveredEdge]    = useState(null);
  const [previewEdges,   setPreviewEdges]   = useState([]);
  const [tool,           setTool]           = useState("place");
  const [activeCategory, setActiveCategory] = useState("Floors");
  const [activeName,     setActiveName]     = useState("Stone Tile");
  const [hdri,           setHdri]           = useState("night");
  const [fogDensity,     setFogDensity]     = useState(0.18);
  const [hour,           setHour]           = useState(23);
  const [searchTerm,     setSearchTerm]     = useState("");
  const [brushRotation,  setBrushRotation]  = useState(0);
  const [hoveredIdx,     setHoveredIdx]     = useState(null);
  const [highlightCells, setHighlightCells] = useState(new Set());
  const [sceneName,      setSceneName]      = useState("Untitled Scene");
  const [saving,         setSaving]         = useState(false);
  const [editingName,    setEditingName]    = useState(false);

  // gridRef mirrors grid state so refs (undo stacks etc.) always see current value
  const gridRef        = useRef(grid);
  const hEdgesRef      = useRef(new Array(812).fill(null));
  const vEdgesRef      = useRef(new Array(812).fill(null));
  const undoStack      = useRef([]);
  const redoStack      = useRef([]);
  const autoSaveTimer  = useRef(null);
  const lastSavedGrid  = useRef(null);

  // shift+drag rectangle selection
  const shiftDragStart = useRef(null);
  const shiftDragEnd   = useRef(null);

  // normal drag state
  const dragging   = useRef(false);
  const dragStart  = useRef(null);

  // edge wall drag state
  const wallAnchor  = useRef(null);   // { type: "h"|"v", idx } — snap target at mousedown
  const wallAxis    = useRef(null);   // "h" | "v" — locked for entire drag
  const wallPreview = useRef([]);     // [{ type, idx }, ...] — edges to commit on mouseup

  // ── grid mutator that keeps gridRef in sync ────────────────────────────────
  const applyGrid = useCallback((updater) => {
    setGrid(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      gridRef.current = next;
      return next;
    });
  }, []);

  const applyHEdges = useCallback((arr) => {
    hEdgesRef.current = arr;
    setHEdges(arr);
  }, []);

  const applyVEdges = useCallback((arr) => {
    vEdgesRef.current = arr;
    setVEdges(arr);
  }, []);

  // ── undo / redo ────────────────────────────────────────────────────────────
  const pushHistory = useCallback(() => {
    undoStack.current = [...undoStack.current.slice(-39), {
      grid:   [...gridRef.current],
      hEdges: [...hEdgesRef.current],
      vEdges: [...vEdgesRef.current],
    }];
    redoStack.current = [];
  }, []);

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

  // ── derived values ─────────────────────────────────────────────────────────
  const activeUrl = ASSET_CATEGORIES[activeCategory]?.[activeName] ?? null;
  const isFloor   = activeUrl && FLOOR_URLS.has(activeUrl);

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

  // auto-select first result when searching
  useEffect(() => {
    if (!searchTerm.trim()) return;
    const cats = Object.keys(filteredCategories);
    if (cats.length > 0 && !filteredCategories[activeCategory]) {
      const firstCat = cats[0];
      setActiveCategory(firstCat);
      setActiveName(Object.keys(filteredCategories[firstCat])[0]);
    }
  }, [searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  const hourLabel = `${String(Math.floor(hour)).padStart(2, "0")}:00`;

  // ── fetch scene on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (!groupId) return;
    api.get(`/api/scenes/${groupId}`)
      .then(res => {
        setSceneName(res.data.name);
        const d = res.data.data;
        if (Array.isArray(d)) {
          if (d.length > 0) applyGrid(d);
        } else if (d && typeof d === "object") {
          if (Array.isArray(d.grid)   && d.grid.length > 0)   applyGrid(d.grid);
          if (Array.isArray(d.hEdges) && d.hEdges.length > 0) {
            const h = d.hEdges.map(v => v === true ? DEFAULT_WALL_URL : (v || null));
            hEdgesRef.current = h; setHEdges(h);
          }
          if (Array.isArray(d.vEdges) && d.vEdges.length > 0) {
            const v = d.vEdges.map(v => v === true ? DEFAULT_WALL_URL : (v || null));
            vEdgesRef.current = v; setVEdges(v);
          }
        }
      })
      .catch(() => {});
  }, [groupId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── auto-save (30s debounce after grid changes) ────────────────────────────
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

  // ── paint / erase ──────────────────────────────────────────────────────────
  const paintCell = (idx) => {
    if (!activeUrl || tool === "erase" || WALL_URLS.has(activeUrl)) return;
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

  const eraseCell = (idx) => applyGrid(prev => { const n = [...prev]; n[idx] = null; return n; });

  // ── rectangle fill ─────────────────────────────────────────────────────────
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
          if (isFloor) cur.floor  = { url: activeUrl, rotY: brushRotation };
          else          cur.object = { url: activeUrl, rotY: brushRotation };
          next[i] = cur;
        });
        return next;
      });
    }
    setHighlightCells(new Set());
    shiftDragStart.current = null;
    shiftDragEnd.current   = null;
  }, [tool, activeUrl, isFloor, brushRotation, applyGrid, pushHistory]);

  const applyEdgeLine = useCallback((edgeList) => {
    if (!edgeList || edgeList.length === 0 || !activeUrl) return;
    const url   = activeUrl;
    const hIdxs = edgeList.filter(e => e.type === "h").map(e => e.idx);
    const vIdxs = edgeList.filter(e => e.type === "v").map(e => e.idx);
    if (hIdxs.length > 0) {
      const next = [...hEdgesRef.current];
      hIdxs.forEach(i => { next[i] = url; });
      applyHEdges(next);
    }
    if (vIdxs.length > 0) {
      const next = [...vEdgesRef.current];
      vIdxs.forEach(i => { next[i] = url; });
      applyVEdges(next);
    }
    setPreviewEdges([]);
    wallPreview.current = [];
  }, [applyHEdges, applyVEdges, activeUrl]);

  const eraseEdge = useCallback((edge) => {
    if (!edge) return;
    if (edge.type === "h") {
      const next = [...hEdgesRef.current];
      next[edge.idx] = null;
      applyHEdges(next);
    } else {
      const next = [...vEdgesRef.current];
      next[edge.idx] = null;
      applyVEdges(next);
    }
  }, [applyHEdges, applyVEdges]);

  // ── drag handlers ──────────────────────────────────────────────────────────
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
      wallAnchor.current  = edge;
      wallAxis.current    = edge.type;
      wallPreview.current = [edge];
      setPreviewEdges([edge]);
      return;
    }
    dragging.current  = true;
    dragStart.current = { col: idx % GRID, row: Math.floor(idx / GRID), idx };
    paintCell(idx);
  };

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
        currentEdgeIdx  = anchorRow * GRID + cellCol;
      } else {
        const anchorCol = wallAnchor.current.idx % (GRID + 1);
        currentEdgeIdx  = cellRow * (GRID + 1) + anchorCol;
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

  // ── keyboard + pointerup ───────────────────────────────────────────────────
  useEffect(() => {
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

    const onKey = (e) => {
      if (e.target.tagName === "INPUT") return;
      if (e.key === "r" || e.key === "R") {
        setBrushRotation(prev => {
          const steps = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
          const idx = steps.findIndex(v => Math.abs(v - prev) < 0.01);
          return steps[(idx + 1) % 4];
        });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); }
    };

    window.addEventListener("pointerup", up);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("keydown", onKey);
    };
  }, [undo, redo, applyRectangle, applyEdgeLine]);

  // ── save scene ────────────────────────────────────────────────────────────
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

  // ── fill floor ─────────────────────────────────────────────────────────────
  const fillFloor = () => {
    if (!isFloor) return;
    pushHistory();
    const url = activeUrl;
    applyGrid(prev => prev.map(cell => {
      const c = cell ? { ...cell, walls: { ...cell?.walls } } : mkCell();
      c.floor = { url, rotY: brushRotation };
      return c;
    }));
  };

  // ── ghost element ──────────────────────────────────────────────────────────
  const ghostElement = useMemo(() => {
    if (tool !== "place" || !activeUrl || hoveredIdx === null) return null;
    const col = hoveredIdx % GRID, row = Math.floor(hoveredIdx / GRID);
    const x = (col + 0.5) * TILE - HALF, z = (row + 0.5) * TILE - HALF;
    return (
      <Suspense fallback={null}>
        <GhostTile url={activeUrl} x={x} z={z} rotY={brushRotation} />
      </Suspense>
    );
  }, [tool, activeUrl, hoveredIdx, brushRotation]);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100vh", display: "grid", gridTemplateRows: "52px 1fr", gridTemplateColumns: "220px 1fr 200px", gridTemplateAreas: `"topbar topbar topbar" "left stage right"`, background: "#0a0a0a", color: "#e0e0e0" }}>

      {/* ── TOPBAR ── */}
      <div className="flex items-center justify-between px-4 border-b border-void-border bg-void-light" style={{ gridArea: "topbar" }}>
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

        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs">{activeCategory} · {activeName}</span>
          <div className="w-px h-4 bg-void-border mx-2" />
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
          <button
            onClick={() => {
              pushHistory();
              applyGrid(Array(GRID * GRID).fill(null));
              applyHEdges(new Array(812).fill(null));
              applyVEdges(new Array(812).fill(null));
            }}
            className="text-xs px-4 py-1.5 font-gothic tracking-wider rounded border border-void-border text-gray-500 hover:text-blood hover:border-blood transition-colors ml-1"
          >
            Clear
          </button>
          <button
            onClick={saveScene}
            disabled={saving || !groupId}
            className="text-xs px-4 py-1.5 font-gothic tracking-wider rounded bg-blood-dark text-white hover:bg-blood transition-colors disabled:opacity-40 disabled:cursor-not-allowed ml-1"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        <span className="text-gray-600 text-xs font-gothic">
          {tool === "erase" ? "Erasing"
            : tool === "wall" ? "Draw Walls · click edge to start line"
            : isFloor ? `Painting floor · ${Math.round(brushRotation * 180 / Math.PI)}°`
            : activeUrl ? `Placing · ${Math.round(brushRotation * 180 / Math.PI)}° (R to rotate)`
            : "Select an asset"}
        </span>
      </div>

      {/* ── LEFT PANEL — Assets ── */}
      <aside style={{ gridArea: "left", borderRight: "1px solid #2a2a2a", background: "#0a0a0a", overflowY: "auto", overflowX: "hidden" }}>
        <div className="px-3 py-3 border-b border-void-border sticky top-0 bg-void z-10">
          <div className="font-gothic text-blood text-xs tracking-widest uppercase mb-2">Assets</div>
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

        {Object.entries(filteredCategories).map(([cat, items]) => (
          <div key={cat}>
            <button
              className={`w-full text-left px-3 py-2 font-gothic text-xs tracking-wider uppercase transition-colors border-l-2 ${
                activeCategory === cat
                  ? "text-blood border-blood bg-void-light"
                  : "text-gray-500 border-transparent hover:text-gray-300"
              }`}
              onClick={() => { setActiveCategory(cat); setActiveName(Object.keys(items)[0]); setTool(WALL_CATS.has(cat) ? "wall" : "place"); }}
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
                    onClick={() => { setActiveName(name); setTool(WALL_CATS.has(activeCategory) ? "wall" : "place"); }}
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

      {/* ── CENTER — 3D Stage ── */}
      <main style={{ gridArea: "stage", position: "relative", background: "#050308", overflow: "hidden" }} onContextMenu={e => e.preventDefault()}>
        <Canvas shadows camera={{ position: [0, 5, 2.5], fov: 50, near: 0.01, far: 200 }} style={{ background: "#050308" }}
          onCreated={({ gl }) => { gl.toneMapping = 0; }}>
          <OrbitControls enablePan enableZoom enableRotate={false} mouseButtons={{ MIDDLE: 2 }} screenSpacePanning panSpeed={1.5} zoomSpeed={1.2} minDistance={0.5} maxDistance={15} />
          <Suspense fallback={null}>
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
          </Suspense>
        </Canvas>

        {/* Bottom controls bar */}
        <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-center gap-3 bg-void-light border border-void-border rounded px-4 py-1.5">
          {isFloor && (
            <button onClick={fillFloor}
              className="text-xs font-gothic tracking-wider border border-void-border text-gray-400 hover:text-gray-200 px-3 py-1 rounded transition-colors">
              Fill Floor
            </button>
          )}
          <span className="text-gray-600 text-xs">Left-click place · Right-click delete · Shift+drag fill area · Middle-drag pan · Scroll zoom</span>
        </div>
      </main>

      {/* ── RIGHT PANEL — Atmosphere ── */}
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
    </div>
  );
}
