"use client";

import { useEffect, useState } from "react";

interface CountUpProps {
  end: number;
  start?: number;
  duration?: number;
  className?: string;
}

export default function CountUp({
  end,
  start = 0,
  duration = 800,
  className = "",
}: CountUpProps) {
  const [count, setCount] = useState(start);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      setCount(end);
      return;
    }

    let startTime: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(start + (end - start) * easeOut));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animationFrameId);
  }, [end, start, duration]);

  return <span className={className}>{count}</span>;
}
