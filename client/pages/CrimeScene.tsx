import { useState, useCallback, useMemo, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Line, Environment, Sparkles, Preload } from "@react-three/drei";
import * as THREE from "three";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import "../styles/dashboard.css";
import "../styles/crime-scene.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tool = "view" | "measure" | "mark";
type EvidenceType = "body" | "blood" | "entry" | "weapon" | "other";
type ElementType =
  | "window" | "door"
  | "desk" | "table" | "bed" | "chair" | "sofa" | "cabinet"
  | "body" | "blood" | "weapon" | "shell" | "footprints" | "glass-shards"
  | "computer" | "lamp" | "safe" | "bag";

interface SceneElement {
  id: string;
  type: ElementType;
  wall?: "north" | "south" | "east" | "west";
  position: [number, number, number];
  rotation?: [number, number, number];
  label: string;
  isBroken?: boolean;
  evidenceNumber?: number;
}

interface RoomConfig {
  type: string;
  width: number;
  depth: number;
  height: number;
}

interface ParsedScene {
  config: RoomConfig;
  elements: SceneElement[];
  legend: LegendItem[];
}

interface LegendItem {
  number?: number;
  icon: string;
  label: string;
  type: string;
  position: string;
}

interface EvidencePin {
  id: string;
  position: [number, number, number];
  label: string;
  type: EvidenceType;
}

interface Measurement {
  id: string;
  pointA: [number, number, number];
  pointB: [number, number, number];
  distance: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EVIDENCE_COLORS: Record<EvidenceType, string> = {
  body: "#ff3366", blood: "#ff0044", entry: "#ffaa00", weapon: "#a855f7", other: "#00e5ff",
};
const EVIDENCE_ICONS: Record<EvidenceType, string> = {
  body: "🧍", blood: "🩸", entry: "🚪", weapon: "🔪", other: "📌",
};

const ROOM_CONFIGS: Record<string, Omit<RoomConfig, "type">> = {
  bedroom:      { width: 9,  depth: 8,  height: 3.2 },
  office:       { width: 12, depth: 9,  height: 3.5 },
  "living room":{ width: 11, depth: 10, height: 3.2 },
  kitchen:      { width: 7,  depth: 6,  height: 2.8 },
  warehouse:    { width: 18, depth: 14, height: 6.0 },
  hallway:      { width: 4,  depth: 14, height: 3.0 },
  default:      { width: 10, depth: 10, height: 3.2 },
};

const EXAMPLE_PROMPTS = [
  "Small office room. Broken window on the north wall. A desk in the center with a computer. Blood stains near the east wall. Weapon found under the desk. Footprints from the window to the desk. Shell casings near the east wall. Door on the south wall.",
  "Bedroom. Bed against the west wall. Broken lamp near the east side. Blood spatter on the north wall. Victim found in the center of the room. Signs of struggle. Window on the south wall.",
  "Large warehouse. Broken window on the east wall. Body found near the center. Shell casings along the north wall. Bag near the south-west corner. Footprints from the east wall to the center.",
];

// ─── Parser (same deterministic logic) ───────────────────────────────────────

function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h) + seed.charCodeAt(i) | 0;
  return (Math.abs(h) % 10000) / 10000;
}

function getWallDir(s: string): "north" | "south" | "east" | "west" | null {
  if (/\bnorth\b|\bback\b/.test(s)) return "north";
  if (/\bsouth\b|\bfront\b/.test(s)) return "south";
  if (/\beast\b|\bright\b/.test(s)) return "east";
  if (/\bwest\b|\bleft\b/.test(s)) return "west";
  return null;
}

function getFloorPos(
  clause: string,
  wall: "north" | "south" | "east" | "west" | null,
  cfg: Omit<RoomConfig, "type">,
  idx: number,
  refs: Record<string, [number, number, number]>
): [number, number, number] {
  const { width: W, depth: D } = cfg;
  const hw = W / 2, hd = D / 2;
  const s = clause.toLowerCase();
  const nearMatch = s.match(/near\s+(?:the\s+)?(\w+)/);
  if (nearMatch && refs[nearMatch[1]]) {
    const r = refs[nearMatch[1]];
    return [r[0] + 0.8, 0, r[2] + 0.8];
  }
  if (/north.{0,5}east|ne\b/.test(s)) return [hw * 0.65, 0, -hd * 0.65];
  if (/north.{0,5}west|nw\b/.test(s)) return [-hw * 0.65, 0, -hd * 0.65];
  if (/south.{0,5}east|se\b/.test(s)) return [hw * 0.65, 0, hd * 0.65];
  if (/south.{0,5}west|sw\b/.test(s)) return [-hw * 0.65, 0, hd * 0.65];
  if (/center|centre|middle/.test(s))
    return [(seededRandom(clause + "cx") - 0.5), 0, (seededRandom(clause + "cz") - 0.5)];
  if (wall === "north") return [(seededRandom(clause + "x") - 0.5) * (W * 0.55), 0, -hd + 1.2 + seededRandom(clause) * 0.6];
  if (wall === "south") return [(seededRandom(clause + "x") - 0.5) * (W * 0.55), 0, hd - 1.2 - seededRandom(clause) * 0.6];
  if (wall === "east")  return [hw - 1.2 - seededRandom(clause) * 0.6, 0, (seededRandom(clause + "z") - 0.5) * (D * 0.55)];
  if (wall === "west")  return [-hw + 1.2 + seededRandom(clause) * 0.6, 0, (seededRandom(clause + "z") - 0.5) * (D * 0.55)];
  const angle = (idx / 8) * Math.PI * 2 + seededRandom(clause) * 0.8;
  const radius = 1.5 + seededRandom(clause + "r") * Math.min(hw, hd) * 0.5;
  return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
}

