import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type AnnouncementProps = {
  title: string;
  subtitle: string;
  date: string;
  accentColor: string;
};

export const announcementDefaults: AnnouncementProps = {
  title: "Culte de louange",
  subtitle: "Venez comme vous êtes",
  date: "Dimanche · 10h00",
  accentColor: "#f59e0b",
};

export const Announcement: React.FC<AnnouncementProps> = ({
  title,
  subtitle,
  date,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 200 } });
  const subtitleIn = spring({ frame: frame - 12, fps, config: { damping: 200 } });
  const dateIn = spring({ frame: frame - 24, fps, config: { damping: 200 } });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 15, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const barWidth = interpolate(titleIn, [0, 1], [0, 240]);

  return (
    <AbsoluteFill
      className="items-center justify-center bg-slate-950 text-white"
      style={{ opacity: fadeOut }}
    >
      <div className="flex flex-col items-center gap-8 px-24 text-center">
        <h1
          className="text-[120px] font-bold leading-none"
          style={{
            opacity: titleIn,
            transform: `translateY(${(1 - titleIn) * 40}px)`,
          }}
        >
          {title}
        </h1>
        <div
          className="h-2 rounded-full"
          style={{ width: barWidth, backgroundColor: accentColor }}
        />
        <p className="text-6xl text-slate-300" style={{ opacity: subtitleIn }}>
          {subtitle}
        </p>
        <p
          className="text-5xl font-semibold"
          style={{ opacity: dateIn, color: accentColor }}
        >
          {date}
        </p>
      </div>
    </AbsoluteFill>
  );
};
