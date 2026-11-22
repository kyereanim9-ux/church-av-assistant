import { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import timeline from "./aimeMoi.timeline.json";
import colorTimeline from "./aimeMoiCouleur.timeline.json";

/* "AIME-MOI": deep quotes shown as comments over a moody black & white
   night scene, each read aloud, separated by glitchy "MOI" interludes. */

type Ev = {
  type: string;
  start: number;
  end: number;
  user?: string;
  ago?: string;
  text?: string;
  words?: { w: string; t: number }[];
  /** seconds into a hit/end where the glitch fires (sung "love" / "me") */
  beats?: number[];
};

export type AimeMoiProps = {
  audioFile: string;
  durationSeconds: number;
  events: Ev[];
  /** Optional photo in public/ to use instead of the drawn night scene. */
  backgroundImage?: string;
  /** Colour grade instead of black & white. */
  color?: boolean;
};

export const aimeMoiDefaults = timeline as AimeMoiProps;
export const aimeMoiCouleurDefaults = colorTimeline as AimeMoiProps;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const RED = "#e0182d";

/* ------------------------------------------------------------------ */
/* Night scene (drawn), black & white                                  */
/* ------------------------------------------------------------------ */

const NightScene: React.FC<{ t: number; color?: boolean }> = ({ t, color }) => {
  const frame = useCurrentFrame();
  const P = color
    ? {
        sky: ["#050a18", "#0c1834", "#2c3b5e", "#0a0d16"],
        lamp: ["#ffe2a8", "#ffb35c", "#c2682a"],
        field: ["#3b3424", "#272117", "#0c0a07"],
        grass: "#a9925c",
        track: "#4e4130",
        lights: ["#ffcf7a", "#9fd0ff"],
        stripeA: "#141a2e",
        stripeB: "#efe4cc",
        rim: "#ffb466",
        skin: "#5b3a28",
        ear: "#7a4e36",
        horizon: "#1b2236",
      }
    : {
        sky: ["#0a0a0b", "#151517", "#2b2b2d", "#0d0d0e"],
        lamp: ["#fff", "#ddd", "#888"],
        field: ["#4a4844", "#36342f", "#151413"],
        grass: "#b5b0a6",
        track: "#5e5b55",
        lights: ["#fff", "#fff"],
        stripeA: "#0f0f0f",
        stripeB: "#8f8f8f",
        rim: "#fff",
        skin: "#202020",
        ear: "#262626",
        horizon: "#1d1d1e",
      };
  const grass = useMemo(
    () =>
      Array.from({ length: 900 }, (_, i) => {
        const y = 1110 + Math.pow(random(`gy${i}`), 1.6) * 810;
        const depth = (y - 1100) / 820;
        return {
          x: random(`gx${i}`) * 1080,
          y,
          h: 6 + depth * 34 * (0.5 + random(`gh${i}`)),
          a: -0.5 + random(`ga${i}`),
          o: 0.15 + random(`go${i}`) * 0.35,
          w: 1 + depth * 2.5,
        };
      }),
    [],
  );
  const flicker =
    0.85 + 0.1 * Math.sin(frame / 3.1) * Math.sin(frame / 7.3) - (random(`f${Math.floor(frame / 2)}`) > 0.96 ? 0.35 : 0);
  const breathe = 1 + Math.sin(t * 1.6) * 0.006;
  const sway = Math.sin(t * 0.7) * 3;
  return (
    <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={P.sky[0]} />
          <stop offset="0.45" stopColor={P.sky[1]} />
          <stop offset="0.58" stopColor={P.sky[2]} />
          <stop offset="1" stopColor={P.sky[3]} />
        </linearGradient>
        <linearGradient id="field" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={P.field[0]} />
          <stop offset="0.5" stopColor={P.field[1]} />
          <stop offset="1" stopColor={P.field[2]} />
        </linearGradient>
        <radialGradient id="lamp" cx="0.92" cy="0.03" r="0.75">
          <stop offset="0" stopColor={P.lamp[0]} stopOpacity={0.95 * flicker} />
          <stop offset="0.12" stopColor={P.lamp[1]} stopOpacity={0.45 * flicker} />
          <stop offset="0.45" stopColor={P.lamp[2]} stopOpacity={0.14 * flicker} />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <pattern id="stripes" width="40" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(-4)">
          <rect width="40" height="26" fill={P.stripeA} />
          <rect y="0" width="40" height="11" fill={P.stripeB} />
        </pattern>
        <linearGradient id="rim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.7" />
          <stop offset="0.6" stopColor="#000" stopOpacity="0.35" />
          <stop offset="1" stopColor={P.rim} stopOpacity="0.22" />
        </linearGradient>
        <filter id="soft">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <rect width="1080" height="1920" fill="url(#sky)" />
      {/* horizon & distant lights */}
      <path d="M0 1105 Q 300 1085 540 1100 T 1080 1095 L1080 1130 L0 1130 Z" fill={P.horizon} />
      {[90, 210, 330, 600, 780, 930].map((x, i) => (
        <circle key={x} cx={x} cy={1098 + (i % 2) * 6} r={3 + (i % 3)} fill={P.lights[i % 2]} opacity={0.5 + 0.3 * Math.sin(frame / 9 + i)} filter="url(#soft)" />
      ))}
      <rect y="1110" width="1080" height="810" fill="url(#field)" />
      {/* tracks in the field */}
      <path d="M-40 1600 C 300 1460, 700 1520, 1120 1380" stroke={P.track} strokeWidth={50} fill="none" opacity={0.35} />
      <path d="M-40 1820 C 360 1660, 760 1760, 1120 1600" stroke={P.track} strokeWidth={70} fill="none" opacity={0.3} />
      {grass.map((g, i) => (
        <line
          key={i}
          x1={g.x}
          y1={g.y}
          x2={g.x + Math.sin(g.a + Math.sin(t * 0.8 + g.x / 200) * 0.15) * g.h}
          y2={g.y - Math.cos(g.a) * g.h}
          stroke={P.grass}
          strokeOpacity={g.o}
          strokeWidth={g.w}
        />
      ))}
      <rect width="1080" height="1920" fill="url(#lamp)" />
      {color ? <rect width="1080" height="1920" fill="#2d5bd6" opacity={0.08} /> : null}
      {/* figure from behind, backlit by the street lamp, looking to the left */}
      <g transform={`translate(${540 + sway} 0) scale(${breathe} 1)`}>
        <path
          d="M-470 1920 C -470 1650 -430 1530 -270 1470 C -170 1432 -100 1405 -78 1335 L 78 1335 C 100 1405 170 1432 270 1470 C 430 1530 470 1650 470 1920 Z"
          fill="url(#stripes)"
        />
        <path
          d="M-470 1920 C -470 1650 -430 1530 -270 1470 C -170 1432 -100 1405 -78 1335 L 78 1335 C 100 1405 170 1432 270 1470 C 430 1530 470 1650 470 1920 Z"
          fill="url(#rim)"
        />
        <path d="M78 1335 C 100 1405 170 1432 270 1470 C 430 1530 470 1650 470 1920" stroke={P.rim} strokeOpacity={0.35} strokeWidth={6} fill="none" />
        <path d="M-74 1340 C -76 1270 -66 1230 -58 1195 L 58 1195 C 66 1230 76 1270 74 1340 Q 0 1362 -74 1340 Z" fill={P.skin} />
        <path d="M58 1200 C 66 1240 74 1280 74 1338" stroke={P.rim} strokeOpacity={0.4} strokeWidth={5} fill="none" />
        <ellipse cx={0} cy={1085} rx={128} ry={152} fill="#1b1b1b" />
        <ellipse cx={-126} cy={1110} rx={21} ry={40} fill={P.ear} />
        <path d="M-118 1150 Q -128 1200 -96 1232 Q -88 1190 -100 1150 Z" fill={P.ear} />
        {[
          [-110, 1000, 52], [-70, 955, 58], [-15, 935, 62], [45, 945, 58], [100, 985, 52], [125, 1045, 40],
          [-125, 1050, 38], [-40, 990, 60], [40, 995, 60], [0, 1060, 70], [80, 1110, 52], [-80, 1100, 50],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#0d0d0d" />
        ))}
        {[
          "M-150 990 q -26 -2 -34 22",
          "M-95 925 q -18 -34 8 -50",
          "M-10 895 q 6 -40 36 -40",
          "M75 915 q 26 -22 46 0",
          "M140 990 q 30 2 30 32",
        ].map((d) => (
          <path key={d} d={d} stroke="#0d0d0d" strokeWidth={24} strokeLinecap="round" fill="none" />
        ))}
        <path d="M60 920 C 120 950 158 1010 152 1080 C 148 1120 138 1150 120 1180" stroke={P.rim} strokeOpacity={0.45} strokeWidth={7} fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
};

/* Film grain + vignette on top of everything in the scene */
const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, mixBlendMode: "overlay", opacity: 0.55 }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 24} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="1080" height="1920" filter="url(#grain)" />
      </svg>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(0,0,0,0.75) 100%)" }} />
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Comment card                                                        */
/* ------------------------------------------------------------------ */

