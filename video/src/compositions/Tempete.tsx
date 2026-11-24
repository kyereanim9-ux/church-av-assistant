import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { AbsoluteFill, Audio, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { Caption, SeasonTitle, type Section, type Sentence } from "./Saisons";
import timeline from "./tempete.timeline.json";

/* "La Tempête et le Calme": a small boat on a stormy night sea (rain,
   lightning, huge waves); when Jesus stands up and speaks, the sea turns
   calm under the moon, then the sun rises on golden water. */

export type TempeteProps = {
  audioFile: string;
  durationSeconds: number;
  sections: Section[];
  sentences: Sentence[];
  flashes: number[];
  verse: { start: number; text: string; ref: string };
  cta: { start: number; text: string };
};
export const tempeteDefaults = timeline as TempeteProps;

const W = 1080;
const H = 1920;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

type Pal = {
  top: string;
  horizon: string;
  water: string;
  crest: string;
  amp: number;
  rain: number;
  cloud: number;
  cloudColor: string;
  stars: number;
  moon: number;
  sun: number;
  light: number;
};
const PALS: Pal[] = [
  { top: "#2d3a4d", horizon: "#7d8792", water: "#2e4b5a", crest: "#9fb3bd", amp: 0.9, rain: 0.25, cloud: 0.75, cloudColor: "#4d5662", stars: 0, moon: 0, sun: 0, light: 0.75 },
  { top: "#0f141c", horizon: "#2c333d", water: "#1b2d36", crest: "#c9d6dc", amp: 2.2, rain: 1, cloud: 1, cloudColor: "#2a3038", stars: 0, moon: 0, sun: 0, light: 0.5 },
  { top: "#0d1118", horizon: "#262c35", water: "#18272f", crest: "#d4dfe4", amp: 2.7, rain: 1, cloud: 1, cloudColor: "#262b33", stars: 0, moon: 0, sun: 0, light: 0.45 },
  { top: "#0a1330", horizon: "#2a3c6c", water: "#0f2347", crest: "#3a5a8a", amp: 0.22, rain: 0, cloud: 0.12, cloudColor: "#3a4766", stars: 0.9, moon: 1, sun: 0, light: 0.6 },
  { top: "#081029", horizon: "#24366a", water: "#0d1f42", crest: "#2f4f80", amp: 0.12, rain: 0, cloud: 0.04, cloudColor: "#3a4766", stars: 1, moon: 1, sun: 0, light: 0.6 },
  { top: "#43609f", horizon: "#ffc68e", water: "#3f5f95", crest: "#ffd9a8", amp: 0.1, rain: 0, cloud: 0.15, cloudColor: "#f3b28c", stars: 0.05, moon: 0, sun: 1, light: 1.25 },
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
const paletteAt = (t: number, sections: Section[]) => {
  let p = PALS[sections[0].palette];
  for (const s of sections) {
    const fast = s.palette === 3;
    const k = interpolate(t, fast ? [s.start + 0.6, s.start + 3.2] : [s.start - 1.5, s.start + 2.5], [0, 1], clamp);
    if (k > 0) p = lerpPal(p, PALS[s.palette], k * k * (3 - 2 * k));
  }
  return p;
};

/* ------------------------------------------------------------------ */
/* Sea                                                                 */
/* ------------------------------------------------------------------ */

const waveH = (x: number, z: number, t: number, amp: number) =>
  amp *
  (0.7 * Math.sin(x * 0.13 + z * 0.06 - t * 1.25) +
    0.3 * Math.sin(x * -0.07 + z * 0.16 - t * 1.6 + 1.3) +
    0.18 * Math.sin(x * 0.23 + z * 0.21 - t * 2.3 + 2.1) +
    0.1 * Math.sin(x * -0.31 + z * 0.37 - t * 3.1 + 0.4));

const SEA = 260;
const useSea = () =>
  useMemo(() => {
    const g = new THREE.PlaneGeometry(SEA, SEA, 150, 150);
    g.rotateX(-Math.PI / 2);
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
    const base = Float32Array.from(g.attributes.position.array as Float32Array);
    return { g, base };
  }, []);

const hash = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const SkyDome: React.FC<{ top: string; horizon: string }> = ({ top, horizon }) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } },
        vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ",
        fragmentShader:
          "uniform vec3 top; uniform vec3 horizon; varying vec3 vP; void main(){ float h = clamp(vP.y*1.5+0.08,0.0,1.0); gl_FragColor = vec4(mix(horizon, top, pow(h,0.65)),1.0);} ",
      }),
    [],
  );
  mat.uniforms.top.value.set(top);
  mat.uniforms.horizon.value.set(horizon);
  return (
    <mesh material={mat}>
      <sphereGeometry args={[500, 32, 16]} />
    </mesh>
  );
};

