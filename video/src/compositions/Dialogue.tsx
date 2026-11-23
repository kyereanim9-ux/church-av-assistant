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
import { LOOKS, Person, type Pose } from "./Characters";
import { Background, CLAMP, GOLD, SANS, SERIF } from "./Story";

/**
 * Two animated characters talk; a narrator opens and closes.
 * Each line has its own voice clip `${voicePrefix}${i + 1}.wav`.
 */
type Mood = "sad" | "neutral" | "happy";
export type DialogueLine = {
  who: "A" | "B" | "N";
  text: string;
  seconds: number;
  /** Optional state changes that apply from this line on */
  moodA?: Mood;
  moodB?: Mood;
  poseA?: Pose;
  poseB?: Pose;
  /** Narrator lines: big title + small caption */
  title?: string;
  caption?: string;
};

export type DialogueProps = {
  nameA: string;
  nameB: string;
  voicePrefix: string;
  music: string | null;
  musicVolume: number;
  lines: DialogueLine[];
};

const LEAD = 6;
const lineFrames = (l: DialogueLine) =>
  Math.round((l.seconds + (l.who === "N" ? 1.2 : 0.5)) * 30) + LEAD;
export const dialogueDuration = (p: DialogueProps) =>
  Math.max(
    1,
    p.lines.reduce((s, l) => s + lineFrames(l), 0),
  );

export const dialogueDefaults: DialogueProps = {
  nameA: "Daniel",
  nameB: "Grâce",
  voicePrefix: "dlg_",
  music: "dlg_musique.wav",
  musicVolume: 0.18,
  lines: [
    {
      who: "N",
      seconds: 7.58,
      title: "Le pouvoir de la langue",
      caption:
        "« La mort et la vie sont au pouvoir de la langue. » — Proverbes 18:21",
      text: "",
      moodA: "sad",
      moodB: "neutral",
      poseA: "idle",
      poseB: "idle",
    },
    {
      who: "A",
      seconds: 5.02,
      text: "Je prie chaque jour pour que les choses changent… mais franchement, rien ne changera jamais.",
    },
    {
      who: "B",
      seconds: 6.84,
      text: "Attends… Tu demandes à Dieu d'ouvrir un chemin, et juste après, tu dis que rien ne changera ?",
    },
    {
      who: "A",
      seconds: 5.11,
      text: "C'est ce que je ressens. Je ne suis pas assez fort. Je n'y arriverai jamais.",
    },
    {
      who: "B",
      seconds: 6.91,
      poseB: "point",
      text: "Tes paroles ne montrent pas seulement ce que tu penses. Elles façonnent aussi ce que tu crois.",
    },
    { who: "A", seconds: 1.87, moodA: "neutral", text: "Comment ça ?" },
    {
      who: "B",
      seconds: 7.97,
      text: "Si tu répètes « je ne peux pas », tu finiras par arrêter d'essayer. Ta bouche doit être d'accord avec ta foi.",
    },
    {
      who: "A",
      seconds: 2.09,
      moodA: "sad",
      poseB: "idle",
      text: "Mais je ne vois aucune réponse…",
    },
    {
      who: "B",
      seconds: 7.78,
      moodB: "happy",
      text: "Ce n'est pas parce que tu ne vois rien que Dieu ne travaille pas. Une porte fermée ne veut pas dire qu'une autre ne va pas s'ouvrir.",
    },
    {
      who: "A",
      seconds: 7.73,
      moodA: "happy",
      poseA: "cheer",
      text: "Tu as raison ! À partir d'aujourd'hui, je change mes paroles. Je crois encore. Dieu ne m'a pas oublié !",
    },
    {
      who: "B",
      seconds: 7.25,
      poseA: "idle",
      poseB: "wave",
      text: "Amen ! Tu traverses peut-être un chapitre difficile, mais ce chapitre n'est pas toute ton histoire.",
    },
    {
      who: "N",
      seconds: 7.03,
      poseA: "cheer",
      poseB: "cheer",
      title: "Tes paroles ont du pouvoir",
      caption:
        "Utilise-les pour être d'accord avec ta foi, pas avec ta frustration.",
      text: "",
    },
  ],
};

// --- Scenery -----------------------------------------------------------------

