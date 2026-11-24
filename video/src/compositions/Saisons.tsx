import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import timeline from "./saisons.timeline.json";

/* "Les Saisons": one continuous flight over a procedural valley whose
   season changes live (winter → spring → summer → autumn → winter night →
   spring sunrise), with a French voice-over, captions and season titles. */

type Word = { w: string; t: number };
export type Sentence = { start: number; end: number; text: string; words: Word[] };
export type Section = { palette: number; start: number; title: string };
export type SaisonsProps = {
  audioFile: string;
  durationSeconds: number;
  sections: Section[];
  sentences: Sentence[];
  verse: { start: number; text: string; ref: string };
  cta: { start: number; text: string };
};
export const saisonsDefaults = timeline as SaisonsProps;

const W = 1080;
const H = 1920;
const SPEED = 4.2;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/* ------------------------------------------------------------------ */
/* Palettes                                                            */
/* ------------------------------------------------------------------ */

type Pal = {
  top: string;
  horizon: string;
  sun: string;
  sunY: number;
  light: number;
  grass: string;
  grass2: string;
  snow: number;
  foliage: string;
  leaf: number;
  water: string;
  stars: number;
  snowfall: number;
  petals: number;
  glow: number;
  falling: number;
};

const PALS: Pal[] = [
  // 0 winter dawn
  { top: "#2a3a6a", horizon: "#f3b9a4", sun: "#ffc2a0", sunY: 0.06, light: 0.9, grass: "#e9eef6", grass2: "#c9d4e6", snow: 1, foliage: "#e2d6dc", leaf: 0.6, water: "#b9cbe0", stars: 0.15, snowfall: 0.5, petals: 0, glow: 0, falling: 0 },
  // 1 winter day
  { top: "#6d92c8", horizon: "#e3ebf4", sun: "#fff4e6", sunY: 0.25, light: 1.1, grass: "#f2f5fa", grass2: "#d5deec", snow: 1, foliage: "#eef2f8", leaf: 0.6, water: "#c8d8ea", stars: 0, snowfall: 1, petals: 0, glow: 0, falling: 0 },
  // 2 spring
  { top: "#4f97e6", horizon: "#e6f3ff", sun: "#fff8e8", sunY: 0.4, light: 1.25, grass: "#7cc35a", grass2: "#4f9a3e", snow: 0.25, foliage: "#f4a6c4", leaf: 1, water: "#3f8fd0", stars: 0, snowfall: 0, petals: 1, glow: 0, falling: 0 },
  // 3 summer, golden hour
  { top: "#3a74cc", horizon: "#ffd9a0", sun: "#ffd27a", sunY: 0.18, light: 1.35, grass: "#d6b54c", grass2: "#6f9a35", snow: 0.1, foliage: "#3f8a36", leaf: 1, water: "#2f7cc0", stars: 0, snowfall: 0, petals: 0, glow: 1, falling: 0 },
  // 4 autumn sunset
  { top: "#4b3b7c", horizon: "#ff9a5c", sun: "#ff8a4a", sunY: 0.07, light: 1.1, grass: "#a8743a", grass2: "#7a5228", snow: 0.15, foliage: "#e0662c", leaf: 0.85, water: "#5a5c8a", stars: 0, snowfall: 0, petals: 0, glow: 0, falling: 1 },
  // 5 winter night
  { top: "#040818", horizon: "#1b2a52", sun: "#bcd2ff", sunY: 0.32, light: 0.45, grass: "#c9d6ee", grass2: "#9fb1d4", snow: 1, foliage: "#a9b8d8", leaf: 0.6, water: "#24345e", stars: 1, snowfall: 0.8, petals: 0, glow: 0, falling: 0 },
  // 6 spring sunrise
  { top: "#3a4f9c", horizon: "#ffc487", sun: "#ffd18a", sunY: 0.05, light: 1.2, grass: "#86c95e", grass2: "#4f9a3e", snow: 0.2, foliage: "#f7b2cb", leaf: 1, water: "#6a8fd0", stars: 0.1, snowfall: 0, petals: 1, glow: 0.4, falling: 0 },
];

const lerpPal = (a: Pal, b: Pal, k: number): Pal => {
  const out = {} as Record<string, string | number>;
  for (const key of Object.keys(a) as (keyof Pal)[]) {
    const va = a[key];
    const vb = b[key];
    out[key] =
      typeof va === "number"
        ? va + ((vb as number) - va) * k
        : "#" + new THREE.Color(va).lerp(new THREE.Color(vb as string), k).getHexString();
  }
  return out as unknown as Pal;
};

