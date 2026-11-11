import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Candle, Character, Heart, Room, type Who } from "./Art";
import type { Episode, Line } from "./types";

export type LuiOuElleProps = { episode: Episode };

const FONT = "Inter, 'Inter Display', system-ui, sans-serif";
const SERIF = "'DejaVu Serif', Georgia, serif";
const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const CHAIR: Record<Who, string> = { M: "#22444a", L: "#4a2a2c", E: "#4a2a2c" };

/** Index de la réplique « à l'image » : le plan change dès la fin de la précédente. */
const activeIndex = (lines: Line[], frame: number) => {
  let idx = 0;
  for (let i = 1; i < lines.length; i++) {
    const prevEnd = lines[i - 1].from + lines[i - 1].dur;
    if (frame >= prevEnd + 4) idx = i;
  }
  return idx;
};

const mouth = (line: Line, frame: number) => {
  const k = frame - line.from;
  if (k < 0 || k >= line.env.length) return 0;
  const e = line.env[k];
  return e < 0.12 ? 0 : Math.min(1, 0.25 + e * 0.9);
};

const Scene: React.FC<{ episode: Episode; frame: number }> = ({
  episode,
  frame,
}) => {
  const { lines } = episode;
  const i = activeIndex(lines, frame);
  const line = lines[i];
  // Début du plan : première réplique consécutive du même locuteur.
  let s = i;
  while (s > 0 && lines[s - 1].sp === line.sp) s--;
  const shotStart = s === 0 ? 0 : lines[s - 1].from + lines[s - 1].dur + 4;
  const zoom = interpolate(frame - shotStart, [0, 300], [1, 1.07], clamp);
  const open = mouth(line, frame);
  const waiting = frame < line.from ? 1 : 0;
  const down =
    interpolate(line.from - frame, [0, 6, 20], [0, 1, 1], clamp) * waiting;

  if (line.sp === "LE") {
    return (
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        <Room frame={frame} windowSide={-1} chair={CHAIR.L} wide>
          <g transform="translate(310 900) scale(0.74)">
            <Character
              who="L"
              frame={frame}
              open={open}
              down={0}
              sad={0.3}
              lightSide={-1}
            />
          </g>
          <g transform="translate(770 930) scale(0.74)">
            <Character
              who="E"
              frame={frame}
              open={open}
              down={0}
              sad={0.3}
              lightSide={-1}
            />
          </g>
        </Room>
      </AbsoluteFill>
    );
  }
  const who = line.sp;
  const side = who === "M" ? 1 : -1;
  return (
    <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
      <Room frame={frame} windowSide={side} chair={CHAIR[who]}>
        <g transform="translate(540 800) scale(1.12)">
          <Character
            who={who}
            frame={frame}
            open={open}
            down={who === "M" ? 0 : down}
            sad={who === "M" ? 0 : 0.8}
            lightSide={side}
          />
        </g>
      </Room>
    </AbsoluteFill>
  );
};

const chunk = (text: string) => {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[][] = [];
  let cur: string[] = [];
  let len = 0;
  for (const w of words) {
    const solo =
      w === "?" ||
      w === "!" ||
      w === ":" ||
      w === ";" ||
      w === "»" ||
      w === "/";
    if (!solo && cur.length > 0 && len + w.length > 22 && w !== "«") {
      out.push(cur);
      cur = [];
      len = 0;
    }
    cur.push(w);
    len += w.length + 1;
  }
  if (cur.length) out.push(cur);
  // « reste collé au mot suivant
  for (let k = 0; k < out.length - 1; k++) {
    if (out[k][out[k].length - 1] === "«") {
      out[k].pop();
      out[k + 1].unshift("«");
    }
  }
  return out.filter((c) => c.length > 0);
};

