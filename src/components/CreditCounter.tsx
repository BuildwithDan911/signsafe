"use client";

import React, { useState } from "react";
import { Coins, Sparkles, Check, HelpCircle } from "lucide-react";

export interface StepCreditInfo {
  name: string;
  credits: number;
  cached?: boolean;
}

interface CreditCounterProps {
  totalCredits: number;
  isJudgeMode?: boolean;
  stepsBreakdown?: StepCreditInfo[];
  onOpenCreditsModal?: () => void;
}

export default function CreditCounter({
  totalCredits,
  isJudgeMode = false,
  stepsBreakdown = [],
  onOpenCreditsModal,
}: CreditCounterProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setShowTooltip((prev) => !prev)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-[13px] font-mono font-medium border transition-colors bg-white/70 hover:bg-white text-[#14213D] border-[#14213D]/20 shadow-xs cursor-pointer"
        aria-label="View credit breakdown"
        aria-expanded={showTooltip}
      >
        {isJudgeMode ? (
          <>
            <Sparkles className="w-3.5 h-3.5 text-[#8A560B]" />
            <span className="font-semibold">0 credits (recorded)</span>
          </>
        ) : (
          <>
            <Coins className="w-3.5 h-3.5 text-[#8A560B]" />
            <span>
              This check:{" "}
              <strong className="font-bold text-[#14213D]">{totalCredits}</strong> credits
            </span>
          </>
        )}
      </button>

      {/* Tooltip breakdown */}
      {showTooltip && (
        <div
          role="tooltip"
          className="absolute right-0 top-full mt-2 w-64 bg-[#14213D] text-[#FBF8F1] rounded-xl shadow-xl p-3 z-50 text-xs border border-white/10 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 font-sans font-semibold">
            <span>{isJudgeMode ? "Replay Mode" : "Step Breakdown"}</span>
            <span className="font-mono text-[#8A560B]">
              {isJudgeMode ? "0 credits" : `${totalCredits} credits`}
            </span>
          </div>

          {isJudgeMode ? (
            <p className="text-[11px] text-[#FBF8F1]/80 leading-relaxed font-sans">
              Replaying recorded run with 0 credits and no key needed.
            </p>
          ) : stepsBreakdown.length > 0 ? (
            <ul className="space-y-1.5 font-mono text-[11px]">
              {stepsBreakdown.map((s, idx) => (
                <li key={idx} className="flex items-center justify-between">
                  <span className="text-[#FBF8F1]/85 truncate max-w-[140px]">{s.name}</span>
                  <span className="shrink-0 flex items-center gap-1">
                    {s.cached ? (
                      <span className="text-[#1E734A] text-[10px]">(cached - 0)</span>
                    ) : (
                      <span>{s.credits} cr</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11px] text-[#FBF8F1]/80 font-sans">
              Step costs recorded per Clocked AI model inference time.
            </p>
          )}

          {onOpenCreditsModal && (
            <div className="mt-2.5 pt-2 border-t border-white/10 text-right font-sans">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTooltip(false);
                  onOpenCreditsModal();
                }}
                className="text-[11px] text-[#8A560B] hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                <HelpCircle className="w-3 h-3" />
                How credits work
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