const paletteAt = (t: number, sections: Section[]): Pal => {
  let p = PALS[sections[0].palette];
  for (const s of sections) {
    const k = interpolate(t, [s.start - 1.2, s.start + 2.2], [0, 1], clamp);
    if (k > 0) p = lerpPal(p, PALS[s.palette], k * k * (3 - 2 * k));
  }
  return p;
};

/* ------------------------------------------------------------------ */
/* Terrain                                                             */
/* ------------------------------------------------------------------ */

const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const vnoise = (x: number, y: number) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x: number, y: number) => {
  let s = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < 5; i++) {
    s += a * vnoise(x * f, y * f);
    f *= 2.03;
    a *= 0.5;
  }
  return s;
};
const riverX = (z: number) => Math.sin(z * 0.012) * 6 + Math.sin(z * 0.031) * 2.5;
export const heightAt = (x: number, z: number) => {
  const dx = Math.abs(x - riverX(z));
  const valley = Math.min(1, Math.max(0, (dx - 5) / 40));
  const hills = fbm(x * 0.03, z * 0.03) * 10 * (0.25 + valley);
  const mountains = Math.pow(Math.max(0, fbm(x * 0.012 + 7, z * 0.012) - 0.35), 1.6) * 90 * valley * valley;
  return -1.6 + hills + mountains + valley * 3;
};

const LEN = 380;
const WIDTH = 220;

const useTerrain = () =>
  useMemo(() => {
    const g = new THREE.PlaneGeometry(WIDTH, LEN, 180, 300);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const n = pos.count;
    const hgt = new Float32Array(n);
    const slope = new Float32Array(n);
    const jitter = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i) - LEN / 2 + 20;
      const h = heightAt(x, z);
      pos.setXYZ(i, x, h, z);
      hgt[i] = h;
      jitter[i] = hash(x * 3.1, z * 1.7);
    }
    g.computeVertexNormals();
    const nor = g.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < n; i++) slope[i] = 1 - nor.getY(i);
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    return { g, hgt, slope, jitter };
  }, []);

const TREE_N = 700;
const useTrees = () =>
  useMemo(() => {
    const list: { x: number; y: number; z: number; s: number; j: number }[] = [];
    let i = 0;
    while (list.length < TREE_N && i < 20000) {
      i++;
      const z = 20 - hash(i, 3.3) * (LEN - 10);
      const x = (hash(i, 9.1) - 0.5) * WIDTH * 0.8;
      const dx = Math.abs(x - riverX(z));
      if (dx < 6.5) continue;
      const y = heightAt(x, z);
      if (y > 22 || y < 0.3) continue;
      if (fbm(x * 0.05 + 3, z * 0.05) < 0.45) continue;
      list.push({ x, y, z, s: 0.7 + hash(i, 1.7) * 0.9, j: hash(i, 4.4) });
    }
    return list;
  }, []);

/* ------------------------------------------------------------------ */
/* 3D world                                                            */
/* ------------------------------------------------------------------ */

const SkyDome: React.FC<{ p: Pal }> = ({ p }) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } },
        vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ",
        fragmentShader:
          "uniform vec3 top; uniform vec3 horizon; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6+0.05,0.0,1.0); gl_FragColor = vec4(mix(horizon, top, pow(h,0.7)),1.0);} ",
      }),
    [],
  );
  mat.uniforms.top.value.set(p.top);
  mat.uniforms.horizon.value.set(p.horizon);
  return (
    <mesh material={mat} renderOrder={-1}>
      <sphereGeometry args={[480, 32, 16]} />
    </mesh>
  );
};

const Stars: React.FC<{ amount: number; camZ: number }> = ({ amount, camZ }) => {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      const a = hash(i, 1) * Math.PI * 2;
      const e = 0.12 + hash(i, 2) * 1.2;
      arr[i * 3] = Math.cos(a) * Math.cos(e) * 420;
      arr[i * 3 + 1] = Math.sin(e) * 420;
      arr[i * 3 + 2] = Math.sin(a) * Math.cos(e) * 420;
    }
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  if (amount < 0.02) return null;
  return (
    <points geometry={geo} position={[0, 0, camZ]}>
      <pointsMaterial color="#ffffff" size={1.6} sizeAttenuation={false} transparent opacity={amount} fog={false} />
    </points>
  );
};

const DOT = (() => {
  if (typeof document === "undefined") return null;
  const cv = document.createElement("canvas");
  cv.width = cv.height = 64;
  const c = cv.getContext("2d")!;
  const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.45, "rgba(255,255,255,0.9)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = gr;
  c.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
})();

