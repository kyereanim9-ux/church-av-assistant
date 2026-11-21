import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

/* Illustrated pieces for PasAPas: the giant (divine) hand, backdrops,
   chapter titles and the big heart. Everything is drawn in page space
   (1920×1080) so it can line up with the character. */

export type Backdrop = "none" | "bedroom" | "path" | "staff";
export type HandKind = "none" | "map" | "staff" | "lift" | "hold" | "bless" | "carry";

const INK = "#1d2433";
const SKIN = "#f3c7a2";
const GOLD = "#d9a441";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Page position of the character's right hand for a given right-arm angle (deg). */
export const rightHandPos = (left: number, top: number, angle: number, bodyShift = 0) => {
  const a = (angle * Math.PI) / 180;
  const sx = 250 - 118 * Math.sin(a);
  const sy = 330 + 118 * Math.cos(a) + bodyShift;
  return { x: left + sx * 1.15, y: top + sy * 1.15 };
};

/* ------------------------------------------------------------------ */
/* Giant hand                                                          */
/* ------------------------------------------------------------------ */

/** Open hand, fingers pointing to -x, arm running off to +x. Origin = palm centre. */
const HandShape: React.FC<{ glow: number }> = ({ glow }) => (
  <g strokeLinejoin="round" strokeLinecap="round">
    <ellipse cx={-40} cy={0} rx={230} ry={170} fill={GOLD} opacity={0.12 * glow} />
    <path d="M90 -50 L 1700 -78 L 1700 78 L 90 50 Z" fill={SKIN} stroke={INK} strokeWidth={6} />
    {[
      [-34, 92],
      [-11, 108],
      [12, 102],
      [34, 84],
    ].map(([y, len], i) => (
      <rect key={i} x={-20 - len} y={y - 12} width={len + 40} height={24} rx={12} fill={SKIN} stroke={INK} strokeWidth={5} />
    ))}
    <path d="M110 -52 Q 10 -62 -22 -40 L -22 44 Q 10 62 110 52 Z" fill={SKIN} stroke={INK} strokeWidth={6} />
    <rect x={-34} y={-78} width={92} height={26} rx={13} fill={SKIN} stroke={INK} strokeWidth={5} transform="rotate(-28 50 -50)" />
    <path d="M30 -20 q 20 10 40 0" stroke="#d9a07c" strokeWidth={4} fill="none" />
  </g>
);

const MapSheet: React.FC = () => (
  <g>
    <rect x={0} y={0} width={440} height={330} rx={8} fill="#fbf3dd" stroke={INK} strokeWidth={5} />
    <rect x={14} y={14} width={412} height={302} rx={6} fill="#cfe6b8" />
    <path d="M300 316 q 60 -60 126 -80 v 80 z" fill="#9fd0f0" />
    <path d="M150 140 l 60 -80 l 60 80 z" fill="#b9b0a4" stroke={INK} strokeWidth={3} />
    <path d="M190 87 l 20 -27 l 20 27 z" fill="#fff" />
    <path d="M240 140 l 50 -66 l 50 66 z" fill="#a69c90" stroke={INK} strokeWidth={3} />
    <circle cx={380} cy={60} r={26} fill="#ffd45e" stroke={INK} strokeWidth={3} />
    <path d="M60 290 C 120 240, 60 200, 140 180 S 260 200, 250 150 S 330 120, 380 90" stroke="#f3e2b5" strokeWidth={16} fill="none" strokeLinecap="round" />
    <path d="M60 290 C 120 240, 60 200, 140 180 S 260 200, 250 150 S 330 120, 380 90" stroke="#c8553d" strokeWidth={4} strokeDasharray="10 10" fill="none" />
    <g transform="translate(40 200)">
      <rect x={0} y={20} width={60} height={44} fill="#fff" stroke={INK} strokeWidth={3} />
      <path d="M-8 24 L 30 -6 L 68 24 Z" fill="#c8553d" stroke={INK} strokeWidth={3} />
    </g>
    <path d="M190 230 q 12 -20 24 0 q 12 -20 24 0 q 0 16 -24 30 q -24 -14 -24 -30 z" fill="#e0475e" />
    {[70, 110, 330, 360, 120].map((x, i) => (
      <g key={i} transform={`translate(${x} ${[110, 80, 200, 230, 250][i]})`}>
        <rect x={-3} y={0} width={6} height={18} fill="#7a5a3a" />
        <circle cx={0} cy={-6} r={14} fill="#4f9a5a" />
      </g>
    ))}
  </g>
);

