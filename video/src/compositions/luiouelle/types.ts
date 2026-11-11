export type Speaker = "M" | "L" | "E" | "LE";

export type Line = {
  sp: Speaker;
  text: string;
  file: string;
  from: number;
  dur: number;
  env: number[];
  verse?: { ref: string; quote: string; prefixFrac: number };
};

export type Episode = {
  id: string;
  num: number;
  title: string;
  cover: string[];
  cast: string;
  endLines: string[];
  endFrom: number;
  endItems: { file: string; from: number; dur: number }[];
  outro: { action: string; label: string; next: string; sub: string };
  durationInFrames: number;
  lines: Line[];
};
