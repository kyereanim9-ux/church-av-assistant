import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import type { Scene } from "./PasAPas";

/* 3D version of the PasAPas world: the character, the giant hand, props
   and backdrops built from simple primitives with soft lights and shadows.
   World units: 1 unit = 100 px at the character's depth (z = 0), so the
   2D kinetic text laid out in pixels still lines up with the 3D scene. */

const W = 1920;
const H = 1080;
const FOV = 30;
const CAM_Z = 5.4 / Math.tan((FOV / 2) * (Math.PI / 180));
const FLOOR = -4.45;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const px = (x: number) => (x - 960) / 100;
const py = (y: number) => (540 - y) / 100;
const rad = (d: number) => (d * Math.PI) / 180;

const COL = {
  skin: "#f6cfae",
  hair: "#4a2e22",
  sweater: "#e3b04b",
  pants: "#2d3b63",
  ink: "#1d2433",
  gold: "#d9a441",
  terracotta: "#c8553d",
  rose: "#e08aa0",
  handSkin: "#f3c7a2",
};

const POSES: Record<string, [number, number]> = {
  cheer: [145, -145],
  worried: [-38, 38],
  heart: [12, 48],
  hold: [18, -70],
  shrug: [70, -70],
  walk: [0, -70],
  wave: [10, -150],
  kneel: [18, -78],
  point: [12, -95],
  reach: [25, -150],
  walkhand: [0, -150],
  umbrella: [12, -22],
  book: [20, -48],
};

const Std: React.FC<{ color: string; rough?: number; emissive?: string; ei?: number; side?: THREE.Side }> = ({
  color,
  rough = 0.55,
  emissive,
  ei = 0,
  side,
}) => (
  <meshStandardMaterial color={color} roughness={rough} metalness={0.02} emissive={emissive ?? "#000"} emissiveIntensity={ei} side={side} />
);

/** Mesh that casts and receives shadows. */
const M: React.FC<{
  children: React.ReactNode;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
}> = ({ children, ...rest }) => (
  <mesh castShadow receiveShadow {...rest}>
    {children}
  </mesh>
);

/* ------------------------------------------------------------------ */
/* Canvas textures                                                     */
/* ------------------------------------------------------------------ */

const useCanvasTexture = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, key: string) =>
  useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    draw(cv.getContext("2d")!);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

