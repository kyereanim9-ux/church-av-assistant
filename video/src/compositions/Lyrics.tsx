import {
  AbsoluteFill,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type LyricsProps = {
  songTitle: string;
  lines: string[];
  secondsPerLine: number;
};

export const lyricsDefaults: LyricsProps = {
  songTitle: "Grâce infinie",
  lines: [
    "Grâce infinie, ô quel doux son",
    "Qui sauve un pécheur comme moi",
    "J'étais perdu, mais me voici",
    "J'étais aveugle et je vois",
  ],
  secondsPerLine: 4,
};

const LyricLine: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = interpolate(
    frame,
    [0, 10, durationInFrames - 10, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill className="items-center justify-center px-32">
      <p
        className="text-center text-[96px] font-semibold leading-tight"
        style={{ opacity }}
      >
        {text}
      </p>
    </AbsoluteFill>
  );
};

export const Lyrics: React.FC<LyricsProps> = ({
  songTitle,
  lines,
  secondsPerLine,
}) => {
  const { fps } = useVideoConfig();
  const framesPerLine = Math.round(secondsPerLine * fps);

  return (
    <AbsoluteFill className="bg-black text-white">
      {lines.map((line, i) => (
        <Sequence
          key={i}
          from={i * framesPerLine}
          durationInFrames={framesPerLine}
        >
          <LyricLine text={line} />
        </Sequence>
      ))}
      <AbsoluteFill className="items-center justify-end pb-16">
        <p className="text-3xl text-slate-500">{songTitle}</p>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
