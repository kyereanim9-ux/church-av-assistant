import "./index.css";
import { Composition } from "remotion";
import {
  Announcement,
  announcementDefaults,
} from "./compositions/Announcement";
import { Lyrics, lyricsDefaults } from "./compositions/Lyrics";

const FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Announcement"
        component={Announcement}
        durationInFrames={6 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={announcementDefaults}
      />
      <Composition
        id="Lyrics"
        component={Lyrics}
        durationInFrames={60}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={lyricsDefaults}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.max(
            1,
            Math.round(props.lines.length * props.secondsPerLine * FPS),
          ),
        })}
      />
    </>
  );
};