const Tree: React.FC<{ x: number; s: number; tone: string }> = ({
  x,
  s,
  tone,
}) => {
  const frame = useCurrentFrame();
  const sway = Math.sin(frame / 40 + x) * 1.5;
  return (
    <svg
      width={300 * s}
      height={520 * s}
      viewBox="0 0 300 520"
      style={{
        position: "absolute",
        left: x,
        bottom: 520,
        overflow: "visible",
      }}
    >
      <g transform={`rotate(${sway} 150 520)`}>
        <rect
          x={135}
          y={260}
          width={30}
          height={260}
          rx={10}
          fill="rgba(20,10,30,0.55)"
        />
        <circle cx={150} cy={190} r={120} fill={tone} />
        <circle cx={80} cy={250} r={80} fill={tone} />
        <circle cx={220} cy={250} r={85} fill={tone} />
      </g>
    </svg>
  );
};

const Scenery: React.FC = () => (
  <>
    <Tree x={-90} s={1.15} tone="rgba(40,20,60,0.55)" />
    <Tree x={800} s={1} tone="rgba(40,20,60,0.5)" />
    <Tree x={560} s={0.6} tone="rgba(60,30,80,0.4)" />
    {/* hill */}
    <div
      style={{
        position: "absolute",
        left: -300,
        right: -300,
        bottom: -700,
        height: 1260,
        borderRadius: "50%",
        background:
          "linear-gradient(180deg, rgba(64,40,90,0.9), rgba(30,18,46,1))",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: -300,
        right: -300,
        bottom: -700,
        height: 1260,
        borderRadius: "50%",
        background:
          "radial-gradient(ellipse at 50% 8%, rgba(253,224,140,0.25), transparent 40%)",
      }}
    />
  </>
);

// --- Bubble ------------------------------------------------------------------

const Bubble: React.FC<{
  line: DialogueLine;
  name: string;
  frames: number;
}> = ({ line, name, frames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 14 } });
  const out = interpolate(frame, [frames - 6, frames], [1, 0], CLAMP);
  const words = line.text.split(" ");
  const speak = (line.seconds * 30) / words.length;
  const isA = line.who === "A";
  const color = isA ? "#93c5fd" : "#f9a8d4";
  return (
    <div
      style={{
        position: "absolute",
        top: 330,
        left: 70,
        right: 70,
        opacity: out,
        transform: `scale(${p})`,
        transformOrigin: isA ? "15% 100%" : "85% 100%",
      }}
    >
      <div
        style={{
          display: "inline-block",
          marginLeft: isA ? 20 : undefined,
          float: isA ? "left" : "right",
          marginRight: isA ? undefined : 20,
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 40,
          color: "#1e1027",
          background: color,
          padding: "10px 30px",
          borderRadius: 999,
          marginBottom: 16,
        }}
      >
        {name}
      </div>
      <div style={{ clear: "both" }} />
      <div
        style={{
          position: "relative",
          background: "white",
          color: "#1e1027",
          borderRadius: 48,
          padding: "44px 50px",
          fontFamily: SANS,
          fontSize: 54,
          fontWeight: 600,
          lineHeight: 1.32,
          boxShadow: `0 20px 60px rgba(0,0,0,0.35), 0 0 0 6px ${color}`,
        }}
      >
        {words.map((w, i) => (
          <span
            key={i}
            style={{
              opacity: interpolate(
                frame - LEAD - i * speak,
                [0, 4],
                [0.15, 1],
                CLAMP,
              ),
            }}
          >
            {w}{" "}
          </span>
        ))}
        {/* tail */}
        <svg
          width={90}
          height={80}
          viewBox="0 0 90 80"
          style={{
            position: "absolute",
            bottom: -70,
            left: isA ? 120 : undefined,
            right: isA ? undefined : 120,
            transform: isA ? undefined : "scaleX(-1)",
          }}
        >
          <path
            d="M0 0 L90 0 L10 76 Z"
            fill="white"
            stroke={color}
            strokeWidth={6}
            strokeLinejoin="round"
          />
          <rect x={-2} y={-8} width={94} height={10} fill="white" />
        </svg>
      </div>
    </div>
  );
};