const drawMap = (c: CanvasRenderingContext2D) => {
  c.fillStyle = "#fbf3dd";
  c.fillRect(0, 0, 440, 330);
  c.fillStyle = "#cfe6b8";
  c.fillRect(14, 14, 412, 302);
  c.fillStyle = "#9fd0f0";
  c.beginPath();
  c.moveTo(300, 316);
  c.quadraticCurveTo(360, 256, 426, 236);
  c.lineTo(426, 316);
  c.fill();
  c.fillStyle = "#b9b0a4";
  c.beginPath();
  c.moveTo(150, 140);
  c.lineTo(210, 60);
  c.lineTo(270, 140);
  c.fill();
  c.fillStyle = "#fff";
  c.beginPath();
  c.moveTo(190, 87);
  c.lineTo(210, 60);
  c.lineTo(230, 87);
  c.fill();
  c.fillStyle = "#ffd45e";
  c.beginPath();
  c.arc(380, 60, 26, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = "#f3e2b5";
  c.lineWidth = 16;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(60, 290);
  c.bezierCurveTo(120, 240, 60, 200, 140, 180);
  c.bezierCurveTo(220, 160, 260, 200, 250, 150);
  c.bezierCurveTo(240, 100, 330, 120, 380, 90);
  c.stroke();
  c.strokeStyle = "#c8553d";
  c.lineWidth = 4;
  c.setLineDash([10, 10]);
  c.stroke();
  c.setLineDash([]);
  c.fillStyle = "#e0475e";
  c.beginPath();
  c.moveTo(214, 260);
  c.bezierCurveTo(180, 236, 186, 214, 202, 214);
  c.bezierCurveTo(210, 214, 214, 222, 214, 226);
  c.bezierCurveTo(214, 222, 218, 214, 226, 214);
  c.bezierCurveTo(242, 214, 248, 236, 214, 260);
  c.fill();
  c.fillStyle = "#c8553d";
  c.beginPath();
  c.moveTo(32, 224);
  c.lineTo(70, 194);
  c.lineTo(108, 224);
  c.fill();
  c.fillStyle = "#fff";
  c.fillRect(40, 224, 60, 44);
  [[70, 110], [110, 80], [330, 200], [360, 230], [120, 250]].forEach(([x, y]) => {
    c.fillStyle = "#4f9a5a";
    c.beginPath();
    c.arc(x, y - 6, 14, 0, Math.PI * 2);
    c.fill();
  });
};

const textTexture = (text: string, color: string, bg?: string) => (c: CanvasRenderingContext2D) => {
  if (bg) {
    c.fillStyle = bg;
    c.fillRect(0, 0, c.canvas.width, c.canvas.height);
  }
  c.fillStyle = color;
  c.font = "900 64px Inter, sans-serif";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(text, c.canvas.width / 2, c.canvas.height / 2);
};

/* ------------------------------------------------------------------ */
/* Character                                                           */
/* ------------------------------------------------------------------ */

const Eye: React.FC<{ x: number; kind: string; blink: boolean; right: boolean }> = ({ x, kind, blink, right }) => {
  const closed = kind === "closed" || (blink && kind !== "happy" && kind !== "wink") || (kind === "wink" && right);
  if (kind === "happy" || closed) {
    return (
      <mesh position={[x, 3.62, 1.16]} rotation={[0, 0, kind === "happy" ? 0 : Math.PI]}>
        <torusGeometry args={[0.15, 0.04, 8, 20, Math.PI]} />
        <Std color={COL.ink} />
      </mesh>
    );
  }
  return (
    <group position={[x, 3.6, 1.12]}>
      <mesh scale={[0.13, 0.18, 0.08]}>
        <sphereGeometry args={[1, 20, 20]} />
        <Std color={COL.ink} rough={0.2} />
      </mesh>
      <mesh position={[0.04, 0.07, 0.07]} scale={0.045}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
      {kind === "worried" ? (
        <mesh position={[0, 0.34, 0.05]} rotation={[0, 0, right ? 0.25 : -0.25]} scale={[0.17, 0.035, 0.03]}>
          <boxGeometry args={[2, 2, 2]} />
          <Std color={COL.hair} />
        </mesh>
      ) : null}
    </group>
  );
};

const Mouth: React.FC<{ kind: string }> = ({ kind }) => {
  const z = 1.2;
  if (kind === "o")
    return (
      <mesh position={[0, 3.18, z]} scale={[0.09, 0.12, 0.05]}>
        <sphereGeometry args={[1, 16, 16]} />
        <Std color={COL.ink} />
      </mesh>
    );
  if (kind === "open" || kind === "grin")
    return (
      <mesh position={[0, 3.26, z - 0.02]} rotation={[0, 0, Math.PI]}>
        <circleGeometry args={[kind === "grin" ? 0.24 : 0.17, 24, 0, Math.PI]} />
        <meshStandardMaterial color={kind === "grin" ? "#fff" : "#8c2f39"} side={THREE.DoubleSide} />
      </mesh>
    );
  return (
    <mesh position={[0, kind === "frown" ? 3.12 : 3.26, z]} rotation={[0, 0, kind === "frown" ? 0 : Math.PI]}>
      <torusGeometry args={[0.15, 0.035, 8, 20, Math.PI]} />
      <Std color={COL.ink} />
    </mesh>
  );
};

const HAIR: [number, number, number, number][] = [
  [-0.9, 4.2, 0.3, 0.55], [-0.5, 4.6, 0.3, 0.6], [0, 4.75, 0.25, 0.62], [0.5, 4.62, 0.3, 0.6], [0.92, 4.25, 0.3, 0.52],
  [-1.15, 3.7, 0, 0.42], [1.17, 3.72, 0, 0.38], [-0.7, 4.3, -0.5, 0.6], [0.7, 4.3, -0.5, 0.6], [0, 4.4, -0.7, 0.7],
  [-0.25, 4.45, 0.75, 0.42], [0.3, 4.42, 0.72, 0.4], [-0.8, 3.9, 0.6, 0.35], [0.82, 3.95, 0.55, 0.34], [0, 3.8, -1.0, 0.7],
];

const HeldProp3D: React.FC<{ prop: string; frame: number }> = ({ prop, frame }) => {
  if (prop === "lantern") {
    const g = 1.4 + Math.sin(frame / 8) * 0.3;
    return (
      <group position={[0.1, -0.9, 0.2]}>
        <M position={[0, 0.55, 0]}>
          <torusGeometry args={[0.12, 0.03, 8, 16]} />
          <Std color={COL.ink} />
        </M>
        <M>
          <boxGeometry args={[0.55, 0.75, 0.55]} />
          <meshStandardMaterial color="#fff3c4" emissive="#ffc861" emissiveIntensity={g} roughness={0.3} />
        </M>
        <M position={[0, 0.42, 0]}>
          <coneGeometry args={[0.42, 0.25, 4]} />
          <Std color={COL.ink} />
        </M>
        <M position={[0, -0.42, 0]}>
          <boxGeometry args={[0.62, 0.1, 0.62]} />
          <Std color={COL.ink} />
        </M>
        <pointLight color="#ffc861" intensity={g * 6} distance={5} decay={1.5} />
      </group>
    );
  }
  if (prop === "coffee")
    return (
      <group position={[-0.05, 0.55, 0.3]}>
        <M>
          <cylinderGeometry args={[0.32, 0.27, 0.7, 24]} />
          <Std color="#fff" rough={0.3} />
        </M>
        <M position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.325, 0.31, 0.16, 24]} />
          <Std color={COL.terracotta} />
        </M>
        <M position={[0.33, 0, 0]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.15, 0.05, 8, 16]} />
          <Std color="#fff" />
        </M>
        {[0, 1, 2].map((i) => {
          const k = ((frame / 30 + i / 3) % 1 + 1) % 1;
          return (
            <mesh key={i} position={[Math.sin(frame / 6 + i) * 0.1, 0.5 + k * 0.9, 0]} scale={0.12 + k * 0.1}>
              <sphereGeometry args={[1, 12, 12]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.5 * (1 - k)} />
            </mesh>
          );
        })}
      </group>
    );
  if (prop === "umbrella")
    return (
      <group position={[-0.25, 0, 0.2]}>
        <M position={[0, 2.1, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 4.4, 10]} />
          <Std color={COL.ink} />
        </M>
        <M position={[0, 4.1, 0]}>
          <sphereGeometry args={[2.1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.3]} />
          <Std color={COL.terracotta} side={THREE.DoubleSide} rough={0.45} />
        </M>
        <M position={[0, 6.15, 0]}>
          <sphereGeometry args={[0.08, 10, 10]} />
          <Std color={COL.ink} />
        </M>
      </group>
    );
  if (prop === "book") {
    const g = 1.2 + Math.sin(frame / 7) * 0.4;
    return (
      <group position={[-0.1, 0.4, 0.4]} rotation={[0.35, 0, 0]}>
        <M position={[-0.38, 0, 0]} rotation={[0, 0.25, 0]}>
          <boxGeometry args={[0.75, 0.05, 1.0]} />
          <Std color="#fffaf0" />
        </M>
        <M position={[0.38, 0, 0]} rotation={[0, -0.25, 0]}>
          <boxGeometry args={[0.75, 0.05, 1.0]} />
          <Std color="#fffaf0" />
        </M>
        <M position={[0, -0.05, 0]}>
          <boxGeometry args={[1.6, 0.05, 1.08]} />
          <Std color="#7a4f9a" />
        </M>
        <mesh position={[0, 0.6, 0]}>
          <sphereGeometry args={[0.5, 20, 20]} />
          <meshStandardMaterial color="#fff2c0" emissive="#ffcf66" emissiveIntensity={g} transparent opacity={0.35} />
        </mesh>
        <pointLight color="#ffcf66" intensity={g * 7} distance={6} decay={1.5} position={[0, 0.8, 0.3]} />
      </group>
    );
  }
  return null;
};