/* ------------------------------------------------------------------ */
/* Boat and people                                                     */
/* ------------------------------------------------------------------ */

const Person: React.FC<{
  robe: string;
  pos: [number, number, number];
  lying?: number;
  arms?: number;
  glow?: number;
  sitting?: boolean;
  rowPhase?: number;
}> = ({ robe, pos, lying = 0, arms = 0, glow = 0, sitting, rowPhase = 0 }) => {
  const armA = 0.3 + arms * 2.2 + (sitting ? Math.sin(rowPhase) * 0.5 : 0);
  return (
    <group position={pos} rotation={[0, 0, lying * (Math.PI / 2)]}>
      {glow > 0.01 ? (
        <mesh position={[0, 1.3, 0]}>
          <sphereGeometry args={[0.9, 20, 20]} />
          <meshBasicMaterial color="#ffe3a8" transparent opacity={0.1 * glow} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ) : null}
      <mesh position={[0, sitting ? 0.45 : 0.75, 0]}>
        <coneGeometry args={[0.45, sitting ? 0.9 : 1.5, 12]} />
        <meshStandardMaterial color={robe} roughness={0.9} emissive={glow > 0 ? "#ffd38a" : "#000"} emissiveIntensity={0.35 * glow} />
      </mesh>
      <mesh position={[0, sitting ? 1.05 : 1.65, 0]}>
        <sphereGeometry args={[0.24, 16, 16]} />
        <meshStandardMaterial color="#8a5a3c" roughness={0.8} />
      </mesh>
      <mesh position={[0, sitting ? 1.15 : 1.75, -0.03]} scale={[1, 0.75, 1]}>
        <sphereGeometry args={[0.26, 16, 16]} />
        <meshStandardMaterial color="#2a1a12" roughness={0.9} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0.32 * s, sitting ? 0.75 : 1.3, 0]} rotation={[0, 0, s * armA]}>
          <capsuleGeometry args={[0.08, 0.6, 4, 8]} />
          <meshStandardMaterial color={robe} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
};

const HULL = (() => {
  const sh = new THREE.Shape();
  sh.moveTo(-3.5, 0.85);
  sh.quadraticCurveTo(-3.3, 0.5, -3.0, 0.45);
  sh.lineTo(3.0, 0.45);
  sh.quadraticCurveTo(3.4, 0.55, 3.75, 1.05);
  sh.quadraticCurveTo(3.3, -0.3, 2.0, -0.7);
  sh.quadraticCurveTo(0, -0.95, -2.2, -0.7);
  sh.quadraticCurveTo(-3.3, -0.35, -3.5, 0.85);
  return new THREE.ExtrudeGeometry(sh, { depth: 2.2, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2, curveSegments: 16 });
})();

const Boat: React.FC<{ t: number; p: Pal; jesus: { lying: number; arms: number; glow: number } }> = ({ t, p, jesus }) => {
  const y0 = waveH(0, 0, t, p.amp);
  const pitch = Math.atan2(waveH(3, 0, t, p.amp) - waveH(-3, 0, t, p.amp), 6);
  const roll = Math.atan2(waveH(0, 1.2, t, p.amp) - waveH(0, -1.2, t, p.amp), 2.4);
  const lanternGlow = 1 + Math.sin(t * 7) * 0.15;
  return (
    <group position={[0, y0 + 0.1, 0]} rotation={[roll * 0.9, 0.35, pitch * 0.9]}>
      {/* hull: side profile extruded across the beam, with a dark interior */}
      <mesh geometry={HULL} position={[0, 0, -1.1]}>
        <meshStandardMaterial color="#7a4626" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.47, 0]}>
        <boxGeometry args={[5.6, 0.04, 1.7]} />
        <meshStandardMaterial color="#3a2414" roughness={0.9} />
      </mesh>
      {[-1.12, 1.12].map((z) => (
        <mesh key={z} position={[0.05, 0.52, z]}>
          <boxGeometry args={[6.4, 0.12, 0.12]} />
          <meshStandardMaterial color="#a8703f" roughness={0.7} />
        </mesh>
      ))}
      {[-1.2, 1.3].map((x) => (
        <mesh key={x} position={[x, 0.5, 0]}>
          <boxGeometry args={[0.25, 0.08, 2.2]} />
          <meshStandardMaterial color="#8a5a33" />
        </mesh>
      ))}
      {/* mast and furled sail */}
      <mesh position={[0.7, 2.4, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 4.8, 8]} />
        <meshStandardMaterial color="#4a2e18" />
      </mesh>
      <mesh position={[0.7, 3.9, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.13, 0.13, 3.2, 10]} />
        <meshStandardMaterial color="#e8dcc0" roughness={0.9} />
      </mesh>
      {/* lantern at the stern */}
      <group position={[-2.6, 0.55, 0.5]}>
        <mesh>
          <boxGeometry args={[0.28, 0.4, 0.28]} />
          <meshStandardMaterial color="#fff1c2" emissive="#ffb648" emissiveIntensity={2 * lanternGlow} />
        </mesh>
        <pointLight color="#ffb648" intensity={14 * lanternGlow} distance={9} decay={1.6} />
      </group>
      {/* disciples rowing */}
      <Person robe="#5c6a7a" pos={[1.6, 0.48, 0.45]} sitting rowPhase={t * (2 + p.amp)} />
      <Person robe="#7a5c48" pos={[-0.5, 0.48, -0.45]} sitting rowPhase={t * (2 + p.amp) + 1} />
      {/* Jesus: asleep at the stern, then standing */}
      <Person robe="#efe6d2" pos={[-2.2, 0.55 + (1 - jesus.lying) * 0.05, 0]} lying={jesus.lying} arms={jesus.arms} glow={jesus.glow} />
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Sky: clouds, rain, lightning, moon, sun, stars                     */
/* ------------------------------------------------------------------ */

