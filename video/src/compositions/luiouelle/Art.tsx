import React from "react";

export type Who = "M" | "L" | "E";

type Look = {
  skin: string;
  skinLight: string;
  skinDark: string;
  hair: string;
  top: string;
  topDark: string;
  lip: string;
};

const LOOKS: Record<Who, Look> = {
  M: {
    skin: "#7b4a2f",
    skinLight: "#9a6442",
    skinDark: "#55301d",
    hair: "#c9c4bc",
    top: "#b98a32",
    topDark: "#8f6922",
    lip: "#3d1f17",
  },
  L: {
    skin: "#8b5a3c",
    skinLight: "#a97350",
    skinDark: "#5f3a25",
    hair: "#16110e",
    top: "#23232b",
    topDark: "#17171d",
    lip: "#4a2419",
  },
  E: {
    skin: "#b97c58",
    skinLight: "#d49a74",
    skinDark: "#8a5639",
    hair: "#1d1410",
    top: "#eadfcb",
    topDark: "#cdbfa6",
    lip: "#8f3a3c",
  },
};

const blinkAt = (frame: number, seed: number) => {
  const period = 96 + seed * 17;
  const p = (frame + seed * 31) % period;
  return p < 2 ? 0.45 : p < 5 ? 0.08 : p < 7 ? 0.5 : 1;
};

const Eye: React.FC<{
  id: string;
  side: 1 | -1;
  lid: number;
  gx: number;
  gy: number;
  lashes: boolean;
}> = ({ id, side, lid, gx, gy, lashes }) => {
  const ry = Math.max(1.2, 14 * lid);
  return (
    <g transform={`translate(${side * 52} -8)`}>
      <clipPath id={id}>
        <ellipse rx={21} ry={ry} />
      </clipPath>
      <ellipse rx={21} ry={ry} fill="#f3ece2" />
      <g clipPath={`url(#${id})`}>
        <circle cx={gx} cy={gy} r={10.5} fill="#24140d" />
        <circle cx={gx + 3.5} cy={gy - 3.5} r={2.6} fill="#fff" opacity={0.8} />
      </g>
      <path
        d={`M -23 ${-ry * 0.25} Q 0 ${-ry - 5} 23 ${-ry * 0.25}`}
        stroke="#1a0f0a"
        strokeWidth={lashes ? 5 : 3.5}
        fill="none"
        strokeLinecap="round"
      />
      {lashes ? (
        <path
          d={`M ${side * 22} ${-ry * 0.3} l ${side * 9} -7`}
          stroke="#1a0f0a"
          strokeWidth={4}
          strokeLinecap="round"
        />
      ) : null}
    </g>
  );
};

/**
 * Personnage assis, dessiné autour de l'origine (centre de la tête).
 * open : ouverture de la bouche 0..1 — down : regard baissé 0..1.
 */
