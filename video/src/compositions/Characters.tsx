import { interpolate, useCurrentFrame } from "remotion";

export type Pose =
  | "idle"
  | "wave"
  | "listen"
  | "phone"
  | "read"
  | "point"
  | "cheer";

export type Look = {
  skin: string;
  hair: string;
  hairStyle: "short" | "afro" | "bun" | "long" | "braids";
  shirt: string;
  pants: string;
};

export const LOOKS: Look[] = [
  {
    skin: "#8d5524",
    hair: "#1b1b1b",
    hairStyle: "short",
    shirt: "#3b82f6",
    pants: "#1e293b",
  },
  {
    skin: "#6b3e1f",
    hair: "#111",
    hairStyle: "afro",
    shirt: "#f59e0b",
    pants: "#334155",
  },
  {
    skin: "#c68642",
    hair: "#2b1a0e",
    hairStyle: "bun",
    shirt: "#ec4899",
    pants: "#1f2937",
  },
  {
    skin: "#5a3418",
    hair: "#0d0d0d",
    hairStyle: "braids",
    shirt: "#10b981",
    pants: "#312e81",
  },
  {
    skin: "#e0ac69",
    hair: "#3b2414",
    hairStyle: "long",
    shirt: "#8b5cf6",
    pants: "#1e293b",
  },
];

const darken = (hex: string, k = 0.8) => {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `rgb(${r},${g},${b})`;
};

/**
 * A friendly flat-style character, 200×300 viewBox.
 * `offset` de-synchronises idle motion between several characters.
 */
