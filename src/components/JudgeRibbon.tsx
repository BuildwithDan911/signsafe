"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

interface JudgeRibbonProps {
  recordedAt?: string;
  onExit?: () => void;
}

export default function JudgeRibbon({ recordedAt, onExit }: JudgeRibbonProps) {
  // Format recorded date e.g. "3 Nov 2026"
  const formattedDate = React.useMemo(() => {
    if (!recordedAt) return "recent";
    try {
      const d = new Date(recordedAt);
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "recent";
    }
  }, [recordedAt]);

  const handleExit = () => {
    try {
      sessionStorage.removeItem("signsafe_judge_mode");
      sessionStorage.removeItem("signsafe_fixture");
    } catch (e) {
      console.warn("Error clearing judge mode session", e);
    }
    if (onExit) onExit();
  };

  return (
    <aside
      aria-label="Judge Mode banner"
      className="w-full bg-[#14213D] text-[#FBF8F1] py-2 px-4 border-b border-[#14213D]/40 text-xs sm:text-sm font-medium z-50 transition-colors"
    >
      <div className="max-w-[1100px] mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#E8A33D]/20 text-[#8A560B] font-mono font-bold text-[11px] uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            Judge Mode
          </span>
          <span className="text-[#FBF8F1]/90">
            Replay of a recorded live run (recorded {formattedDate}).
          </span>
        </div>

        <Link
          href="/"
          onClick={handleExit}
          className="inline-flex items-center gap-1.5 text-[#8A560B] hover:text-[#FBF8F1] font-semibold underline underline-offset-4 transition-colors"
        >
          <span>Upload your own document for a live check</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </aside>
  );
}