function parseScene(description: string): ParsedScene {
  const text = description.toLowerCase();
  const clauses = description.split(/[.,;!\n]+/).map(c => c.trim()).filter(c => c.length > 3);
  const roomTypeName = (() => {
    if (text.includes("bedroom")) return "bedroom";
    if (text.includes("office")) return "office";
    if (text.includes("living room") || text.includes("lounge")) return "living room";
    if (text.includes("kitchen")) return "kitchen";
    if (text.includes("warehouse") || text.includes("storage")) return "warehouse";
    if (text.includes("hallway") || text.includes("corridor")) return "hallway";
    return "default";
  })();
  const baseCfg = ROOM_CONFIGS[roomTypeName] || ROOM_CONFIGS.default;
  const config: RoomConfig = { type: roomTypeName, ...baseCfg };
  const { width: W, depth: D, height: H } = config;
  const elements: SceneElement[] = [];
  const legend: LegendItem[] = [];
  const refs: Record<string, [number, number, number]> = {};
  let evidenceNum = 0;

  const addEvidence = (label: string, type: string, icon: string, pos: [number, number, number]) => {
    evidenceNum++;
    legend.push({ number: evidenceNum, icon, label, type, position: `(${pos[0].toFixed(1)}, ${pos[2].toFixed(1)})` });
    return evidenceNum;
  };
  const addScene = (label: string, type: string, icon: string, pos: [number, number, number]) => {
    legend.push({ icon, label, type, position: `(${pos[0].toFixed(1)}, ${pos[2].toFixed(1)})` });
  };

  clauses.forEach((clause, idx) => {
    const s = clause.toLowerCase();
    const wall = getWallDir(s);
    const floorPos = () => getFloorPos(s, wall, baseCfg, idx, refs);

    if (/\bwindow\b/.test(s)) {
      const isBroken = /broken|shattered|smashed|cracked/.test(s);
      const w = wall || "north";
      const wallPos: [number, number, number] = (() => {
        const xr = (seededRandom(clause + "wx") - 0.5) * (W * 0.5);
        const zr = (seededRandom(clause + "wz") - 0.5) * (D * 0.5);
        if (w === "north") return [xr, H * 0.55, -D / 2 + 0.05];
        if (w === "south") return [xr, H * 0.55, D / 2 - 0.05];
        if (w === "east")  return [W / 2 - 0.05, H * 0.55, zr];
        return [-W / 2 + 0.05, H * 0.55, zr];
      })();
      const num = addEvidence(isBroken ? "Broken Window" : "Window", "window", "🪟", wallPos);
      elements.push({ id: `win-${idx}`, type: "window", wall: w, position: wallPos, label: isBroken ? "Broken Window" : "Window", isBroken, evidenceNumber: num });
      refs["window"] = wallPos;
      if (isBroken) {
        const shardPos: [number, number, number] = w === "north" ? [wallPos[0], 0, -D / 2 + 0.5] :
          w === "south" ? [wallPos[0], 0, D / 2 - 0.5] :
          w === "east"  ? [W / 2 - 0.5, 0, wallPos[2]] : [-W / 2 + 0.5, 0, wallPos[2]];
        elements.push({ id: `glass-${idx}`, type: "glass-shards", wall: w, position: shardPos, label: "Broken Glass" });
      }
    }
    if (/\bdoor\b|\bentrance\b|\bexit\b/.test(s)) {
      const w = wall || "south";
      const doorPos: [number, number, number] = (() => {
        const xr = (seededRandom(clause + "dx") - 0.5) * (W * 0.4);
        const zr = (seededRandom(clause + "dz") - 0.5) * (D * 0.4);
        if (w === "north") return [xr, H * 0.5, -D / 2 + 0.05];
        if (w === "south") return [xr, H * 0.5, D / 2 - 0.05];
        if (w === "east")  return [W / 2 - 0.05, H * 0.5, zr];
        return [-W / 2 + 0.05, H * 0.5, zr];
      })();
      addScene("Door", "door", "🚪", doorPos);
      elements.push({ id: `door-${idx}`, type: "door", wall: w, position: doorPos, label: "Door", isBroken: /broken|forced|kicked/.test(s) });
      refs["door"] = doorPos;
    }
    if (/\bdesk\b|\bworkstation\b/.test(s)) {
      const pos = floorPos(); addScene("Desk", "desk", "🪑", pos);
      elements.push({ id: `desk-${idx}`, type: "desk", position: pos, label: "Desk", rotation: [0, wall === "east" || wall === "west" ? Math.PI / 2 : 0, 0] });
      refs["desk"] = pos;
    }
    if (/\btable\b/.test(s) && !/\btable of\b/.test(s)) {
      const pos = floorPos(); addScene("Table", "table", "📦", pos);
      elements.push({ id: `table-${idx}`, type: "table", position: pos, label: "Table" });
      refs["table"] = pos;
    }
    if (/\bbed\b/.test(s)) {
      const pos = floorPos(); addScene("Bed", "bed", "🛏️", pos);
      elements.push({ id: `bed-${idx}`, type: "bed", position: pos, label: "Bed", wall: wall || undefined });
      refs["bed"] = pos;
    }
    if (/\bchair\b/.test(s)) {
      const pos = floorPos(); addScene("Chair", "chair", "🪑", pos);
      elements.push({ id: `chair-${idx}`, type: "chair", position: pos, label: "Chair" });
    }
    if (/\bsofa\b|\bcouch\b/.test(s)) {
      const pos = floorPos(); addScene("Sofa", "sofa", "🛋️", pos);
      elements.push({ id: `sofa-${idx}`, type: "sofa", position: pos, label: "Sofa", wall: wall || undefined });
    }
    if (/\bblood\b|\bbloodstain\b/.test(s)) {
      const pos = floorPos(); const num = addEvidence("Blood Stain", "blood", "🩸", pos);
      elements.push({ id: `blood-${idx}`, type: "blood", position: [pos[0], 0.003, pos[2]], label: "Blood Stain", evidenceNumber: num });
    }
    if (/\bbody\b|\bvictim\b|\bcorpse\b|\bdeceased\b/.test(s)) {
      const pos = floorPos(); const num = addEvidence("Victim", "body", "🧍", pos);
      elements.push({ id: `body-${idx}`, type: "body", position: pos, label: "Victim", evidenceNumber: num, rotation: [0, seededRandom(clause) * Math.PI * 2, 0] });
    }
    if (/\bweapon\b|\bgun\b|\bpistol\b|\bknife\b|\bblade\b|\brevolver\b|\brifle\b/.test(s)) {
      const weaponLabel = /gun|pistol|revolver|rifle/.test(s) ? "Firearm" : /knife|blade/.test(s) ? "Knife" : "Weapon";
      const pos = floorPos(); const num = addEvidence(weaponLabel, "weapon", "🔪", pos);
      elements.push({ id: `weapon-${idx}`, type: "weapon", position: [pos[0], 0.05, pos[2]], label: weaponLabel, evidenceNumber: num, rotation: [0, seededRandom(clause) * Math.PI * 2, 0] });
    }
    if (/\bshell\b|\bcasing\b|\bbullet\b|\bcartridge\b/.test(s)) {
      const basePos = floorPos(); const num = addEvidence("Shell Casings", "shell", "🔫", basePos);
      for (let i = 0; i < 4; i++) {
        const sp: [number, number, number] = [basePos[0] + (seededRandom(clause + i) - 0.5) * 1.2, 0.02, basePos[2] + (seededRandom(clause + i + "z") - 0.5) * 1.2];
        elements.push({ id: `shell-${idx}-${i}`, type: "shell", position: sp, label: i === 0 ? "Shell Casings" : "", evidenceNumber: i === 0 ? num : undefined });
      }
    }
    if (/\bfootprint\b|\bshoe\b|\btrack\b|\btire track\b/.test(s)) {
      const pos = floorPos(); const num = addEvidence("Footprints", "footprints", "👣", pos);
      elements.push({ id: `foot-${idx}`, type: "footprints", position: pos, label: "Footprints", evidenceNumber: num, rotation: [0, seededRandom(clause) * Math.PI * 2, 0] });
    }
    if (/\bcomputer\b|\bmonitor\b|\blaptop\b|\bscreen\b/.test(s)) {
      const pos = refs["desk"] ? [refs["desk"][0], 0, refs["desk"][2]] as [number, number, number] : floorPos();
      addScene("Computer", "computer", "💻", pos);
      elements.push({ id: `comp-${idx}`, type: "computer", position: [pos[0], 0.78, pos[2]], label: "Computer" });
    }
    if (/\blamp\b/.test(s)) {
      const pos = floorPos(); const isBroken = /broken|knocked|smashed/.test(s);
      addScene(isBroken ? "Broken Lamp" : "Lamp", "lamp", "💡", pos);
      elements.push({ id: `lamp-${idx}`, type: "lamp", position: pos, label: isBroken ? "Broken Lamp" : "Lamp", isBroken });
    }
    if (/\bsafe\b/.test(s)) {
      const pos = floorPos(); const num = addEvidence("Safe", "safe", "🔒", pos);
      elements.push({ id: `safe-${idx}`, type: "safe", position: pos, label: "Safe", evidenceNumber: num });
    }
    if (/\bbag\b|\bbriefcase\b|\bsuitcase\b|\bbackpack\b/.test(s)) {
      const pos = floorPos(); addScene("Bag", "bag", "🧳", pos);
      elements.push({ id: `bag-${idx}`, type: "bag", position: pos, label: "Bag" });
    }
  });

  return { config, elements, legend };
}

// ─── Procedural Texture Helpers ───────────────────────────────────────────────