const Arm3D: React.FC<{ x: number; angle: number; children?: React.ReactNode }> = ({ x, angle, children }) => (
  <group position={[x, 2.5, 0]} rotation={[0, 0, rad(-angle)]}>
    <M position={[0, -0.6, 0]}>
      <capsuleGeometry args={[0.24, 0.8, 8, 16]} />
      <Std color={COL.sweater} rough={0.8} />
    </M>
    <M position={[0, -1.28, 0]}>
      <sphereGeometry args={[0.22, 16, 16]} />
      <Std color={COL.skin} />
    </M>
    <group position={[0, -1.28, 0]} rotation={[0, 0, rad(angle)]}>
      {children}
    </group>
  </group>
);

const Character3D: React.FC<{
  scene: Scene;
  localT: number;
  bob: number;
  lift: number;
  enter: number;
  walkX: number;
}> = ({ scene, localT, bob, lift, enter, walkX }) => {
  const frame = useCurrentFrame();
  let [la, ra] = POSES[scene.pose] ?? [0, 0];
  let legL = 0;
  let legR = 0;
  if (scene.pose === "walk" || scene.pose === "walkhand") {
    const sw = Math.sin(frame / 5);
    la = sw * 22;
    legL = sw * 22;
    legR = -sw * 22;
  }
  if (scene.pose === "cheer") {
    la += Math.sin(frame / 4) * 8;
    ra -= Math.sin(frame / 4) * 8;
  }
  let tilt = 0;
  if (scene.fall) {
    const f0 = scene.fallAt ?? 0.5;
    const r0 = scene.riseAt ?? 1.9;
    tilt =
      interpolate(localT, [f0, f0 + 0.6], [0, 78], { ...clamp, easing: (x) => x * x }) -
      interpolate(localT, [r0, r0 + 0.5], [0, 78], clamp);
  }
  const kneel = scene.pose === "kneel";
  const blink = Math.floor(frame / 3) % 40 === 0;
  const turn = Math.sin(frame / 40) * 0.12 + (scene.pose === "walk" || scene.pose === "walkhand" ? 0.25 : 0);
  const y = FLOOR - (1 - enter) * 0.8 - bob / 100 + lift / 100;
  const s = 0.9 + enter * 0.1;

  return (
    <group position={[px(scene.cx) + walkX / 100, y, 0]} rotation={[0, 0, rad(-tilt)]} scale={s}>
      <group rotation={[0, turn, 0]}>
        {/* legs */}
        {kneel ? (
          <group>
            <M position={[-0.35, 0.45, 0.45]} rotation={[Math.PI / 2, 0, 0]}>
              <capsuleGeometry args={[0.27, 0.6, 8, 16]} />
              <Std color={COL.pants} rough={0.8} />
            </M>
            <M position={[-0.35, 0.3, 0.75]}>
              <capsuleGeometry args={[0.26, 0.3, 8, 16]} />
              <Std color={COL.pants} rough={0.8} />
            </M>
            <M position={[-0.35, 0.1, 0.9]} scale={[0.3, 0.16, 0.42]}>
              <sphereGeometry args={[1, 16, 16]} />
              <Std color={COL.ink} rough={0.4} />
            </M>
            <M position={[0.35, 0.25, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
              <capsuleGeometry args={[0.27, 0.9, 8, 16]} />
              <Std color={COL.pants} rough={0.8} />
            </M>
          </group>
        ) : (
          [-0.35, 0.35].map((x, i) => (
            <group key={x} position={[x, 1.2, 0]} rotation={[rad(i ? legR : legL), 0, 0]}>
              <M position={[0, -0.55, 0]}>
                <capsuleGeometry args={[0.27, 0.75, 8, 16]} />
                <Std color={COL.pants} rough={0.8} />
              </M>
              <M position={[0, -1.08, 0.15]} scale={[0.32, 0.17, 0.45]}>
                <sphereGeometry args={[1, 16, 16]} />
                <Std color={COL.ink} rough={0.4} />
              </M>
            </group>
          ))
        )}
        <group position={[0, kneel ? -0.7 : 0, 0]}>
          {/* body */}
          <M position={[0, 1.85, 0]} scale={[1, 1, 0.8]}>
            <capsuleGeometry args={[0.78, 0.75, 12, 24]} />
            <Std color={COL.sweater} rough={0.85} />
          </M>
          <M position={[0, 2.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.38, 0.09, 10, 24]} />
            <Std color="#c99436" rough={0.85} />
          </M>
          <Arm3D x={-0.82} angle={la} />
          <Arm3D x={0.82} angle={ra}>
            <HeldProp3D prop={scene.prop} frame={frame} />
          </Arm3D>
          {/* head */}
          <M position={[0, 3.7, 0]}>
            <sphereGeometry args={[1.25, 40, 40]} />
            <Std color={COL.skin} rough={0.6} />
          </M>
          {HAIR.map(([x, yy, z, r], i) => (
            <M key={i} position={[x, yy, z]}>
              <sphereGeometry args={[r, 20, 20]} />
              <Std color={COL.hair} rough={0.9} />
            </M>
          ))}
          {[-0.62, 0.62].map((x) => (
            <mesh key={x} position={[x, 3.25, 1.0]} scale={[0.2, 0.12, 0.05]}>
              <sphereGeometry args={[1, 12, 12]} />
              <meshStandardMaterial color={COL.rose} transparent opacity={0.6} />
            </mesh>
          ))}
          <Eye x={-0.38} kind={scene.eyes} blink={blink} right={false} />
          <Eye x={0.38} kind={scene.eyes} blink={blink} right />
          <Mouth kind={scene.mouth} />
        </group>
      </group>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* Giant hand                                                          */
/* ------------------------------------------------------------------ */

const Hand3D: React.FC = () => (
  <group>
    <M position={[9.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.62, 0.52, 16.5, 24]} />
      <Std color={COL.handSkin} rough={0.6} />
    </M>
    <M position={[0.35, 0, 0]} scale={[0.85, 0.62, 0.3]}>
      <sphereGeometry args={[1, 28, 28]} />
      <Std color={COL.handSkin} rough={0.6} />
    </M>
    {[
      [0.34, 0.95],
      [0.11, 1.08],
      [-0.12, 1.02],
      [-0.34, 0.84],
    ].map(([y, len], i) => (
      <M key={i} position={[-0.35 - len / 2, y, 0.02]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.12, len, 8, 12]} />
        <Std color={COL.handSkin} rough={0.6} />
      </M>
    ))}
    <M position={[0.05, 0.62, 0.12]} rotation={[0, 0, rad(-62)]}>
      <capsuleGeometry args={[0.14, 0.7, 8, 12]} />
      <Std color={COL.handSkin} rough={0.6} />
    </M>
  </group>
);

const Staff3D: React.FC<{ a: [number, number]; b: [number, number] }> = ({ a, b }) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const ang = Math.atan2(dy, dx) - Math.PI / 2;
  const tex = useCanvasTexture(512, 96, textTexture("COURAGE", "#fff7e0"), "courage");
  return (
    <group position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0.2]} rotation={[0, 0, ang]}>
      <M>
        <cylinderGeometry args={[0.12, 0.14, len, 16]} />
        <Std color="#a86f35" rough={0.7} />
      </M>
      <M position={[0, len / 2 + 0.25, 0]}>
        <sphereGeometry args={[0.32, 24, 24]} />
        <Std color="#c08a45" rough={0.4} />
      </M>
      {[0.1, 0.3].map((d) => (
        <M key={d} position={[0, len / 2 - d, 0]}>
          <torusGeometry args={[0.15, 0.05, 8, 16]} />
          <Std color="#6e4520" />
        </M>
      ))}
      <mesh position={[0, -0.6, 0.15]} rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[2.2, 0.4]} />
        <meshBasicMaterial map={tex} transparent />
      </mesh>
    </group>
  );
};

