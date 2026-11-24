import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { LOOKS, Person, type Look, type Pose } from "./Characters";
import { nouveauDepartLines } from "./nouveauDepartData";
import { CLAMP, GOLD, SANS, SERIF } from "./Story";

/**
 * « Un nouveau départ » — two characters in armchairs talk in a room lit by a
 * window that slowly turns from grey morning to golden sunrise.
 * Shots cut between close-ups of the speaker and wide shots.
 */

type Who = "S" | "J" | "N";
type Shot = "wide" | "close";
type Mood = "sad" | "neutral" | "happy";

export type NdLine = {
  who: Who;
  seconds: number;
  words: [string, number][];
  shot?: Shot;
  verse?: { text: string; ref: string };
  moodJ?: Mood;
  moodS?: Mood;
  poseJ?: Pose;
  poseS?: Pose;
};

export type NouveauDepartProps = {
  nameS: string;
  nameJ: string;
  voicePrefix: string;
  music: string | null;
  musicVolume: number;
  endTitle: string;
  endRef: string;
  endSub: string;
  lines: NdLine[];
};

const LEAD = 6;
const fr = (l: NdLine) =>
  Math.round((l.seconds + (l.who === "N" ? 3 : l.verse ? 1.6 : 0.35)) * 30) +
  LEAD;
export const nouveauDepartDuration = (p: NouveauDepartProps) =>
  Math.max(
    1,
    p.lines.reduce((s, l) => s + fr(l), 0),
  );

const extra: Partial<NdLine>[] = [
  { shot: "wide", moodJ: "sad", moodS: "neutral" }, // 1 Imagine…
  {}, // 2
  {}, // 3
  {}, // 4
  {}, // 5
  {}, // 6
  {}, // 7
  { moodJ: "neutral" }, // 8
  { shot: "wide" }, // 9 Intéressant
  {}, // 10 Quoi ?
  {}, // 11
  { moodJ: "sad" }, // 12
  {
    moodS: "happy",
    verse: {
      text: "Ne pensez plus aux événements passés… Voici, je vais faire une chose nouvelle.",
      ref: "Ésaïe 43:18-19",
    },
  }, // 13
  { moodJ: "neutral" }, // 14
  {
    verse: {
      text: "Ses compassions ne sont pas à leur terme ; elles se renouvellent chaque matin.",
      ref: "Lamentations 3:22-23",
    },
  }, // 15
  {
    verse: {
      text: "Si quelqu'un est en Christ, il est une nouvelle créature. Les choses anciennes sont passées.",
      ref: "2 Corinthiens 5:17",
    },
  }, // 16
  { shot: "wide", moodJ: "happy" }, // 17
  {}, // 18
  { shot: "wide", poseJ: "cheer", poseS: "wave" }, // 19
  { shot: "wide" }, // 20 narrator
];

export const nouveauDepartDefaults: NouveauDepartProps = {
  nameS: "Samuel",
  nameJ: "Josué",
  voicePrefix: "nd_",
  music: "nd_musique.wav",
  musicVolume: 0.16,
  endTitle:
    "« C'est ici la journée que l'Éternel a faite : qu'elle soit pour nous un sujet d'allégresse et de joie ! »",
  endRef: "Psaume 118:24",
  endSub: "Aujourd'hui est ton nouveau départ",
  lines: nouveauDepartLines.map((l, i) => ({ ...l, ...extra[i] })),
};

const LOOK_J: Look = { ...LOOKS[1], shirt: "#334155", pants: "#1e293b" };
const LOOK_S: Look = {
  skin: "#7a4a26",
  hair: "#9ca3af",
  hairStyle: "short",
  shirt: "#9ca3af",
  pants: "#374151",
};

// --- Room ----------------------------------------------------------------------

