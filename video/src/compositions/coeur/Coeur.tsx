import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  random,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { lines } from "./data";
import { Heart } from "../luiouelle/Art";

const SERIF = "'DejaVu Serif', Georgia, serif";
const SANS = "Inter, system-ui, sans-serif";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Mots mis en valeur : plus grands, en or (partie 2) ou bleu glacé (partie 1). */
const KEY = new Set(
  "amour faiblesse blessés cœur brisé jamais fort courage aimer vivant mort blessure souffrir t'aime".split(
    " ",
  ),
);
const strip = (w: string) => w.toLowerCase().replace(/[«»…,.?!:;]/g, "");

type Unit = { text: string; from: number; key: boolean; part: number };

/** Un « plan » texte = un mot, ou un petit mot collé au suivant (« ce que », « le plus »). */
const units: Unit[] = (() => {
  const out: Unit[] = [];
  for (const l of lines) {
    let buf: { t: string; f: number }[] = [];
    l.words.forEach((w, i) => {
      buf.push({ t: w.t, f: w.f });
      // Une pause dans la voix (ponctuation) coupe toujours le plan.
      const last = i === l.words.length - 1 || l.words[i + 1].f - w.e > 5;
      const joined = buf.map((b) => b.t).join(" ");
      if (last || (w.t.length > 3 && joined.length > 4) || buf.length === 3) {
        out.push({
          text: joined,
          from: buf[0].f,
          key: buf.some((b) => KEY.has(strip(b.t))),
          part: l.part,
        });
        buf = [];
      }
    });
  }
  return out;
})();

const TURN = lines.find((l) => l.part === 1)!.from;
const LAST = lines[lines.length - 1];
const END = LAST.from + LAST.dur;

const HEART =
  "M540 1330 C 330 1180 170 1040 170 860 C 170 720 270 620 400 620 C 470 620 515 655 540 700 C 565 655 610 620 680 620 C 810 620 910 720 910 860 C 910 1040 750 1180 540 1330 Z";
const CRACK = "M540 700 L 505 790 L 570 870 L 495 960 L 565 1050 L 520 1140 L 545 1330";

const Background: React.FC<{ frame: number; warm: number }> = ({
  frame,
  warm,
}) => {
  const zoom = interpolate(frame, [0, END], [1, 1.12], clamp);
  const heal = interpolate(frame, [TURN + 400, END - 60], [0, 1], clamp);
  const breathe = 1 + Math.sin(frame / 22) * 0.012 * warm;
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 48%, #12223a 0%, #05080f 70%)",
        }}
      />
      <AbsoluteFill
        style={{
          opacity: warm,
          background:
            "radial-gradient(circle at 50% 50%, #4a2a12 0%, #140a04 72%)",
        }}
      />
      <svg
        viewBox="0 0 1080 1920"
        width={1080}
        height={1920}
        style={{
          position: "absolute",
          transform: `scale(${zoom * breathe})`,
        }}
      >
        <defs>
          <radialGradient id="gold" cx="50%" cy="45%">
            <stop offset="0%" stopColor="#ffd98a" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#ff9a3c" stopOpacity={0.05} />
          </radialGradient>
          <filter id="blur">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>
        {/* pluie froide (partie 1) / poussière de lumière (partie 2) */}
        {Array.from({ length: 60 }).map((_, i) => {
          const x = random(`x${i}`) * 1080;
          const speed = 6 + random(`s${i}`) * 8;
          const y = ((random(`y${i}`) * 1920 + frame * speed) % 2100) - 100;
          const yUp = 1920 - ((random(`y${i}`) * 1920 + frame * 1.2) % 2000);
          return (
            <g key={i}>
              <line
                x1={x}
                x2={x - 6}
                y1={y}
                y2={y + 40}
                stroke="#7fa6d6"
                strokeWidth={2}
                opacity={0.25 * (1 - warm)}
              />
              <circle
                cx={x}
                cy={yUp}
                r={2 + random(`r${i}`) * 3}
                fill="#ffd98a"
                opacity={0.35 * warm * (0.5 + 0.5 * Math.sin(frame / 15 + i))}
              />
            </g>
          );
        })}
        <path d={HEART} fill="url(#gold)" opacity={warm * (0.35 + heal * 0.5)} />
        <path
          d={HEART}
          fill="none"
          stroke={warm > 0.5 ? "#f6d48a" : "#7fa6d6"}
          strokeWidth={6}
          opacity={0.55}
        />
        <path
          d={CRACK}
          fill="none"
          stroke="#ffd98a"
          strokeWidth={22}
          filter="url(#blur)"
          opacity={warm * (0.6 + 0.4 * Math.sin(frame / 12))}
        />
        <path
          d={CRACK}
          fill="none"
          stroke={warm > 0.5 ? "#fff1c9" : "#05080f"}
          strokeWidth={10}
          strokeLinejoin="round"
          opacity={1 - heal * 0.7}
        />
      </svg>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,.7) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