type ParticleKind = "snow" | "petals" | "glow" | "leaves";
const Particles: React.FC<{ kind: ParticleKind; amount: number; t: number; cam: THREE.Vector3 }> = ({
  kind,
  amount,
  t,
  cam,
}) => {
  const N = kind === "glow" ? 260 : 900;
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    return g;
  }, [N]);
  if (amount < 0.02) return null;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const fall = kind === "snow" ? 1.4 : kind === "petals" ? 0.9 : kind === "leaves" ? 1.8 : -0.15;
  for (let i = 0; i < N; i++) {
    const bx = (hash(i, 11) - 0.5) * 60;
    const bz = -hash(i, 12) * 70 - 2;
    const by = hash(i, 13) * 30;
    const sway = Math.sin(t * (0.8 + hash(i, 14)) + i) * (kind === "snow" ? 0.6 : 1.6);
    const y = (((by - t * fall * (0.6 + hash(i, 15))) % 30) + 30) % 30;
    pos.setXYZ(i, cam.x + bx + sway, cam.y - 12 + y, cam.z + bz);
  }
  pos.needsUpdate = true;
  const color = { snow: "#ffffff", petals: "#ffb3cf", glow: "#ffe27a", leaves: "#e8762e" }[kind];
  const size = { snow: 0.55, petals: 0.7, glow: 0.45, leaves: 0.9 }[kind];
  return (
    <points geometry={geo}>
      <pointsMaterial
        color={color}
        size={size}
        map={DOT}
        sizeAttenuation
        transparent
        opacity={amount * (kind === "glow" ? 1 : 0.9)}
        depthWrite={false}
        blending={kind === "glow" ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </points>
  );
};

const Figure: React.FC<{ z: number; show: number }> = ({ z, show }) => {
  if (show < 0.01) return null;
  const x = riverX(z) + 7.5;
  const y = heightAt(x, z);
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[1.6, 2.2, 1.2, 9]} />
        <meshStandardMaterial color="#4a4038" roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 2.05, 0]}>
        <capsuleGeometry args={[0.32, 1.1, 6, 12]} />
        <meshStandardMaterial color="#1a1a22" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.05, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#1a1a22" roughness={0.9} />
      </mesh>
      <mesh position={[0.45, 2.55, 0]} rotation={[0, 0, -2.4]}>
        <capsuleGeometry args={[0.1, 0.8, 4, 8]} />
        <meshStandardMaterial color="#1a1a22" />
      </mesh>
      <mesh position={[-0.45, 2.55, 0]} rotation={[0, 0, 2.4]}>
        <capsuleGeometry args={[0.1, 0.8, 4, 8]} />
        <meshStandardMaterial color="#1a1a22" />
      </mesh>
    </group>
  );
};

const CameraRig: React.FC<{ pos: THREE.Vector3; look: THREE.Vector3 }> = ({ pos, look }) => {
  const { camera } = useThree();
  camera.position.copy(pos);
  camera.lookAt(look);
  (camera as THREE.PerspectiveCamera).fov = 52;
  camera.updateProjectionMatrix();
  return null;
};