const Room: React.FC<{ t: number; zoom: number; focusX: number }> = ({
  t,
  zoom,
  focusX,
}) => {
  const frame = useCurrentFrame();
  const wall = `hsl(${interpolate(t, [0, 1], [222, 392]) % 360}, ${interpolate(t, [0, 1], [18, 35])}%, ${interpolate(t, [0, 1], [16, 26])}%)`;
  const light = interpolate(t, [0, 1], [0.18, 0.55]);
  const sun = `hsl(${interpolate(t, [0, 1], [210, 400]) % 360}, ${interpolate(t, [0, 1], [30, 95])}%, ${interpolate(t, [0, 1], [85, 70])}%)`;
  return (
    <AbsoluteFill
      style={{
        transform: `scale(${zoom})`,
        transformOrigin: `${focusX}% 45%`,
      }}
    >
      <AbsoluteFill style={{ background: wall }} />
      {/* window */}
      <div
        style={{
          position: "absolute",
          right: 90,
          top: 180,
          width: 380,
          height: 560,
          background: sun,
          boxShadow: `0 0 160px 40px ${sun}`,
          opacity: 0.9,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 182,
            top: 0,
            width: 16,
            height: "100%",
            background: "rgba(30,30,40,0.7)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 272,
            left: 0,
            height: 16,
            width: "100%",
            background: "rgba(30,30,40,0.7)",
          }}
        />
      </div>
      {/* light rays */}
      <svg
        width={1080}
        height={1920}
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="ray" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={sun} stopOpacity={light} />
            <stop offset="1" stopColor={sun} stopOpacity={0} />
          </linearGradient>
        </defs>
        <polygon points="610,180 990,180 520,1900 -200,1900" fill="url(#ray)" />
        <polygon
          points="610,460 990,740 380,1900 -100,1900"
          fill="url(#ray)"
          opacity={0.6}
        />
      </svg>
      {/* dust */}
      {new Array(36).fill(0).map((_, i) => {
        const x = 200 + random(`dx${i}`) * 700 + Math.sin(frame / 50 + i) * 30;
        const y =
          300 +
          ((random(`dy${i}`) * 1300 + frame * (0.3 + random(`ds${i}`) * 0.5)) %
            1300);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: sun,
              opacity: light * (0.6 + 0.4 * Math.sin(frame / 20 + i)),
            }}
          />
        );
      })}
      {/* floor */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 520,
          background: `linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.6))`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Armchair drawn in the same 200×300 space as Person (viewBox 0 -40 200 340). */
const Chair: React.FC<{
  height: number;
  layer: "back" | "front";
  color: string;
}> = ({ height, layer, color }) => (
  <svg
    width={(height * 200) / 300}
    height={height}
    viewBox="0 -40 200 340"
    style={{ position: "absolute", left: 0, bottom: 0, overflow: "visible" }}
  >
    {layer === "back" ? (
      <rect x={24} y={60} width={152} height={200} rx={36} fill={color} />
    ) : (
      <g>
        <rect
          x={38}
          y={200}
          width={124}
          height={44}
          rx={16}
          fill={color}
          filter="brightness(1.15)"
        />
        <rect x={14} y={150} width={40} height={110} rx={18} fill={color} />
        <rect x={146} y={150} width={40} height={110} rx={18} fill={color} />
        <rect x={30} y={258} width={10} height={30} rx={3} fill="#3f2a1d" />
        <rect x={160} y={258} width={10} height={30} rx={3} fill="#3f2a1d" />
      </g>
    )}
  </svg>
);

const Seated: React.FC<{
  look: Look;
  pose: Pose;
  mood: Mood;
  talking: boolean;
  height: number;
  chair: string;
  offset?: number;
}> = ({ look, pose, mood, talking, height, chair, offset }) => (
  <div style={{ position: "relative", width: (height * 200) / 300, height }}>
    <Chair height={height} layer="back" color={chair} />
    <div style={{ position: "absolute", left: 0, bottom: 0 }}>
      <Person
        look={look}
        pose={pose}
        mood={mood}
        talking={talking}
        height={height}
        offset={offset}
      />
    </div>
    <Chair height={height} layer="front" color={chair} />
  </div>
);

// --- Captions ------------------------------------------------------------------

const Caption: React.FC<{ line: NdLine }> = ({ line }) => {
  const frame = useCurrentFrame();
  const t = (frame - LEAD) / 30;
  // chunks of up to 6 words, shown while being spoken
  const chunks: [string, number][][] = [];
  for (let i = 0; i < line.words.length; i += 6)
    chunks.push(line.words.slice(i, i + 6));
  let ci = 0;
  for (let i = 0; i < chunks.length; i++)
    if (t >= chunks[i][0][1] - 0.05) ci = i;
  const chunk = chunks[ci];
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        bottom: 300,
        textAlign: "center",
        fontFamily: SANS,
        fontSize: 64,
        fontWeight: 800,
        lineHeight: 1.25,
        textShadow: "0 4px 18px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.9)",
      }}
    >
      {chunk.map(([w, s], i) => {
        const on = t >= s - 0.02;
        return (
          <span
            key={i}
            style={{ color: on ? "white" : "rgba(255,255,255,0.35)" }}
          >
            {w}{" "}
          </span>
        );
      })}
    </div>
  );
};

