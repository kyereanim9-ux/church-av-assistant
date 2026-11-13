import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { LOOKS, Person } from "./Characters";
import { Background, CLAMP, GOLD, Rise, SANS, SERIF, Verse } from "./Story";

/**
 * Weekly reminder with animated characters:
 * 3 minutes of meditation + Weclick, then a call to answer the Telegram poll.
 * Each scene has its own voice clip; scene length = clip length + padding.
 */
export type RappelProps = {
  /** Voice clip length in seconds per scene (7 scenes). */
  voiceSeconds: number[];
  voicePrefix: string;
  music: string | null;
  musicVolume: number;
  texts: {
    intro: [string, string];
    minutes: [string, string];
    weclickTitle: string;
    weclickButton: string;
    weclickDone: string;
    whyTitle: string;
    why: string[];
    verse: { text: string; ref: string };
    checkTitle: string;
    check: string[];
    pollTitle: string;
    pollYes: string;
    pollNo: string;
    pollSub: string;
  };
};

const LEAD = 12; // frames of silence before each voice clip
const PAD = 1.0; // seconds after each clip

export const rappelSceneFrames = (p: RappelProps) =>
  p.voiceSeconds.map((s) => Math.round((s + PAD) * 30) + LEAD);
export const rappelDuration = (p: RappelProps) =>
  Math.max(
    1,
    rappelSceneFrames(p).reduce((a, b) => a + b, 0),
  );

export const rappelDefaults: RappelProps = {
  voiceSeconds: [7.78, 9.77, 5.02, 10.49, 12.24, 6.58, 9.62],
  voicePrefix: "rappel_v",
  music: "rappel_musique.wav",
  musicVolume: 0.22,
  texts: {
    intro: ["Rappel de la semaine", "As-tu nourri ton esprit\u00a0?"],
    minutes: [
      "de méditation de la parole du PP",
      "sur 1 440 minutes dans ta journée !",
    ],
    weclickTitle: "Et un petit Weclick !",
    weclickButton: "Weclick",
    weclickDone: "C'est fait !",
    whyTitle: "Pourquoi c'est important\u00a0?",
    why: [
      "La Parole nourrit notre esprit",
      "Ensemble, on grandit pas à pas",
      "La fidélité se construit dans les petites choses",
    ],
    verse: {
      text: "Heureux celui qui lit et ceux qui entendent les paroles de la prophétie, et qui gardent les choses qui y sont écrites ! Car le temps est proche.",
      ref: "Apocalypse 1:3",
    },
    checkTitle: "Cette semaine, as-tu…",
    check: [
      "Écouté les 3 minutes de méditation de la parole du PP ?",
      "Fait Weclick au moins une fois ?",
    ],
    pollTitle: "Réponds au sondage\u00a0!",
    pollYes: "Oui, c'est fait !",
    pollNo: "Pas encore…",
    pollSub: "Il n'est jamais trop tard : fais-le aujourd'hui\u00a0!",
  },
};

const Floor: React.FC = () => (
  <div
    style={{
      position: "absolute",
      left: -100,
      right: -100,
      bottom: -260,
      height: 520,
      borderRadius: "50%",
      background:
        "radial-gradient(ellipse at 50% 30%, rgba(253,224,140,0.22), rgba(255,255,255,0.04) 60%, transparent 70%)",
    }}
  />
);

const Stage: React.FC<{ children: React.ReactNode; bottom?: number }> = ({
  children,
  bottom = 120,
}) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      bottom,
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-end",
      gap: 10,
    }}
  >
    {children}
  </div>
);

const Pop: React.FC<{ delay: number; children: React.ReactNode }> = ({
  delay,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 13 } });
  return (
    <div
      style={{
        transform: `scale(${p}) translateY(${(1 - p) * 120}px)`,
        transformOrigin: "bottom center",
      }}
    >
      {children}
    </div>
  );
};

const Title: React.FC<{
  text: string;
  size?: number;
  color?: string;
  delay?: number;
}> = ({ text, size = 86, color = "white", delay = 0 }) => (
  <Rise delay={delay}>
    <div
      style={{
        fontFamily: SERIF,
        fontSize: size,
        fontWeight: 700,
        color,
        lineHeight: 1.15,
        textAlign: "center",
        textShadow:
          color === GOLD
            ? "0 0 40px rgba(253,200,120,0.6)"
            : "0 4px 20px rgba(0,0,0,0.3)",
      }}
    >
      {text}
    </div>
  </Rise>
);

const Top: React.FC<{
  children: React.ReactNode;
  top?: number;
  gap?: number;
}> = ({ children, top = 170, gap = 36 }) => (
  <div
    style={{
      position: "absolute",
      top,
      left: 80,
      right: 80,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap,
      color: "white",
    }}
  >
    {children}
  </div>
);

