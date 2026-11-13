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

/**
 * Vertical (1080×1920) encouragement video built from a list of scenes.
 * Each scene has its own length in frames so it can be timed to a voice-over.
 */

type Base = { frames: number };
export type Scene = Base &
  (
    | { kind: "icon"; icon: "heart" | "sun"; lines: string[]; heal?: boolean }
    | { kind: "title"; lines: string[] }
    | { kind: "pills"; title: string; items: string[] }
    | {
        kind: "lines";
        lines: string[];
        verse?: { text: string; ref: string };
        icon?: "heart" | "sun";
      }
    | { kind: "verse"; text: string; ref: string }
    | { kind: "challenge"; title: string; text: string }
    | { kind: "outro"; icon: "heart" | "sun"; text: string; sub: string }
    | { kind: "stat"; value: number; unit: string; lines: string[] }
    | { kind: "checklist"; title: string; items: string[] }
    | {
        kind: "poll";
        title: string;
        yes: string;
        no: string;
        sub: string;
      }
  );

export type StoryProps = {
  /** Background hues [top, bottom] at the start and at the end. */
  hues: { from: [number, number]; to: [number, number] };
  voice: string | null;
  music: string | null;
  musicVolume: number;
  scenes: Scene[];
};

export const storyDuration = (p: StoryProps) =>
  Math.max(
    1,
    p.scenes.reduce((s, sc) => s + sc.frames, 0),
  );

export const SERIF = "'Liberation Serif', 'DejaVu Serif', Georgia, serif";
export const SANS = "'DejaVu Sans', Arial, sans-serif";
export const GOLD = "#fcd34d";
export const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

export const center: React.CSSProperties = {
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: "0 90px",
  color: "white",
};