const Word: React.FC<{ frame: number }> = ({ frame }) => {
  // Le premier mot est à l'écran dès la 1re image (accroche + vignette).
  let idx = 0;
  for (let i = 0; i < units.length; i++) if (frame >= units[i].from - 2) idx = i;
  if (frame > END + 6) return null;
  const u = units[idx];
  const k = idx === 0 ? 99 : frame - (u.from - 2);
  const size = Math.min(
    u.key ? 190 : 130,
    Math.floor(1700 / Math.max(4, u.text.length)),
  );
  const color = u.key ? (u.part ? "#f6d48a" : "#a9c8f0") : "#ffffff";
  return (
    <div
      style={{
        position: "absolute",
        top: 860,
        width: "100%",
        textAlign: "center",
        fontFamily: SERIF,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1,
        color,
        padding: "0 40px",
        boxSizing: "border-box",
        textShadow: "0 4px 30px rgba(0,0,0,.95)",
        transform: `translateY(-50%) scale(${interpolate(k, [0, 5], [1.18, 1], clamp)})`,
        opacity: interpolate(k, [0, 3], [0, 1], clamp),
        filter: `blur(${interpolate(k, [0, 4], [6, 0], clamp)}px)`,
      }}
    >
      {u.text.replace(/[«»]/g, "").trim()}
    </div>
  );
};

/** La phrase entière en petit, pour suivre même sans le son. */
const Sentence: React.FC<{ frame: number }> = ({ frame }) => {
  const l = [...lines].reverse().find((x) => frame >= x.from - 4) ?? lines[0];
  if (!l || frame > l.from + l.dur + 20 || frame > END) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 1500,
        width: "100%",
        padding: "0 90px",
        boxSizing: "border-box",
        textAlign: "center",
        fontFamily: SANS,
        fontSize: 40,
        fontWeight: 600,
        lineHeight: 1.35,
        color: "rgba(255,255,255,.78)",
        textShadow: "0 2px 12px rgba(0,0,0,.9)",
        opacity: l === lines[0] ? 1 : interpolate(frame, [l.from - 4, l.from + 6], [0, 1], clamp),
      }}
    >
      {l.text.replace(/ ([?!:;»])/g, " $1").replace(/« /g, "« ")}
    </div>
  );
};

const Ending: React.FC<{ frame: number }> = ({ frame }) => {
  const k = frame - END;
  if (k < 0) return null;
  const f = (a: number) => interpolate(k, [a, a + 15], [0, 1], clamp);
  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        background: `rgba(10,5,2,${interpolate(k, [0, 20], [0, 0.6], clamp)})`,
      }}
    >
      <div
        style={{
          fontFamily: SERIF,
          fontStyle: "italic",
          fontSize: 96,
          color: "#f6d48a",
          opacity: f(0),
          textShadow: "0 4px 30px rgba(0,0,0,.9)",
        }}
      >
        Tu es aimé(e) <Heart size={80} color="#f6d48a" />
      </div>
      <div
        style={{
          marginTop: 40,
          fontFamily: SANS,
          fontSize: 40,
          fontWeight: 600,
          color: "#fff",
          opacity: f(20) * 0.85,
        }}
      >
        Cantique des cantiques 8:6
      </div>
      <div
        style={{
          marginTop: 120,
          fontFamily: SANS,
          fontSize: 34,
          fontWeight: 700,
          letterSpacing: 6,
          color: "#f6d48a",
          opacity: f(35),
        }}
      >
        LUMIÈRE POUR TON CŒUR
      </div>
    </AbsoluteFill>
  );
};

export const Coeur: React.FC = () => {
  const frame = useCurrentFrame();
  const warm = interpolate(frame, [TURN - 30, TURN + 10], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: "#05080f" }}>
      <Background frame={frame} warm={warm} />
      <Word frame={frame} />
      <Sentence frame={frame} />
      <Ending frame={frame} />
      <div
        style={{
          position: "absolute",
          top: 170,
          width: "100%",
          textAlign: "center",
          fontFamily: SANS,
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: 6,
          color: "rgba(255,255,255,.6)",
        }}
      >
        LUMIÈRE POUR TON CŒUR
      </div>
      {lines.map((l, i) => (
        <Sequence key={i} from={l.from} durationInFrames={l.dur + 6} layout="none">
          <Audio src={staticFile(l.file)} />
        </Sequence>
      ))}
      <Audio
        src={staticFile("luiouelle/pad.mp3")}
        loop
        volume={(f) =>
          (f < TURN ? 0.08 : 0.15) *
          interpolate(f, [0, 30], [0, 1], clamp) *
          interpolate(f, [END + 60, END + 130], [1, 0], clamp)
        }
      />
    </AbsoluteFill>
  );
};

/** Couverture fixe. */
export const CoeurCover: React.FC = () => (
  <AbsoluteFill>
    <Background frame={TURN - 40} warm={0.15} />
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        fontFamily: SERIF,
        fontWeight: 700,
        textShadow: "0 4px 30px rgba(0,0,0,.95)",
      }}
    >
      <div style={{ fontSize: 110, color: "#fff", lineHeight: 1.1 }}>
        L'amour est
        <br />
        une faiblesse
        <span style={{ color: "#f6d48a" }}>&nbsp;?</span>
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);