export const Character: React.FC<{
  who: Who;
  frame: number;
  open: number;
  down: number;
  sad: number;
  lightSide: 1 | -1;
}> = ({ who, frame, open, down, sad, lightSide }) => {
  const c = LOOKS[who];
  const seed = who === "M" ? 1 : who === "L" ? 2 : 3;
  const breath = Math.sin((frame + seed * 20) / 22) * 2.5;
  const tilt =
    Math.sin((frame + seed * 40) / 47) * 1.2 + open * 1.4 - down * 3 * 0.5;
  const lid = blinkAt(frame, seed) * (1 - 0.35 * down) * (1 - 0.12 * sad);
  const gx = Math.sin((frame + seed * 60) / 90) * 2;
  const gy = 1 + down * 6;
  const o = Math.max(0, Math.min(1, open));
  const browHair = who === "M" ? "#a9a49b" : c.hair;

  return (
    <g>
      <defs>
        <radialGradient
          id={`skin-${who}`}
          cx={lightSide > 0 ? "72%" : "28%"}
          cy="32%"
          r="85%"
        >
          <stop offset="0%" stopColor={c.skinLight} />
          <stop offset="55%" stopColor={c.skin} />
          <stop offset="100%" stopColor={c.skinDark} />
        </radialGradient>
        <linearGradient
          id={`top-${who}`}
          x1={lightSide > 0 ? "100%" : "0%"}
          x2={lightSide > 0 ? "0%" : "100%"}
          y1="0%"
          y2="60%"
        >
          <stop offset="0%" stopColor={c.top} />
          <stop offset="100%" stopColor={c.topDark} />
        </linearGradient>
      </defs>

      {/* Corps */}
      <g transform={`translate(0 ${breath})`}>
        <rect x={-50} y={110} width={100} height={130} fill={c.skinDark} />
        <path
          d="M -310 560 C -310 320 -210 222 -78 204 L 78 204 C 210 222 310 320 310 560 L 310 1000 L -310 1000 Z"
          fill={`url(#top-${who})`}
        />
        {who === "M" ? (
          <>
            <path d="M -78 204 L 0 420 L 78 204 Z" fill="#efe6d6" />
            <path
              d="M -78 204 L 0 420 L 0 1000 M 78 204 L 0 420"
              stroke={c.topDark}
              strokeWidth={10}
              fill="none"
            />
            <circle cx={0} cy={520} r={9} fill={c.topDark} />
            <circle cx={0} cy={610} r={9} fill={c.topDark} />
          </>
        ) : who === "L" ? (
          <path
            d="M -80 206 Q 0 262 80 206"
            stroke="#3a3a45"
            strokeWidth={16}
            fill="none"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M -92 208 Q 0 300 92 208"
            stroke={c.topDark}
            strokeWidth={26}
            fill="none"
            strokeLinecap="round"
          />
        )}
        {/* Bras et mains jointes */}
        <path
          d="M -262 345 C -310 500 -225 625 -48 652"
          stroke={c.topDark}
          strokeWidth={100}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 262 345 C 310 500 225 625 48 652"
          stroke={c.topDark}
          strokeWidth={100}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M -262 345 C -310 500 -225 625 -48 652"
          stroke={c.top}
          strokeWidth={84}
          fill="none"
          strokeLinecap="round"
          opacity={0.55}
        />
        <path
          d="M 262 345 C 310 500 225 625 48 652"
          stroke={c.top}
          strokeWidth={84}
          fill="none"
          strokeLinecap="round"
          opacity={0.55}
        />
        <ellipse cx={-22} cy={655} rx={50} ry={36} fill={c.skin} />
        <ellipse cx={26} cy={662} rx={50} ry={36} fill={c.skinLight} />
        <path
          d="M -6 640 q 18 22 4 46 M 20 638 q 18 22 4 48 M 46 642 q 14 20 2 40"
          stroke={c.skinDark}
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
          opacity={0.7}
        />
      </g>

      {/* Tête */}
      <g transform={`translate(0 ${breath * 0.6}) rotate(${tilt} 0 150)`}>
        {who === "E" ? (
          <g fill={c.hair}>
            <circle cx={0} cy={-218} r={84} />
            <circle cx={-66} cy={-190} r={46} />
            <circle cx={66} cy={-190} r={46} />
            <circle cx={-142} cy={-30} r={50} />
            <circle cx={142} cy={-30} r={50} />
            <circle cx={-150} cy={52} r={42} />
            <circle cx={150} cy={52} r={42} />
            <circle cx={-136} cy={122} r={34} />
            <circle cx={136} cy={122} r={34} />
          </g>
        ) : null}
        <ellipse cx={-131} cy={12} rx={22} ry={34} fill={c.skinDark} />
        <ellipse cx={131} cy={12} rx={22} ry={34} fill={c.skinDark} />
        {who === "E" ? (
          <>
            <circle cx={-134} cy={56} r={9} fill="#e0b24f" />
            <circle cx={134} cy={56} r={9} fill="#e0b24f" />
          </>
        ) : null}
        <ellipse rx={132} ry={160} fill={`url(#skin-${who})`} />

        {/* Cheveux et barbe */}
        {who === "M" ? (
          <>
            <path
              d="M -134 -28 C -142 -152 -72 -184 0 -184 C 72 -184 142 -152 134 -28 C 120 -92 82 -130 0 -130 C -82 -130 -120 -92 -134 -28 Z"
              fill={c.hair}
            />
            <path
              d="M -131 14 C -128 126 -68 198 0 200 C 68 198 128 126 131 14 C 114 56 84 52 56 50 C 28 40 -28 40 -56 50 C -84 52 -114 56 -131 14 Z"
              fill={c.hair}
            />
            <path
              d="M -100 96 q 20 30 40 60 M 100 96 q -20 30 -40 60 M -30 150 q 30 16 60 0"
              stroke="#a39d94"
              strokeWidth={4}
              fill="none"
              strokeLinecap="round"
              opacity={0.7}
            />
          </>
        ) : who === "L" ? (
          <path
            d="M -137 -14 C -156 -176 -82 -214 0 -214 C 82 -214 156 -176 137 -14 C 128 -84 98 -116 0 -116 C -98 -116 -128 -84 -137 -14 Z"
            fill={c.hair}
          />
        ) : (
          <>
            <path
              d="M -138 -4 C -158 -168 -82 -200 0 -200 C 82 -200 158 -168 138 -4 C 126 -70 96 -104 30 -112 C 0 -80 -70 -70 -110 -60 C -126 -44 -134 -24 -138 -4 Z"
              fill={c.hair}
            />
            <circle cx={-100} cy={-150} r={30} fill={c.hair} />
            <circle cx={100} cy={-150} r={30} fill={c.hair} />
          </>
        )}

        {/* Sourcils */}
        {([-1, 1] as const).map((s) => (
          <path
            key={s}
            d={`M ${s * 26} ${-52 - 9 * sad} Q ${s * 54} ${-62 - 2 * sad} ${s * 82} ${-50 + 5 * sad}`}
            stroke={browHair}
            strokeWidth={who === "E" ? 7 : 10}
            fill="none"
            strokeLinecap="round"
          />
        ))}

        <Eye
          id={`eye-${who}-l`}
          side={-1}
          lid={lid}
          gx={gx}
          gy={gy}
          lashes={who === "E"}
        />
        <Eye
          id={`eye-${who}-r`}
          side={1}
          lid={lid}
          gx={gx}
          gy={gy}
          lashes={who === "E"}
        />

        {/* Nez */}
        <path
          d="M -14 34 Q 0 46 14 34"
          stroke={c.skinDark}
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
        />

        {/* Bouche */}
        <g transform="translate(0 88)">
          {o > 0.1 ? (
            <>
              <ellipse
                rx={25 + 3 * o}
                ry={4 + 19 * o}
                fill="#2e0f0d"
                stroke={c.lip}
                strokeWidth={who === "E" ? 7 : 4}
              />
              {o > 0.45 ? (
                <ellipse cy={6 + 9 * o} rx={14} ry={5 + 4 * o} fill="#a8504c" />
              ) : null}
            </>
          ) : (
            <path
              d={`M -27 0 Q 0 ${6 - 11 * sad} 27 0`}
              stroke={c.lip}
              strokeWidth={who === "E" ? 9 : 6}
              fill="none"
              strokeLinecap="round"
            />
          )}
        </g>
      </g>
    </g>
  );
};