function makeNoiseTexture(size = 256, baseColor: number[], roughness = 0.3): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const noise = (Math.random() - 0.5) * roughness * 255;
    data[i * 4 + 0] = Math.max(0, Math.min(255, baseColor[0] + noise));
    data[i * 4 + 1] = Math.max(0, Math.min(255, baseColor[1] + noise));
    data[i * 4 + 2] = Math.max(0, Math.min(255, baseColor[2] + noise));
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.needsUpdate = true;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeWoodTexture(size = 512): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const grain = Math.sin((x * 0.15) + Math.sin(y * 0.04) * 8) * 0.5 + 0.5;
      const micro = (Math.random() - 0.5) * 0.12;
      const v = 0.45 + grain * 0.35 + micro;
      data[i + 0] = Math.max(0, Math.min(255, v * 230));
      data[i + 1] = Math.max(0, Math.min(255, v * 155));
      data[i + 2] = Math.max(0, Math.min(255, v * 70));
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.needsUpdate = true;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeConcreteTexture(size = 256): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const noise = Math.random();
    const v = 110 + noise * 45;
    data[i * 4 + 0] = v;
    data[i * 4 + 1] = v + 8;
    data[i * 4 + 2] = v + 18;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.needsUpdate = true;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeTileTexture(size = 256): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const tileSize = 32;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const gx = x % tileSize, gy = y % tileSize;
      const isGrout = gx < 2 || gy < 2;
      const noise = (Math.random() - 0.5) * 15;
      const v = isGrout ? 80 : 210 + noise;
      data[i + 0] = Math.max(0, Math.min(255, v));
      data[i + 1] = Math.max(0, Math.min(255, v + 2));
      data[i + 2] = Math.max(0, Math.min(255, v + 8));
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.needsUpdate = true;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ─── Realistic Room Shell ─────────────────────────────────────────────────────

function RealisticRoom({ config }: { config: RoomConfig }) {
  const { width: W, depth: D, height: H } = config;

  const floorTex = useMemo(() => {
    const t = config.type === "kitchen" ? makeTileTexture(512) : makeWoodTexture(512);
    t.repeat.set(W / 2, D / 2);
    return t;
  }, [config]);

  const wallTex = useMemo(() => {
    const t = makeConcreteTexture(256);
    t.repeat.set(4, 2);
    return t;
  }, []);

  const roughnessTex = useMemo(() => {
    const t = makeNoiseTexture(128, [180, 180, 180], 0.4);
    t.repeat.set(4, 4);
    return t;
  }, []);

  return (
    <>
      {/* Floor - Polished with high specular sheen */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D, 4, 4]} />
        <meshStandardMaterial map={floorTex} roughness={0.4} metalness={0.1} envMapIntensity={1.2} />
      </mesh>

      {/* Spatial Floor Grid Overlay */}
      <gridHelper args={[Math.max(W, D) * 1.2, 24, "#00f0ff", "#334155"]} position={[0, 0.002, 0]} />

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.7} />
      </mesh>

      {/* Ceiling light panels */}
      {[[0, 0], [W * 0.3, D * 0.3], [-W * 0.3, -D * 0.3], [W * 0.3, -D * 0.3], [-W * 0.3, D * 0.3]].map(([cx, cz], i) => (
        <group key={i}>
          <mesh position={[cx, H - 0.01, cz]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.2, 0.4]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <rectAreaLight
            position={[cx, H - 0.15, cz]}
            rotation={[Math.PI / 2, 0, 0]}
            color="#fffbea"
            intensity={config.type === "warehouse" ? 10 : 6.5}
            width={1.4}
            height={0.5}
          />
        </group>
      ))}

      {/* North wall */}
      <mesh position={[0, H / 2, -D / 2]} receiveShadow>
        <planeGeometry args={[W, H, 2, 2]} />
        <meshStandardMaterial map={wallTex} roughnessMap={roughnessTex} roughness={0.65} color="#334155" envMapIntensity={0.6} />
      </mesh>
      {/* South wall */}
      <mesh position={[0, H / 2, D / 2]} rotation={[0, Math.PI, 0]} receiveShadow>
        <planeGeometry args={[W, H, 2, 2]} />
        <meshStandardMaterial map={wallTex} roughnessMap={roughnessTex} roughness={0.65} color="#334155" envMapIntensity={0.6} />
      </mesh>
      {/* East wall */}
      <mesh position={[W / 2, H / 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[D, H, 2, 2]} />
        <meshStandardMaterial map={wallTex} roughnessMap={roughnessTex} roughness={0.65} color="#475569" envMapIntensity={0.6} />
      </mesh>
      {/* West wall */}
      <mesh position={[-W / 2, H / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[D, H, 2, 2]} />
        <meshStandardMaterial map={wallTex} roughnessMap={roughnessTex} roughness={0.65} color="#475569" envMapIntensity={0.6} />
      </mesh>

      {/* Crown Molding (Top) */}
      {[-D / 2, D / 2].map((z, i) => (
        <mesh key={`top-ns-${i}`} position={[0, H - 0.05, z + (i === 0 ? 0.04 : -0.04)]}>
          <boxGeometry args={[W, 0.1, 0.04]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
      ))}

      {/* Baseboards (Bottom) */}
      {[-D / 2, D / 2].map((z, i) => (
        <mesh key={i} position={[0, 0.06, z + (i === 0 ? 0.04 : -0.04)]}>
          <boxGeometry args={[W, 0.12, 0.04]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} />
        </mesh>
      ))}
      {[W / 2, -W / 2].map((x, i) => (
        <mesh key={i} position={[x + (i === 0 ? -0.04 : 0.04), 0.06, 0]}>
          <boxGeometry args={[0.04, 0.12, D]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} />
        </mesh>
      ))}
    </>
  );
}

// ─── Realistic 3D Objects ─────────────────────────────────────────────────────

function EvidenceLabel({ label, color, number, position }: {
  label: string; color: string; number?: number; position: [number, number, number];
}) {
  return (
    <Html position={position} center distanceFactor={8}>
      <div className="evidence-pin-label" style={{ borderColor: color, backgroundColor: `${color}22` }}>
        {number && <span className="evidence-num">#{number}</span>}
        <span>{label}</span>
      </div>
    </Html>
  );
}

function Window3D({ el, cfg }: { el: SceneElement; cfg: RoomConfig }) {
  const { width: W, depth: D, height: H } = cfg;
  const rot: [number, number, number] =
    el.wall === "east" ? [0, -Math.PI / 2, 0] :
    el.wall === "west" ? [0, Math.PI / 2, 0] :
    el.wall === "south" ? [0, Math.PI, 0] : [0, 0, 0];

  const frameTex = useMemo(() => makeNoiseTexture(64, [80, 70, 60], 0.15), []);

  return (
    <group position={el.position} rotation={rot}>
      {/* Glass pane */}
      <mesh>
        <planeGeometry args={[2.1, 1.5]} />
        <meshPhysicalMaterial
          color={el.isBroken ? "#2a4a5a" : "#5ad0ff"}
          transparent opacity={el.isBroken ? 0.08 : 0.22}
          roughness={0.0} metalness={0.1}
          transmission={el.isBroken ? 0 : 0.5}
          ior={1.45}
        />
      </mesh>
      {/* Outer frame */}
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[2.3, 1.7, 0.08]} />
        <meshStandardMaterial map={frameTex} color="#3a3020" roughness={0.7} />
      </mesh>
      {/* Window sill */}
      <mesh position={[0, -0.88, 0.04]}>
        <boxGeometry args={[2.3, 0.06, 0.18]} />
        <meshStandardMaterial color="#2a2018" roughness={0.8} />
      </mesh>
      {/* Crossbars */}
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[2.1, 0.04, 0.02]} />
        <meshStandardMaterial color="#2a2018" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[0.04, 1.5, 0.02]} />
        <meshStandardMaterial color="#2a2018" roughness={0.6} />
      </mesh>
      {/* Light shaft */}
      {!el.isBroken && (
        <spotLight
          position={[0, 0, 2]}
          target-position={[0, -1, 8]}
          color="#fff8e8"
          intensity={12}
          angle={0.45}
          penumbra={0.7}
          distance={18}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
      )}
      {el.evidenceNumber && (
        <EvidenceLabel label={el.label} color="#00d4ff" number={el.evidenceNumber} position={[0, -1.1, 0.15]} />
      )}
    </group>
  );
}