const GiantHand3D: React.FC<{ scene: Scene; localT: number; left: number; top: number; lift: number }> = ({
  scene,
  localT,
  left,
  top,
  lift,
}) => {
  const { fps } = useVideoConfig();
  const mapTex = useCanvasTexture(440, 330, drawMap, "map");
  const kind = scene.hand ?? "none";
  if (kind === "none") return null;
  const at = scene.handAt ?? 0.4;
  const s = at < 0 ? 1 : spring({ frame: (localT - at) * fps, fps, config: { damping: 16, mass: 0.9 } });
  const cx = scene.cx;
  let ax = 0;
  let ay = 0;
  let rot = 0;
  let z = 0.6;
  if (kind === "map") [ax, ay, rot] = [1360, 455, -22];
  else if (kind === "staff") [ax, ay, rot] = [1110, 520, -32];
  else if (kind === "lift") [ax, ay, rot] = [cx + 150, 860, 12];
  else if (kind === "carry") [ax, ay, rot, z] = [cx + 110, 1015 - lift, 4, 0.2];
  else if (kind === "bless") [ax, ay, rot, z] = [cx + 70, 300, -62, 1.2];
  else if (kind === "hold") {
    // the 3D character's raised right hand (shoulder 0.82/2.5, arm 1.28 at 150°)
    const hxW = px(left + 230) + 0.82 + 1.28 * Math.sin(rad(150));
    const hyW = FLOOR - (top - 300) / 100 + 2.5 - 1.28 * Math.cos(rad(150));
    const r = rad(-74);
    [ax, ay, rot] = [960 + (hxW + Math.cos(r) * 1.25) * 100, 540 - (hyW - Math.sin(r) * 1.25) * 100, -74];
  }
  const dist = (1 - s) * 9;
  const dirX = Math.cos(rad(rot));
  const dirY = -Math.sin(rad(rot));
  return (
    <group position={[dirX * dist, dirY * dist, 0]}>
      {kind === "map" ? (
        <mesh position={[px(ax - 250), py(ay + 135), 0.4]} rotation={[0, -0.12, rad(4)]} castShadow>
          <boxGeometry args={[4.4, 3.3, 0.03]} />
          <meshStandardMaterial map={mapTex} roughness={0.8} />
        </mesh>
      ) : null}
      {kind === "staff" ? <Staff3D a={[px(1015), py(985)]} b={[px(1085), py(430)]} /> : null}
      {kind === "bless" ? (
        <mesh position={[px(cx), py(430), -0.5]}>
          <sphereGeometry args={[2, 24, 24]} />
          <meshBasicMaterial color={COL.gold} transparent opacity={0.12 * s} />
        </mesh>
      ) : null}
      <group position={[px(ax), py(ay), z]} rotation={[0, 0, rad(-rot)]}>
        <Hand3D />
      </group>
    </group>
  );
};