const Sparkles: React.FC<{
  x: number;
  y: number;
  spread?: number;
  note?: boolean;
}> = ({ x, y, spread = 220, note }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {new Array(8).fill(0).map((_, i) => {
        const t = ((frame + i * 17) % 90) / 90;
        const ang = (i / 8) * Math.PI * 2;
        const px = x + Math.cos(ang) * spread * (0.4 + t * 0.6);
        const py = y - t * 220 + Math.sin(ang) * 40;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: px,
              top: py,
              opacity: Math.sin(t * Math.PI),
              fontFamily: SERIF,
              fontSize: note ? 70 : 44,
              color: GOLD,
              textShadow: "0 0 20px rgba(253,200,120,0.9)",
            }}
          >
            {note ? (i % 2 ? "♪" : "♫") : "✦"}
          </div>
        );
      })}
    </>
  );
};

// --- Scenes ---------------------------------------------------------------

const Intro: React.FC<{ t: RappelProps["texts"] }> = ({ t }) => (
  <AbsoluteFill>
    <Floor />
    <Top top={260} gap={50}>
      <Rise delay={0}>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 44,
            letterSpacing: 10,
            textTransform: "uppercase",
            color: GOLD,
            border: `2px solid ${GOLD}`,
            borderRadius: 999,
            padding: "14px 40px",
          }}
        >
          {t.intro[0]}
        </div>
      </Rise>
      <Title text={t.intro[1]} size={110} color={GOLD} delay={90} />
    </Top>
    <Stage>
      <Pop delay={10}>
        <Person look={LOOKS[0]} pose="wave" height={860} />
      </Pop>
    </Stage>
  </AbsoluteFill>
);

const Minutes: React.FC<{ t: RappelProps["texts"] }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({
    frame: frame - 10,
    fps,
    config: { damping: 200 },
    durationInFrames: 60,
  });
  const ring = interpolate(frame, [10, 120], [0, 1], CLAMP);
  const R = 200;
  const C = 2 * Math.PI * R;
  return (
    <AbsoluteFill>
      <Floor />
      <Top top={130} gap={24}>
        <div style={{ position: "relative", width: 480, height: 480 }}>
          <svg width={480} height={480} viewBox="0 0 480 480">
            <circle
              cx={240}
              cy={240}
              r={R}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={16}
              fill="none"
            />
            <circle
              cx={240}
              cy={240}
              r={R}
              stroke={GOLD}
              strokeWidth={16}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - ring)}
              transform="rotate(-90 240 240)"
              style={{ filter: "drop-shadow(0 0 16px rgba(253,200,120,0.8))" }}
            />
          </svg>
          <AbsoluteFill
            style={{
              alignItems: "center",
              justifyContent: "center",
              color: "white",
            }}
          >
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 210,
                fontWeight: 700,
                color: GOLD,
                lineHeight: 1,
              }}
            >
              {Math.max(1, Math.round(p * 3))}
            </div>
            <div style={{ fontFamily: SANS, fontSize: 44, letterSpacing: 10 }}>
              MINUTES
            </div>
          </AbsoluteFill>
        </div>
        <Title text={t.minutes[0]} size={62} delay={40} />
        <Title text={t.minutes[1]} size={58} color={GOLD} delay={170} />
      </Top>
      <Sparkles x={500} y={1180} note spread={300} />
      <Stage bottom={80}>
        <Pop delay={5}>
          <Person look={LOOKS[2]} pose="listen" height={760} />
        </Pop>
      </Stage>
    </AbsoluteFill>
  );
};

