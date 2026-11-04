"use client";

import React, { useState, useEffect } from "react";
import NotarySeal from "./NotarySeal";
import { HelpCircle, Check, AlertCircle } from "lucide-react";

export default function HeroDemoStrip() {
  // Stages:
  // 0: Initial text displayed
  // 1: Marker highlight sweeps over the upfront fee clause
  // 2: Targeted follow-up question card slides in
  // 3: Notary seal stamps amber "ASK FIRST" with verdict explanation
  // 4: Hold, then reset
  const [stage, setStage] = useState<number>(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setPrefersReducedMotion(true);
      setStage(3); // Show complete state statically
      return;
    }

    let isMounted = true;
    let timer: NodeJS.Timeout;

    const runSequence = () => {
      // Step 0 -> Step 1: Sweep highlight after 1.4s
      timer = setTimeout(() => {
        if (!isMounted) return;
        setStage(1);

        // Step 1 -> Step 2: Slide in question card after 1.2s
        timer = setTimeout(() => {
          if (!isMounted) return;
          setStage(2);

          // Step 2 -> Step 3: Stamp seal after 1.4s
          timer = setTimeout(() => {
            if (!isMounted) return;
            setStage(3);

            // Step 3 -> Loop reset after 4.5s hold
            timer = setTimeout(() => {
              if (!isMounted) return;
              setStage(0);
              runSequence();
            }, 4500);
          }, 1400);
        }, 1200);
      }, 1400);
    };

    runSequence();

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      className="w-full max-w-2xl mx-auto my-6 sm:my-8 text-left"
      aria-label="Live SignSafe demonstration"
    >
      <div className="relative bg-[#FFFFFF] rounded-xl border border-[#14213D]/15 shadow-[0_4px_20px_-4px_rgba(20,33,61,0.08)] overflow-hidden transition-all">
        {/* Document Header Bar */}
        <div className="bg-[#F8F5EE] border-b border-[#14213D]/10 px-4 py-2.5 flex items-center justify-between text-xs text-[#14213D]/70 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E8A33D]" />
            <span className="font-semibold tracking-wider uppercase text-[11px]">
              Live Document Scan Preview
            </span>
          </div>
          <span className="text-[11px] text-[#14213D]/70 hidden sm:inline">
            Sample: Remote Employment Offer § 4.2
          </span>
        </div>

        {/* Contract Clause Content */}
        <div className="p-5 sm:p-7 space-y-4 font-sans text-sm sm:text-[16px] text-[#14213D]/90 leading-relaxed relative">
          <div className="text-xs font-mono font-semibold uppercase tracking-wider text-[#14213D]/70">
            Section 4.2 — Onboarding & Workstation Hardware
          </div>

          <p className="font-serif text-[#14213D] text-base sm:text-lg">
            Upon signing this Agreement, the Company shall issue designated home office
            hardware to the Employee.{" "}
            <span className="relative inline-block whitespace-normal font-sans text-sm sm:text-base font-semibold text-[#14213D]">
              {/* Animated Marker Highlight */}
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 bottom-0 top-0.5 -z-10 origin-left rounded-[3px] -rotate-[0.3deg] transition-all duration-700 ease-out ${
                  stage >= 1 || prefersReducedMotion ? "w-full" : "w-0"
                }`}
                style={{
                  backgroundColor: "rgba(232, 163, 61, 0.35)",
                  borderBottom: "2px solid rgba(232, 163, 61, 0.6)",
                }}
              />
              <span className="relative z-10 px-1">
                a $150 processing fee is payable before start date
              </span>
            </span>{" "}
            to initiate dispatch logistics.
          </p>

          {/* Slide-in Follow-up Question Card */}
          <div
            className={`transition-all duration-500 ease-out ${
              stage >= 2 || prefersReducedMotion
                ? "opacity-100 translate-y-0 max-h-40 mt-4"
                : "opacity-0 translate-y-3 max-h-0 overflow-hidden pointer-events-none mt-0"
            }`}
          >
            <div className="bg-[#FAF7F0] border border-[#E8A33D]/40 rounded-lg p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="p-1 rounded-md bg-[#E8A33D]/15 text-[#B87518] mt-0.5">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#B87518] font-bold">
                    Targeted Clarification
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-[#14213D]">
                    Did they ask you to pay before starting?
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-semibold">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#E8A33D] text-[#14213D] shadow-xs">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  Yes, upfront
                </span>
                <span className="px-2.5 py-1 rounded bg-stone-200/60 text-stone-600 line-through">
                  No
                </span>
              </div>
            </div>
          </div>

          {/* Seal Stamp & Verdict Notice */}
          <div
            className={`transition-all duration-600 ease-out ${
              stage >= 3 || prefersReducedMotion
                ? "opacity-100 scale-100 max-h-48 pt-2"
                : "opacity-0 scale-95 max-h-0 overflow-hidden pointer-events-none"
            }`}
          >
            <div className="border-t border-[#14213D]/10 pt-4 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-mono font-bold uppercase tracking-wider text-[#B87518] bg-[#E8A33D]/15 px-2 py-0.5 rounded">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Advance-Fee Trap Detected
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#14213D]/75 leading-snug">
                  Legitimate employers never ask candidates to pay for training or
                  onboarding supplies before their first day.
                </p>
              </div>

              {/* Notary Seal Stamp */}
              <div className="flex-shrink-0">
                <NotarySeal
                  color="amber"
                  score={62}
                  size="sm"
                  animate={!prefersReducedMotion && stage === 3}
                  replayKey={stage}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Loop Indicator */}
        <div className="bg-[#F8F5EE]/60 border-t border-[#14213D]/5 px-4 py-1.5 flex items-center justify-between text-[11px] text-[#14213D]/70 font-mono">
          <span>Automated scan • 1 highlighted risk</span>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                stage === 0 ? "bg-[#14213D] scale-125" : "bg-[#14213D]/25"
              }`}
            />
            <span
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                stage === 1 ? "bg-[#E8A33D] scale-125" : "bg-[#14213D]/25"
              }`}
            />
            <span
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                stage === 2 ? "bg-[#E8A33D] scale-125" : "bg-[#14213D]/25"
              }`}
            />
            <span
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                stage === 3 ? "bg-[#E8A33D] scale-125" : "bg-[#14213D]/25"
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