function Door3D({ el }: { el: SceneElement }) {
  const rot: [number, number, number] =
    el.wall === "east" ? [0, -Math.PI / 2, 0] :
    el.wall === "west" ? [0, Math.PI / 2, 0] :
    el.wall === "south" ? [0, Math.PI, 0] : [0, 0, 0];
  const woodTex = useMemo(() => makeWoodTexture(256), []);
  const frameTex = useMemo(() => makeNoiseTexture(64, [35, 25, 15], 0.1), []);

  return (
    <group position={el.position} rotation={rot}>
      {/* Door frame */}
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[1.2, 2.4, 0.12]} />
        <meshStandardMaterial map={frameTex} color="#2a1a0a" roughness={0.8} />
      </mesh>
      {/* Door slab */}
      <mesh position={[0, 0, 0]} rotation={[0, el.isBroken ? 0.6 : 0, 0]}>
        <boxGeometry args={[1.0, 2.2, 0.05]} />
        <meshStandardMaterial map={woodTex} color={el.isBroken ? "#3a1a08" : "#4a2a10"} roughness={0.75} />
      </mesh>
      {/* Door knob */}
      <mesh position={[0.38, 0, 0.05]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color="#b8a060" metalness={0.85} roughness={0.2} />
      </mesh>
      {el.isBroken && (
        <pointLight position={[0, 0, 1]} color="#ff6030" intensity={1.5} distance={4} />
      )}
    </group>
  );
}

function Desk3D({ el }: { el: SceneElement }) {
  const rot = el.rotation || ([0, 0, 0] as [number, number, number]);
  const woodTex = useMemo(() => { const t = makeWoodTexture(256); t.repeat.set(2, 1); return t; }, []);
  return (
    <group position={el.position} rotation={rot}>
      {/* Tabletop - Rich polished oak */}
      <mesh position={[0, 0.76, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.7, 0.05, 0.9]} />
        <meshStandardMaterial map={woodTex} color="#d97706" roughness={0.4} metalness={0.1} />
      </mesh>
      {/* Modesty panel */}
      <mesh position={[0, 0.4, -0.43]}>
        <boxGeometry args={[1.6, 0.75, 0.025]} />
        <meshStandardMaterial color="#92400e" roughness={0.6} />
      </mesh>
      {/* Chrome Legs */}
      {([[-0.78, -0.41], [0.78, -0.41], [-0.78, 0.41], [0.78, 0.41]] as [number, number][]).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.38, z]} castShadow>
          <boxGeometry args={[0.06, 0.78, 0.06]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
      {/* Cross brace */}
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[1.6, 0.04, 0.04]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Table3D({ el }: { el: SceneElement }) {
  const woodTex = useMemo(() => { const t = makeWoodTexture(256); t.repeat.set(1.5, 0.8); return t; }, []);
  return (
    <group position={el.position}>
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.3, 0.04, 0.85]} />
        <meshStandardMaterial map={woodTex} color="#f59e0b" roughness={0.45} />
      </mesh>
      {([[-0.55, -0.35], [0.55, -0.35], [-0.55, 0.35], [0.55, 0.35]] as [number, number][]).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.37, z]} castShadow>
          <cylinderGeometry args={[0.025, 0.025, 0.74, 8]} />
          <meshStandardMaterial color="#b45309" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Bed3D({ el }: { el: SceneElement }) {
  const rot: [number, number, number] =
    el.wall === "east" || el.wall === "west" ? [0, Math.PI / 2, 0] : [0, 0, 0];
  const fabricTex = useMemo(() => makeNoiseTexture(128, [70, 60, 110], 0.2), []);
  const woodTex = useMemo(() => makeWoodTexture(128), []);
  return (
    <group position={el.position} rotation={rot}>
      {/* Wooden Frame */}
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.36, 1.6]} />
        <meshStandardMaterial map={woodTex} color="#7c2d12" roughness={0.6} />
      </mesh>
      {/* Crisp White Mattress */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[2.05, 0.2, 1.5]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.8} />
      </mesh>
      {/* Royal Indigo Duvet Cover */}
      <mesh position={[0, 0.56, -0.1]}>
        <boxGeometry args={[2.0, 0.04, 1.35]} />
        <meshStandardMaterial map={fabricTex} color="#4f46e5" roughness={0.7} />
      </mesh>
      {/* White Pillows */}
      {[-0.5, 0.5].map((x, i) => (
        <mesh key={i} position={[x, 0.62, -0.55]}>
          <boxGeometry args={[0.8, 0.14, 0.55]} />
          <meshStandardMaterial color="#ffffff" roughness={0.6} />
        </mesh>
      ))}
      {/* Headboard */}
      <mesh position={[0, 0.7, 0.74]} castShadow>
        <boxGeometry args={[2.1, 0.9, 0.08]} />
        <meshStandardMaterial map={woodTex} color="#9a3412" roughness={0.5} />
      </mesh>
    </group>
  );
}

function Chair3D({ el }: { el: SceneElement }) {
  const fabricTex = useMemo(() => makeNoiseTexture(128, [14, 116, 144], 0.2), []);
  return (
    <group position={el.position}>
      {/* Cushion - Bright Cyan / Teal */}
      <mesh position={[0, 0.48, 0]} castShadow>
        <boxGeometry args={[0.52, 0.08, 0.52]} />
        <meshStandardMaterial map={fabricTex} color="#0284c7" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.85, -0.24]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[0.52, 0.72, 0.05]} />
        <meshStandardMaterial map={fabricTex} color="#0284c7" roughness={0.6} />
      </mesh>
      {/* Star Base Chrome Legs */}
      {([[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]] as [number, number][]).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.24, z]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.48, 8]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