/* ------------------------------------------------------------------ */
/* World props & backdrops                                             */
/* ------------------------------------------------------------------ */

const heartShape = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, -0.7);
  s.bezierCurveTo(-0.4, -0.4, -1.2, 0, -1.2, 0.6);
  s.bezierCurveTo(-1.2, 1.1, -0.6, 1.3, 0, 0.8);
  s.bezierCurveTo(0.6, 1.3, 1.2, 1.1, 1.2, 0.6);
  s.bezierCurveTo(1.2, 0, 0.4, -0.4, 0, -0.7);
  return s;
})();

const Heart3D: React.FC<{ x: number; y: number; localT: number; fill: boolean }> = ({ x, y, localT, fill }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: (localT - 0.2) * fps, fps, config: { damping: 10 } });
  const beat = 1 + Math.max(0, Math.sin(frame / 4.5)) * 0.07;
  const level = fill ? interpolate(localT, [0.4, 2.2], [0, 1], clamp) : 1;
  const color = new THREE.Color("#ffffff").lerp(new THREE.Color("#e0475e"), level);
  return (
    <group position={[x, y, 0.5]} scale={s * beat} rotation={[0, Math.sin(frame / 20) * 0.3, 0]}>
      <M position={[0, 0, -0.2]}>
        <extrudeGeometry args={[heartShape, { depth: 0.4, bevelEnabled: true, bevelSize: 0.15, bevelThickness: 0.15, bevelSegments: 6 }]} />
        <meshStandardMaterial color={color} roughness={0.25} emissive="#e0475e" emissiveIntensity={0.15 * level} />
      </M>
    </group>
  );
};