export const Person: React.FC<{
  look: Look;
  pose: Pose;
  height: number;
  offset?: number;
  /** 0 → 1 tap progress for the phone pose */
  tap?: number;
}> = ({ look, pose, height, offset = 0, tap = 0 }) => {
  const f = useCurrentFrame() + offset;

  // Body motion
  const bob = Math.sin(f / 12) * 3;
  const jump = pose === "cheer" ? -Math.abs(Math.sin(f / 7)) * 28 : 0;
  const sway = pose === "listen" ? Math.sin(f / 20) * 4 : 0;

  // Blink every ~100 frames (eyes closed for 4 frames)
  const blink = f % 100 < 4 ? 0.1 : 1;
  const eyesClosed = pose === "listen";

  // Arm angles (SVG rotate, around the shoulder). Left arm: + raises outward.
  // Right arm: − raises outward.
  let la = 8;
  let ra = -8;
  switch (pose) {
    case "wave":
      ra = -150 + Math.sin(f / 4) * 22;
      break;
    case "cheer":
      la = 150 + Math.sin(f / 5) * 12;
      ra = -150 - Math.sin(f / 5) * 12;
      break;
    case "listen":
      la = 155;
      ra = -155;
      break;
    case "phone":
      ra = 40 + interpolate(tap, [0, 0.5, 1], [0, -10, 0]);
      la = -30;
      break;
    case "read":
      la = -35;
      ra = 35;
      break;
    case "point":
      ra = -125 + Math.sin(f / 10) * 5;
      break;
    default:
      la = 8 + Math.sin(f / 15) * 3;
      ra = -8 - Math.sin(f / 15) * 3;
  }

  const shirtDark = darken(look.shirt, 0.82);
  const skinDark = darken(look.skin, 0.85);
  const happy = pose === "cheer" || pose === "wave";

  const arm = (x: number, angle: number) => (
    <g transform={`rotate(${angle} ${x} 140)`}>
      <rect x={x - 9} y={134} width={18} height={66} rx={9} fill={shirtDark} />
      <circle cx={x} cy={202} r={11} fill={look.skin} />
    </g>
  );

  const hair = () => {
    const c = look.hair;
    switch (look.hairStyle) {
      case "afro":
        return (
          <g fill={c}>
            {[-34, -18, 0, 18, 34].map((dx, i) => (
              <circle key={i} cx={100 + dx} cy={44 - (i % 2) * 6} r={24} />
            ))}
            <circle cx={62} cy={70} r={16} />
            <circle cx={138} cy={70} r={16} />
          </g>
        );
      case "bun":
        return (
          <g fill={c}>
            <circle cx={100} cy={22} r={18} />
            <path d="M56 78 C56 36 144 36 144 78 C134 58 66 58 56 78 Z" />
          </g>
        );
      case "long":
        return (
          <g fill={c}>
            <path d="M54 80 C50 30 150 30 146 80 L150 150 L128 150 L132 76 C120 56 80 56 68 76 L72 150 L50 150 Z" />
          </g>
        );
      case "braids":
        return (
          <g fill={c}>
            <path d="M56 76 C56 36 144 36 144 76 C132 56 68 56 56 76 Z" />
            {[0, 1, 2, 3].map((i) => (
              <rect
                key={i}
                x={56 + (i > 1 ? 72 : 0) + (i % 2) * 8}
                y={74}
                width={7}
                height={70}
                rx={3.5}
              />
            ))}
          </g>
        );
      default:
        return (
          <path
            d="M56 76 C54 34 146 34 144 76 C130 58 70 58 56 76 Z"
            fill={c}
          />
        );
    }
  };

  return (
    <svg
      width={(height * 200) / 300}
      height={height}
      viewBox="0 -40 200 340"
      style={{ overflow: "visible" }}
    >
      {/* ground shadow */}
      <ellipse
        cx={100}
        cy={292}
        rx={52 + jump / 3}
        ry={9}
        fill="rgba(0,0,0,0.25)"
      />
      <g transform={`translate(0 ${bob + jump}) rotate(${sway} 100 280)`}>
        {/* legs */}
        <rect x={78} y={205} width={20} height={78} rx={10} fill={look.pants} />
        <rect
          x={102}
          y={205}
          width={20}
          height={78}
          rx={10}
          fill={look.pants}
        />
        <ellipse cx={86} cy={284} rx={16} ry={8} fill="#111827" />
        <ellipse cx={114} cy={284} rx={16} ry={8} fill="#111827" />

        {/* back arm when reading/phone sits behind props */}
        {arm(66, la)}

        {/* body */}
        <rect
          x={62}
          y={118}
          width={76}
          height={100}
          rx={32}
          fill={look.shirt}
        />
        <path
          d="M86 120 L100 136 L114 120"
          fill="none"
          stroke={shirtDark}
          strokeWidth={4}
          strokeLinecap="round"
        />

        {/* neck + head */}
        <rect x={92} y={104} width={16} height={18} rx={6} fill={skinDark} />
        {look.hairStyle === "long" ? hair() : null}
        <circle cx={100} cy={78} r={44} fill={look.skin} />
        <circle cx={57} cy={82} r={8} fill={skinDark} />
        <circle cx={143} cy={82} r={8} fill={skinDark} />
        {look.hairStyle !== "long" ? (
          hair()
        ) : (
          <path
            d="M56 74 C56 34 144 34 144 74 C126 52 74 52 56 74 Z"
            fill={look.hair}
          />
        )}

        {/* face */}
        {eyesClosed ? (
          <g
            stroke="#1f2937"
            strokeWidth={3.5}
            fill="none"
            strokeLinecap="round"
          >
            <path d="M78 82 Q85 88 92 82" />
            <path d="M108 82 Q115 88 122 82" />
          </g>
        ) : (
          <g fill="#1f2937">
            <ellipse cx={85} cy={80} rx={5.5} ry={7 * blink} />
            <ellipse cx={115} cy={80} rx={5.5} ry={7 * blink} />
            <circle cx={87} cy={77} r={1.8} fill="white" opacity={blink} />
            <circle cx={117} cy={77} r={1.8} fill="white" opacity={blink} />
          </g>
        )}
        <circle cx={74} cy={96} r={7} fill="#f472b6" opacity={0.35} />
        <circle cx={126} cy={96} r={7} fill="#f472b6" opacity={0.35} />
        {happy ? (
          <path
            d="M86 98 Q100 116 114 98 Z"
            fill="#7f1d1d"
            stroke="#1f2937"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M88 100 Q100 110 112 100"
            fill="none"
            stroke="#1f2937"
            strokeWidth={3.5}
            strokeLinecap="round"
          />
        )}

        {/* headphones */}
        {pose === "listen" ? (
          <g>
            <path
              d="M54 80 C54 18 146 18 146 80"
              fill="none"
              stroke="#111827"
              strokeWidth={9}
              strokeLinecap="round"
            />
            <rect x={44} y={68} width={20} height={32} rx={8} fill={GOLDISH} />
            <rect x={136} y={68} width={20} height={32} rx={8} fill={GOLDISH} />
          </g>
        ) : null}

        {/* open book */}
        {pose === "read" ? (
          <g transform="translate(100 186)">
            <path
              d="M0 -4 L-46 -14 L-46 26 L0 36 Z"
              fill="#fef3c7"
              stroke="#92400e"
              strokeWidth={3}
              strokeLinejoin="round"
            />
            <path
              d="M0 -4 L46 -14 L46 26 L0 36 Z"
              fill="#fffbeb"
              stroke="#92400e"
              strokeWidth={3}
              strokeLinejoin="round"
            />
            {[0, 1, 2].map((i) => (
              <g key={i} stroke="#d6a35c" strokeWidth={2}>
                <line x1={-38} y1={-2 + i * 9} x2={-8} y2={4 + i * 9} />
                <line x1={8} y1={4 + i * 9} x2={38} y2={-2 + i * 9} />
              </g>
            ))}
          </g>
        ) : null}

        {arm(134, ra)}

        {/* phone in right hand */}
        {pose === "phone" ? (
          <g transform={`rotate(${ra} 134 140)`}>
            <rect
              x={116}
              y={186}
              width={30}
              height={50}
              rx={6}
              fill="#111827"
              transform="rotate(-40 131 211)"
            />
            <rect
              x={120}
              y={192}
              width={22}
              height={36}
              rx={3}
              fill="#60a5fa"
              transform="rotate(-40 131 211)"
            />
          </g>
        ) : null}
      </g>
    </svg>
  );
};

const GOLDISH = "#fbbf24";