const Weclick: React.FC<{ t: RappelProps["texts"] }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const TAP = 70;
  const tap = interpolate(frame, [TAP - 10, TAP, TAP + 10], [0, 1, 0], CLAMP);
  const done = spring({ frame: frame - TAP - 5, fps, config: { damping: 12 } });
  const ripple = interpolate(frame, [TAP, TAP + 25], [0, 1], CLAMP);
  const fingerY = interpolate(
    frame,
    [20, TAP - 5, TAP, TAP + 15],
    [220, 30, 10, 120],
    CLAMP,
  );
  const phoneIn = spring({ frame: frame - 5, fps, config: { damping: 15 } });
  return (
    <AbsoluteFill>
      <Floor />
      <Top top={150}>
        <Title text={t.weclickTitle} size={96} color={GOLD} />
      </Top>
      {/* big phone mock-up */}
      <div
        style={{
          position: "absolute",
          left: 560,
          top: 470,
          width: 420,
          height: 820,
          borderRadius: 64,
          background: "#0f172a",
          border: "10px solid #1e293b",
          boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
          transform: `translateX(${(1 - phoneIn) * 500}px) rotate(${(1 - phoneIn) * 15 + 4}deg)`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 18,
            left: 150,
            width: 100,
            height: 22,
            borderRadius: 11,
            background: "#000",
          }}
        />
        <AbsoluteFill
          style={{ alignItems: "center", justifyContent: "center", gap: 40 }}
        >
          <div style={{ position: "relative", width: 300, height: 300 }}>
            {/* button */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                transform: `scale(${1 - tap * 0.12})`,
                background:
                  done > 0.05
                    ? "linear-gradient(135deg,#34d399,#059669)"
                    : `linear-gradient(135deg, ${GOLD}, #f97316)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 60px rgba(253,200,120,0.6)",
              }}
            >
              {done > 0.05 ? (
                <svg
                  width={170}
                  height={170}
                  viewBox="0 0 100 100"
                  style={{ transform: `scale(${done})` }}
                >
                  <path
                    d="M24 52 L43 70 L77 32"
                    fill="none"
                    stroke="white"
                    strokeWidth={12}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <div
                  style={{
                    fontFamily: SANS,
                    fontWeight: 800,
                    fontSize: 60,
                    color: "#2a1606",
                  }}
                >
                  {t.weclickButton}
                </div>
              )}
            </div>
            {/* ripple */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: `8px solid ${GOLD}`,
                transform: `scale(${1 + ripple * 0.6})`,
                opacity: ripple > 0 ? 1 - ripple : 0,
              }}
            />
            {/* finger */}
            <div
              style={{
                position: "absolute",
                left: 170,
                top: 150 + fingerY,
                width: 70,
                height: 160,
                borderRadius: 35,
                background: LOOKS[1].skin,
                opacity: interpolate(
                  frame,
                  [15, 25, TAP + 15, TAP + 25],
                  [0, 1, 1, 0],
                  CLAMP,
                ),
                boxShadow: "0 10px 20px rgba(0,0,0,0.3)",
              }}
            />
          </div>
          <div
            style={{
              fontFamily: SANS,
              fontSize: 54,
              fontWeight: 800,
              color: "#34d399",
              opacity: done,
              transform: `scale(${done})`,
            }}
          >
            {t.weclickDone}
          </div>
        </AbsoluteFill>
      </div>
      <div style={{ position: "absolute", left: 60, bottom: 110 }}>
        <Pop delay={0}>
          <Person
            look={LOOKS[1]}
            pose={frame > TAP + 10 ? "cheer" : "phone"}
            height={760}
            tap={tap}
          />
        </Pop>
      </div>
    </AbsoluteFill>
  );
};

const Why: React.FC<{ t: RappelProps["texts"]; frames: number }> = ({
  t,
  frames,
}) => {
  const step = (frames * 0.75 - 60) / t.why.length;
  return (
    <AbsoluteFill>
      <Floor />
      <Top top={150} gap={34}>
        <Title text={t.whyTitle} size={84} />
        {t.why.map((w, i) => (
          <Rise key={w} delay={Math.round(60 + i * step)}>
            <div
              style={{
                fontFamily: SANS,
                fontSize: 48,
                fontWeight: 700,
                color: "#2a1606",
                textAlign: "center",
                background: `linear-gradient(90deg, ${GOLD}, #fdba74)`,
                padding: "20px 44px",
                borderRadius: 40,
                boxShadow: "0 10px 40px rgba(253,200,120,0.45)",
                maxWidth: 900,
                lineHeight: 1.25,
              }}
            >
              {w}
            </div>
          </Rise>
        ))}
      </Top>
      <Sparkles x={520} y={1150} spread={420} />
      <Stage bottom={90}>
        {[3, 4, 0].map((li, i) => (
          <Pop key={li} delay={10 + i * 10}>
            <Person
              look={LOOKS[li]}
              pose={i === 1 ? "wave" : "idle"}
              height={i === 1 ? 680 : 620}
              offset={i * 23}
            />
          </Pop>
        ))}
      </Stage>
    </AbsoluteFill>
  );
};

const Reading: React.FC<{ t: RappelProps["texts"] }> = ({ t }) => (
  <AbsoluteFill>
    <Floor />
    <Top top={170}>
      <Verse text={t.verse.text} reference={t.verse.ref} delay={40} />
    </Top>
    <Sparkles x={500} y={1300} spread={200} />
    <Stage bottom={90}>
      <Pop delay={0}>
        <Person look={LOOKS[4]} pose="read" height={720} />
      </Pop>
    </Stage>
  </AbsoluteFill>
);