const Cloud3D: React.FC<{ x: number; y: number; localT: number }> = ({ x, y, localT }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: (localT - 0.2) * fps, fps, config: { damping: 12 } });
  return (
    <group position={[x, y, 0]} scale={s}>
      {[
        [-0.8, 0, 0.7], [0, 0.3, 0.9], [0.85, 0, 0.7], [-0.3, -0.25, 0.65], [0.4, -0.25, 0.65],
      ].map(([dx, dy, r], i) => (
        <M key={i} position={[dx, dy, 0]}>
          <sphereGeometry args={[r, 24, 24]} />
          <Std color="#a7b3c9" rough={0.95} />
        </M>
      ))}
      {Array.from({ length: 10 }, (_, i) => {
        const k = ((frame / 18 + i * 0.37) % 1 + 1) % 1;
        return (
          <mesh key={i} position={[-1.1 + (i % 5) * 0.55, -0.7 - k * 2.2, 0.2 + (i % 2) * 0.3]}>
            <capsuleGeometry args={[0.03, 0.22, 4, 6]} />
            <meshStandardMaterial color="#4f8fd6" transparent opacity={1 - k} />
          </mesh>
        );
      })}
    </group>
  );
};

const Sun3D: React.FC<{ x: number; y: number; localT: number }> = ({ x, y, localT }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: (localT - 0.2) * fps, fps, config: { damping: 12 } });
  return (
    <group position={[x, y, -2]} scale={s} rotation={[0, 0, frame / 60]}>
      <mesh>
        <sphereGeometry args={[0.9, 32, 32]} />
        <meshStandardMaterial color="#ffd86b" emissive="#ffc23d" emissiveIntensity={0.9} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} rotation={[0, 0, (i / 12) * Math.PI * 2]} position={[0, 0, 0]}>
          <group position={[0, 1.45, 0]}>
            <mesh>
              <capsuleGeometry args={[0.08, 0.45, 4, 8]} />
              <meshStandardMaterial color="#ffd86b" emissive="#ffc23d" emissiveIntensity={0.6} />
            </mesh>
          </group>
        </mesh>
      ))}
    </group>
  );
};