const Staff: React.FC<{ x0: number; y0: number; x1: number; y1: number }> = ({ x0, y0, x1, y1 }) => (
  <g>
    <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="#8a5a2b" strokeWidth={22} strokeLinecap="round" />
    <line x1={x0} y1={y0} x2={x1} y2={y1} stroke="#b77d3e" strokeWidth={10} strokeLinecap="round" />
    <circle cx={x1 + 4} cy={y1 - 22} r={30} fill="#c08a45" stroke="#6e4520" strokeWidth={6} />
    <path d={`M${x1 - 6} ${y1 - 30} q 14 -8 16 8`} stroke="#6e4520" strokeWidth={4} fill="none" />
    {[18, 34].map((d) => (
      <line key={d} x1={x1 - 14} y1={y1 + d} x2={x1 + 16} y2={y1 + d + 2} stroke="#6e4520" strokeWidth={6} />
    ))}
  </g>
);

export type HandInfo = {
  kind: HandKind;
  /** seconds into the scene when the hand arrives (negative = already there) */
  at: number;
  /** character page box */
  left: number;
  top: number;
  cx: number;
  lift: number;
};

export const GiantHand: React.FC<{ info: HandInfo; localT: number }> = ({ info, localT }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { kind, at, cx } = info;
  if (kind === "none") return null;
  const s = at < 0 ? 1 : spring({ frame: (localT - at) * fps, fps, config: { damping: 16, mass: 0.9 } });
  const glow = 0.7 + Math.sin(frame / 10) * 0.3;

  let ax = 0;
  let ay = 0;
  let rot = 0;
  let extra: React.ReactNode = null;
  let under: React.ReactNode = null;

  if (kind === "map") {
    ax = 1360;
    ay = 455;
    rot = -22;
    under = (
      <g transform={`translate(${ax - 470} ${ay - 30}) rotate(-4)`}>
        <MapSheet />
      </g>
    );
  } else if (kind === "staff") {
    ax = 1110;
    ay = 520;
    rot = -32;
    under = <Staff x0={1015} y0={985} x1={1085} y1={430} />;
    extra = (
      <text x={1050} y={760} transform="rotate(-83 1050 760)" fontFamily="Inter" fontWeight={900} fontSize={34} fill="#fff7e0" letterSpacing={2}>
        COURAGE
      </text>
    );
  } else if (kind === "lift") {
    ax = cx + 150;
    ay = 860;
    rot = 12;
  } else if (kind === "carry") {
    ax = cx + 110;
    ay = 1015 - info.lift;
    rot = 4;
  } else if (kind === "hold") {
    const h = rightHandPos(info.left, info.top, -150);
    const r = (-62 * Math.PI) / 180;
    ax = h.x + Math.cos(r) * 150;
    ay = h.y + Math.sin(r) * 150;
    rot = -62;
  } else if (kind === "bless") {
    ax = cx + 70;
    ay = 300;
    rot = -62;
    extra = <circle cx={cx} cy={430} r={190} fill={GOLD} opacity={0.18 * glow * s} />;
  }

  // slide in along the arm direction
  const r = (rot * Math.PI) / 180;
  const dist = (1 - s) * 900;
  const ox = Math.cos(r) * dist;
  const oy = Math.sin(r) * dist;

  return (
    <svg
      viewBox="0 0 1920 1080"
      width={1920}
      height={1080}
      style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}
    >
      {kind === "bless" ? extra : null}
      <g transform={`translate(${ox} ${oy})`} opacity={interpolate(s, [0, 0.2], [0, 1], clamp)}>
        {under}
        {kind === "staff" ? extra : null}
        <g transform={`translate(${ax} ${ay}) rotate(${rot})`}>
          <HandShape glow={glow} />
        </g>
      </g>
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* Backdrops                                                           */
/* ------------------------------------------------------------------ */

const Bedroom: React.FC = () => (
  <g strokeLinejoin="round">
    {/* bed */}
    <rect x={110} y={640} width={34} height={300} rx={6} fill="#a8753f" stroke={INK} strokeWidth={5} />
    <rect x={110} y={760} width={640} height={120} rx={10} fill="#c48b4c" stroke={INK} strokeWidth={5} />
    <rect x={144} y={730} width={590} height={60} rx={14} fill="#fffaf0" stroke={INK} strokeWidth={5} />
    <path d="M150 700 q 40 -30 120 -10 q 30 14 0 40 q -80 12 -120 -30 z" fill="#ffd166" stroke={INK} strokeWidth={5} />
    <path d="M300 720 q 120 -60 230 -10 q 90 40 210 0 l 20 140 q -120 60 -260 30 q -120 -20 -210 10 z" fill="#4f7fc8" stroke={INK} strokeWidth={5} />
    <path d="M380 760 q 60 20 120 0 M560 780 q 40 20 90 0" stroke="#3a64a3" strokeWidth={5} fill="none" />
    <rect x={720} y={860} width={26} height={110} fill="#a8753f" stroke={INK} strokeWidth={5} />
    {/* floor mess */}
    <path d="M70 960 q 40 -40 90 -10 q 30 -10 50 10 q -20 30 -70 26 q -50 4 -70 -26 z" fill="#5fa05f" stroke={INK} strokeWidth={4} />
    <path d="M300 965 l 50 -8 q 18 0 14 18 l -46 10 z" fill="#fff" stroke={INK} strokeWidth={4} />
    <path d="M318 960 l 12 -2 l 4 20 l -12 2 z" fill="#4f7fc8" />
    <path d="M520 975 q 40 -30 110 -12 q 30 20 -10 30 q -60 10 -100 -18 z" fill="#3b3f4a" stroke={INK} strokeWidth={4} />
    <g transform="translate(1150 930)">
      <rect x={0} y={0} width={130} height={24} rx={4} fill="#3a7bd5" stroke={INK} strokeWidth={4} />
      <rect x={10} y={-22} width={120} height={24} rx={4} fill="#5fa05f" stroke={INK} strokeWidth={4} />
    </g>
    <g transform="translate(1520 850) rotate(-18)">
      <path d="M0 0 h 180 l -20 130 h -140 z" fill="#8ec5ea" stroke={INK} strokeWidth={5} />
      {[30, 70, 110, 150].map((x) => (
        <rect key={x} x={x - 8} y={30} width={16} height={60} rx={6} fill="#fff" opacity={0.7} />
      ))}
    </g>
    <path d="M1420 930 q 60 -50 130 -40 q 40 20 10 50 q -80 30 -140 -10 z" fill="#d64545" stroke={INK} strokeWidth={4} />
    <path d="M1480 950 q 50 -20 90 6 q -20 24 -70 18 z" fill="#f2f2f2" stroke={INK} strokeWidth={4} />
    <path d="M1690 950 q 70 -40 150 -10 q 20 30 -20 40 q -90 20 -130 -30 z" fill="#c9dcf2" stroke={INK} strokeWidth={4} />
  </g>
);

const PathScene: React.FC<{ drift: number }> = ({ drift }) => (
  <g>
    <path d="M0 640 C 300 560, 600 600, 960 590 S 1600 560, 1920 620 L 1920 1080 L 0 1080 Z" fill="#e4eed7" />
    <path d="M0 760 C 400 700, 700 740, 1000 720 S 1600 700, 1920 760 L 1920 1080 L 0 1080 Z" fill="#d5e6c3" />
    <path d="M820 1080 C 860 900, 1080 860, 1000 760 S 1120 640, 1060 600 L 1090 600 C 1170 650, 1060 760, 1100 800 S 960 920, 1040 1080 Z" fill="#f4e6c6" />
    {[0, 1, 2, 3, 4, 5].map((i) => {
      const y = 1040 - ((i * 70 + drift * 60) % 420);
      const k = (1040 - y) / 420;
      return <ellipse key={i} cx={940 + k * 90 + (i % 2 ? 14 : -14)} cy={y} rx={10 - k * 5} ry={6 - k * 3} fill="#d9c49a" />;
    })}
    {[
      [140, 640, 1], [320, 600, 0.8], [1640, 610, 0.9], [1800, 660, 1.1], [520, 720, 0.7], [1430, 700, 0.75],
    ].map(([x, y, sc], i) => (
      <g key={i} transform={`translate(${x} ${y}) scale(${sc})`}>
        <rect x={-6} y={0} width={12} height={46} rx={4} fill="#8a6a48" />
        <circle cx={0} cy={-18} r={34} fill="#86b97a" />
        <circle cx={-18} cy={0} r={22} fill="#79ae6e" />
      </g>
    ))}
  </g>
);

const MusicStaff: React.FC<{ t: number }> = ({ t }) => (
  <g>
    {[0, 1, 2, 3, 4].map((i) => (
      <path
        key={i}
        d={`M0 ${760 + i * 26} C 480 ${720 + i * 26}, 1440 ${800 + i * 26}, 1920 ${760 + i * 26}`}
        stroke="#c9b48a"
        strokeWidth={3}
        fill="none"
        opacity={0.7}
      />
    ))}
    {Array.from({ length: 9 }, (_, i) => {
      const x = 1920 - ((t * 220 + i * 240) % 2160);
      const y = 770 + ((i * 37) % 5) * 22 - 40 * Math.sin((x / 1920) * Math.PI);
      return (
        <text key={i} x={x} y={y} fontSize={64} fill={["#24366b", "#c8553d", "#d9a441", "#7a4f9a"][i % 4]}>
          {i % 3 ? "♪" : "♫"}
        </text>
      );
    })}
  </g>
);

export const BackdropLayer: React.FC<{ kind?: Backdrop; localT: number; t: number; cont?: boolean }> = ({
  kind,
  localT,
  t,
  cont,
}) => {
  const { fps } = useVideoConfig();
  if (!kind || kind === "none") return null;
  const s = cont ? 1 : spring({ frame: localT * fps, fps, config: { damping: 200 } });
  return (
    <svg
      viewBox="0 0 1920 1080"
      width={1920}
      height={1080}
      style={{ position: "absolute", left: 0, top: 0, opacity: s, transform: `translateY(${(1 - s) * 40}px)` }}
    >
      {kind === "bedroom" ? <Bedroom /> : null}
      {kind === "path" ? <PathScene drift={t} /> : null}
      {kind === "staff" ? <MusicStaff t={t} /> : null}
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* Chapter title                                                       */
/* ------------------------------------------------------------------ */

export const ChapterPill: React.FC<{ text?: string; localT: number }> = ({ text, localT }) => {
  const { fps } = useVideoConfig();
  if (!text || localT > 4.2) return null;
  const [part, sub] = text.split("·").map((x) => x.trim());
  const s = spring({ frame: localT * fps, fps, config: { damping: 18 } });
  const out = interpolate(localT, [3.6, 4.2], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 56,
        bottom: 46,
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "14px 30px 14px 22px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.88)",
        boxShadow: "0 10px 30px rgba(29,36,51,0.12)",
        opacity: s * out,
        transform: `translateX(${(1 - s) * -120}px)`,
      }}
    >
      <div style={{ width: 16, height: 16, borderRadius: 8, background: GOLD }} />
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 26, letterSpacing: 4, color: "#24366b" }}>
        {part.toUpperCase()}
      </div>
      {sub ? (
        <div style={{ fontFamily: "'FreeSerif', serif", fontStyle: "italic", fontSize: 38, color: INK }}>{sub}</div>
      ) : null}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Big heart that fills with gold                                      */
/* ------------------------------------------------------------------ */

export const BigHeart: React.FC<{ x: number; y: number; localT: number; fill: boolean; id: string }> = ({
  x,
  y,
  localT,
  fill,
  id,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: (localT - 0.2) * fps, fps, config: { damping: 10 } });
  const beat = 1 + Math.max(0, Math.sin(frame / 4.5)) * 0.06;
  const level = fill ? interpolate(localT, [0.4, 2.2], [0.05, 1], clamp) : 1;
  const d = "M0 70 C -40 40 -120 0 -120 -60 C -120 -110 -60 -130 0 -80 C 60 -130 120 -110 120 -60 C 120 0 40 40 0 70 Z";
  return (
    <svg
      width={320}
      height={300}
      viewBox="-160 -150 320 300"
      style={{ position: "absolute", left: x - 160, top: y - 150, transform: `scale(${s * beat})`, overflow: "visible" }}
    >
      <defs>
        <clipPath id={`hc-${id}`}>
          <path d={d} />
        </clipPath>
      </defs>
      <circle r={150} fill={GOLD} opacity={0.15} />
      <path d={d} fill="#fff" stroke={INK} strokeWidth={7} />
      <rect x={-130} y={70 - 210 * level} width={260} height={220} fill="#e0475e" clipPath={`url(#hc-${id})`} />
      <path d={d} fill="none" stroke={INK} strokeWidth={7} />
      <path d="M-70 -70 q 10 -24 36 -24" stroke="#fff" strokeWidth={10} strokeLinecap="round" fill="none" opacity={0.7} />
    </svg>
  );
};
