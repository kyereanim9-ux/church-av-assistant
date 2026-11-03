import {
  AbsoluteFill,
  Audio,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type TimedWord = { text: string; start: number; end: number };
export type TimedLine = { start: number; end: number; words: TimedWord[] };

export type FoundMeProps = {
  songTitle: string;
  artist: string;
  /** File in video/public, or "" for a silent render. */
  audioFile: string;
  /** Second at which the background turns from night to dawn (the chorus). */
  dawnAt: number;
  durationSeconds: number;
  lines: TimedLine[];
};

/** Build evenly timed words for a line when no word timestamps exist. */
const line = (text: string, start: number, end: number): TimedLine => {
  const parts = text.split(" ");
  const step = (end - start) / parts.length;
  return {
    start,
    end,
    words: parts.map((p, i) => ({
      text: p,
      start: start + i * step,
      end: start + (i + 1) * step,
    })),
  };
};

export const foundMeDefaults: FoundMeProps = {
  songTitle: "Found Me",
  artist: "",
  audioFile: "",
  dawnAt: 24,
  durationSeconds: 50,
  lines: [
    line("I was walking in the dark with my head hung low", 1, 7),
    line("Every road I took was a road I didn't know", 7, 13),
    line("I was shouting at the sky till my voice ran dry", 13, 19),
    line("Never knew that someone heard me every time I cried", 19, 24),
    line("You found me, you found me", 24, 28),
    line("When I couldn't find myself", 28, 32),
    line("You found me, you found me", 32, 36),
    line("Picked me up each time I fell", 36, 40),
    line("I was lost, now I'm home", 40, 44),
    line("Never walking on my own", 44, 49),
  ],
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const mix = (a: number[], b: number[], t: number) =>
  `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",")})`;

/** Night → dawn sky with a rising sun glow. */
const Sky: React.FC<{ dawn: number }> = ({ dawn }) => {
  const frame = useCurrentFrame();
  const top = mix([6, 10, 22], [58, 32, 70], dawn);
  const mid = mix([14, 22, 40], [214, 110, 70], dawn);
  const bottom = mix([4, 6, 12], [255, 196, 110], dawn);
  const sunY = interpolate(dawn, [0, 1], [118, 72]);
  const pulse = 1 + Math.sin(frame / 40) * 0.03;
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${top} 0%, ${mid} 62%, ${bottom} 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% ${sunY}%, rgba(255,220,150,${
            0.15 + dawn * 0.75
          }) 0%, rgba(255,170,90,${dawn * 0.35}) ${18 * pulse}%, transparent ${
            46 * pulse
          }%)`,
        }}
      />
      {/* light rays */}
      <AbsoluteFill
        style={{
          opacity: dawn * 0.35,
          background: `repeating-conic-gradient(from ${
            frame / 6
          }deg at 50% ${sunY}%, rgba(255,235,190,0.35) 0deg 4deg, transparent 4deg 18deg)`,
          maskImage: `radial-gradient(circle at 50% ${sunY}%, black 0%, transparent 70%)`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Drifting embers / dust in the light. */
const Particles: React.FC<{ dawn: number }> = ({ dawn }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const dots = Array.from({ length: 46 }, (_, i) => {
    const seed = (i * 9301 + 49297) % 233280;
    const r = seed / 233280;
    const x = ((r * 7.31 + i * 0.137) % 1) * width;
    const speed = 0.4 + ((i * 37) % 10) / 10;
    const y = height - ((frame * speed * 2 + r * height * 3) % (height + 200)) + 100;
    const size = 3 + ((i * 13) % 7);
    const sway = Math.sin(frame / 30 + i) * 24;
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: x + sway,
          top: y,
          width: size,
          height: size,
          borderRadius: "50%",
          background: dawn > 0.5 ? "#fff1c9" : "#a9c4ff",
          opacity: 0.25 + 0.45 * ((i % 5) / 5),
          boxShadow: `0 0 ${size * 3}px ${dawn > 0.5 ? "#ffd27a" : "#7fa6ff"}`,
        }}
      />
    );
  });
  return <AbsoluteFill>{dots}</AbsoluteFill>;
};

/** Silhouetted hills in the foreground. */
const Hills: React.FC<{ dawn: number }> = ({ dawn }) => {
  const color = mix([2, 4, 8], [40, 22, 20], dawn);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end" }}>
      <svg viewBox="0 0 1080 520" width="100%" preserveAspectRatio="none">
        <path
          d="M0 300 C 180 200 320 260 480 220 C 640 180 760 260 1080 190 L1080 520 L0 520 Z"
          fill={color}
          opacity={0.75}
        />
        <path
          d="M0 400 C 220 330 380 390 560 350 C 760 300 900 380 1080 340 L1080 520 L0 520 Z"
          fill={color}
        />
        {/* lone figure looking at the sun */}
        <g transform="translate(540 336)" fill={color}>
          <circle cx="0" cy="-92" r="15" />
          <path d="M-16 -74 L16 -74 L22 -10 L10 -10 L8 18 L-8 18 L-10 -10 L-22 -10 Z" />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

const LyricLine: React.FC<{ line: TimedLine; dawn: number }> = ({
  line: l,
  dawn,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const local = frame - l.start * fps;
  const enter = spring({ frame: local, fps, config: { damping: 200 } });
  const exit = interpolate(t, [l.end - 0.25, l.end + 0.1], [1, 0], clamp);
  const glow = dawn > 0.5 ? "255,200,110" : "150,190,255";

  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        right: 80,
        top: 700,
        textAlign: "center",
        opacity: enter * exit,
        transform: `translateY(${(1 - enter) * 40}px) scale(${0.96 + enter * 0.04})`,
        fontFamily: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
        fontSize: 92,
        lineHeight: 1.12,
        fontWeight: 900,
        textTransform: "uppercase",
        letterSpacing: -1,
      }}
    >
      {l.words.map((w, i) => {
        const lit = interpolate(t, [w.start - 0.05, w.start + 0.12], [0, 1], clamp);
        const pop = interpolate(t, [w.start, w.start + 0.1, w.start + 0.3], [1, 1.08, 1], clamp);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              margin: "0 14px",
              transform: `scale(${pop})`,
              color: `rgba(255,${Math.round(246 - 20 * dawn)},${Math.round(
                230 - 60 * dawn,
              )},${0.42 + lit * 0.58})`,
              textShadow: `0 0 ${10 + lit * 30}px rgba(${glow},${lit * 0.9}), 0 4px 18px rgba(0,0,0,0.7)`,
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};

export const FoundMe: React.FC<FoundMeProps> = ({
  songTitle,
  artist,
  audioFile,
  dawnAt,
  durationSeconds,
  lines,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const dawn = interpolate(t, [dawnAt - 3, dawnAt + 4], [0, 1], clamp);
  const titleOpacity = interpolate(t, [0, 0.6, 3.5, 4.5], [0, 1, 1, 0], clamp);
  const fadeOut = interpolate(t, [durationSeconds - 1.5, durationSeconds], [1, 0], clamp);
  const current = lines.find((l) => t >= l.start - 0.3 && t < l.end + 0.1);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", opacity: fadeOut }}>
      {audioFile ? <Audio src={staticFile(audioFile)} /> : null}
      <Sky dawn={dawn} />
      <Particles dawn={dawn} />
      <Hills dawn={dawn} />
      {/* title card */}
      <div
        style={{
          position: "absolute",
          top: 260,
          width: "100%",
          textAlign: "center",
          opacity: titleOpacity,
          color: "#f4ecdf",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ fontSize: 132, fontStyle: "italic" }}>{songTitle}</div>
        {artist ? (
          <div style={{ fontSize: 44, letterSpacing: 10, opacity: 0.7, marginTop: 10 }}>
            {artist.toUpperCase()}
          </div>
        ) : null}
      </div>
      {current ? <LyricLine key={current.start} line={current} dawn={dawn} /> : null}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