export const Rise: React.FC<{
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

const Fade: React.FC<{ last?: boolean; children: React.ReactNode }> = ({
  last,
  children,
}) => {
  const f = useCurrentFrame();
  const { durationInFrames: d } = useVideoConfig();
  const o = last
    ? interpolate(f, [0, 15], [0, 1], CLAMP)
    : interpolate(f, [0, 15, d - 15, d], [0, 1, 1, 0], CLAMP);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export const Background: React.FC<{ hues: StoryProps["hues"] }> = ({
  hues,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = interpolate(frame, [0, durationInFrames], [0, 1], CLAMP);
  const h = (i: 0 | 1) =>
    (interpolate(t, [0, 1], [hues.from[i], hues.to[i]]) + 720) % 360;
  const top = `hsl(${h(0)}, 45%, ${interpolate(t, [0, 1], [12, 22])}%)`;
  const bottom = `hsl(${h(1)}, 60%, ${interpolate(t, [0, 1], [22, 38])}%)`;
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

/** A sun rising over the horizon, rays slowly turning. `rise` goes 0 → 1. */
const Sun: React.FC<{ rise: number; size: number }> = ({ rise, size }) => {
  const frame = useCurrentFrame();
  const y = interpolate(rise, [0, 1], [70, 42]);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{
        filter: `drop-shadow(0 0 ${20 + rise * 40}px rgba(253,200,120,0.9))`,
      }}
    >
      <defs>
        <clipPath id="above">
          <rect x={0} y={0} width={100} height={72} />
        </clipPath>
      </defs>
      <g clipPath="url(#above)">
        <g transform={`rotate(${frame / 3} 50 ${y})`} opacity={rise}>
          {new Array(12).fill(0).map((_, i) => (
            <rect
              key={i}
              x={49}
              y={y - 46}
              width={2}
              height={14}
              rx={1}
              fill={GOLD}
              transform={`rotate(${i * 30} 50 ${y})`}
            />
          ))}
        </g>
        <circle cx={50} cy={y} r={22} fill="#fbbf24" />
        <circle cx={50} cy={y} r={22} fill="url(#none)" />
      </g>
      <rect x={6} y={72} width={88} height={2.5} rx={1.2} fill={GOLD} />
    </svg>
  );
};

const Icon: React.FC<{
  icon: "heart" | "sun";
  p: number;
  size: number;
  beat?: boolean;
}> = ({ icon, p, size, beat }) =>
  icon === "heart" ? (
    <Heart heal={p} size={size} beat={beat} />
  ) : (
    <Sun rise={p} size={size} />
  );

export const Verse: React.FC<{
  text: string;
  reference: string;
  delay: number;
}> = ({ text, reference, delay }) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  const step = words.length > 20 ? 3 : 4;
  return (
    <div
      style={{
        border: "3px solid rgba(252,211,77,0.6)",
        borderRadius: 40,
        padding: "56px 54px",
        background: "rgba(0,0,0,0.25)",
      }}
    >
      <div
        style={{
          fontFamily: SERIF,
          fontStyle: "italic",
          fontSize: words.length > 20 ? 58 : 66,
          lineHeight: 1.35,
        }}
      >
        «{" "}
        {words.map((w, i) => {
          const o = interpolate(
            frame - delay - i * step,
            [0, 10],
            [0, 1],
            CLAMP,
          );
          return (
            <span key={i} style={{ opacity: o }}>
              {w}{" "}
            </span>
          );
        })}
        »
      </div>
      <Rise delay={delay + words.length * step + 10} style={{ marginTop: 36 }}>
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

const SceneView: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = scene.frames;

  switch (scene.kind) {
    case "icon": {
      const p = scene.heal
        ? interpolate(frame, [d * 0.4, d * 0.8], [0, 1], CLAMP)
        : interpolate(frame, [0, d * 0.6], [0, 1], CLAMP);
      return (
        <AbsoluteFill style={{ ...center, gap: 70 }}>
          <Rise delay={0}>
            <Icon icon={scene.icon} p={p} size={380} beat={p > 0.5} />
          </Rise>
          {scene.lines.map((l, i) => (
            <Rise key={i} delay={i === 0 ? 10 : Math.round(d * 0.42)}>
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: i === 0 ? 76 : 86,
                  fontStyle: i === 0 ? "italic" : "normal",
                  fontWeight: i === 0 ? 400 : 700,
                  color: i === 0 ? "white" : GOLD,
                  lineHeight: 1.25,
                }}
              >
                {l}
              </div>
            </Rise>
          ))}
        </AbsoluteFill>
      );
    }
    case "title":
      return (
        <AbsoluteFill style={{ ...center, gap: 40 }}>
          {scene.lines.map((l, i) => (
            <Rise key={i} delay={i * Math.round(d * 0.3)}>
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: i === scene.lines.length - 1 ? 110 : 72,
                  fontWeight: 700,
                  color: i === scene.lines.length - 1 ? GOLD : "white",
                  lineHeight: 1.15,
                  textShadow:
                    i === scene.lines.length - 1
                      ? "0 0 50px rgba(253,200,120,0.7)"
                      : undefined,
                }}
              >
                {l}
              </div>
            </Rise>
          ))}
        </AbsoluteFill>
      );
    case "pills": {
      const step = (d * 0.8 - 30) / scene.items.length;
      return (
        <AbsoluteFill style={{ ...center, gap: 34 }}>
          <Rise delay={0} style={{ marginBottom: 40 }}>
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 74,
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {scene.title}
            </div>
          </Rise>
          {scene.items.map((w, i) => (
            <Rise key={w} delay={Math.round(30 + i * step)}>
              <div
                style={{
                  fontFamily: SANS,
                  fontSize: 50,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  color: "#3b1d0a",
                  background: `linear-gradient(90deg, ${GOLD}, #fdba74)`,
                  padding: "18px 44px",
                  borderRadius: 999,
                  boxShadow: "0 10px 40px rgba(253,200,120,0.45)",
                  transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 2}deg)`,
                }}
              >
                {w}
              </div>
            </Rise>
          ))}
        </AbsoluteFill>
      );
    }
    case "lines": {
      const p = interpolate(frame, [20, 100], [0, 1], CLAMP);
      const verseAt = Math.round(d * 0.4);
      return (
        <AbsoluteFill style={{ ...center, gap: 50 }}>
          {scene.icon ? (
            <Icon icon={scene.icon} p={p} size={240} beat={p > 0.9} />
          ) : null}
          {scene.lines.map((l, i) => (
            <Rise
              key={i}
              delay={5 + i * Math.round(d * (scene.verse ? 0.12 : 0.25))}
            >
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: 72,
                  fontWeight: i === scene.lines.length - 1 ? 700 : 400,
                  color: i === scene.lines.length - 1 ? GOLD : "white",
                  lineHeight: 1.25,
                }}
              >
                {l}
              </div>
            </Rise>
          ))}
          {scene.verse ? (
            <Verse
              text={scene.verse.text}
              reference={scene.verse.ref}
              delay={verseAt}
            />
          ) : null}
        </AbsoluteFill>
      );
    }
    case "verse":
      return (
        <AbsoluteFill style={center}>
          <Verse text={scene.text} reference={scene.ref} delay={10} />
        </AbsoluteFill>
      );
    case "challenge": {
      const pop = spring({ frame, fps, config: { damping: 12 } });
      return (
        <AbsoluteFill style={{ ...center, gap: 60 }}>
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
            {scene.title}
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
              {scene.text}
            </div>
          </Rise>
        </AbsoluteFill>
      );
    }
    case "outro":
      return (
        <AbsoluteFill style={{ ...center, gap: 60 }}>
          <Icon icon={scene.icon} p={1} size={300} beat />
          <Rise delay={10}>
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 120,
                fontWeight: 700,
                color: GOLD,
                lineHeight: 1.1,
                textShadow: "0 0 50px rgba(253,200,120,0.8)",
              }}
            >
              {scene.text}
            </div>
          </Rise>
          <Rise delay={40}>
            <div style={{ fontFamily: SANS, fontSize: 46, opacity: 0.9 }}>
              {scene.sub}
            </div>
          </Rise>
        </AbsoluteFill>
      );
    case "stat": {
      const p = spring({
        frame: frame - 10,
        fps,
        config: { damping: 200 },
        durationInFrames: 50,
      });
      const ring = interpolate(frame, [10, 70], [0, 1], CLAMP);
      const R = 300;
      const C = 2 * Math.PI * R;
      return (
        <AbsoluteFill style={{ ...center, gap: 70 }}>
          <div style={{ position: "relative", width: 720, height: 720 }}>
            <svg width={720} height={720} viewBox="0 0 720 720">
              <circle
                cx={360}
                cy={360}
                r={R}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={18}
                fill="none"
              />
              <circle
                cx={360}
                cy={360}
                r={R}
                stroke={GOLD}
                strokeWidth={18}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={C}
                strokeDashoffset={C * (1 - ring)}
                transform="rotate(-90 360 360)"
                style={{
                  filter: "drop-shadow(0 0 18px rgba(253,200,120,0.8))",
                }}
              />
            </svg>
            <AbsoluteFill
              style={{ alignItems: "center", justifyContent: "center" }}
            >
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: 300,
                  fontWeight: 700,
                  color: GOLD,
                  lineHeight: 1,
                }}
              >
                {Math.round(p * scene.value)}
              </div>
              <div
                style={{
                  fontFamily: SANS,
                  fontSize: 56,
                  letterSpacing: 10,
                  textTransform: "uppercase",
                }}
              >
                {scene.unit}
              </div>
            </AbsoluteFill>
          </div>
          {scene.lines.map((l, i) => (
            <Rise key={i} delay={60 + i * 35}>
              <div
                style={{
                  fontFamily: SERIF,
                  fontSize: i === 0 ? 64 : 72,
                  fontStyle: i === 0 ? "italic" : "normal",
                  fontWeight: i === 0 ? 400 : 700,
                  color: i === 0 ? "white" : GOLD,
                  lineHeight: 1.25,
                }}
              >
                {l}
              </div>
            </Rise>
          ))}
        </AbsoluteFill>
      );
    }
    case "checklist": {
      const step = (d * 0.75 - 30) / scene.items.length;
      return (
        <AbsoluteFill style={{ ...center, gap: 50 }}>
          <Rise delay={0} style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: SERIF, fontSize: 84, fontWeight: 700 }}>
              {scene.title}
            </div>
          </Rise>
          {scene.items.map((it, i) => {
            const start = Math.round(25 + i * step);
            const tick = interpolate(
              frame,
              [start + 25, start + 45],
              [0, 1],
              CLAMP,
            );
            return (
              <Rise key={i} delay={start} style={{ width: "100%" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 40,
                    textAlign: "left",
                    padding: "44px 48px",
                    borderRadius: 36,
                    background: "rgba(255,255,255,0.08)",
                    border: `2px solid rgba(252,211,77,${0.25 + tick * 0.5})`,
                    boxShadow: `0 0 ${tick * 40}px rgba(253,200,120,0.35)`,
                  }}
                >
                  <svg
                    width={110}
                    height={110}
                    viewBox="0 0 100 100"
                    style={{ flexShrink: 0 }}
                  >
                    <rect
                      x={6}
                      y={6}
                      width={88}
                      height={88}
                      rx={24}
                      fill={tick > 0 ? GOLD : "none"}
                      fillOpacity={tick}
                      stroke={GOLD}
                      strokeWidth={6}
                    />
                    <path
                      d="M28 52 L44 67 L73 35"
                      fill="none"
                      stroke="#2a1606"
                      strokeWidth={10}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={70}
                      strokeDashoffset={70 * (1 - tick)}
                    />
                  </svg>
                  <div
                    style={{
                      fontFamily: SANS,
                      fontSize: 52,
                      fontWeight: 700,
                      lineHeight: 1.25,
                    }}
                  >
                    {it}
                  </div>
                </div>
              </Rise>
            );
          })}
        </AbsoluteFill>
      );
    }
    case "poll": {
      const btn = (label: string, good: boolean, delay: number) => {
        const p = spring({
          frame: frame - delay,
          fps,
          config: { damping: 14 },
        });
        const glow = 0.5 + 0.5 * Math.sin((frame - delay) / 8);
        return (
          <div
            style={{
              transform: `scale(${p})`,
              display: "flex",
              alignItems: "center",
              gap: 30,
              width: 820,
              padding: "38px 50px",
              borderRadius: 999,
              fontFamily: SANS,
              fontSize: 56,
              fontWeight: 800,
              color: good ? "#2a1606" : "white",
              background: good
                ? `linear-gradient(90deg, ${GOLD}, #fdba74)`
                : "rgba(255,255,255,0.1)",
              border: good ? "none" : "3px solid rgba(255,255,255,0.5)",
              boxShadow: good
                ? `0 0 ${30 + glow * 30}px rgba(253,200,120,0.6)`
                : undefined,
            }}
          >
            <svg width={70} height={70} viewBox="0 0 100 100">
              <circle
                cx={50}
                cy={50}
                r={44}
                fill="none"
                stroke={good ? "#2a1606" : "white"}
                strokeWidth={8}
              />
              {good ? (
                <path
                  d="M28 52 L44 67 L73 35"
                  fill="none"
                  stroke="#2a1606"
                  strokeWidth={10}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <path
                  d="M50 26 L50 52 L66 62"
                  fill="none"
                  stroke="white"
                  strokeWidth={8}
                  strokeLinecap="round"
                />
              )}
            </svg>
            {label}
          </div>
        );
      };
      const arrow = Math.sin(frame / 6) * 18;
      return (
        <AbsoluteFill style={{ ...center, gap: 56 }}>
          <Rise delay={0}>
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 92,
                fontWeight: 700,
                color: GOLD,
                lineHeight: 1.15,
                textShadow: "0 0 40px rgba(253,200,120,0.6)",
              }}
            >
              {scene.title}
            </div>
          </Rise>
          {btn(scene.yes, true, 25)}
          {btn(scene.no, false, 40)}
          <Rise delay={60}>
            <div
              style={{
                fontFamily: SERIF,
                fontStyle: "italic",
                fontSize: 54,
                lineHeight: 1.3,
              }}
            >
              {scene.sub}
            </div>
          </Rise>
          <svg
            width={90}
            height={90}
            viewBox="0 0 100 100"
            style={{
              transform: `translateY(${arrow}px)`,
              opacity: interpolate(frame, [70, 85], [0, 1], CLAMP),
            }}
          >
            <path
              d="M50 10 L50 85 M22 58 L50 86 L78 58"
              fill="none"
              stroke={GOLD}
              strokeWidth={9}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </AbsoluteFill>
      );
    }
  }
};