const Heart: React.FC<{ filled?: boolean; size?: number }> = ({ filled, size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path
      d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.8 6.6 4.8c2.1 0 3.6 1.2 4.4 2.6.8-1.4 2.3-2.6 4.4-2.6 3.6 0 5.7 3.6 4.2 7C19.5 16.4 12 21 12 21z"
      fill={filled ? RED : "none"}
      stroke={filled ? RED : "#9a9a9a"}
      strokeWidth={1.8}
    />
  </svg>
);

const CommentCard: React.FC<{ ev: Ev; lt: number }> = ({ ev, lt }) => {
  const { fps } = useVideoConfig();
  const s = spring({ frame: lt * fps, fps, config: { damping: 18, mass: 0.8 } });
  const dur = ev.end - ev.start;
  const out = interpolate(lt, [dur - 0.35, dur], [1, 0], clamp);
  const liked = lt > (ev.words?.[ev.words.length - 1]?.t ?? dur) + 0.2;
  const likePop = liked ? spring({ frame: (lt - (ev.words?.[ev.words.length - 1]?.t ?? 0) - 0.2) * fps, fps, config: { damping: 8 } }) : 0;
  const tokens = ev.text!.split(/\s+/);
  // map each displayed token to a spoken word time (sequential)
  const times: number[] = [];
  let j = 0;
  for (const tok of tokens) {
    const w = ev.words?.[j];
    times.push(w ? w.t : 99);
    if (w && tok.replace(/[^\p{L}']/gu, "").length > 0) j++;
  }
  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        top: 330,
        padding: "30px 34px 26px",
        borderRadius: 30,
        background: "rgba(24,24,26,0.9)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
        border: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        gap: 24,
        opacity: s * out,
        transform: `translateY(${(1 - s) * 40}px) scale(${0.96 + s * 0.04})`,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          flex: "0 0 auto",
          width: 76,
          height: 76,
          borderRadius: 38,
          background: "linear-gradient(135deg, #3a3a3e, #8a8a90)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontWeight: 800,
          fontSize: 34,
        }}
      >
        {ev.user!.replace(/[^a-z]/gi, "")[0].toUpperCase()}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28 }}>
          <span style={{ color: "#fff", fontWeight: 700 }}>{ev.user}</span>
          <span style={{ color: "#8d8d92" }}>{ev.ago}</span>
          <span style={{ color: RED }}>❤</span>
        </div>
        <div style={{ marginTop: 10, fontSize: 40, lineHeight: 1.32, color: "#fff", fontWeight: 500 }}>
          {tokens.map((tok, i) => (
            <span key={i} style={{ opacity: lt >= times[i] - 0.05 ? 1 : 0.35 }}>
              {tok}{" "}
            </span>
          ))}
        </div>
        <div style={{ marginTop: 14, fontSize: 26, color: "#8d8d92", fontWeight: 600 }}>Répondre</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, paddingTop: 30 }}>
        <div style={{ transform: `scale(${1 + likePop * 0.25 - (liked ? 0.25 : 0)})` }}>
          <Heart filled={liked} />
        </div>
        <div style={{ color: "#8d8d92", fontSize: 22 }}>{liked ? "2,4 k" : "2,3 k"}</div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Glitch title                                                        */