function Sofa3D({ el }: { el: SceneElement }) {
  const rot: [number, number, number] =
    el.wall === "east" || el.wall === "west" ? [0, Math.PI / 2, 0] : [0, 0, 0];
  const fabricTex = useMemo(() => makeNoiseTexture(128, [13, 148, 136], 0.2), []);
  return (
    <group position={el.position} rotation={rot}>
      {/* Base - Vibrant Teal Upholstery */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[2.3, 0.4, 0.95]} />
        <meshStandardMaterial map={fabricTex} color="#0d9488" roughness={0.7} />
      </mesh>
      {/* Seat cushions */}
      {[-0.7, 0, 0.7].map((x, i) => (
        <mesh key={i} position={[x, 0.47, 0]}>
          <boxGeometry args={[0.72, 0.16, 0.9]} />
          <meshStandardMaterial map={fabricTex} color="#0f766e" roughness={0.7} />
        </mesh>
      ))}
      {/* Backrest */}
      <mesh position={[0, 0.72, -0.4]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[2.3, 0.62, 0.14]} />
        <meshStandardMaterial map={fabricTex} color="#0d9488" roughness={0.7} />
      </mesh>
      {/* Accent Pillows */}
      {[-0.7, 0.7].map((x, i) => (
        <mesh key={`pillow-${i}`} position={[x, 0.58, -0.2]}>
          <boxGeometry args={[0.38, 0.38, 0.18]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.6} />
        </mesh>
      ))}
      {/* Arms */}
      {[-1.1, 1.1].map((x, i) => (
        <mesh key={i} position={[x, 0.55, 0]}>
          <boxGeometry args={[0.14, 0.5, 0.95]} />
          <meshStandardMaterial map={fabricTex} color="#115e59" roughness={0.7} />
        </mesh>
      ))}
      {/* Legs */}
      {[-1.0, 1.0].map((x) => [-0.35, 0.35].map((z) => (
        <mesh key={`${x}${z}`} position={[x, 0.05, z]}>
          <cylinderGeometry args={[0.04, 0.04, 0.12, 8]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
        </mesh>
      )))}
    </group>
  );
}

function Blood3D({ el }: { el: SceneElement }) {
  const droplets = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    x: (seededRandom(el.id + i) - 0.5) * 2.0,
    z: (seededRandom(el.id + i + "z") - 0.5) * 2.0,
    r: 0.04 + seededRandom(el.id + i + "r") * 0.16,
    oval: 0.5 + seededRandom(el.id + i + "o") * 0.5,
  })), [el]);
  return (
    <group position={[el.position[0], 0.003, el.position[2]]}>
      {/* Outer Blood Glow Aura */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]}>
        <circleGeometry args={[0.85, 24]} />
        <meshBasicMaterial color="#ff0044" transparent opacity={0.25} />
      </mesh>
      {/* Main pool – shiny wet crimson */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.65, 28]} />
        <meshPhysicalMaterial
          color="#dc2626"
          roughness={0.01}
          metalness={0.05}
          clearcoat={1.0}
          clearcoatRoughness={0.0}
          emissive="#7f1d1d"
          emissiveIntensity={0.3}
        />
      </mesh>
      {/* Inner arterial blood highlight */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.06, 0, 0.001]}>
        <circleGeometry args={[0.28, 20]} />
        <meshStandardMaterial color="#ef4444" roughness={0.0} emissive="#ef4444" emissiveIntensity={0.4} />
      </mesh>
      {/* Splatter drops */}
      {droplets.map((d, i) => (
        <mesh key={i} position={[d.x, 0.001, d.z]} rotation={[-Math.PI / 2, 0, seededRandom(el.id + i + "rot") * Math.PI]} scale={[1, d.oval, 1]}>
          <circleGeometry args={[d.r, 12]} />
          <meshPhysicalMaterial color="#b91c1c" roughness={0.01} clearcoat={1.0} />
        </mesh>
      ))}
      {el.evidenceNumber && (
        <EvidenceLabel label={el.label} color="#ff0044" number={el.evidenceNumber} position={[0, 0.7, 0]} />
      )}
    </group>
  );
}

function Body3D({ el }: { el: SceneElement }) {
  return (
    <group position={[el.position[0], 0, el.position[2]]} rotation={el.rotation || [0, 0, 0]}>
      {/* Bright Glowing Forensic Chalk Outline around victim on floor */}
      <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.65, 1.1, 1]}>
        <ringGeometry args={[0.9, 1.1, 32]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.9} />
      </mesh>

      {/* 3D Human Victim Figure in prone position */}
      <group position={[0, 0.15, 0]}>
        {/* Head */}
        <mesh position={[0, 0.12, -0.92]} castShadow>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshStandardMaterial color="#fcd34d" roughness={0.6} />
        </mesh>
        {/* Hair */}
        <mesh position={[0, 0.16, -0.95]} castShadow>
          <sphereGeometry args={[0.135, 12, 12]} />
          <meshStandardMaterial color="#331800" roughness={0.9} />
        </mesh>

        {/* Torso (Royal Blue Jacket) */}
        <mesh position={[0, 0.14, -0.2]} rotation={[0.08, 0, 0]} castShadow>
          <boxGeometry args={[0.48, 0.22, 0.75]} />
          <meshStandardMaterial color="#1e40af" roughness={0.7} />
        </mesh>

        {/* Left Arm (bent naturally) */}
        <group position={[-0.32, 0.08, -0.3]} rotation={[0.2, 0, 0.4]}>
          <mesh position={[0, 0, 0.15]} castShadow>
            <cylinderGeometry args={[0.065, 0.06, 0.38, 10]} />
            <meshStandardMaterial color="#1e40af" roughness={0.7} />
          </mesh>
          <mesh position={[-0.08, 0, 0.38]} rotation={[0, -0.5, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.05, 0.32, 10]} />
            <meshStandardMaterial color="#fcd34d" roughness={0.6} />
          </mesh>
        </group>

        {/* Right Arm */}
        <group position={[0.32, 0.08, -0.3]} rotation={[0.1, 0, -0.5]}>
          <mesh position={[0, 0, 0.15]} castShadow>
            <cylinderGeometry args={[0.065, 0.06, 0.38, 10]} />
            <meshStandardMaterial color="#1e40af" roughness={0.7} />
          </mesh>
          <mesh position={[0.08, 0, 0.38]} rotation={[0, 0.4, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.05, 0.32, 10]} />
            <meshStandardMaterial color="#fcd34d" roughness={0.6} />
          </mesh>
        </group>

        {/* Pelvis & Legs (Jeans) */}
        <mesh position={[0, 0.12, 0.35]} castShadow>
          <boxGeometry args={[0.44, 0.2, 0.35]} />
          <meshStandardMaterial color="#2563eb" roughness={0.8} />
        </mesh>

        {/* Left Leg */}
        <group position={[-0.14, 0.09, 0.7]} rotation={[-0.05, 0.1, 0]}>
          <mesh position={[0, 0, 0.25]} castShadow>
            <cylinderGeometry args={[0.08, 0.07, 0.55, 10]} />
            <meshStandardMaterial color="#2563eb" roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.02, 0.65]} castShadow>
            <boxGeometry args={[0.09, 0.11, 0.22]} />
            <meshStandardMaterial color="#111827" roughness={0.4} />
          </mesh>
        </group>

        {/* Right Leg */}
        <group position={[0.14, 0.09, 0.7]} rotation={[0.05, -0.15, 0]}>
          <mesh position={[0, 0, 0.25]} castShadow>
            <cylinderGeometry args={[0.08, 0.07, 0.55, 10]} />
            <meshStandardMaterial color="#2563eb" roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.02, 0.65]} castShadow>
            <boxGeometry args={[0.09, 0.11, 0.22]} />
            <meshStandardMaterial color="#111827" roughness={0.4} />
          </mesh>
        </group>
      </group>

      {el.evidenceNumber && (
        <EvidenceLabel label="Victim" color="#ff3366" number={el.evidenceNumber} position={[0, 1.2, 0]} />
      )}
    </group>
  );
}

