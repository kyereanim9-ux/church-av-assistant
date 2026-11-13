import "./index.css";
import { Composition } from "remotion";
import {
  Announcement,
  announcementDefaults,
} from "./compositions/Announcement";
import { Lyrics, lyricsDefaults } from "./compositions/Lyrics";
import { Rappel, rappelDefaults, rappelDuration } from "./compositions/Rappel";
import {
  Story,
  courageDefaults,
  meditationDefaults,
  parolesDefaults,
  storyDuration,
} from "./compositions/Story";

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
        id="Paroles"
        component={Story}
        durationInFrames={60}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={parolesDefaults}
        calculateMetadata={({ props }) => ({
          durationInFrames: storyDuration(props),
        })}
      />
      <Composition
        id="Courage"
        component={Story}
        durationInFrames={60}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={courageDefaults}
        calculateMetadata={({ props }) => ({
          durationInFrames: storyDuration(props),
        })}
      />
      <Composition
        id="Meditation"
        component={Story}
        durationInFrames={60}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={meditationDefaults}
        calculateMetadata={({ props }) => ({
          durationInFrames: storyDuration(props),
        })}
      />
      <Composition
        id="Rappel"
        component={Rappel}
        durationInFrames={60}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={rappelDefaults}
        calculateMetadata={({ props }) => ({
          durationInFrames: rappelDuration(props),
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