const World: React.FC<{ t: number; p: Pal; endT: number }> = ({ t, p, endT }) => {
  const { g, hgt, slope, jitter } = useTerrain();
  const trees = useTrees();
  const terrainMat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: false }), []);
  const trunkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#5b4636", roughness: 1 }), []);
  const crownMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true }), []);
  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.18, 0.28, 2.2, 6), []);
  const crownGeo = useMemo(() => new THREE.IcosahedronGeometry(1.4, 0), []);
  const trunks = useMemo(() => new THREE.InstancedMesh(trunkGeo, trunkMat, TREE_N), [trunkGeo, trunkMat]);
  const crowns = useMemo(() => new THREE.InstancedMesh(crownGeo, crownMat, TREE_N), [crownGeo, crownMat]);

  // camera path along the river, slowing down at the very end
  const tt = Math.min(t, endT) + Math.max(0, t - endT) * 0.25;
  const z = -tt * SPEED;
  const cx = riverX(z) + 9 + Math.sin(tt * 0.21) * 3;
  const cy = Math.max(heightAt(cx, z) + 5, 11 + Math.sin(tt * 0.33) * 1.5);
  const cam = new THREE.Vector3(cx, cy, z);
  const look = new THREE.Vector3(riverX(z - 45) + 2 + Math.sin(tt * 0.15) * 3, cy - 7, z - 45);

  // terrain colours for the current palette
  const col = g.attributes.color as THREE.BufferAttribute;
  const cA = new THREE.Color(p.grass);
  const cB = new THREE.Color(p.grass2);
  const rock = new THREE.Color("#6e6a66");
  const snowC = new THREE.Color("#f4f7fb");
  const sand = new THREE.Color("#cbb994");
  const tmp = new THREE.Color();
  for (let i = 0; i < hgt.length; i++) {
    const h = hgt[i];
    tmp.copy(cA).lerp(cB, jitter[i] * 0.6 + Math.min(1, h / 18) * 0.4);
    if (h < 0.4) tmp.lerp(sand, 0.6 * (1 - p.snow));
    tmp.lerp(rock, Math.min(1, Math.max(0, (slope[i] - 0.25) * 2.5)));
    const snowLine = 30 - p.snow * 32;
    const sn = Math.min(1, Math.max(0, (h - snowLine) / 6)) * (slope[i] < 0.55 ? 1 : 0.4);
    tmp.lerp(snowC, Math.max(sn, p.snow > 0.9 ? 0.85 * (slope[i] < 0.5 ? 1 : 0.5) : 0));
    col.setXYZ(i, tmp.r, tmp.g, tmp.b);
  }
  col.needsUpdate = true;

  // trees
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const fol = new THREE.Color(p.foliage);
  const green = new THREE.Color("#3f8a36");
  trees.forEach((tr, i) => {
    sc.set(tr.s, tr.s, tr.s);
    m.compose(new THREE.Vector3(tr.x, tr.y + 1.1 * tr.s, tr.z), q, sc);
    trunks.setMatrixAt(i, m);
    const leaf = Math.max(0.12, p.leaf * (0.85 + tr.j * 0.3));
    sc.set(tr.s * leaf, tr.s * leaf * 1.15, tr.s * leaf);
    m.compose(new THREE.Vector3(tr.x, tr.y + 2.6 * tr.s, tr.z), q, sc);
    crowns.setMatrixAt(i, m);
    tmp.copy(fol);
    if (p.petals > 0.5) tmp.lerp(green, tr.j < 0.45 ? 0.75 : 0.05);
    else tmp.offsetHSL((tr.j - 0.5) * 0.05, 0, (tr.j - 0.5) * 0.12);
    crowns.setColorAt(i, tmp);
  });
  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;

  const sunDir = new THREE.Vector3(-0.12, p.sunY, -1).normalize();
  const sunPos = cam.clone().add(sunDir.clone().multiplyScalar(400));

  return (
    <>
      <CameraRig pos={cam} look={look} />
      <fog attach="fog" args={[p.horizon, 40, 260]} />
      <SkyDome p={p} />
      <group position={[cam.x, 0, cam.z]}>
        <SkyDome p={p} />
      </group>
      <Stars amount={p.stars} camZ={cam.z} />
      <mesh position={sunPos}>
        <sphereGeometry args={[11, 32, 32]} />
        <meshBasicMaterial color={p.sun} fog={false} />
      </mesh>
      <mesh position={sunPos}>
        <sphereGeometry args={[30, 32, 32]} />
        <meshBasicMaterial color={p.sun} transparent opacity={0.25} fog={false} depthWrite={false} />
      </mesh>
      <hemisphereLight args={[p.top, p.grass2, 0.8 * p.light]} />
      <ambientLight intensity={0.45 * p.light} color={p.horizon} />
      <directionalLight position={sunDir.clone().multiplyScalar(100)} intensity={1.6 * p.light} color={p.sun} />
      <mesh geometry={g} material={terrainMat} position={[0, 0, cam.z > -LEN / 2 ? 0 : 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -LEN / 2 + 20]}>
        <planeGeometry args={[WIDTH, LEN]} />
        <meshStandardMaterial
          color={"#" + new THREE.Color(p.water).lerp(new THREE.Color(p.horizon), 0.3).getHexString()}
          emissive={p.horizon}
          emissiveIntensity={0.22}
          roughness={p.snow > 0.9 ? 0.6 : 0.2}
          metalness={0.1}
        />
      </mesh>
      <primitive object={trunks} />
      <primitive object={crowns} />
      <Particles kind="snow" amount={p.snowfall} t={t} cam={cam} />
      <Particles kind="petals" amount={p.petals} t={t} cam={cam} />
      <Particles kind="glow" amount={p.glow} t={t} cam={cam} />
      <Particles kind="leaves" amount={p.falling} t={t} cam={cam} />
      <Figure z={-(endT + 3.5) * SPEED - 26} show={t > endT - 14 ? 1 : 0} />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Overlays                                                            */
/* ------------------------------------------------------------------ */

export const Caption: React.FC<{ s: Sentence; t: number }> = ({ s, t }) => {
  const lt = t - s.start;
  const tokens = s.text.split(/\s+/);
  const times: number[] = [];
  let j = 0;
  for (const tok of tokens) {
    times.push(s.words[j]?.t ?? 99);
    if (s.words[j] && tok.replace(/[^\p{L}']/gu, "").length > 0) j++;
  }
  const out = interpolate(t, [s.end + 0.25, s.end + 0.45], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 90,
        right: 90,
        top: 900,
        textAlign: "center",
        fontFamily: "Inter, sans-serif",
        fontWeight: 700,
        fontSize: 50,
        lineHeight: 1.3,
        color: "#fff",
        textShadow: "0 3px 14px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.6)",
        opacity: out,
      }}
    >
      {tokens.map((tok, i) => {
        const o = interpolate(lt, [times[i] - 0.08, times[i] + 0.12], [0, 1], clamp);
        return (
          <span key={i} style={{ opacity: o, display: "inline-block", transform: `translateY(${(1 - o) * 10}px)`, marginRight: 13 }}>
            {tok}
          </span>
        );
      })}
    </div>
  );
};

export const SeasonTitle: React.FC<{ title: string; lt: number }> = ({ title, lt }) => {
  if (!title || lt < 0 || lt > 3.4) return null;
  const o = interpolate(lt, [0, 0.6, 2.6, 3.4], [0, 1, 1, 0], clamp);
  const spread = interpolate(lt, [0, 3.4], [10, 34], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 560,
        textAlign: "center",
        fontFamily: "'FreeSerif', serif",
        fontSize: 120,
        letterSpacing: spread,
        color: "#fff",
        opacity: o,
        filter: `blur(${(1 - o) * 8}px)`,
        textShadow: "0 6px 30px rgba(0,0,0,0.35)",
      }}
    >
      {title}
    </div>
  );
};