function Weapon3D({ el }: { el: SceneElement }) {
  const isGun = el.label === "Firearm";
  return (
    <group position={el.position} rotation={el.rotation || [0, 0, 0]}>
      {isGun ? (
        <group scale={[1.3, 1.3, 1.3]}>
          {/* Barrel */}
          <mesh position={[0.12, 0, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.26, 12]} />
            <meshStandardMaterial color="#334155" metalness={0.98} roughness={0.08} />
          </mesh>
          {/* Slide with polished steel highlights */}
          <mesh>
            <boxGeometry args={[0.26, 0.065, 0.11]} />
            <meshStandardMaterial color="#1e293b" metalness={0.95} roughness={0.12} />
          </mesh>
          {/* Brass ejection port highlight */}
          <mesh position={[0.04, 0.02, 0.055]}>
            <boxGeometry args={[0.06, 0.03, 0.01]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.98} roughness={0.05} />
          </mesh>
          {/* Grip */}
          <mesh position={[-0.06, -0.08, 0]} rotation={[0, 0, -0.15]}>
            <boxGeometry args={[0.11, 0.15, 0.095]} />
            <meshStandardMaterial color="#0f172a" roughness={0.6} />
          </mesh>
          {/* Red Safety / Laser Dot */}
          <mesh position={[0.25, 0, 0]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>
          <pointLight position={[0.26, 0, 0]} color="#ef4444" intensity={0.8} distance={0.8} />
        </group>
      ) : (
        <group scale={[1.3, 1.3, 1.3]}>
          {/* Mirror-Polished Blade */}
          <mesh position={[0.12, 0, 0]} castShadow>
            <boxGeometry args={[0.32, 0.008, 0.035]} />
            <meshStandardMaterial color="#ffffff" metalness={0.99} roughness={0.03} envMapIntensity={2.0} />
          </mesh>
          {/* Brass Hilt Guard */}
          <mesh position={[-0.04, 0, 0]}>
            <boxGeometry args={[0.02, 0.02, 0.1]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.95} roughness={0.1} />
          </mesh>
          {/* Handle */}
          <mesh position={[-0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.018, 0.02, 0.14, 10]} />
            <meshStandardMaterial color="#7c2d12" roughness={0.6} />
          </mesh>
          {/* Blood on Blade tip */}
          <mesh position={[0.24, 0.005, 0]}>
            <boxGeometry args={[0.08, 0.002, 0.032]} />
            <meshStandardMaterial color="#dc2626" roughness={0.01} emissive="#991b1b" emissiveIntensity={0.5} />
          </mesh>
        </group>
      )}
      {el.evidenceNumber && (
        <EvidenceLabel label={el.label} color="#a855f7" number={el.evidenceNumber} position={[0, 0.5, 0]} />
      )}
    </group>
  );
}

function Shell3D({ el }: { el: SceneElement }) {
  return (
    <group position={el.position} rotation={[Math.PI / 2, 0, seededRandom(el.id) * Math.PI * 2]}>
      {/* Shiny Golden Brass Bullet Casing */}
      <mesh castShadow>
        <cylinderGeometry args={[0.02, 0.018, 0.06, 12]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.98} roughness={0.05} envMapIntensity={2.0} />
      </mesh>
      <mesh position={[0, 0.032, 0]}>
        <sphereGeometry args={[0.02, 10, 10]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.95} roughness={0.08} />
      </mesh>
      {/* Glowing point light for high visibility */}
      <pointLight position={[0, 0.1, 0]} color="#fbbf24" intensity={0.6} distance={1.2} />
      {el.evidenceNumber && (
        <EvidenceLabel label={el.label} color="#f59e0b" number={el.evidenceNumber} position={[0, 0.4, 0]} />
      )}
    </group>
  );
}

function Footprints3D({ el }: { el: SceneElement }) {
  const baseRot = el.rotation?.[1] || 0;
  const steps = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      x: el.position[0] + Math.cos(baseRot) * i * 0.48 + (i % 2 === 0 ? 0.14 : -0.14) * Math.cos(baseRot + Math.PI / 2),
      z: el.position[2] + Math.sin(baseRot) * i * 0.48 + (i % 2 === 0 ? 0.14 : -0.14) * Math.sin(baseRot + Math.PI / 2),
      fade: Math.max(0.25, 1 - i * 0.09),
    })), [el, baseRot]);

  return (
    <group>
      {steps.map((s, i) => (
        <group key={i} position={[s.x, 0.005, s.z]} rotation={[-Math.PI / 2, 0, baseRot + (i % 2 === 0 ? 0.18 : -0.18)]}>
          {/* Forensic UV Luminescent Boot Print (Glowing Cyan) */}
          <mesh scale={[0.13, 0.26, 1]}>
            <planeGeometry args={[1, 1]} />
            <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={s.fade * 1.2} transparent opacity={s.fade * 0.85} />
          </mesh>
        </group>
      ))}
      {el.evidenceNumber && (
        <EvidenceLabel label={el.label} color="#00e5ff" number={el.evidenceNumber} position={[el.position[0], 0.7, el.position[2]]} />
      )}
    </group>
  );
}

function GlassShards({ el }: { el: SceneElement }) {
  const shards = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    x: el.position[0] + (seededRandom(el.id + i) - 0.5) * 1.4,
    z: el.position[2] + (seededRandom(el.id + i + "z") - 0.5) * 1.0,
    r: seededRandom(el.id + i + "r") * Math.PI,
    w: 0.04 + seededRandom(el.id + i + "w") * 0.18,
    h: 0.03 + seededRandom(el.id + i + "h") * 0.12,
  })), [el]);
  return (
    <group>
      {shards.map((s, i) => (
        <mesh key={i} position={[s.x, 0.006, s.z]} rotation={[-Math.PI / 2, 0, s.r]}>
          <planeGeometry args={[s.w, s.h]} />
          <meshPhysicalMaterial color="#bae6fd" transparent opacity={0.7} roughness={0.0} metalness={0.1} transmission={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Computer3D({ el }: { el: SceneElement }) {
  return (
    <group position={el.position}>
      {/* Dual Monitor Setup */}
      {[-0.32, 0.32].map((xOffset, idx) => (
        <group key={idx} position={[xOffset, 0, 0]} rotation={[0, idx === 0 ? 0.15 : -0.15, 0]}>
          {/* Base */}
          <mesh position={[0, -0.06, 0]}>
            <cylinderGeometry args={[0.12, 0.16, 0.025, 12]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Stand */}
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.04, 0.22, 0.04]} />
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Monitor frame */}
          <mesh position={[0, 0.22, 0]}>
            <boxGeometry args={[0.55, 0.34, 0.03]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* Glowing Active UI Screen */}
          <mesh position={[0, 0.22, 0.016]}>
            <planeGeometry args={[0.52, 0.31]} />
            <meshStandardMaterial color="#0284c7" emissive="#0284c7" emissiveIntensity={1.3} roughness={0.1} />
          </mesh>
          <pointLight position={[0, 0.22, 0.15]} color="#38bdf8" intensity={1.5} distance={2.2} />
        </group>
      ))}

      {/* RGB Keyboard */}
      <mesh position={[0, -0.04, 0.22]} rotation={[-0.05, 0, 0]}>
        <boxGeometry args={[0.45, 0.02, 0.15]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.03, 0.22]}>
        <boxGeometry args={[0.42, 0.005, 0.13]} />
        <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

function Lamp3D({ el }: { el: SceneElement }) {
  const lampRot: [number, number, number] = el.isBroken ? [0, 0, Math.PI * 0.55] : [0, 0, 0];
  return (
    <group position={el.position} rotation={lampRot}>
      {/* Brass Base */}
      <mesh position={[0, 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.18, 0.08, 16]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Metallic Pole */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.022, 0.022, 1.4, 12]} />
        <meshStandardMaterial color="#d97706" metalness={0.85} roughness={0.3} />
      </mesh>
      {/* Vibrant Gold Shade */}
      <mesh position={[0, 1.45, 0]}>
        <coneGeometry args={[0.28, 0.38, 18, 1, true]} />
        <meshStandardMaterial color="#fbbf24" side={THREE.DoubleSide} roughness={0.4} metalness={0.2} />
      </mesh>
      {/* Glowing Bulb */}
      <mesh position={[0, 1.35, 0]}>
        <sphereGeometry args={[0.07, 14, 14]} />
        <meshStandardMaterial color="#ffffff" emissive={el.isBroken ? "#000000" : "#ffea75"} emissiveIntensity={3.5} />
      </mesh>
      {!el.isBroken && (
        <pointLight position={[0, 1.35, 0]} color="#fef08a" intensity={12} distance={8} castShadow />
      )}
    </group>
  );
}

function Safe3D({ el }: { el: SceneElement }) {
  const metalTex = useMemo(() => makeNoiseTexture(64, [40, 50, 65], 0.12), []);
  return (
    <group position={el.position}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.65, 0.9, 0.55]} />
        <meshStandardMaterial map={metalTex} color="#334155" metalness={0.85} roughness={0.2} />
      </mesh>
      {/* Door panel */}
      <mesh position={[0, 0.45, 0.285]}>
        <boxGeometry args={[0.6, 0.84, 0.025]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.15} />
      </mesh>
      {/* Glowing Digital Keypad */}
      <mesh position={[0.1, 0.5, 0.3]}>
        <boxGeometry args={[0.14, 0.18, 0.02]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.1, 0.5, 0.311]}>
        <planeGeometry args={[0.12, 0.16]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1.5} />
      </mesh>
      {/* Handle */}
      <mesh position={[-0.15, 0.45, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.055, 0.012, 8, 20, Math.PI]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
      </mesh>
      {el.evidenceNumber && (
        <EvidenceLabel label={el.label} color="#aaa" number={el.evidenceNumber} position={[0, 1.2, 0]} />
      )}
    </group>
  );
}