const Rock3D: React.FC<{ x: number }> = ({ x }) => {
  const tex = useCanvasTexture(320, 96, textTexture("DOUTES", "#4b4741"), "doutes");
  return (
    <group position={[x, FLOOR + 0.35, 0.6]}>
      <M scale={[1.3, 0.75, 0.9]}>
        <dodecahedronGeometry args={[0.8, 1]} />
        <meshStandardMaterial color="#a8a29a" roughness={0.95} flatShading />
      </M>
      <mesh position={[0, 0.05, 0.78]}>
        <planeGeometry args={[1.3, 0.39]} />
        <meshBasicMaterial map={tex} transparent />
      </mesh>
    </group>
  );
};

const Tree: React.FC<{ p: [number, number, number]; s: number }> = ({ p, s }) => (
  <group position={p} scale={s}>
    <M position={[0, 0.6, 0]}>
      <cylinderGeometry args={[0.15, 0.2, 1.2, 10]} />
      <Std color="#8a6a48" rough={0.9} />
    </M>
    <M position={[0, 1.6, 0]}>
      <sphereGeometry args={[0.8, 20, 20]} />
      <Std color="#86b97a" rough={0.9} />
    </M>
    <M position={[-0.45, 1.2, 0.2]}>
      <sphereGeometry args={[0.55, 16, 16]} />
      <Std color="#79ae6e" rough={0.9} />
    </M>
  </group>
);

const pathShape = (() => {
  // drawn in ground coordinates: y = distance into the scene (-z after rotation)
  const s = new THREE.Shape();
  s.moveTo(-1.6, -6);
  s.bezierCurveTo(-1.2, -2, 1.8, 0, 0.5, 6);
  s.bezierCurveTo(0.5, 12, 2.6, 16, 1.5, 30);
  s.lineTo(2.4, 30);
  s.bezierCurveTo(3.6, 16, 1.6, 12, 1.6, 6);
  s.bezierCurveTo(3.0, 0, 0.0, -2, 0.6, -6);
  s.closePath();
  return s;
})();

const PathWorld: React.FC = () => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR, -10]} receiveShadow>
      <planeGeometry args={[80, 40]} />
      <meshStandardMaterial color="#d5e6c3" roughness={1} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR + 0.01, 0]} receiveShadow>
      <shapeGeometry args={[pathShape]} />
      <meshStandardMaterial color="#f1e3c4" roughness={1} />
    </mesh>
    {[
      [-18, -20, 9], [8, -26, 11], [26, -22, 8],
    ].map(([x, z, r], i) => (
      <mesh key={i} position={[x, FLOOR - r * 0.55, z]} scale={[1.6, 1, 1]} receiveShadow>
        <sphereGeometry args={[r, 32, 32]} />
        <meshStandardMaterial color={["#c9dfb4", "#bcd6a5", "#c3dbad"][i]} roughness={1} />
      </mesh>
    ))}
    {[
      [-8.5, FLOOR, -3, 1.1], [-6, FLOOR, -8, 0.9], [7.5, FLOOR, -4, 1.0], [9.5, FLOOR, -9, 1.2], [-11, FLOOR, -12, 1.3], [12, FLOOR, -14, 1.2],
    ].map(([x, y, z, s], i) => (
      <Tree key={i} p={[x, y, z]} s={s} />
    ))}
  </group>
);