const CLOUD_N = 170;
const Clouds: React.FC<{ p: Pal; flash: number; t: number }> = ({ p, flash, t }) => {
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 1), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true, transparent: true }), []);
  const mesh = useMemo(() => new THREE.InstancedMesh(geo, mat, CLOUD_N), [geo, mat]);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < CLOUD_N; i++) {
    const a = hash(i, 1) * Math.PI * 2;
    const r = 30 + hash(i, 2) * 140;
    const drift = t * 1.5 + (1 - p.cloud) * 120;
    const x = Math.cos(a) * r + drift * (hash(i, 6) > 0.5 ? 1 : -1);
    const z = Math.sin(a) * r - 40;
    const y = 28 + hash(i, 3) * 18;
    const s = (6 + hash(i, 4) * 9) * Math.max(0.05, p.cloud);
    m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s * 1.8, s * 0.55, s));
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mat.color.set(p.cloudColor);
  mat.emissive.set("#c8d4ff");
  mat.emissiveIntensity = flash * 0.9;
  mat.opacity = Math.min(1, p.cloud * 1.3);
  return <primitive object={mesh} />;
};

const Rain: React.FC<{ amount: number; t: number }> = ({ amount, t }) => {
  const N = 1400;
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 6), 3));
    return g;
  }, []);
  if (amount < 0.02) return null;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < N; i++) {
    const x = (hash(i, 7) - 0.5) * 70;
    const z = (hash(i, 8) - 0.5) * 60 + 5;
    const y = ((((hash(i, 9) * 30 - t * 26) % 30) + 30) % 30) - 2;
    pos.setXYZ(i * 2, x, y, z);
    pos.setXYZ(i * 2 + 1, x + 0.5, y - 1.4, z);
  }
  pos.needsUpdate = true;
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#b9c8d6" transparent opacity={0.45 * amount} />
    </lineSegments>
  );
};

const Bolt: React.FC<{ seed: number; strength: number }> = ({ seed, strength }) => {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    let x = (hash(seed, 1) - 0.5) * 90;
    const z = -90 - hash(seed, 2) * 60;
    for (let y = 45; y > 0; y -= 3) {
      pts.push(new THREE.Vector3(x, y, z));
      x += (hash(seed, y) - 0.5) * 7;
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [seed]);
  if (strength < 0.05) return null;
  return (
    <line>
      <primitive object={geo} attach="geometry" />
      <lineBasicMaterial color="#f2f6ff" transparent opacity={strength} fog={false} />
    </line>
  );
};

const Stars: React.FC<{ amount: number }> = ({ amount }) => {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr = new Float32Array(1100 * 3);
    for (let i = 0; i < 1100; i++) {
      const a = hash(i, 11) * Math.PI * 2;
      const e = 0.08 + hash(i, 12) * 1.3;
      arr.set([Math.cos(a) * Math.cos(e) * 450, Math.sin(e) * 450, Math.sin(a) * Math.cos(e) * 450], i * 3);
    }
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  if (amount < 0.02) return null;
  return (
    <points geometry={geo}>
      <pointsMaterial color="#ffffff" size={2} sizeAttenuation={false} transparent opacity={amount} fog={false} />
    </points>
  );
};

