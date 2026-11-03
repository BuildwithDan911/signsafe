"use client";

import React, { useId } from "react";
import CountUp from "./CountUp";

export type SealColor = "green" | "amber" | "red";

interface NotarySealProps {
  color?: SealColor;
  score?: number;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
  className?: string;
  replayKey?: string | number;
}

const colorMap: Record<
  SealColor,
  {
    primary: string;
    secondary: string;
    accent: string;
    light: string;
    label: string;
  }
> = {
  green: {
    primary: "#2FA36B",
    secondary: "#1E734A",
    accent: "#E2F5EA",
    light: "#F0FDF4",
    label: "LOOKS FAIR",
  },
  amber: {
    primary: "#E8A33D",
    secondary: "#B87518",
    accent: "#FDF4E5",
    light: "#FFFBEB",
    label: "ASK FIRST",
  },
  red: {
    primary: "#D64545",
    secondary: "#A62626",
    accent: "#FDEAEA",
    light: "#FEF2F2",
  label: "DON'T SIGN",
  },
};

const sizeMap = {
  sm: { dimension: 110, fontSizeScore: 24, fontSizeLabel: 9, viewBox: 200 },
  md: { dimension: 150, fontSizeScore: 32, fontSizeLabel: 11, viewBox: 200 },
  lg: { dimension: 190, fontSizeScore: 40, fontSizeLabel: 13, viewBox: 200 },
};

export default function NotarySeal({
  color = "amber",
  score = 65,
  size = "md",
  animate = true,
  className = "",
  replayKey,
}: NotarySealProps) {
  const c = colorMap[color];
  const s = sizeMap[size];
  const uniqueId = useId().replace(/:/g, "");

  // Generate 32 scalloped notched serrated teeth for the outer notary ring
  const teethCount = 32;
  const radiusOuter = 95;
  const radiusInner = 88;
  const center = 100;

  const teethPoints = React.useMemo(() => {
    const points: string[] = [];
    for (let i = 0; i < teethCount * 2; i++) {
      const angle = (i * Math.PI) / teethCount;
      const r = i % 2 === 0 ? radiusOuter : radiusInner;
      const x = center + r * Math.sin(angle);
      const y = center - r * Math.cos(angle);
      points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return points.join(" ");
  }, []);

  return (
    <div
      key={replayKey}
      className={`relative inline-flex items-center justify-center select-none ${
        animate ? "animate-seal-press" : ""
      } ${className}`}
      style={{ width: s.dimension, height: s.dimension }}
      role="img"
      aria-label={`SignSafe Notary Seal: ${c.label}, Score ${score}`}
    >
      <svg
        viewBox={`0 0 ${s.viewBox} ${s.viewBox}`}
        className="w-full h-full drop-shadow-sm"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle gradient for embossed sheen */}
          <linearGradient id={`grad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.25" />
          </linearGradient>

          {/* Inner debossed filter */}
          <radialGradient id={`bg-${uniqueId}`} cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor={c.accent} />
            <stop offset="85%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor={c.light} />
          </radialGradient>

          {/* Circular path for the repeating text */}
          <path
            id={`textPath-${uniqueId}`}
            d="M 100,100 m -68,0 a 68,68 0 1,1 136,0 a 68,68 0 1,1 -136,0"
          />
        </defs>

        {/* Scalloped outer edge */}
        <polygon
          points={teethPoints}
          fill={c.primary}
          stroke={c.secondary}
          strokeWidth="1.5"
        />

        {/* Circular inner body with gradient */}
        <circle cx={center} cy={center} r="84" fill={`url(#bg-${uniqueId})`} />
        <circle cx={center} cy={center} r="84" fill={`url(#grad-${uniqueId})`} />

        {/* Double concentric thin rings */}
        <circle
          cx={center}
          cy={center}
          r="78"
          fill="none"
          stroke={c.primary}
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />
        <circle
          cx={center}
          cy={center}
          r="58"
          fill="none"
          stroke={c.secondary}
          strokeWidth="1"
        />

        {/* Circular embossed text: SIGNSAFE CHECKED */}
        <text
          fill={c.secondary}
          fontSize="8.5"
          fontWeight="700"
          letterSpacing="2.5"
          className="uppercase tracking-widest font-mono"
        >
          <textPath
            href={`#textPath-${uniqueId}`}
            startOffset="0%"
            textAnchor="middle"
          >
            SIGNSAFE CHECKED • SIGNSAFE CHECKED •
          </textPath>
        </text>

        {/* Center content: Score & status label */}
        <g textAnchor="middle">
          <text
            x={center}
            y={center - 3}
            fill={c.secondary}
            fontSize={s.fontSizeScore}
            fontWeight="800"
            fontFamily="var(--font-inter), sans-serif"
          >
            {score}
          </text>
          <text
            x={center}
            y={center + 18}
            fill={c.primary}
            fontSize={s.fontSizeLabel}
            fontWeight="800"
            letterSpacing="0.8"
            className="uppercase tracking-wider font-sans"
          >
            {c.label}
          </text>
        </g>
      </svg>
    </div>
  );
}