const Narration: React.FC<{
  line: DialogueLine;
  frames: number;
  last: boolean;
}> = ({ line, frames, last }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 200 } });
  const p2 = spring({ frame: frame - 25, fps, config: { damping: 200 } });
  const out = last
    ? 1
    : interpolate(frame, [frames - 10, frames], [1, 0], CLAMP);
  return (
    <div
      style={{
        position: "absolute",
        top: 230,
        left: 70,
        right: 70,
        textAlign: "center",
        color: "white",
        opacity: out,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 40,
      }}
    >
      <div
        style={{
          opacity: p,
          transform: `translateY(${(1 - p) * 40}px)`,
          fontFamily: SERIF,
          fontSize: 112,
          fontWeight: 700,
          color: GOLD,
          lineHeight: 1.1,
          textShadow: "0 0 50px rgba(253,200,120,0.7)",
        }}
      >
        {line.title}
      </div>
      <div
        style={{
          opacity: p2,
          transform: `translateY(${(1 - p2) * 40}px)`,
          fontFamily: SERIF,
          fontStyle: "italic",
          fontSize: 60,
          lineHeight: 1.3,
          background: "rgba(0,0,0,0.25)",
          border: "3px solid rgba(252,211,77,0.6)",
          borderRadius: 36,
          padding: "36px 44px",
        }}
      >
        {line.caption}
      </div>
    </div>
  );
};

// --- Composition -------------------------------------------------------------

export const Dialogue: React.FC<DialogueProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Resolve per-line state
  const starts: number[] = [];
  let acc = 0;
  for (const l of p.lines) {
    starts.push(acc);
    acc += lineFrames(l);
  }
  let idx = 0;
  for (let i = 0; i < starts.length; i++) if (frame >= starts[i]) idx = i;
  let moodA: Mood = "neutral";
  let moodB: Mood = "neutral";
  let poseA: Pose = "idle";
  let poseB: Pose = "idle";
  for (let i = 0; i <= idx; i++) {
    const l = p.lines[i];
    moodA = l.moodA ?? moodA;
    moodB = l.moodB ?? moodB;
    poseA = l.poseA ?? poseA;
    poseB = l.poseB ?? poseB;
  }
  const cur = p.lines[idx];
  const inLine = frame - starts[idx];
  const speaking = inLine >= LEAD && inLine < LEAD + cur.seconds * 30;
  const enterA = spring({ frame: frame - 5, fps, config: { damping: 16 } });
  const enterB = spring({ frame: frame - 15, fps, config: { damping: 16 } });
  const lean = (who: "A" | "B") => (cur.who === who && speaking ? 1 : 0);

  return (
    <AbsoluteFill>
      <Background hues={{ from: [225, 250], to: [390, 380] }} />
      <Scenery />
      {p.music ? (
        <Audio src={staticFile(p.music)} volume={p.musicVolume} />
      ) : null}

      {/* characters */}
      <div
        style={{
          position: "absolute",
          left: 20,
          bottom: 130,
          transform: `translateX(${(1 - enterA) * -600}px) scale(${1 + lean("A") * 0.03})`,
          transformOrigin: "bottom center",
        }}
      >
        <Person
          look={LOOKS[0]}
          pose={poseA}
          mood={moodA}
          talking={cur.who === "A" && speaking}
          height={920}
        />
      </div>
      <div
        style={{
          position: "absolute",
          right: 20,
          bottom: 130,
          transform: `translateX(${(1 - enterB) * 600}px) scale(${1 + lean("B") * 0.03})`,
          transformOrigin: "bottom center",
        }}
      >
        <Person
          look={LOOKS[2]}
          pose={poseB}
          mood={moodB}
          talking={cur.who === "B" && speaking}
          height={920}
          offset={37}
        />
      </div>

      {/* lines */}
      {p.lines.map((l, i) => (
        <Sequence key={i} from={starts[i]} durationInFrames={lineFrames(l)}>
          {l.who === "N" ? (
            <Narration
              line={l}
              frames={lineFrames(l)}
              last={i === p.lines.length - 1}
            />
          ) : (
            <Bubble
              line={l}
              name={l.who === "A" ? p.nameA : p.nameB}
              frames={lineFrames(l)}
            />
          )}
          <Sequence from={LEAD}>
            <Audio src={staticFile(`${p.voicePrefix}${i + 1}.wav`)} />
          </Sequence>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