const CameraRig: React.FC<{ t: number; amp: number; shake: number }> = ({ t, amp, shake }) => {
  const { camera } = useThree();
  const a = 0.55 + Math.sin(t * 0.05) * 0.5;
  const dist = 17 - Math.min(3, t * 0.02);
  const y = 3.6 + amp * 0.45 + Math.sin(t * 0.7) * amp * 0.3;
  const sx = (random(`sx${Math.floor(t * 30)}`) - 0.5) * shake;
  const sy = (random(`sy${Math.floor(t * 30)}`) - 0.5) * shake;
  camera.position.set(Math.sin(a) * dist + sx, y + sy, Math.cos(a) * dist);
  camera.lookAt(0, 2.4 + amp * 0.2, 0);
  camera.updateProjectionMatrix();
  return null;
};

const World: React.FC<{ t: number; p: Pal; flash: number; flashSeed: number; jesus: { lying: number; arms: number; glow: number } }> = ({
  t,
  p,
  flash,
  flashSeed,
  jesus,
}) => {
  const { g, base } = useSea();
  const seaMat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.15, flatShading: true }), []);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const col = g.attributes.color as THREE.BufferAttribute;
  const cw = new THREE.Color(p.water);
  const cc = new THREE.Color(p.crest);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3];
    const z = base[i * 3 + 2];
    const h = waveH(x, z, t, p.amp);
    pos.setY(i, h);
    const k = Math.min(1, Math.max(0, (h / Math.max(0.3, p.amp) - 0.45) * 1.6));
    tmp.copy(cw).lerp(cc, k * (p.amp > 1 ? 0.9 : 0.35));
    col.setXYZ(i, tmp.r, tmp.g, tmp.b);
  }
  pos.needsUpdate = true;
  col.needsUpdate = true;
  g.computeVertexNormals();

  // keep the moon / sun in frame: on the camera's viewing axis
  const ca = 0.55 + Math.sin(t * 0.05) * 0.5;
  const dir = new THREE.Vector3(-Math.sin(ca), 0, -Math.cos(ca));
  const side = new THREE.Vector3(dir.z, 0, -dir.x);
  const moonPos = dir.clone().multiplyScalar(300).add(side.clone().multiplyScalar(-30)).setY(105);
  const sunPos = dir.clone().multiplyScalar(320).add(side.clone().multiplyScalar(25)).setY(6 + p.sun * 26);
  const bodyPos = p.sun > 0.5 ? sunPos : moonPos;
  const pathAngle = Math.atan2(bodyPos.x, bodyPos.z);
  const lightCol = p.sun > 0.5 ? "#ffd7a1" : p.moon > 0.5 ? "#bcd0ff" : "#c9d3e0";
  return (
    <>
      <CameraRig t={t} amp={p.amp} shake={p.amp > 1.5 ? 0.25 + flash * 0.6 : 0} />
      <fog attach="fog" args={[p.horizon, 30, 300]} />
      <SkyDome top={"#" + new THREE.Color(p.top).lerp(new THREE.Color("#8da2c8"), flash * 0.5).getHexString()} horizon={p.horizon} />
      <Stars amount={p.stars} />
      {p.moon > 0.02 ? (
        <>
          <mesh position={moonPos}>
            <sphereGeometry args={[10, 32, 32]} />
            <meshBasicMaterial color="#f4f1e6" transparent opacity={p.moon} fog={false} />
          </mesh>
          <mesh position={moonPos}>
            <sphereGeometry args={[26, 32, 32]} />
            <meshBasicMaterial color="#9fb4ff" transparent opacity={0.12 * p.moon} fog={false} depthWrite={false} />
          </mesh>
        </>
      ) : null}
      {p.sun > 0.02 ? (
        <>
          <mesh position={sunPos}>
            <sphereGeometry args={[14, 32, 32]} />
            <meshBasicMaterial color="#ffe0a0" transparent opacity={p.sun} fog={false} />
          </mesh>
          <mesh position={sunPos}>
            <sphereGeometry args={[40, 32, 32]} />
            <meshBasicMaterial color="#ffb36b" transparent opacity={0.2 * p.sun} fog={false} depthWrite={false} />
          </mesh>
        </>
      ) : null}
      {/* light path on the water toward the moon / sun */}
      {p.moon + p.sun > 0.05 ? (
        <mesh position={[bodyPos.x * 0.45, 0.3, bodyPos.z * 0.45]} rotation={[-Math.PI / 2, 0, pathAngle]}>
          <planeGeometry args={[7, 260]} />
          <meshBasicMaterial color={p.sun > 0.5 ? "#ffcf8a" : "#cfdcff"} transparent opacity={0.08 * Math.min(1, p.moon + p.sun)} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ) : null}
      <hemisphereLight args={[p.top, p.water, 0.9 * p.light]} />
      <ambientLight intensity={0.35 * p.light} color={p.horizon} />
      <directionalLight position={[-40, 60, -80]} intensity={1.4 * p.light + flash * 3} color={flash > 0.2 ? "#e8eeff" : lightCol} />
      <pointLight position={[8, 7, 12]} intensity={25 * p.light} distance={40} decay={1.4} color={lightCol} />
      <mesh geometry={g} material={seaMat} />
      <Boat t={t} p={p} jesus={jesus} />
      <Clouds p={p} flash={flash} t={t} />
      <Rain amount={p.rain} t={t} />
      <Bolt seed={flashSeed} strength={flash > 0.5 ? flash : 0} />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Composition                                                         */
/* ------------------------------------------------------------------ */

export const Tempete: React.FC<TempeteProps> = ({ audioFile, durationSeconds, sections, sentences, flashes, verse, cta }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const p = paletteAt(t, sections);

  // lightning envelope: bright strike + a second flicker
  let flash = 0;
  let flashSeed = 0;
  flashes.forEach((f, i) => {
    const d = t - f;
    if (d >= 0 && d < 1) {
      const v = Math.exp(-d * 10) + (d > 0.12 ? 0.6 * Math.exp(-(d - 0.12) * 14) : 0);
      if (v > flash) {
        flash = Math.min(1, v);
        flashSeed = i + 1;
      }
    }
  });

  // Jesus wakes, stands and speaks to the wind
  const find = (s: string) => sentences.find((x) => x.text.startsWith(s))?.start ?? 0;
  const wake = find("Alors ils l'ont");
  const stand = find("Il s'est levé");
  const speak = find("Il a parlé");
  const jesus = {
    lying: interpolate(t, [stand - 0.2, stand + 1.0], [1, 0], clamp),
    arms: interpolate(t, [speak, speak + 0.8, speak + 5, speak + 7], [0, 1, 1, 0.2], clamp),
    glow: interpolate(t, [speak, speak + 1.5, durationSeconds - 6, durationSeconds], [0, 1, 1, 0.6], clamp) + (t > wake && t < stand ? 0 : 0),
  };

  const sentence = sentences.find((s) => t >= s.start - 0.05 && t < s.end + 0.45);
  const section = [...sections].reverse().find((s) => t >= s.start);
  const verseO = interpolate(t, [verse.start, verse.start + 0.8, cta.start - 0.4, cta.start], [0, 1, 1, 0], clamp);
  const ctaO = interpolate(t, [cta.start, cta.start + 0.6, durationSeconds - 0.6, durationSeconds], [0, 1, 1, 0], clamp);
  const fade = interpolate(t, [0, 1.2, durationSeconds - 0.8, durationSeconds], [0, 1, 1, 0], clamp);

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {audioFile ? <Audio src={staticFile(audioFile)} /> : null}
      <AbsoluteFill style={{ opacity: fade }}>
        <ThreeCanvas width={W} height={H} gl={{ antialias: true, preserveDrawingBuffer: true }} camera={{ fov: 50, near: 0.3, far: 1500 }}>
          <World t={t} p={p} flash={flash} flashSeed={flashSeed} jesus={jesus} />
        </ThreeCanvas>
        <AbsoluteFill style={{ background: "#dfe8ff", opacity: flash * 0.28, mixBlendMode: "screen" }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 48%, rgba(0,0,0,0.55) 100%)" }} />
        {section ? <SeasonTitle title={section.title} lt={t - section.start} /> : null}
        {sentence ? <Caption s={sentence} t={t} /> : null}
        <div style={{ position: "absolute", left: 100, right: 100, top: 700, textAlign: "center", color: "#fff", opacity: verseO, textShadow: "0 4px 20px rgba(0,0,0,0.6)" }}>
          <div style={{ fontFamily: "'FreeSerif', serif", fontStyle: "italic", fontSize: 64, lineHeight: 1.3 }}>{verse.text}</div>
          <div style={{ marginTop: 30, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 30, letterSpacing: 8 }}>{verse.ref.toUpperCase()}</div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 110,
            right: 110,
            top: 820,
            textAlign: "center",
            fontFamily: "Inter, sans-serif",
            fontWeight: 700,
            fontSize: 48,
            lineHeight: 1.3,
            color: "#fff",
            opacity: ctaO,
            textShadow: "0 4px 20px rgba(0,0,0,0.6)",
          }}
        >
          {cta.text}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
