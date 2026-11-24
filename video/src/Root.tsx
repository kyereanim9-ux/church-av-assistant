import "./index.css";
import { Composition } from "remotion";
import {
  Announcement,
  announcementDefaults,
} from "./compositions/Announcement";
import { FoundMe, foundMeDefaults } from "./compositions/FoundMe";
import { PasAPas, pasAPasDefaults, PasAPasProps } from "./compositions/PasAPas";
import songTimeline from "./compositions/pasAPasSong.timeline.json";
import { AimeMoi, aimeMoiCouleurDefaults, aimeMoiDefaults } from "./compositions/AimeMoi";
import { Saisons, saisonsDefaults } from "./compositions/Saisons";
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
        id="PasAPas"
        component={PasAPas}
        durationInFrames={38 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={pasAPasDefaults}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.round(props.durationSeconds * FPS),
        })}
      />
      <Composition
        id="PasAPasChanson"
        component={PasAPas}
        durationInFrames={146 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={songTimeline as PasAPasProps}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.round(props.durationSeconds * FPS),
        })}
      />
      <Composition
        id="PasAPasChanson3D"
        component={PasAPas}
        durationInFrames={146 * FPS}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ ...(songTimeline as PasAPasProps), mode3d: true }}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.round(props.durationSeconds * FPS),
        })}
      />
      <Composition
        id="AimeMoi"
        component={AimeMoi}
        durationInFrames={47 * FPS}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={aimeMoiDefaults}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.round(props.durationSeconds * FPS),
        })}
      />
      <Composition
        id="AimeMoiCouleur"
        component={AimeMoi}
        durationInFrames={57 * FPS}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={aimeMoiCouleurDefaults}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.round(props.durationSeconds * FPS),
        })}
      />
      <Composition
        id="Saisons"
        component={Saisons}
        durationInFrames={75 * FPS}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={saisonsDefaults}
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
