import {
  AbsoluteFill,
  Audio,
  interpolate,
  staticFile,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import timeline from "./pasAPas.timeline.json";

/* ------------------------------------------------------------------ */
/* Types & props                                                       */
/* ------------------------------------------------------------------ */

type WordStyle = "pop" | "slide" | "drop" | "type" | "stretch" | "vertical";
type Font = "sans" | "serif" | "mono";

export type Word = {
  text: string;
  /** seconds, relative to the scene start */
  at: number;
  x: number;
  y: number;
  size: number;
  color: string;
  font?: Font;
  style?: WordStyle;
  rotate?: number;
};

type Pose = "cheer" | "worried" | "heart" | "hold" | "shrug" | "walk" | "wave";
type Eyes = "open" | "happy" | "closed" | "worried" | "wink";
type Mouth = "smile" | "open" | "frown" | "o" | "grin";
type Prop = "none" | "cloud" | "sun" | "plan" | "question" | "rock" | "coffee" | "lantern";

export type Scene = {
  start: number;
  end: number;
  pose: Pose;
  eyes: Eyes;
  mouth: Mouth;
  prop: Prop;
  /** character centre x (px, 1920 wide frame) */
  cx: number;
  fall?: boolean;
  /** seconds into the scene: start of the stumble / getting back up */
  fallAt?: number;
  riseAt?: number;
  words: Word[];
};

export type PasAPasProps = {
  title: string;
  /** File in video/public, or "" for a silent render. */
  audioFile: string;
  durationSeconds: number;
  scenes: Scene[];
};

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */

const C = {
  ink: "#1d2433",
  navy: "#24366b",
  gold: "#d9a441",
  terracotta: "#c8553d",
  sage: "#6f9a7c",
  rose: "#e08aa0",
  sky: "#4f8fd6",
  plum: "#7a4f9a",
};

const FONTS: Record<Font, React.CSSProperties> = {
  sans: { fontFamily: "Inter, 'Inter Display', sans-serif", fontWeight: 900, letterSpacing: -2 },
  serif: { fontFamily: "'FreeSerif', 'Liberation Serif', serif", fontStyle: "italic", fontWeight: 400 },
  mono: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, letterSpacing: 2 },
};

/* ------------------------------------------------------------------ */
/* Default timeline (French, original lyrics)                          */
/* ------------------------------------------------------------------ */

export const pasAPasDefaults = timeline as PasAPasProps;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/* ------------------------------------------------------------------ */
/* Kinetic word                                                        */
/* ------------------------------------------------------------------ */