export const Candle: React.FC<{
  frame: number;
  x: number;
  y: number;
  s?: number;
}> = ({ frame, x, y, s = 1 }) => {
  const fl =
    1 + Math.sin(frame / 3.1) * 0.06 + Math.sin(frame / 7.3 + 1) * 0.05;
  const sway = Math.sin(frame / 11) * 3;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cy={-70} r={330 * fl} fill="url(#candleGlow)" />
      <rect x={-24} y={0} width={48} height={120} rx={8} fill="#efe3c8" />
      <rect x={-24} y={0} width={18} height={120} rx={8} fill="#d6c7a6" />
      <rect x={-2} y={-14} width={4} height={16} fill="#3a2a1c" />
      <path
        d={`M 0 ${-88 * fl} C ${22 + sway} -50 18 -14 0 -12 C -18 -14 ${-22 + sway} -50 0 ${-88 * fl} Z`}
        fill="#ffb347"
      />
      <path
        d={`M 0 ${-60 * fl} C ${10 + sway * 0.5} -38 9 -16 0 -15 C -9 -16 ${-10 + sway * 0.5} -38 0 ${-60 * fl} Z`}
        fill="#fff3c4"
      />
    </g>
  );
};

/** Décor : salon le soir, fenêtre, rayon de lumière, bougie. 1080×1920. */
export const Room: React.FC<{
  frame: number;
  windowSide: 1 | -1;
  chair: string;
  wide?: boolean;
  children: React.ReactNode;
}> = ({ frame, windowSide, chair, wide, children }) => {
  const wx = windowSide > 0 ? 680 : 70;
  const beam = 0.2 + Math.sin(frame / 40) * 0.025;
  const cx = windowSide > 0 ? 150 : 930;
  return (
    <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
      <defs>
        <linearGradient id="wall" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#3b2519" />
          <stop offset="100%" stopColor="#1b100b" />
        </linearGradient>
        <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#1a2748" />
          <stop offset="60%" stopColor="#7a4a55" />
          <stop offset="100%" stopColor="#e08a3c" />
        </linearGradient>
        <linearGradient
          id="beam"
          x1={windowSide > 0 ? "100%" : "0%"}
          x2={windowSide > 0 ? "0%" : "100%"}
          y1="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#ffd9a0" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#ffd9a0" stopOpacity={0} />
        </linearGradient>
        <radialGradient id="candleGlow">
          <stop offset="0%" stopColor="#ffb85c" stopOpacity={0.5} />
          <stop offset="40%" stopColor="#ff9a3c" stopOpacity={0.16} />
          <stop offset="100%" stopColor="#ff9a3c" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="logoBg" cx="50%" cy="45%" r="75%">
          <stop offset="0%" stopColor="#2b4fb8" />
          <stop offset="100%" stopColor="#0a1a5c" />
        </radialGradient>
        <radialGradient id="logoGlow">
          <stop offset="0%" stopColor="#ffd27a" stopOpacity={0.75} />
          <stop offset="100%" stopColor="#ffb347" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="vignette" cx="50%" cy="42%" r="75%">
          <stop offset="55%" stopColor="#000" stopOpacity={0} />
          <stop offset="100%" stopColor="#000" stopOpacity={0.62} />
        </radialGradient>
        <linearGradient id="chairG" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={chair} />
          <stop offset="100%" stopColor="#0d0907" />
        </linearGradient>
      </defs>

      <rect width={1080} height={1920} fill="url(#wall)" />

      {/* Fenêtre */}
      <rect
        x={wx - 18}
        y={150}
        width={366}
        height={566}
        rx={10}
        fill="#20130c"
      />
      <rect x={wx} y={168} width={330} height={530} fill="url(#sky)" />
      <circle cx={wx + 230} cy={640} r={46} fill="#ffd08a" opacity={0.85} />
      <rect x={wx + 158} y={168} width={14} height={530} fill="#20130c" />
      <rect x={wx} y={420} width={330} height={14} fill="#20130c" />
      <rect x={wx - 34} y={706} width={398} height={22} rx={6} fill="#2a1a10" />

      {/* Cadre au mur : le logo de la page (bougie sur fond bleu) */}
      <g transform={`translate(${windowSide > 0 ? 220 : 860} 455)`}>
        <rect
          x={-112}
          y={-112}
          width={224}
          height={224}
          rx={8}
          fill="#2a1a10"
        />
        <rect x={-94} y={-94} width={188} height={188} fill="url(#logoBg)" />
        <circle cy={-14} r={62} fill="url(#logoGlow)" />
        <ellipse cy={66} rx={46} ry={9} fill="#f2a23a" opacity={0.35} />
        <rect x={-17} y={8} width={34} height={56} rx={5} fill="#f3dfb0" />
        <rect x={-17} y={8} width={12} height={56} rx={5} fill="#dcc48e" />
        <path
          d="M 0 -44 C 15 -22 12 4 0 6 C -12 4 -15 -22 0 -44 Z"
          fill="#ffb347"
        />
        <path
          d="M 0 -26 C 7 -14 6 3 0 4 C -6 3 -7 -14 0 -26 Z"
          fill="#fff3c4"
        />
      </g>

      {/* Rayon de lumière */}
      <polygon
        points={
          windowSide > 0
            ? `${wx},168 ${wx + 330},168 ${wx - 120},1920 ${wx - 760},1920`
            : `${wx},168 ${wx + 330},168 ${wx + 1090},1920 ${wx + 450},1920`
        }
        fill="url(#beam)"
        opacity={beam}
      />

      {/* Fauteuil ou canapé */}
      {wide ? (
        <>
          <rect
            x={40}
            y={900}
            width={1000}
            height={900}
            rx={90}
            fill="url(#chairG)"
          />
          <rect
            x={-40}
            y={1180}
            width={200}
            height={760}
            rx={80}
            fill={chair}
          />
          <rect
            x={920}
            y={1180}
            width={200}
            height={760}
            rx={80}
            fill={chair}
          />
        </>
      ) : (
        <>
          <rect
            x={150}
            y={690}
            width={780}
            height={1300}
            rx={150}
            fill="url(#chairG)"
          />
          <rect x={50} y={1270} width={210} height={700} rx={90} fill={chair} />
          <rect
            x={820}
            y={1270}
            width={210}
            height={700}
            rx={90}
            fill={chair}
          />
        </>
      )}

      {children}

      {/* Guéridon et bougie au premier plan */}
      <ellipse cx={cx} cy={1790} rx={210} ry={40} fill="#1d120b" />
      <rect x={cx - 210} y={1790} width={420} height={140} fill="#1d120b" />
      <Candle frame={frame} x={cx} y={1660} />

      <rect width={1080} height={1920} fill="url(#vignette)" />
    </svg>
  );
};

export const Heart: React.FC<{ size: number; color?: string }> = ({
  size,
  color = "#fff",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    style={{ display: "inline-block", verticalAlign: "-0.12em" }}
  >
    <path
      d="M12 21s-7.5-4.7-10-9.3C.3 8.300 2 4.500 5.600 4.500c2.100 0 3.500 1.100 4.400 2.500.9-1.400 2.300-2.500 4.400-2.500C18 4.500 19.700 8.300 22 11.700 19.500 16.300 12 21 12 21z"
      fill={color}
    />
  </svg>
);