const Caption: React.FC<{ line: Line; frame: number }> = ({ line, frame }) => {
  const k = frame - line.from;
  if (k < 0 || k > line.dur + 3) return null;
  const verse = line.verse;
  const start = verse ? Math.round(line.dur * verse.prefixFrac) : 0;
  const text = verse ? verse.quote : line.text;

  if (verse && k < start) {
    return (
      <div
        style={{
          fontFamily: SERIF,
          fontSize: 84,
          fontWeight: 700,
          color: "#f6d48a",
          textShadow: "0 4px 24px rgba(0,0,0,.9)",
          opacity: interpolate(k, [0, 6], [0, 1], clamp),
        }}
      >
        {verse.ref}
      </div>
    );
  }

  const chunks = chunk(text);
  const total = chunks.reduce((a, c) => a + c.join(" ").length + 2, 0);
  const span = line.dur - start;
  let t0 = start;
  let cur = chunks[chunks.length - 1];
  let cs = t0;
  let ce = line.dur;
  for (const c of chunks) {
    const d = ((c.join(" ").length + 2) / total) * span;
    if (k < t0 + d) {
      cur = c;
      cs = t0;
      ce = t0 + d;
      break;
    }
    t0 += d;
  }
  const chars = cur.join(" ").length;
  const p = (k - cs) / Math.max(1, ce - cs);
  let acc = 0;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
      }}
    >
      {verse ? (
        <div
          style={{
            fontFamily: FONT,
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: 3,
            color: "#f6d48a",
            textTransform: "uppercase",
          }}
        >
          {verse.ref}
        </div>
      ) : null}
      <div
        style={{
          fontFamily: verse ? SERIF : FONT,
          fontStyle: verse ? "italic" : "normal",
          fontSize: verse ? 62 : 68,
          fontWeight: verse ? 700 : 800,
          lineHeight: 1.18,
          textAlign: "center",
          maxWidth: 900,
          textShadow: "0 3px 6px rgba(0,0,0,.95), 0 0 28px rgba(0,0,0,.85)",
          transform: `scale(${interpolate(k - cs, [0, 4], [0.94, 1], clamp)})`,
        }}
      >
        {cur.map((w, wi) => {
          const at = acc / chars;
          acc += w.length + 1;
          const said = p >= at - 0.02;
          return (
            <span
              key={wi}
              style={{
                color: verse ? "#fff3d6" : "#fff",
                opacity: said ? 1 : 0.5,
              }}
            >
              {w}{" "}
            </span>
          );
        })}
      </div>
    </div>
  );
};

const EndCard: React.FC<{ episode: Episode; frame: number }> = ({
  episode,
  frame,
}) => {
  const k = frame - episode.endFrom;
  if (k < 0) return null;
  const [said, loved, cta] = episode.endItems.map((it) => it.from);
  const fade = (at: number, len = 14) =>
    interpolate(frame, [at - 4, at - 4 + len], [0, 1], clamp);
  const { outro } = episode;
  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 50% 54%, #3a2314 0%, #120a06 70%)",
        opacity: interpolate(k, [0, 18], [0, 1], clamp),
        alignItems: "center",
        fontFamily: FONT,
        color: "#fff",
        textAlign: "center",
      }}
    >
      <svg
        viewBox="0 0 1080 1920"
        width={1080}
        height={1920}
        style={{ position: "absolute" }}
      >
        <defs>
          <radialGradient id="candleGlow">
            <stop offset="0%" stopColor="#ffb85c" stopOpacity={0.5} />
            <stop offset="40%" stopColor="#ff9a3c" stopOpacity={0.16} />
            <stop offset="100%" stopColor="#ff9a3c" stopOpacity={0} />
          </radialGradient>
        </defs>
        <Candle frame={frame} x={540} y={1010} s={1.15} />
      </svg>
      <div style={{ marginTop: 330, padding: "0 80px" }}>
        {episode.endLines.map((l, i) => (
          <div
            key={i}
            style={{
              fontSize: 62,
              fontWeight: 800,
              lineHeight: 1.25,
              opacity: fade(said + i * 10),
            }}
          >
            {l}
          </div>
        ))}
        <div
          style={{
            marginTop: 56,
            fontFamily: SERIF,
            fontStyle: "italic",
            fontSize: 76,
            color: "#f6d48a",
            opacity: fade(loved),
          }}
        >
          Tu es aimé(e) <Heart size={64} color="#f6d48a" />
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 1250,
          width: 860,
          opacity: fade(cta),
          transform: `translateY(${interpolate(frame, [cta - 4, cta + 12], [24, 0], clamp)}px)`,
        }}
      >
        <div style={{ fontSize: 42, fontWeight: 600, lineHeight: 1.3 }}>
          {outro.action}
        </div>
        <div
          style={{
            width: 120,
            height: 3,
            background: "#f6d48a",
            margin: "34px auto 30px",
            borderRadius: 2,
          }}
        />
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 7,
            color: "#f6d48a",
          }}
        >
          {outro.label}
        </div>
        <div style={{ fontSize: 58, fontWeight: 800, marginTop: 12 }}>
          {outro.next}
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 500,
            opacity: 0.75,
            marginTop: 14,
          }}
        >
          {outro.sub}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Tag: React.FC<{ episode: Episode }> = ({ episode }) => (
  <div
    style={{
      position: "absolute",
      top: 190,
      width: "100%",
      textAlign: "center",
      fontFamily: FONT,
      color: "#fff",
      textShadow: "0 2px 12px rgba(0,0,0,.9)",
    }}
  >
    <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 6 }}>
      LUI OU ELLE ? · ÉP. {episode.num}
    </div>
    <div style={{ fontSize: 26, fontWeight: 500, opacity: 0.75, marginTop: 8 }}>
      Lumière pour Ton Cœur
    </div>
  </div>
);