/* ------------------------------------------------------------------ */

const GlitchWord: React.FC<{ text: string; lt: number; size: number; y?: number; color?: string; beats?: number[] }> = ({
  text,
  lt,
  size,
  y = 0,
  color = "#fff",
  beats,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lastBeat = Math.max(0, ...(beats ?? [0]).filter((b) => b <= lt));
  const punch = Math.min(
    spring({ frame: lt * fps, fps, config: { damping: 9, mass: 0.6 } }),
    0.92 + 0.08 * spring({ frame: (lt - lastBeat) * fps, fps, config: { damping: 9, mass: 0.6 } }),
  );
  const glitching = (beats ?? [0, 1.2]).some((b) => lt > b - 0.03 && lt < b + 0.3) || random(`g${frame}`) > 0.93;
  const jx = glitching ? (random(`x${frame}`) - 0.5) * 40 : 0;
  const split = glitching ? 14 + random(`s${frame}`) * 18 : 6;
  const base: React.CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    top: 960 + y - size * 0.6,
    textAlign: "center",
    fontFamily: "'Inter Display', Inter, sans-serif",
    fontWeight: 900,
    fontSize: size,
    letterSpacing: -size * 0.04,
    lineHeight: 1.1,
  };
  const slices = glitching ? [0.2, 0.55, 0.8] : [];
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${0.7 + punch * 0.3})` }}>
      <div style={{ ...base, color: RED, transform: `translate(${-split + jx}px, ${split * 0.3}px)`, opacity: 0.9 }}>{text}</div>
      <div style={{ ...base, color: "#19c3ff", transform: `translate(${split * 0.6 + jx}px, 0)`, opacity: glitching ? 0.5 : 0, mixBlendMode: "screen" }}>
        {text}
      </div>
      <div style={{ ...base, color, transform: `translate(${jx * 0.4}px, 0)` }}>{text}</div>
      {slices.map((p, i) => (
        <div
          key={i}
          style={{
            ...base,
            color,
            clipPath: `inset(${p * 100}% 0 ${100 - p * 100 - 7}% 0)`,
            transform: `translate(${(random(`sl${frame}${i}`) - 0.5) * 120}px, 0)`,
          }}
        >
          {text}
        </div>
      ))}
    </div>
  );
};

const Scanlines: React.FC = () => (
  <AbsoluteFill
    style={{
      background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0 2px, transparent 2px 6px)",
      pointerEvents: "none",
    }}
  />
);

/* ------------------------------------------------------------------ */
/* Composition                                                         */
/* ------------------------------------------------------------------ */

export const AimeMoi: React.FC<AimeMoiProps> = ({ audioFile, durationSeconds, events, backgroundImage, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const ev = events.find((e) => t >= e.start && t < e.end) ?? events[events.length - 1];
  const lt = t - ev.start;
  const fadeIn = interpolate(t, [0, 0.4], [0, 1], clamp);
  const fadeOut = interpolate(t, [durationSeconds - 0.6, durationSeconds], [1, 0], clamp);
  const isScene = ev.type === "quote" || ev.type === "final";
  const zoom = 1.02 + lt * 0.012;
  const flash = interpolate(lt, [0, 0.12], [1, 0], clamp);

  return (
    <AbsoluteFill style={{ background: "#000", opacity: fadeIn * fadeOut, overflow: "hidden" }}>
      {audioFile ? <Audio src={staticFile(audioFile)} /> : null}
      {isScene ? (
        <AbsoluteFill style={{ transform: `scale(${zoom})`, filter: color ? "saturate(1.15) contrast(1.06)" : "grayscale(1) contrast(1.12) brightness(0.95)" }}>
          {backgroundImage ? (
            <Img src={staticFile(backgroundImage)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <NightScene t={t} color={color} />
          )}
          <Grain />
        </AbsoluteFill>
      ) : null}
      {ev.type === "quote" ? <CommentCard ev={ev} lt={lt} /> : null}
      {ev.type === "final" ? (
        <AbsoluteFill style={{ background: "rgba(0,0,0,0.45)" }}>
          <div
            style={{
              position: "absolute",
              left: 90,
              right: 90,
              top: 700,
              textAlign: "center",
              fontFamily: "'FreeSerif', serif",
              fontStyle: "italic",
              fontSize: 74,
              lineHeight: 1.3,
              color: "#fff",
            }}
          >
            {ev.text!.split(/\s+/).map((tok, i) => {
              const wt = ev.words?.[Math.min(i, (ev.words?.length ?? 1) - 1)]?.t ?? 0;
              const o = interpolate(lt, [wt - 0.1, wt + 0.25], [0, 1], clamp);
              return (
                <span key={i} style={{ opacity: o, display: "inline-block", transform: `translateY(${(1 - o) * 16}px)`, marginRight: 18 }}>
                  {tok}
                </span>
              );
            })}
          </div>
        </AbsoluteFill>
      ) : null}
      {ev.type === "hit" ? (
        <AbsoluteFill
          style={{
            background: color ? "radial-gradient(circle at 50% 50%, rgba(224,24,45,0.28), #000 62%)" : "#000",
          }}
        >
          <GlitchWord text="MOI" lt={lt} size={300} beats={ev.beats} />
          <Scanlines />
        </AbsoluteFill>
      ) : null}
      {ev.type === "end" ? (
        <AbsoluteFill
          style={{
            background: color ? "radial-gradient(circle at 50% 50%, rgba(224,24,45,0.3), #000 65%)" : "#000",
          }}
        >
          <GlitchWord text="AIME" lt={lt} size={330} y={-90} color={RED} beats={ev.beats} />
          {lt > (ev.beats?.[1] ?? 1.0) ? (
            <GlitchWord
              text="MOI"
              lt={lt - (ev.beats?.[1] ?? 1.0)}
              size={220}
              y={150}
              beats={(ev.beats ?? [0, 1]).map((b) => b - (ev.beats?.[1] ?? 1.0)).filter((b) => b >= 0)}
            />
          ) : null}
          <Scanlines />
        </AbsoluteFill>
      ) : null}
      <AbsoluteFill style={{ background: "#fff", opacity: (ev.type === "hit" || ev.type === "end" ? flash : 0) * 0.5 }} />
    </AbsoluteFill>
  );
};
