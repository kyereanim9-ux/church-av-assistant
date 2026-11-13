import {
  AbsoluteFill,
  Sequence,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type ParolesProps = {
  intro: string[];
  wordsTitle: string;
  healingWords: string[];
  forgiveLines: string[];
  forgiveVerse: { text: string; ref: string };
  sweetVerse: { text: string; ref: string };
  challengeTitle: string;
  challenge: string;
  outro: string;
  share: string;
};

export const parolesDefaults: ParolesProps = {
  intro: ["Les mots peuvent blesser…", "mais ils peuvent aussi guérir."],
  wordsTitle: "Un seul mot peut relever quelqu'un",
  healingWords: [
    "Je te pardonne",
    "Tu comptes pour moi",
    "Je prie pour toi",
    "Tu n'es pas seul(e)",
    "Je suis fier de toi",
    "Merci",
    "Dieu t'aime",
  ],
  forgiveLines: [
    "Pardonner, c'est retirer la flèche…",
    "et laisser Dieu soigner la blessure.",
  ],
  forgiveVerse: {
    text: "De même que Christ vous a pardonné, pardonnez-vous aussi.",
    ref: "Colossiens 3:13",
  },
  sweetVerse: {
    text: "Les paroles agréables sont un rayon de miel, douces pour l'âme et salutaires pour le corps.",
    ref: "Proverbes 16:24",
  },
  challengeTitle: "Défi du jour",
  challenge:
    "Envoie aujourd'hui un message d'encouragement à quelqu'un qui en a besoin.",
  outro: "Tu es aimé(e)",
  share: "Partage cette vidéo à quelqu'un",
};

const SERIF = "'Liberation Serif', 'DejaVu Serif', Georgia, serif";
const SANS = "'DejaVu Sans', Arial, sans-serif";
const GOLD = "#fcd34d";
const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Scene timing in frames (30 fps)
const S = {
  intro: [0, 165],
  words: [165, 345],
  forgive: [510, 300],
  sweet: [810, 270],
  challenge: [1080, 180],
  outro: [1260, 150],
} as const;
export const PAROLES_DURATION = 1410;

const useFade = (dur: number, edge = 15) => {
  const f = useCurrentFrame();
  return interpolate(f, [0, edge, dur - edge, dur], [0, 1, 1, 0], CLAMP);
};

const Rise: React.FC<{
  delay: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200 } });
  return (
    <div
      style={{
        opacity: p,
        transform: `translateY(${(1 - p) * 50}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // From dusky purple (hurt) to warm gold (healing)
  const t = interpolate(frame, [0, durationInFrames], [0, 1], CLAMP);
  // Hue goes past 360 so it travels through pink/red, never through green
  const top = `hsl(${interpolate(t, [0, 1], [265, 390]) % 360}, 45%, ${interpolate(t, [0, 1], [12, 22])}%)`;
  const bottom = `hsl(${interpolate(t, [0, 1], [330, 378]) % 360}, 60%, ${interpolate(t, [0, 1], [22, 38])}%)`;
  const glowY = 50 + Math.sin(frame / 60) * 6;
  return (
    <AbsoluteFill
      style={{ background: `linear-gradient(180deg, ${top}, ${bottom})` }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% ${glowY}%, rgba(253,224,140,0.28), transparent 55%)`,
        }}
      />
      {new Array(40).fill(0).map((_, i) => {
        const x = random(`x${i}`) * 1080;
        const speed = 0.6 + random(`s${i}`) * 1.4;
        const size = 4 + random(`r${i}`) * 10;
        const y = 1920 + 40 - ((frame * speed + random(`y${i}`) * 2000) % 2000);
        const tw = 0.3 + 0.5 * Math.abs(Math.sin(frame / 25 + i));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + Math.sin(frame / 40 + i) * 20,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              background: GOLD,
              opacity: tw,
              boxShadow: `0 0 ${size * 2}px ${GOLD}`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** A heart whose crack fades away while it starts to glow. */
const Heart: React.FC<{ heal: number; size: number; beat?: boolean }> = ({
  heal,
  size,
  beat,
}) => {
  const frame = useCurrentFrame();
  const pulse = beat ? 1 + Math.max(0, Math.sin(frame / 7)) * 0.05 : 1;
  const fill = `hsl(${interpolate(heal, [0, 1], [345, 355])}, ${interpolate(heal, [0, 1], [30, 85])}%, ${interpolate(heal, [0, 1], [40, 58])}%)`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{
        transform: `scale(${pulse})`,
        filter: `drop-shadow(0 0 ${heal * 50}px rgba(253,200,120,${heal}))`,
      }}
    >
      <path
        d="M50 88 C20 66 6 50 6 32 C6 18 17 8 30 8 C39 8 46 13 50 21 C54 13 61 8 70 8 C83 8 94 18 94 32 C94 50 80 66 50 88 Z"
        fill={fill}
      />
      <path
        d="M50 21 L44 36 L55 46 L45 60 L52 72"
        fill="none"
        stroke="#1e1027"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={1 - heal}
      />
      <ellipse cx={30} cy={28} rx={9} ry={6} fill="white" opacity={0.25} />
    </svg>
  );
};

const center: React.CSSProperties = {
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: "0 90px",
  color: "white",
};

const Intro: React.FC<{ lines: string[] }> = ({ lines }) => {
  const frame = useCurrentFrame();
  const fade = useFade(S.intro[1]);
  const heal = interpolate(frame, [70, 140], [0, 1], CLAMP);
  return (
    <AbsoluteFill style={{ ...center, opacity: fade, gap: 70 }}>
      <Rise delay={0}>
        <Heart heal={heal} size={380} beat={heal > 0.5} />
      </Rise>
      <Rise delay={10}>
        <div style={{ fontFamily: SERIF, fontSize: 78, fontStyle: "italic" }}>
          {lines[0]}
        </div>
      </Rise>
      <Rise delay={70}>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 86,
            fontWeight: 700,
            color: GOLD,
          }}
        >
          {lines[1]}
        </div>
      </Rise>
    </AbsoluteFill>
  );
};