const VerseCard: React.FC<{
  verse: { text: string; ref: string };
  at: number;
}> = ({ verse, at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - at, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        position: "absolute",
        top: 170,
        left: 70,
        right: 70,
        opacity: p,
        transform: `translateY(${(1 - p) * -40}px)`,
        background: "rgba(15,10,25,0.72)",
        border: `3px solid ${GOLD}`,
        borderRadius: 36,
        padding: "36px 44px",
        textAlign: "center",
        boxShadow: "0 0 60px rgba(253,200,120,0.35)",
      }}
    >
      <div
        style={{
          fontFamily: SERIF,
          fontStyle: "italic",
          fontSize: 54,
          lineHeight: 1.3,
          color: "white",
        }}
      >
        « {verse.text} »
      </div>
      <div
        style={{
          marginTop: 20,
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 42,
          color: GOLD,
          letterSpacing: 2,
        }}
      >
        {verse.ref}
      </div>
    </div>
  );
};

const NameTag: React.FC<{ name: string; side: "left" | "right" }> = ({
  name,
  side,
}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 8, 50, 60], [0, 1, 1, 0], CLAMP);
  return (
    <div
      style={{
        position: "absolute",
        top: 1250,
        [side]: 80,
        opacity: o,
        fontFamily: SANS,
        fontSize: 38,
        fontWeight: 800,
        letterSpacing: 4,
        textTransform: "uppercase",
        color: GOLD,
        borderLeft: `6px solid ${GOLD}`,
        paddingLeft: 18,
      }}
    >
      {name}
    </div>
  );
};

// --- Composition ----------------------------------------------------------------