export const LuiOuElle: React.FC<LuiOuElleProps> = ({ episode }) => {
  const frame = useCurrentFrame();
  const { lines, endFrom, durationInFrames } = episode;
  const line = lines[activeIndex(lines, frame)];
  return (
    <AbsoluteFill style={{ backgroundColor: "#120a06" }}>
      <Scene episode={episode} frame={frame} />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,.55) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 52%, rgba(0,0,0,.6) 78%, rgba(0,0,0,.75) 100%)",
        }}
      />
      <Tag episode={episode} />
      <div
        style={{
          position: "absolute",
          top: 1180,
          height: 330,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Caption line={line} frame={frame} />
      </div>
      <EndCard episode={episode} frame={frame} />

      {episode.endItems.map((it, i) => (
        <Sequence
          key={`fin${i}`}
          from={it.from}
          durationInFrames={it.dur + 6}
          layout="none"
        >
          <Audio src={staticFile(it.file)} />
        </Sequence>
      ))}
      {lines.map((l, i) => (
        <Sequence
          key={i}
          from={l.from}
          durationInFrames={l.dur + 6}
          layout="none"
        >
          <Audio src={staticFile(l.file)} />
        </Sequence>
      ))}
      <Audio
        src={staticFile("luiouelle/pad.mp3")}
        loop
        volume={(f) => {
          const verse = lines.some(
            (l) =>
              l.verse !== undefined &&
              f >= l.from - 10 &&
              f <= l.from + l.dur + 10,
          );
          const base = verse ? 0.05 : f >= endFrom ? 0.1 : 0.14;
          return (
            base *
            interpolate(f, [0, 30], [0, 1], clamp) *
            interpolate(
              f,
              [durationInFrames - 40, durationInFrames - 2],
              [1, 0],
              clamp,
            )
          );
        }}
      />
    </AbsoluteFill>
  );
};

/** Vignette de couverture (image fixe). */
export const LuiOuElleCover: React.FC<LuiOuElleProps> = ({ episode }) => {
  const cast = episode.cast;
  const both = cast.indexOf("L") >= 0 && cast.indexOf("E") >= 0;
  const who: Who = cast.indexOf("L") >= 0 ? "L" : "E";
  return (
    <AbsoluteFill style={{ backgroundColor: "#120a06" }}>
      <Room frame={12} windowSide={-1} chair={CHAIR.L} wide={both}>
        {both ? (
          <>
            <g transform="translate(310 1000) scale(0.74)">
              <Character
                who="L"
                frame={20}
                open={0}
                down={1}
                sad={0.9}
                lightSide={-1}
              />
            </g>
            <g transform="translate(770 1030) scale(0.74)">
              <Character
                who="E"
                frame={20}
                open={0}
                down={0}
                sad={0.9}
                lightSide={-1}
              />
            </g>
          </>
        ) : (
          <g transform="translate(540 900) scale(1.12)">
            <Character
              who={who}
              frame={20}
              open={0}
              down={1}
              sad={1}
              lightSide={-1}
            />
          </g>
        )}
      </Room>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,.8) 0%, rgba(0,0,0,.35) 38%, rgba(0,0,0,0) 55%, rgba(0,0,0,.7) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 250,
          width: "100%",
          textAlign: "center",
          fontFamily: FONT,
          color: "#fff",
          padding: "0 60px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            fontSize: 38,
            fontWeight: 800,
            letterSpacing: 6,
            color: "#f6d48a",
          }}
        >
          LUI OU ELLE ? · ÉP. {episode.num}
        </div>
        {episode.cover.map((l, i) => (
          <div
            key={i}
            style={{
              fontSize: 104,
              fontWeight: 900,
              lineHeight: 1.08,
              marginTop: i === 0 ? 30 : 6,
              color:
                i === episode.cover.length - 1 && i > 0 ? "#f6d48a" : "#fff",
              textShadow: "0 6px 30px rgba(0,0,0,.9)",
            }}
          >
            {l}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