const Words: React.FC<{ title: string; words: string[] }> = ({
  title,
  words,
}) => {
  const fade = useFade(S.words[1]);
  return (
    <AbsoluteFill style={{ ...center, opacity: fade, gap: 34 }}>
      <Rise delay={0} style={{ marginBottom: 40 }}>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 74,
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
      </Rise>
      {words.map((w, i) => (
        <Rise key={w} delay={30 + i * 20}>
          <div
            style={{
              fontFamily: SANS,
              fontSize: 54,
              fontWeight: 700,
              color: "#3b1d0a",
              background: `linear-gradient(90deg, ${GOLD}, #fdba74)`,
              padding: "18px 44px",
              borderRadius: 999,
              boxShadow: "0 10px 40px rgba(253,200,120,0.45)",
              transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 2}deg)`,
            }}
          >
            « {w} »
          </div>
        </Rise>
      ))}
    </AbsoluteFill>
  );
};

const Verse: React.FC<{ text: string; reference: string; delay: number }> = ({
  text,
  reference,
  delay,
}) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  return (
    <div
      style={{
        border: `3px solid rgba(252,211,77,0.6)`,
        borderRadius: 40,
        padding: "56px 54px",
        background: "rgba(0,0,0,0.25)",
      }}
    >
      <div
        style={{
          fontFamily: SERIF,
          fontStyle: "italic",
          fontSize: 66,
          lineHeight: 1.35,
        }}
      >
        «{" "}
        {words.map((w, i) => {
          const o = interpolate(frame - delay - i * 4, [0, 10], [0, 1], CLAMP);
          return (
            <span key={i} style={{ opacity: o }}>
              {w}{" "}
            </span>
          );
        })}
        »
      </div>
      <Rise delay={delay + words.length * 4 + 10} style={{ marginTop: 36 }}>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 46,
            fontWeight: 700,
            color: GOLD,
            letterSpacing: 2,
          }}
        >
          {reference}
        </div>
      </Rise>
    </div>
  );
};

const Forgive: React.FC<{
  lines: string[];
  verse: { text: string; ref: string };
}> = ({ lines, verse }) => {
  const frame = useCurrentFrame();
  const fade = useFade(S.forgive[1]);
  const heal = interpolate(frame, [40, 120], [0, 1], CLAMP);
  return (
    <AbsoluteFill style={{ ...center, opacity: fade, gap: 50 }}>
      <Heart heal={heal} size={240} beat={heal > 0.9} />
      <Rise delay={5}>
        <div style={{ fontFamily: SERIF, fontSize: 70, lineHeight: 1.25 }}>
          {lines[0]}
        </div>
      </Rise>
      <Rise delay={45}>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 70,
            fontWeight: 700,
            color: GOLD,
            lineHeight: 1.25,
          }}
        >
          {lines[1]}
        </div>
      </Rise>
      <Verse text={verse.text} reference={verse.ref} delay={110} />
    </AbsoluteFill>
  );
};

const Sweet: React.FC<{ verse: { text: string; ref: string } }> = ({
  verse,
}) => {
  const fade = useFade(S.sweet[1]);
  return (
    <AbsoluteFill style={{ ...center, opacity: fade }}>
      <Verse text={verse.text} reference={verse.ref} delay={10} />
    </AbsoluteFill>
  );
};

const Challenge: React.FC<{ title: string; text: string }> = ({
  title,
  text,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fade = useFade(S.challenge[1]);
  const pop = spring({ frame, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{ ...center, opacity: fade, gap: 60 }}>
      <div
        style={{
          transform: `scale(${pop})`,
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 64,
          letterSpacing: 6,
          textTransform: "uppercase",
          color: "#3b1d0a",
          background: GOLD,
          padding: "20px 50px",
          borderRadius: 24,
        }}
      >
        {title}
      </div>
      <Rise delay={15}>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.3,
          }}
        >
          {text}
        </div>
      </Rise>
    </AbsoluteFill>
  );
};

const Outro: React.FC<{ text: string; share: string }> = ({ text, share }) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 15], [0, 1], CLAMP);
  return (
    <AbsoluteFill style={{ ...center, opacity: fadeIn, gap: 60 }}>
      <Heart heal={1} size={300} beat />
      <Rise delay={10}>
        <div
          style={{
            fontFamily: SERIF,
            fontSize: 130,
            fontWeight: 700,
            color: GOLD,
            textShadow: "0 0 50px rgba(253,200,120,0.8)",
          }}
        >
          {text}
        </div>
      </Rise>
      <Rise delay={40}>
        <div style={{ fontFamily: SANS, fontSize: 46, opacity: 0.9 }}>
          {share}
        </div>
      </Rise>
    </AbsoluteFill>
  );
};

export const Paroles: React.FC<ParolesProps> = (p) => {
  return (
    <AbsoluteFill>
      <Background />
      <Sequence from={S.intro[0]} durationInFrames={S.intro[1]}>
        <Intro lines={p.intro} />
      </Sequence>
      <Sequence from={S.words[0]} durationInFrames={S.words[1]}>
        <Words title={p.wordsTitle} words={p.healingWords} />
      </Sequence>
      <Sequence from={S.forgive[0]} durationInFrames={S.forgive[1]}>
        <Forgive lines={p.forgiveLines} verse={p.forgiveVerse} />
      </Sequence>
      <Sequence from={S.sweet[0]} durationInFrames={S.sweet[1]}>
        <Sweet verse={p.sweetVerse} />
      </Sequence>
      <Sequence from={S.challenge[0]} durationInFrames={S.challenge[1]}>
        <Challenge title={p.challengeTitle} text={p.challenge} />
      </Sequence>
      <Sequence from={S.outro[0]} durationInFrames={S.outro[1]}>
        <Outro text={p.outro} share={p.share} />
      </Sequence>
    </AbsoluteFill>
  );
};