const Check: React.FC<{ t: RappelProps["texts"]; frames: number }> = ({
  t,
  frames,
}) => {
  const frame = useCurrentFrame();
  const step = (frames * 0.7 - 30) / t.check.length;
  return (
    <AbsoluteFill>
      <Floor />
      <Top top={150} gap={40}>
        <Title text={t.checkTitle} size={84} />
        {t.check.map((it, i) => {
          const start = Math.round(30 + i * step);
          const tick = interpolate(
            frame,
            [start + 30, start + 50],
            [0, 1],
            CLAMP,
          );
          return (
            <Rise key={i} delay={start} style={{ width: "100%" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 36,
                  padding: "36px 44px",
                  borderRadius: 36,
                  background: "rgba(255,255,255,0.08)",
                  border: `2px solid rgba(252,211,77,${0.25 + tick * 0.5})`,
                  boxShadow: `0 0 ${tick * 40}px rgba(253,200,120,0.35)`,
                }}
              >
                <svg
                  width={100}
                  height={100}
                  viewBox="0 0 100 100"
                  style={{ flexShrink: 0 }}
                >
                  <rect
                    x={6}
                    y={6}
                    width={88}
                    height={88}
                    rx={24}
                    fill={GOLD}
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
                    fontSize: 48,
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
      </Top>
      <Stage bottom={90}>
        <Pop delay={5}>
          <Person look={LOOKS[0]} pose="point" height={720} />
        </Pop>
      </Stage>
    </AbsoluteFill>
  );
};

const Poll: React.FC<{ t: RappelProps["texts"] }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const btn = (label: string, good: boolean, delay: number) => {
    const p = spring({ frame: frame - delay, fps, config: { damping: 14 } });
    const glow = 0.5 + 0.5 * Math.sin((frame - delay) / 8);
    return (
      <div
        style={{
          transform: `scale(${p})`,
          display: "flex",
          alignItems: "center",
          gap: 28,
          width: 800,
          padding: "32px 48px",
          borderRadius: 999,
          fontFamily: SANS,
          fontSize: 54,
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
        <svg width={64} height={64} viewBox="0 0 100 100">
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
  const arrow = Math.sin(frame / 6) * 16;
  return (
    <AbsoluteFill>
      <Floor />
      <Top top={140} gap={40}>
        <Title text={t.pollTitle} size={96} color={GOLD} />
        {btn(t.pollYes, true, 20)}
        {btn(t.pollNo, false, 35)}
        <Rise delay={90}>
          <div
            style={{
              fontFamily: SERIF,
              fontStyle: "italic",
              fontSize: 52,
              lineHeight: 1.3,
              textAlign: "center",
            }}
          >
            {t.pollSub}
          </div>
        </Rise>
        <svg
          width={80}
          height={80}
          viewBox="0 0 100 100"
          style={{
            transform: `translateY(${arrow}px)`,
            opacity: interpolate(frame, [30, 45], [0, 1], CLAMP),
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
      </Top>
      <Sparkles x={520} y={1250} spread={460} />
      <Stage bottom={80}>
        {[1, 2, 0, 3].map((li, i) => (
          <Pop key={li} delay={5 + i * 8}>
            <Person
              look={LOOKS[li]}
              pose="cheer"
              height={380}
              offset={i * 11}
            />
          </Pop>
        ))}
      </Stage>
    </AbsoluteFill>
  );
};

// --- Composition ------------------------------------------------------------

const SceneFade: React.FC<{ last: boolean; children: React.ReactNode }> = ({
  last,
  children,
}) => {
  const f = useCurrentFrame();
  const { durationInFrames: d } = useVideoConfig();
  const o = last
    ? interpolate(f, [0, 12], [0, 1], CLAMP)
    : interpolate(f, [0, 12, d - 12, d], [0, 1, 1, 0], CLAMP);
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export const Rappel: React.FC<RappelProps> = (p) => {
  const frames = rappelSceneFrames(p);
  const t = p.texts;
  const scenes = [
    <Intro key="a" t={t} />,
    <Minutes key="b" t={t} />,
    <Weclick key="c" t={t} />,
    <Why key="d" t={t} frames={frames[3]} />,
    <Reading key="e" t={t} />,
    <Check key="f" t={t} frames={frames[5]} />,
    <Poll key="g" t={t} />,
  ];
  let from = 0;
  return (
    <AbsoluteFill>
      <Background hues={{ from: [225, 245], to: [255, 285] }} />
      {p.music ? (
        <Audio src={staticFile(p.music)} volume={p.musicVolume} />
      ) : null}
      {scenes.map((s, i) => {
        const start = from;
        from += frames[i];
        return (
          <Sequence key={i} from={start} durationInFrames={frames[i]}>
            <SceneFade last={i === scenes.length - 1}>{s}</SceneFade>
            <Sequence from={LEAD}>
              <Audio src={staticFile(`${p.voicePrefix}${i + 1}.wav`)} />
            </Sequence>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