export const Saisons: React.FC<SaisonsProps> = ({ audioFile, durationSeconds, sections, sentences, verse, cta }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const p = paletteAt(t, sections);
  const sentence = sentences.find((s) => t >= s.start - 0.05 && t < s.end + 0.45);
  const section = [...sections].reverse().find((s) => t >= s.start);
  const verseO = interpolate(t, [verse.start, verse.start + 0.8, cta.start - 0.4, cta.start], [0, 1, 1, 0], clamp);
  const ctaO = interpolate(t, [cta.start, cta.start + 0.6, durationSeconds - 0.6, durationSeconds], [0, 1, 1, 0], clamp);
  const fade = interpolate(t, [0, 1.0, durationSeconds - 0.8, durationSeconds], [0, 1, 1, 0], clamp);

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {audioFile ? <Audio src={staticFile(audioFile)} /> : null}
      <AbsoluteFill style={{ opacity: fade }}>
        <ThreeCanvas width={W} height={H} gl={{ antialias: true, preserveDrawingBuffer: true }} camera={{ fov: 52, near: 0.5, far: 1200 }}>
          <World t={t} p={p} endT={verse.start - 2} />
        </ThreeCanvas>
        <AbsoluteFill
          style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 50%, rgba(0,0,0,0.45) 100%)", pointerEvents: "none" }}
        />
        {section ? <SeasonTitle title={section.title} lt={t - section.start} /> : null}
        {sentence ? <Caption s={sentence} t={t} /> : null}
        <div
          style={{
            position: "absolute",
            left: 100,
            right: 100,
            top: 760,
            textAlign: "center",
            color: "#fff",
            opacity: verseO,
            textShadow: "0 4px 20px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ fontFamily: "'FreeSerif', serif", fontStyle: "italic", fontSize: 64, lineHeight: 1.3 }}>{verse.text}</div>
          <div style={{ marginTop: 30, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 30, letterSpacing: 8 }}>
            {verse.ref.toUpperCase()}
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 110,
            right: 110,
            top: 860,
            textAlign: "center",
            fontFamily: "Inter, sans-serif",
            fontWeight: 700,
            fontSize: 48,
            lineHeight: 1.3,
            color: "#fff",
            opacity: ctaO,
            textShadow: "0 4px 20px rgba(0,0,0,0.5)",
          }}
        >
          {cta.text}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