export const Story: React.FC<StoryProps> = ({
  hues,
  voice,
  music,
  musicVolume,
  scenes,
}) => {
  let from = 0;
  return (
    <AbsoluteFill>
      <Background hues={hues} />
      {music ? <Audio src={staticFile(music)} volume={musicVolume} /> : null}
      {voice ? <Audio src={staticFile(voice)} /> : null}
      {scenes.map((s, i) => {
        const start = from;
        from += s.frames;
        return (
          <Sequence key={i} from={start} durationInFrames={s.frames}>
            <Fade last={i === scenes.length - 1}>
              <SceneView scene={s} />
            </Fade>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Video 1 — « Les paroles qui guérissent »
export const parolesDefaults: StoryProps = {
  hues: { from: [265, 330], to: [390, 378] },
  voice: null,
  music: null,
  musicVolume: 0.25,
  scenes: [
    {
      kind: "icon",
      icon: "heart",
      heal: true,
      frames: 165,
      lines: ["Les mots peuvent blesser…", "mais ils peuvent aussi guérir."],
    },
    {
      kind: "pills",
      frames: 345,
      title: "Un seul mot peut relever quelqu'un",
      items: [
        "« Je te pardonne »",
        "« Tu comptes pour moi »",
        "« Je prie pour toi »",
        "« Tu n'es pas seul(e) »",
        "« Je suis fier de toi »",
        "« Merci »",
        "« Dieu t'aime »",
      ],
    },
    {
      kind: "lines",
      frames: 300,
      icon: "heart",
      lines: [
        "Pardonner, c'est retirer la flèche…",
        "et laisser Dieu soigner la blessure.",
      ],
      verse: {
        text: "De même que Christ vous a pardonné, pardonnez-vous aussi.",
        ref: "Colossiens 3:13",
      },
    },
    {
      kind: "verse",
      frames: 270,
      text: "Les paroles agréables sont un rayon de miel, douces pour l'âme et salutaires pour le corps.",
      ref: "Proverbes 16:24",
    },
    {
      kind: "challenge",
      frames: 180,
      title: "Défi du jour",
      text: "Envoie aujourd'hui un message d'encouragement à quelqu'un qui en a besoin.",
    },
    {
      kind: "outro",
      frames: 150,
      icon: "heart",
      text: "Tu es aimé(e)",
      sub: "Partage cette vidéo à quelqu'un",
    },
  ],
};

// ---------------------------------------------------------------------------
// Video 2 — « Dieu ne t'a pas oublié » (night → sunrise)
export const courageDefaults: StoryProps = {
  hues: { from: [235, 260], to: [395, 385] },
  voice: "courage_voix.wav",
  music: "courage_musique.wav",
  musicVolume: 0.25,
  scenes: [
    {
      kind: "icon",
      icon: "sun",
      frames: 211,
      lines: [
        "Tu traverses peut-être une saison difficile…",
        "Dieu te voit encore.",
      ],
    },
    {
      kind: "title",
      frames: 120,
      lines: ["Écoute bien :", "Dieu ne t'a pas oublié."],
    },
    {
      kind: "pills",
      frames: 273,
      title: "Ce que Dieu dit de toi",
      items: [
        "Tu es précieux(se) à ses yeux",
        "Tu n'es pas seul(e)",
        "Ta tempête ne durera pas",
        "Ton histoire n'est pas finie",
        "Dieu combat pour toi",
      ],
    },
    {
      kind: "verse",
      frames: 339,
      text: "Ne crains rien, car je suis avec toi ; ne promène pas des regards inquiets, car je suis ton Dieu ; je te fortifie, je viens à ton secours.",
      ref: "Ésaïe 41:10",
    },
    {
      kind: "verse",
      frames: 331,
      text: "Car je connais les projets que j'ai formés sur vous, dit l'Éternel, projets de paix et non de malheur, afin de vous donner un avenir et de l'espérance.",
      ref: "Jérémie 29:11",
    },
    {
      kind: "lines",
      frames: 147,
      icon: "sun",
      lines: [
        "Relève la tête.",
        "Continue d'avancer.",
        "Le meilleur est devant toi.",
      ],
    },
    {
      kind: "outro",
      frames: 175,
      icon: "sun",
      text: "Dieu est avec toi",
      sub: "Partage à quelqu'un qui en a besoin",
    },
  ],
};

// ---------------------------------------------------------------------------
// Video 3 — weekly reminder: 3 minutes of meditation + Weclick, then poll
export const meditationDefaults: StoryProps = {
  hues: { from: [225, 245], to: [255, 285] },
  voice: null,
  music: "meditation_musique.wav",
  musicVolume: 0.5,
  scenes: [
    {
      kind: "title",
      frames: 150,
      lines: ["Rappel de la semaine", "As-tu nourri ton esprit ?"],
    },
    {
      kind: "stat",
      frames: 210,
      value: 3,
      unit: "minutes",
      lines: ["sur les 1 440 minutes de ta journée…", "pour la Parole."],
    },
    {
      kind: "pills",
      frames: 270,
      title: "Pourquoi c'est important",
      items: [
        "Nourrir son esprit chaque jour",
        "Rester connecté(e) à la Parole",
        "Grandir ensemble, pas à pas",
        "Rester fidèle et constant(e)",
      ],
    },
    {
      kind: "verse",
      frames: 300,
      text: "Heureux celui qui lit et ceux qui entendent les paroles de la prophétie, et qui gardent les choses qui y sont écrites ! Car le temps est proche.",
      ref: "Apocalypse 1:3",
    },
    {
      kind: "checklist",
      frames: 240,
      title: "Cette semaine, as-tu…",
      items: [
        "Écouté les 3 minutes de méditation de la parole du PP ?",
        "Fait Weclick au moins une fois ?",
      ],
    },
    {
      kind: "poll",
      frames: 240,
      title: "Réponds au sondage",
      yes: "Oui, c'est fait !",
      no: "Pas encore…",
      sub: "Il n'est jamais trop tard : fais-le aujourd'hui !",
    },
  ],
};