function Bag3D({ el }: { el: SceneElement }) {
  const fabricTex = useMemo(() => makeNoiseTexture(64, [30, 40, 50], 0.2), []);
  return (
    <group position={el.position}>
      <mesh position={[0, 0.24, 0]} castShadow>
        <boxGeometry args={[0.52, 0.44, 0.28]} />
        <meshStandardMaterial map={fabricTex} color="#ea580c" roughness={0.7} />
      </mesh>
      {/* Yellow Caution Straps */}
      {[-0.15, 0.15].map((x, i) => (
        <mesh key={i} position={[x, 0.24, 0]}>
          <boxGeometry args={[0.04, 0.45, 0.29]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.6} />
        </mesh>
      ))}
      {/* Handle */}
      <mesh position={[0, 0.48, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.12, 0.012, 8, 20, Math.PI]} />
        <meshStandardMaterial color="#1e293b" roughness={0.7} />
      </mesh>
    </group>
  );
}

// ─── Floating Evidence Pin ────────────────────────────────────────────────────

function FloatingPin({ pin }: { pin: EvidencePin }) {
  const color = EVIDENCE_COLORS[pin.type];
  const sphereRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (sphereRef.current) sphereRef.current.position.y = pin.position[1] + 0.9 + Math.sin(clock.getElapsedTime() * 2.5) * 0.07;
  });
  return (
    <group position={pin.position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.18, 0.3, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.45} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 1, 8]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh ref={sphereRef} position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </mesh>
      <Html position={[0, 1.7, 0]} center distanceFactor={8}>
        <div className="evidence-pin-label" style={{ borderColor: color, backgroundColor: `${color}22` }}>
          <span>{EVIDENCE_ICONS[pin.type]}</span><span>{pin.label}</span>
        </div>
      </Html>
    </group>
  );
}

function MeasurementViz({ m }: { m: Measurement }) {
  const pA = new THREE.Vector3(...m.pointA);
  const pB = new THREE.Vector3(...m.pointB);
  const mid = pA.clone().add(pB).multiplyScalar(0.5);
  return (
    <group>
      <Line points={[pA, pB]} color="#00d4ff" lineWidth={2.5} />
      {[pA, pB].map((p, i) => (
        <mesh key={i} position={p.toArray() as [number, number, number]}>
          <sphereGeometry args={[0.12, 14, 14]} />
          <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={1.0} />
        </mesh>
      ))}
      <Html position={mid.toArray() as [number, number, number]} center distanceFactor={8}>
        <div className="measurement-label">📏 {m.distance.toFixed(2)} m</div>
      </Html>
    </group>
  );
}

function SceneElement3D({ el, cfg }: { el: SceneElement; cfg: RoomConfig }) {
  switch (el.type) {
    case "window":       return <Window3D el={el} cfg={cfg} />;
    case "door":         return <Door3D el={el} />;
    case "glass-shards": return <GlassShards el={el} />;
    case "desk":         return <Desk3D el={el} />;
    case "table":        return <Table3D el={el} />;
    case "bed":          return <Bed3D el={el} />;
    case "chair":        return <Chair3D el={el} />;
    case "sofa":         return <Sofa3D el={el} />;
    case "blood":        return <Blood3D el={el} />;
    case "body":         return <Body3D el={el} />;
    case "weapon":       return <Weapon3D el={el} />;
    case "shell":        return <Shell3D el={el} />;
    case "footprints":   return <Footprints3D el={el} />;
    case "computer":     return <Computer3D el={el} />;
    case "lamp":         return <Lamp3D el={el} />;
    case "safe":         return <Safe3D el={el} />;
    case "bag":          return <Bag3D el={el} />;
    default:             return null;
  }
}

// ─── Main Scene ───────────────────────────────────────────────────────────────

interface SceneContentProps {
  scene: ParsedScene | null;
  tool: Tool;
  measurePointA: [number, number, number] | null;
  onSceneClick: (p: THREE.Vector3) => void;
  pins: EvidencePin[];
  measurements: Measurement[];
}

