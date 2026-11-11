import "./index.css";
import React from "react";
import { Composition, Still } from "remotion";
import {
  Announcement,
  announcementDefaults,
} from "./compositions/Announcement";
import { Lyrics, lyricsDefaults } from "./compositions/Lyrics";
import { LuiOuElle, LuiOuElleCover } from "./compositions/luiouelle/LuiOuElle";
import { episodes } from "./compositions/luiouelle/data";

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
      {episodes.map((episode) => (
        <React.Fragment key={episode.id}>
          <Composition
            id={`LuiOuElle-Ep${episode.num}`}
            component={LuiOuElle}
            durationInFrames={episode.durationInFrames}
            fps={FPS}
            width={1080}
            height={1920}
            defaultProps={{ episode }}
          />
          <Still
            id={`LuiOuElleCover-Ep${episode.num}`}
            component={LuiOuElleCover}
            width={1080}
            height={1920}
            defaultProps={{ episode }}
          />
        </React.Fragment>
      ))}
    </>
  );
};
