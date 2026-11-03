import "./index.css";
import { Composition } from "remotion";
import {
  Announcement,
  announcementDefaults,
} from "./compositions/Announcement";
import { FoundMe, foundMeDefaults } from "./compositions/FoundMe";
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
        id="FoundMe"
        component={FoundMe}
        durationInFrames={50 * FPS}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={foundMeDefaults}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.round(props.durationSeconds * FPS),
        })}
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