const KineticWord: React.FC<{ w: Word; t: number; sceneEnd: number }> = ({ w, t, sceneEnd }) => {
  const { fps } = useVideoConfig();
  const local = (t - w.at) * fps;
  if (local < 0) return null;
  const style = w.style ?? "pop";
  const s = spring({ frame: local, fps, config: { damping: 11, stiffness: 160, mass: 0.6 } });
  const smooth = spring({ frame: local, fps, config: { damping: 200 } });
  const out = interpolate(t, [sceneEnd - 0.25, sceneEnd], [1, 0], clamp);

  let transform = "";
  let opacity = 1;
  let filter = "none";
  let text = w.text;

  switch (style) {
    case "pop":
      transform = `scale(${s})`;
      break;
    case "slide": {
      transform = `translateX(${(1 - smooth) * -260}px)`;
      opacity = smooth;
      filter = `blur(${(1 - smooth) * 16}px)`;
      break;
    }
    case "drop":
      transform = `translateY(${(1 - s) * -380}px)`;
      break;
    case "type": {
      const n = Math.floor(interpolate(local, [0, w.text.length * 2], [0, w.text.length], clamp));
      text = w.text.slice(0, n);
      break;
    }
    case "stretch":
      transform = `scaleX(${interpolate(s, [0, 1], [2.4, 1])}) scaleY(${s})`;
      opacity = smooth;
      break;
    case "vertical":
      transform = `rotate(-90deg) translateX(${(1 - smooth) * -200}px)`;
      opacity = smooth;
      break;
  }

  return (
    <div
      style={{
        position: "absolute",
        left: w.x,
        top: w.y,
        transform: `translate(-50%, -50%) rotate(${w.rotate ?? 0}deg)`,
        whiteSpace: "nowrap",
        opacity: out,
      }}
    >
      <div
        style={{
          ...FONTS[w.font ?? "sans"],
          fontSize: w.size,
          lineHeight: 1,
          color: w.color,
          transform,
          opacity,
          filter,
          textShadow: "0 6px 0 rgba(29,36,51,0.08)",
        }}
      >
        {text}
        {style === "type" && text.length < w.text.length ? (
          <span style={{ opacity: 0.5 }}>|</span>
        ) : null}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Character                                                           */
/* ------------------------------------------------------------------ */

const SKIN = "#f6d2b5";
const HAIR = "#4a2e22";
const SWEATER = "#e3b04b";
const PANTS = "#2d3b63";

const POSES: Record<Pose, [number, number]> = {
  // [left arm, right arm] in degrees; 0 = hanging down
  cheer: [145, -145],
  worried: [-38, 38],
  heart: [12, 48],
  hold: [18, -70],
  shrug: [70, -70],
  walk: [0, -70],
  wave: [10, -150],
};

const Arm: React.FC<{ x: number; angle: number; children?: React.ReactNode }> = ({
  x,
  angle,
  children,
}) => (
  <g transform={`rotate(${angle} ${x} 330)`}>
    <line x1={x} y1={330} x2={x} y2={440} stroke={SWEATER} strokeWidth={34} strokeLinecap="round" />
    <circle cx={x} cy={448} r={19} fill={SKIN} />
    {children}
  </g>
);

const EyesSvg: React.FC<{ kind: Eyes; blink: boolean }> = ({ kind, blink }) => {
  const arcs = (dir: 1 | -1) => (
    <g stroke={C.ink} strokeWidth={7} fill="none" strokeLinecap="round">
      <path d={`M150 ${220} q 16 ${-18 * dir} 32 0`} />
      <path d={`M218 ${220} q 16 ${-18 * dir} 32 0`} />
    </g>
  );
  if (kind === "happy") return arcs(1);
  if (kind === "closed" || (blink && kind !== "wink")) return arcs(-1);
  const eye = (cx: number) => (
    <g>
      <ellipse cx={cx} cy={218} rx={15} ry={20} fill={C.ink} />
      <circle cx={cx + 5} cy={210} r={5} fill="#fff" />
    </g>
  );
  return (
    <g>
      {eye(166)}
      {kind === "wink" ? (
        <path d="M218 220 q 16 -18 32 0" stroke={C.ink} strokeWidth={7} fill="none" strokeLinecap="round" />
      ) : (
        eye(234)
      )}
      {kind === "worried" ? (
        <g stroke={HAIR} strokeWidth={7} strokeLinecap="round">
          <line x1={148} y1={186} x2={178} y2={178} />
          <line x1={252} y1={186} x2={222} y2={178} />
        </g>
      ) : null}
    </g>
  );
};

const MouthSvg: React.FC<{ kind: Mouth }> = ({ kind }) => {
  const st = { stroke: C.ink, strokeWidth: 6, strokeLinecap: "round" as const, fill: "none" };
  switch (kind) {
    case "smile":
      return <path d="M186 262 q 14 14 28 0" {...st} />;
    case "frown":
      return <path d="M186 272 q 14 -12 28 0" {...st} />;
    case "o":
      return <ellipse cx={200} cy={268} rx={9} ry={12} fill={C.ink} />;
    case "open":
      return <path d="M182 258 q 18 30 36 0 z" fill="#8c2f39" stroke={C.ink} strokeWidth={5} />;
    case "grin":
      return <path d="M178 256 q 22 34 44 0 z" fill="#fff" stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />;
  }
};

const HeldProp: React.FC<{ prop: Prop; frame: number }> = ({ prop, frame }) => {
  // Drawn in the right-arm group, hand at (250, 448) before rotation.
  if (prop === "plan")
    return (
      <g transform="translate(250 448)">
        <rect x={-10} y={-140} width={170} height={210} rx={10} fill="#fbf3dd" stroke="#c9a96a" strokeWidth={5} />
        <path d="M10 60 C 40 20, 60 40, 80 0 S 120 -60, 140 -90" stroke={C.terracotta} strokeWidth={5} strokeDasharray="10 9" fill="none" />
        <path d="M134 -100 l 8 -12 l 8 12 l -8 12 z" fill={C.gold} />
        <circle cx={14} cy={64} r={8} fill={C.sage} />
        <path d="M60 -40 q 10 -18 20 0 q 10 -18 20 0 q 0 14 -20 26 q -20 -12 -20 -26 z" fill={C.rose} />
      </g>
    );
  if (prop === "coffee") {
    const steam = (o: number) =>
      `M${o} -40 q ${8 + Math.sin(frame / 6 + o) * 6} -20 0 -40 q -8 -20 0 -40`;
    return (
      <g transform="translate(240 380)">
        <path d="M-6 -6 h 70 l -8 80 h -54 z" fill="#fff" stroke={C.ink} strokeWidth={5} />
        <path d="M64 10 q 26 6 0 34" stroke={C.ink} strokeWidth={5} fill="none" />
        <rect x={0} y={20} width={58} height={16} fill={C.terracotta} />
        <g stroke="#b9a89a" strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.8}>
          <path d={steam(16)} />
          <path d={steam(40)} />
        </g>
      </g>
    );
  }
  if (prop === "lantern") {
    const glow = 0.55 + Math.sin(frame / 8) * 0.12;
    return (
      <g transform="translate(262 452)">
        <circle cx={0} cy={70} r={110} fill={C.gold} opacity={glow * 0.35} />
        <line x1={0} y1={-6} x2={0} y2={20} stroke={C.ink} strokeWidth={5} />
        <path d="M-30 20 h 60 l 10 90 h -80 z" fill="#fff4cf" stroke={C.ink} strokeWidth={5} />
        <path d="M0 50 q 14 22 0 44 q -14 -22 0 -44" fill={C.gold} />
        <rect x={-40} y={108} width={80} height={14} rx={4} fill={C.ink} />
      </g>
    );
  }
  return null;
};

const Character: React.FC<{ scene: Scene; localT: number }> = ({ scene, localT }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: localT * fps, fps, config: { damping: 14, mass: 0.7 } });
  let [la, ra] = POSES[scene.pose];
  const bob = Math.sin(frame / 7) * 6;
  let legL = 0;
  let legR = 0;
  if (scene.pose === "walk") {
    const sw = Math.sin(frame / 5);
    la = sw * 22;
    legL = sw * 22;
    legR = -sw * 22;
  }
  if (scene.pose === "cheer") {
    la += Math.sin(frame / 4) * 8;
    ra -= Math.sin(frame / 4) * 8;
  }
  // stumble over the rock, then get back up
  let tilt = 0;
  if (scene.fall) {
    const f0 = scene.fallAt ?? 0.5;
    const r0 = scene.riseAt ?? 1.9;
    tilt =
      interpolate(localT, [f0, f0 + 0.6], [0, 78], { ...clamp, easing: (x) => x * x }) -
      interpolate(localT, [r0, r0 + 0.5], [0, 78], clamp);
  }
  const blink = Math.floor(frame / 3) % 40 === 0;
  const walkX = scene.pose === "walk" ? (localT - 2.5) * 40 : 0;

  return (
    <div
      style={{
        position: "absolute",
        left: scene.cx - 230 + walkX,
        top: 300,
        width: 460,
        height: 690,
        transform: `translateY(${(1 - enter) * 80 + bob}px) scale(${0.9 + enter * 0.1})`,
        transformOrigin: "50% 100%",
      }}
    >
      <svg viewBox="0 0 400 600" width={460} height={690} style={{ overflow: "visible" }}>
        {/* shadow */}
        <ellipse cx={200} cy={588} rx={110 - Math.abs(bob) * 2} ry={14} fill="#1d2433" opacity={0.1} />
        <g transform={`rotate(${tilt} 200 585)`}>
          {/* legs */}
          <g transform={`rotate(${legL} 175 470)`}>
            <rect x={156} y={460} width={38} height={110} rx={16} fill={PANTS} />
            <ellipse cx={170} cy={576} rx={30} ry={13} fill={C.ink} />
          </g>
          <g transform={`rotate(${legR} 225 470)`}>
            <rect x={206} y={460} width={38} height={110} rx={16} fill={PANTS} />
            <ellipse cx={232} cy={576} rx={30} ry={13} fill={C.ink} />
          </g>
          {/* body */}
          <path d="M140 330 q 60 -26 120 0 l 14 150 q -74 22 -148 0 z" fill={SWEATER} />
          <path d="M176 318 q 24 16 48 0" stroke="#c99436" strokeWidth={8} fill="none" strokeLinecap="round" />
          <Arm x={150} angle={la} />
          {/* head */}
          <circle cx={200} cy={210} r={112} fill={SKIN} />
          {/* hair: curly cap */}
          <g fill={HAIR}>
            {[
              [110, 160, 42], [140, 118, 44], [184, 100, 46], [230, 104, 44], [270, 130, 42],
              [292, 170, 34], [100, 200, 28], [300, 206, 24], [160, 140, 30], [214, 136, 30],
            ].map(([x, y, r], i) => (
              <circle key={i} cx={x} cy={y} r={r} />
            ))}
          </g>
          <circle cx={150} cy={252} r={16} fill={C.rose} opacity={0.45} />
          <circle cx={250} cy={252} r={16} fill={C.rose} opacity={0.45} />
          <EyesSvg kind={scene.eyes} blink={blink} />
          <MouthSvg kind={scene.mouth} />
          <Arm x={250} angle={ra}>
            <g transform={`rotate(${-ra} 250 448)`}>
              <HeldProp prop={scene.prop} frame={frame} />
            </g>
          </Arm>
        </g>
      </svg>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Scene props that live in the world (not held)                       */
/* ------------------------------------------------------------------ */

const WorldProp: React.FC<{ scene: Scene; localT: number }> = ({ scene, localT }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inS = spring({ frame: (localT - 0.2) * fps, fps, config: { damping: 12 } });
  const x = scene.cx;

  if (scene.prop === "cloud") {
    return (
      <div style={{ position: "absolute", left: x - 170, top: 110, transform: `scale(${inS})` }}>
        <svg width={340} height={300} viewBox="0 0 340 300">
          <g fill="#9aa7bd">
            <circle cx={90} cy={110} r={60} />
            <circle cx={170} cy={80} r={75} />
            <circle cx={250} cy={115} r={58} />
            <rect x={60} y={110} width={220} height={60} rx={30} />
          </g>
          {[80, 140, 200, 260].map((dx, i) => {
            const y = 190 + ((frame * 6 + i * 37) % 90);
            return <line key={i} x1={dx} y1={y} x2={dx - 6} y2={y + 20} stroke={C.sky} strokeWidth={7} strokeLinecap="round" />;
          })}
        </svg>
      </div>
    );
  }
  if (scene.prop === "sun") {
    const r = frame / 2;
    return (
      <div style={{ position: "absolute", left: x - 720, top: 330, transform: `scale(${inS})`, opacity: 0.9 }}>
        <svg width={440} height={440} viewBox="-220 -220 440 440">
          <g transform={`rotate(${r})`}>
            {Array.from({ length: 12 }, (_, i) => (
              <rect key={i} x={-6} y={-200} width={12} height={60} rx={6} fill={C.gold} opacity={0.6} transform={`rotate(${i * 30})`} />
            ))}
          </g>
          <circle r={120} fill={C.gold} opacity={0.18} />
        </svg>
      </div>
    );
  }
  if (scene.prop === "question") {
    return (
      <>
        {[
          [-260, 160, -12, 0.2],
          [230, 120, 14, 0.6],
          [300, 300, 6, 1.0],
        ].map(([dx, y, rot, d], i) => {
          const s = spring({ frame: (localT - d) * fps, fps, config: { damping: 9 } });
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x + dx,
                top: y + Math.sin(frame / 9 + i) * 10,
                transform: `scale(${s}) rotate(${rot}deg)`,
                ...FONTS.serif,
                fontSize: 130,
                color: [C.plum, C.sky, C.rose][i],
              }}
            >
              ?
            </div>
          );
        })}
      </>
    );
  }
  if (scene.prop === "rock") {
    return (
      <div style={{ position: "absolute", left: x + 130, top: 820, transform: `scale(${inS})` }}>
        <svg width={260} height={150} viewBox="0 0 260 150">
          <path d="M20 140 q -10 -70 50 -100 q 60 -40 120 0 q 60 30 50 100 z" fill="#a8a29a" stroke="#6f6a63" strokeWidth={5} />
          <text x={130} y={110} textAnchor="middle" fontFamily="JetBrains Mono" fontWeight={800} fontSize={24} fill="#4b4741">
            DOUTES
          </text>
        </svg>
      </div>
    );
  }
  return null;
};