export const NouveauDepart: React.FC<NouveauDepartProps> = (p) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const starts: number[] = [];
  let acc = 0;
  for (const l of p.lines) {
    starts.push(acc);
    acc += fr(l);
  }
  let idx = 0;
  for (let i = 0; i < starts.length; i++) if (frame >= starts[i]) idx = i;
  let moodJ: Mood = "neutral";
  let moodS: Mood = "neutral";
  let poseJ: Pose = "idle";
  let poseS: Pose = "idle";
  for (let i = 0; i <= idx; i++) {
    const l = p.lines[i];
    moodJ = l.moodJ ?? moodJ;
    moodS = l.moodS ?? moodS;
    poseJ = l.poseJ ?? poseJ;
    poseS = l.poseS ?? poseS;
  }
  const cur = p.lines[idx];
  const local = frame - starts[idx];
  const tSec = (local - LEAD) / 30;
  const speaking = tSec >= 0 && tSec < cur.seconds - 0.1;
  const shot: Shot = cur.who === "N" ? "wide" : (cur.shot ?? "close");
  const t = interpolate(
    frame,
    [0, durationInFrames * 0.55, durationInFrames],
    [0, 0.25, 1],
    CLAMP,
  );
  const push = interpolate(local, [0, fr(cur)], [1, 1.06], CLAMP);
  const isLast = idx === p.lines.length - 1;
  const endIn = spring({ frame: local - 10, fps, config: { damping: 200 } });

  const J = (h: number) => (
    <Seated
      look={LOOK_J}
      pose={poseJ}
      mood={moodJ}
      talking={cur.who === "J" && speaking}
      height={h}
      chair="#4b5563"
    />
  );
  const Sm = (h: number) => (
    <Seated
      look={LOOK_S}
      pose={poseS}
      mood={moodS}
      talking={cur.who === "S" && speaking}
      height={h}
      chair="#57534e"
      offset={41}
    />
  );

  return (
    <AbsoluteFill style={{ background: "#0b0b12", overflow: "hidden" }}>
      {p.music ? (
        <Audio src={staticFile(p.music)} volume={p.musicVolume} />
      ) : null}

      {shot === "wide" ? (
        <AbsoluteFill
          style={{ transform: `scale(${push})`, transformOrigin: "50% 70%" }}
        >
          <Room t={t} zoom={1} focusX={50} />
          <div style={{ position: "absolute", left: -30, bottom: 230 }}>
            {J(900)}
          </div>
          <div style={{ position: "absolute", right: -30, bottom: 230 }}>
            {Sm(900)}
          </div>
        </AbsoluteFill>
      ) : cur.who === "J" ? (
        <AbsoluteFill
          style={{ transform: `scale(${push})`, transformOrigin: "35% 40%" }}
        >
          <Room t={t} zoom={1.35} focusX={80} />
          <div style={{ position: "absolute", left: -70, bottom: 50 }}>
            {J(1700)}
          </div>
        </AbsoluteFill>
      ) : (
        <AbsoluteFill
          style={{ transform: `scale(${push})`, transformOrigin: "65% 40%" }}
        >
          <Room t={t} zoom={1.35} focusX={20} />
          <div style={{ position: "absolute", right: -203, bottom: 50 }}>
            {Sm(1700)}
          </div>
        </AbsoluteFill>
      )}

      {/* soft vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.55))",
        }}
      />

      {p.lines.map((l, i) => (
        <Sequence key={i} from={starts[i]} durationInFrames={fr(l)}>
          {l.who !== "N" ? <Caption line={l} /> : null}
          {l.verse ? <VerseCard verse={l.verse} at={LEAD + 10} /> : null}
          {l.who !== "N" && (i === 0 || i === 1) ? (
            <NameTag
              name={l.who === "J" ? p.nameJ : p.nameS}
              side={l.who === "J" ? "left" : "right"}
            />
          ) : null}
          <Sequence from={LEAD}>
            <Audio src={staticFile(`${p.voicePrefix}${i + 1}.wav`)} />
          </Sequence>
        </Sequence>
      ))}

      {isLast ? (
        <AbsoluteFill
          style={{
            background: `rgba(10,6,4,${0.55 * endIn})`,
            alignItems: "center",
            justifyContent: "center",
            padding: "0 80px",
            textAlign: "center",
            gap: 40,
            color: "white",
          }}
        >
          <div
            style={{
              opacity: endIn,
              fontFamily: SERIF,
              fontStyle: "italic",
              fontSize: 70,
              lineHeight: 1.3,
              transform: `translateY(${(1 - endIn) * 40}px)`,
            }}
          >
            {p.endTitle}
          </div>
          <div
            style={{
              opacity: endIn,
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: 48,
              color: GOLD,
              letterSpacing: 3,
            }}
          >
            {p.endRef}
          </div>
          <div
            style={{
              opacity: interpolate(local, [150, 170], [0, 1], CLAMP),
              marginTop: 50,
              fontFamily: SERIF,
              fontWeight: 700,
              fontSize: 84,
              color: GOLD,
              textShadow: "0 0 50px rgba(253,200,120,0.8)",
            }}
          >
            {p.endSub}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