const Bedroom3D: React.FC = () => (
  <group position={[0, FLOOR, 0]}>
    <group position={[-5.6, 0, -1.2]}>
      <M position={[0, 0.55, 0]}>
        <boxGeometry args={[5.2, 0.6, 2.6]} />
        <Std color="#c48b4c" rough={0.8} />
      </M>
      <M position={[-2.55, 1.4, 0]}>
        <boxGeometry args={[0.25, 2.8, 2.7]} />
        <Std color="#a8753f" rough={0.8} />
      </M>
      <M position={[0.1, 1.05, 0]}>
        <boxGeometry args={[4.9, 0.45, 2.45]} />
        <Std color="#fffaf0" rough={0.9} />
      </M>
      <M position={[-1.75, 1.45, 0]} scale={[0.8, 0.3, 1.0]}>
        <sphereGeometry args={[1, 20, 20]} />
        <Std color="#ffd166" rough={0.9} />
      </M>
      <M position={[0.75, 1.42, 0.15]} rotation={[0.08, 0.1, -0.06]} scale={[1, 0.35, 1]}>
        <boxGeometry args={[3.4, 0.6, 2.8]} />
        <Std color="#4f7fc8" rough={0.95} />
      </M>
    </group>
    {[
      [-7.5, 0.1, 1.6, "#5fa05f", 0.7], [-3.4, 0.08, 2.2, "#fff", 0.35], [-2.0, 0.1, 1.9, "#3b3f4a", 0.6],
      [5.6, 0.1, 1.4, "#d64545", 0.6], [6.4, 0.08, 2.1, "#f2f2f2", 0.45], [8.3, 0.12, 1.0, "#c9dcf2", 0.7],
    ].map(([x, y, z, c, r], i) => (
      <M key={i} position={[x as number, y as number, z as number]} scale={[(r as number) * 1.4, 0.16, r as number]}>
        <sphereGeometry args={[1, 16, 12]} />
        <Std color={c as string} rough={0.95} />
      </M>
    ))}
    <group position={[2.6, 0, 1.6]}>
      <M position={[0, 0.12, 0]}>
        <boxGeometry args={[1.3, 0.22, 0.9]} />
        <Std color="#3a7bd5" />
      </M>
      <M position={[0.05, 0.34, 0]} rotation={[0, 0.2, 0]}>
        <boxGeometry args={[1.2, 0.22, 0.85]} />
        <Std color="#5fa05f" />
      </M>
    </group>
    <M position={[6.6, 0.8, 0.2]} rotation={[0, 0, rad(-70)]}>
      <cylinderGeometry args={[0.95, 0.75, 1.6, 24, 1, true]} />
      <Std color="#8ec5ea" side={THREE.DoubleSide} />
    </M>
  </group>
);

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

const CameraRig: React.FC<{ t: number }> = ({ t }) => {
  // gentle, slow drift so the 3D depth is felt; small enough to keep text aligned
  const { camera } = useThree();
  const x = Math.sin(t * 0.21) * 0.9;
  const y = 0.35 + Math.sin(t * 0.13) * 0.25;
  camera.position.set(x, y, CAM_Z);
  camera.lookAt(x * 0.85, y * 0.85, 0);
  camera.updateProjectionMatrix();
  return null;
};

export const Scene3D: React.FC<{
  scene: Scene;
  localT: number;
  t: number;
  bob: number;
  lift: number;
  walkX: number;
}> = ({ scene, localT, t, bob, lift, walkX }) => {
  const { fps } = useVideoConfig();
  const enter = scene.cont ? 1 : spring({ frame: localT * fps, fps, config: { damping: 14, mass: 0.7 } });
  const left = scene.cx - 230 + walkX;
  const top = 300 + bob - lift;
  const cxW = px(scene.cx);
  const shadowFloor = scene.backdrop !== "path";
  return (
    <ThreeCanvas
      width={W}
      height={H}
      style={{ position: "absolute", left: 0, top: 0 }}
      shadows
      flat
      camera={{ fov: FOV, near: 0.1, far: 200, position: [0, 0, CAM_Z] }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
    >
      <CameraRig t={t} />
      <ambientLight intensity={0.9} />
      <hemisphereLight args={["#fff7ea", "#e6dccb", 1.1]} />
      <directionalLight
        position={[-6, 12, 10]}
        intensity={2.1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={10}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[8, 4, -6]} intensity={0.9} color="#ffe2b8" />
      {shadowFloor ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR, 0]} receiveShadow>
          <planeGeometry args={[60, 30]} />
          <shadowMaterial opacity={0.18} />
        </mesh>
      ) : null}
      {scene.backdrop === "path" ? <PathWorld /> : null}
      {scene.backdrop === "bedroom" ? <Bedroom3D /> : null}
      {scene.prop === "cloud" ? <Cloud3D x={cxW} y={py(250)} localT={localT} /> : null}
      {scene.prop === "umbrella" ? <Cloud3D x={cxW} y={py(60)} localT={localT} /> : null}
      {scene.prop === "sun" ? <Sun3D x={cxW} y={py(130)} localT={localT} /> : null}
      {scene.prop === "heart" || scene.prop === "heartfill" ? (
        <Heart3D x={cxW} y={py(200)} localT={localT} fill={scene.prop === "heartfill"} />
      ) : null}
      {scene.prop === "rock" ? <Rock3D x={cxW + 1.9} /> : null}
      <Character3D scene={scene} localT={localT} bob={bob} lift={lift} enter={enter} walkX={walkX} />
      <GiantHand3D scene={scene} localT={localT} left={left} top={top} lift={lift} />
    </ThreeCanvas>
  );
};
