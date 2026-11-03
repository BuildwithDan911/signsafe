"use client";

import React, { useEffect, useRef, useState } from "react";

export type HighlightColor = "green" | "amber" | "red";

interface MarkerHighlightProps {
  children: React.ReactNode;
  color?: HighlightColor;
  className?: string;
  animate?: boolean;
  replayKey?: string | number;
}

const colorStyles: Record<
  HighlightColor,
  { bg: string; border: string }
> = {
  amber: {
    bg: "rgba(232, 163, 61, 0.28)",
    border: "rgba(232, 163, 61, 0.4)",
  },
  red: {
    bg: "rgba(214, 69, 69, 0.24)",
    border: "rgba(214, 69, 69, 0.4)",
  },
  green: {
    bg: "rgba(47, 163, 107, 0.25)",
    border: "rgba(47, 163, 107, 0.4)",
  },
};

export default function MarkerHighlight({
  children,
  color = "amber",
  className = "",
  animate = true,
  replayKey,
}: MarkerHighlightProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(!animate);
  const c = colorStyles[color];

  useEffect(() => {
    if (!animate) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [animate, replayKey]);

  return (
    <span
      ref={containerRef}
      key={replayKey}
      className={`relative inline-block font-medium ${className}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 bottom-0.5 top-1 -z-10 origin-left rounded-[2px] -rotate-[0.4deg] transition-all duration-700 ease-out ${
          isVisible ? "w-full" : "w-0"
        }`}
        style={{
          backgroundColor: c.bg,
          borderBottom: `1.5px solid ${c.border}`,
          borderRadius: "3px 6px 4px 7px",
        }}
      />
      <span className="relative z-0 px-0.5">{children}</span>
    </span>
  );
}