/* ------------------------------------------------------------------ */
/* Sparkle burst around big words                                     */
const Burst: React.FC<{ x: number; y: number; t: number }> = ({ x, y, t }) => {
  if (t < 0 || t > 1.2) return null;
  const colors = [C.gold, C.terracotta, C.sky, C.rose, C.sage];
  return (
    <>
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + i;
        const dist = 120 + (i % 3) * 70;
        const p = 1 - Math.pow(1 - Math.min(1, t / 0.7), 3);
        const op = interpolate(t, [0, 0.1, 0.8, 1.2], [0, 1, 1, 0], clamp);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + Math.cos(a) * dist * 1.8 * p,
              top: y + Math.sin(a) * dist * p,
              fontSize: 28 + (i % 4) * 10,
              color: colors[i % colors.length],
              opacity: op,
              transform: `translate(-50%, -50%) rotate(${t * 300 + i * 40}deg)`,
            }}
          >
            {i % 2 ? "✦" : "●"}
          </div>
        );
      })}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Composition                                                         */
/* ------------------------------------------------------------------ */

export const PasAPas: React.FC<PasAPasProps> = ({ title, audioFile, durationSeconds, scenes }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const scene = scenes.find((s) => t >= s.start && t < s.end) ?? scenes[scenes.length - 1];
  const localT = t - scene.start;
  const fadeOut = interpolate(t, [durationSeconds - 0.8, durationSeconds], [1, 0], clamp);
  const endCard = interpolate(t, [durationSeconds - 2, durationSeconds - 1.4], [0, 1], clamp);

  // Quick white flash + slight zoom on each scene change
  const cut = interpolate(localT, [0, 0.18], [1, 0], clamp);
  const zoom = interpolate(localT, [0, 0.35], [1.04, 1], clamp);

  // camera shake when the character hits the ground
  let shake = 0;
  if (scene.fall) {
    const hit = (scene.fallAt ?? 0.5) + 0.6;
    const k = Math.max(0, 1 - (localT - hit) / 0.45);
    shake = localT >= hit ? Math.sin(localT * 90) * 14 * k : 0;
  }
  const lastEnd = scenes[scenes.length - 1].end;
  const outro = spring({ frame: (t - lastEnd + 0.4) * fps, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(ellipse at 50% 45%, #ffffff 0%, #f7f3ec 60%, #ece5d8 100%)",
        opacity: fadeOut,
        overflow: "hidden",
      }}
    >
      {audioFile ? <Audio src={staticFile(audioFile)} /> : null}
      <AbsoluteFill style={{ transform: `translate(${shake}px, ${shake * 0.6}px) scale(${zoom})` }}>
      {/* floor line */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 985, height: 2, background: "rgba(29,36,51,0.06)" }} />
      <WorldProp scene={scene} localT={localT} />
      <Character key={scene.start} scene={scene} localT={localT} />
      {scene.words.map((w, i) => (
        <KineticWord key={`${scene.start}-${i}`} w={w} t={localT} sceneEnd={scene.end - scene.start} />
      ))}
      {scene.words
        .filter((w) => w.style === "stretch")
        .map((w, i) => (
          <Burst key={`b${scene.start}-${i}`} x={w.x} y={w.y} t={localT - w.at} />
        ))}
      </AbsoluteFill>
      {t > lastEnd - 0.4 ? (
        <div
          style={{
            position: "absolute",
            top: 150,
            width: "100%",
            textAlign: "center",
            ...FONTS.serif,
            fontSize: 170,
            color: C.navy,
            transform: `scale(${outro})`,
          }}
        >
          {title} <span style={{ color: C.gold }}>✦</span>
        </div>
      ) : null}
      {t > lastEnd - 0.4 ? <Burst x={960} y={240} t={t - lastEnd + 0.2} /> : null}
      {/* signature */}
      <div
        style={{
          position: "absolute",
          right: 60,
          bottom: 40,
          ...FONTS.serif,
          fontSize: 40,
          color: C.navy,
          opacity: 0.5 + endCard * 0.5,
        }}
      >
        {title} ✦
      </div>
      <AbsoluteFill style={{ background: "#fff", opacity: cut * 0.6, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