function SceneContent({ scene, tool, measurePointA, onSceneClick, pins, measurements }: SceneContentProps) {
  const floorSize = scene ? Math.max(scene.config.width, scene.config.depth) * 2.5 : 60;
  return (
    <>
      {/* Vibrant Ambient Lighting */}
      <ambientLight intensity={0.65} color="#f1f5f9" />
      
      {/* Key Golden Sunlight Directional Light */}
      <directionalLight
        position={[10, 16, 10]}
        intensity={1.8}
        color="#fffbeb"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={45}
        shadow-camera-near={0.1}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-bias={-0.0001}
      />

      {/* Soft Sky Blue Fill Light */}
      <directionalLight position={[-12, 10, -8]} intensity={1.1} color="#e0f2fe" />

      {/* Soft Violet/Magenta Rim Light */}
      <directionalLight position={[0, 8, -14]} intensity={1.2} color="#f3e8ff" />

      {/* Floating Sparkles / Dust Particles in vibrant cyan & amber */}
      {scene && (
        <>
          <Sparkles count={90} scale={[scene.config.width, scene.config.height, scene.config.depth]}
            size={1.2} speed={0.2} opacity={0.4} color="#38bdf8" />
          <Sparkles count={50} scale={[scene.config.width, scene.config.height, scene.config.depth]}
            size={1.0} speed={0.15} opacity={0.35} color="#fbbf24" />
        </>
      )}

      {/* Environment preset for rich realistic reflections */}
      <Environment preset="apartment" environmentIntensity={1.2} />

      {scene ? (
        <>
          <RealisticRoom config={scene.config} />
          {scene.elements.map(el => <SceneElement3D key={el.id} el={el} cfg={scene.config} />)}
        </>
      ) : (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[floorSize, floorSize, 1, 1]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
      )}

      {pins.map(p => <FloatingPin key={p.id} pin={p} />)}
      {measurements.map(m => <MeasurementViz key={m.id} m={m} />)}

      {measurePointA && (
        <mesh position={measurePointA}>
          <sphereGeometry args={[0.15, 14, 14]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={1.2} />
        </mesh>
      )}

      {/* Interaction floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}
        onPointerDown={e => { if (tool === "view") return; e.stopPropagation(); onSceneClick(e.point.clone()); }}>
        <planeGeometry args={[floorSize, floorSize]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <OrbitControls makeDefault enabled={tool === "view"} minDistance={1.5} maxDistance={55} maxPolarAngle={Math.PI * 0.82} />
      <Preload all />
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CrimeScene() {
  const [inputText, setInputText] = useState("");
  const [scene, setScene] = useState<ParsedScene | null>(null);
  const [generating, setGenerating] = useState(false);
  const [tool, setTool] = useState<Tool>("view");
  const [measurePointA, setMeasurePointA] = useState<[number, number, number] | null>(null);
  const [pins, setPins] = useState<EvidencePin[]>([]);
  const [pendingMarkPos, setPendingMarkPos] = useState<[number, number, number] | null>(null);
  const [markLabel, setMarkLabel] = useState("");
  const [markType, setMarkType] = useState<EvidenceType>("other");
  const [measurements, setMeasurements] = useState<Measurement[]>([]);

  const generate = useCallback(() => {
    if (!inputText.trim()) return;
    setGenerating(true);
    setTimeout(() => {
      setScene(parseScene(inputText));
      setGenerating(false);
      setPins([]); setMeasurements([]); setMeasurePointA(null); setTool("view");
    }, 1100);
  }, [inputText]);

  const handleSceneClick = useCallback((point: THREE.Vector3) => {
    if (tool === "measure") {
      if (!measurePointA) { setMeasurePointA([point.x, point.y, point.z]); }
      else {
        const pA = measurePointA, pB: [number, number, number] = [point.x, point.y, point.z];
        const dist = Math.sqrt((pB[0]-pA[0])**2+(pB[1]-pA[1])**2+(pB[2]-pA[2])**2);
        setMeasurements(prev => [...prev, { id: `m-${Date.now()}`, pointA: pA, pointB: pB, distance: dist }]);
        setMeasurePointA(null);
      }
    } else if (tool === "mark") {
      setPendingMarkPos([point.x, point.y, point.z]);
      setMarkLabel("");
    }
  }, [tool, measurePointA]);

  const addPin = () => {
    if (!pendingMarkPos || !markLabel.trim()) return;
    setPins(prev => [...prev, { id: `pin-${Date.now()}`, position: pendingMarkPos, label: markLabel.trim(), type: markType }]);
    setPendingMarkPos(null); setMarkLabel("");
  };

  const setToolMode = (m: Tool) => { setTool(m); setMeasurePointA(null); setPendingMarkPos(null); };

  return (
    <>
      <Navbar />
      <div className="page-layout">
        <Sidebar />
        <main className="page-main" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div className="cs-layout">
            {/* Left Panel */}
            <div className="cs-left-panel">
              <div className="cs-panel-header">
                <h2 className="cs-title">🏗️ Crime Scene</h2>
                <span className="cs-subtitle">Realistic Text-to-3D</span>
              </div>
              <div className="cs-tab-content" style={{ gap: "12px" }}>
                <div className="cs-section-label">Example Prompts</div>
                <div className="cs-chip-row">
                  {["Office Burglary", "Bedroom Crime", "Warehouse Scene"].map((name, i) => (
                    <button key={i} className="cs-chip" onClick={() => setInputText(EXAMPLE_PROMPTS[i])}>{name}</button>
                  ))}
                </div>
                <div className="cs-section-label">Describe the Crime Scene</div>
                <textarea className="cs-textarea" rows={8}
                  placeholder={`Describe what was found at the crime scene. Mention:\n• Room type (bedroom, office, warehouse…)\n• Locations (north wall, center, corner…)\n• Objects (desk, bed, sofa, computer…)\n• Evidence (blood, body, weapon, shell casings, footprints…)\n• Features (broken window, forced door…)`}
                  value={inputText} onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => { if (e.ctrlKey && e.key === "Enter") generate(); }}
                />
                <button id="cs-generate-btn" className={`cs-generate-btn ${generating ? "loading" : ""}`}
                  onClick={generate} disabled={!inputText.trim() || generating}>
                  {generating ? <><span className="cs-spinner" />Reconstructing Scene…</> : <>🏗️ Generate 3D Scene</>}
                </button>
                {scene && scene.legend.length > 0 && (
                  <>
                    <div className="cs-section-label" style={{ marginTop: "4px" }}>
                      Scene — {scene.config.type} ({scene.config.width}×{scene.config.depth}m)
                    </div>
                    <div className="cs-evidence-list">
                      {scene.legend.map((item, i) => (
                        <div key={i} className="cs-evidence-item">
                          <span className="cs-evidence-icon">{item.icon}</span>
                          <div className="cs-evidence-details">
                            <div className="cs-evidence-label">
                              {item.number ? <><span className="evidence-num-small">#{item.number}</span> </> : null}
                              {item.label}
                            </div>
                            <div className="cs-evidence-pos">{item.type} · {item.position}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {!scene && (
                  <div className="cs-empty-state">
                    <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>🏗️</div>
                    <p>Type a scene description and click <strong>Generate 3D Scene</strong> to reconstruct the crime environment.</p>
                  </div>
                )}
              </div>
            </div>

            {/* 3D Canvas */}
            <div className="cs-canvas-wrapper">
              <div className="cs-toolbar">
                <span className="cs-toolbar-title">3D Scene</span>
                <div className="cs-tool-group">
                  {(["view", "measure", "mark"] as Tool[]).map(t => (
                    <button key={t} id={`cs-btn-${t}`} className={`cs-tool-btn ${tool === t ? "active" : ""}`} onClick={() => setToolMode(t)}>
                      {t === "view" ? "👁️ View" : t === "measure" ? "📏 Measure" : "📍 Mark"}
                    </button>
                  ))}
                </div>
                <span className="cs-toolbar-hint">
                  {tool === "view" && "Drag to orbit · Scroll to zoom · Right-click to pan"}
                  {tool === "measure" && (measurePointA ? "Click Point B to complete" : "Click Point A in scene")}
                  {tool === "mark" && "Click anywhere to place an evidence pin"}
                </span>
              </div>

              <Canvas
                camera={{ position: [12, 9, 12], fov: 50, near: 0.1, far: 200 }}
                shadows="soft"
                gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.65 }}
                style={{ width: "100%", height: "100%", background: "linear-gradient(180deg, #0f172a 0%, #020617 100%)" }}
              >
                <Suspense fallback={null}>
                  <SceneContent scene={scene} tool={tool} measurePointA={measurePointA}
                    onSceneClick={handleSceneClick} pins={pins} measurements={measurements} />
                </Suspense>
              </Canvas>

              {generating && (
                <div className="cs-generating-overlay">
                  <div className="cs-generating-card">
                    <div className="cs-generating-spinner" />
                    <div className="cs-generating-title">Reconstructing Crime Scene…</div>
                    <div className="cs-generating-sub">Parsing description · Building PBR materials · Compositing 3D environment</div>
                  </div>
                </div>
              )}

              {pendingMarkPos && (
                <div className="cs-mark-modal">
                  <div className="cs-mark-modal-card">
                    <div className="cs-mark-modal-title">📍 Add Evidence Marker</div>
                    <div className="cs-mark-modal-pos">Position: ({pendingMarkPos[0].toFixed(2)}, {pendingMarkPos[1].toFixed(2)}, {pendingMarkPos[2].toFixed(2)})</div>
                    <div className="cs-mark-type-grid">
                      {(Object.entries(EVIDENCE_ICONS) as [EvidenceType, string][]).map(([type, icon]) => (
                        <button key={type} className={`cs-mark-type-btn ${markType === type ? "active" : ""}`}
                          onClick={() => setMarkType(type)} style={{ borderColor: markType === type ? EVIDENCE_COLORS[type] : undefined }}>
                          {icon} {type}
                        </button>
                      ))}
                    </div>
                    <input id="cs-mark-label-input" className="cs-mark-input" type="text"
                      placeholder='Label (e.g. "Fingerprint", "Entry wound")' value={markLabel}
                      onChange={e => setMarkLabel(e.target.value)} onKeyDown={e => e.key === "Enter" && addPin()} autoFocus />
                    <div className="cs-mark-modal-actions">
                      <button className="cs-mark-cancel" onClick={() => setPendingMarkPos(null)}>Cancel</button>
                      <button id="cs-mark-confirm-btn" className="cs-mark-confirm" onClick={addPin} disabled={!markLabel.trim()}>Place Marker</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="cs-status-bar">
                {scene ? (
                  <>
                    <span>🏠 {scene.config.type} ({scene.config.width}×{scene.config.depth}m)</span>
                    <span>🔍 {scene.elements.length} objects</span>
                    <span>📍 {pins.length} pins</span>
                    <span>📏 {measurements.length} measurements</span>
                  </>
                ) : (
                  <span>⌨️ Enter description and generate the 3D scene</span>
                )}
                {measurePointA && <span className="cs-status-active">⚡ A set — click Point B</span>}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

