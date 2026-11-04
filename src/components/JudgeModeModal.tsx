"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { X, Sparkles, ArrowRight, ShieldAlert, CheckCircle2, AlertTriangle, FileText, Scale } from "lucide-react";
import { JUDGE_SAMPLES, JudgeSampleOption } from "@/lib/judge";

interface JudgeModeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function JudgeModeModal({ isOpen, onClose }: JudgeModeModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleSelectSample = (sample: JudgeSampleOption) => {
    try {
      // 1. Set judge mode active
      sessionStorage.setItem(
        "signsafe_judge_mode",
        JSON.stringify({
          sampleId: sample.id,
          recordedAt: sample.fixture.recordedAt,
          totalCredits: sample.fixture.totalCredits,
        })
      );
      sessionStorage.setItem("signsafe_fixture", JSON.stringify(sample.fixture));

      if (sample.destination === "/changes") {
        sessionStorage.setItem("signsafe_changes", JSON.stringify(sample.fixture.compare));
        sessionStorage.setItem(
          "signsafe_doc_v1",
          JSON.stringify({ fileName: "04_tenancy_v1.md", text: sample.fixture.text1 })
        );
        sessionStorage.setItem(
          "signsafe_doc_v2",
          JSON.stringify({ fileName: "04_tenancy_v2.md", text: sample.fixture.text2 })
        );
        router.push("/changes");
      } else {
        sessionStorage.setItem("signsafe_doc", JSON.stringify(sample.fixture.doc));
        // Remove any previous audit so scan plays fresh
        sessionStorage.removeItem("signsafe_audit");
        router.push("/scan");
      }
    } catch (err) {
      console.error("Failed to start Judge Mode", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#14213D]/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="judge-modal-title"
        className="w-full max-w-2xl bg-[#FBF8F1] border-2 border-[#14213D] rounded-2xl shadow-2xl p-6 sm:p-8 relative text-[#14213D] max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          aria-label="Close Judge Mode dialog"
          className="absolute top-5 right-5 p-2 text-[#14213D]/70 hover:text-[#14213D] hover:bg-[#14213D]/5 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-3.5 mb-6">
          <div className="w-11 h-11 rounded-xl bg-[#14213D] text-[#8A560B] flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E8A33D]/20 text-[#14213D] font-mono font-bold text-xs uppercase tracking-wider mb-1">
              Zero Credits • Instant Evaluation
            </div>
            <h2 id="judge-modal-title" className="font-serif text-2xl sm:text-3xl font-bold text-[#14213D]">
              Judge Mode Replay
            </h2>
            <p className="text-xs sm:text-sm text-[#14213D]/75 mt-1 leading-relaxed">
              Select any of the three pre-recorded live runs below. The check plays through each step
              using real recorded responses with zero Clocked calls and no API key required.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {JUDGE_SAMPLES.map((sample) => (
            <div
              key={sample.id}
              onClick={() => handleSelectSample(sample)}
              className="p-4 sm:p-5 bg-white/80 hover:bg-white border-2 border-[#14213D]/15 hover:border-[#14213D] rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-sm bg-[#14213D]/5 text-[#14213D]/80">
                    {sample.badge}
                  </span>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-[#14213D] mt-1.5 group-hover:text-[#14213D]">
                    {sample.title}
                  </h3>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono ${
                      sample.sealColor === "red"
                        ? "bg-[#D64545]/15 text-[#A62626]"
                        : "bg-[#E8A33D]/20 text-[#14213D]"
                    }`}
                  >
                    {sample.sealColor === "red" ? (
                      <ShieldAlert className="w-3.5 h-3.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                    {sample.sealColor === "red" ? "Red Seal" : "Amber Seal"}
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-[#14213D]/75 leading-relaxed mb-3">
                {sample.description}
              </p>

              <div className="pt-3 border-t border-[#14213D]/10 flex flex-wrap items-center justify-between gap-2">
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#14213D]/70 font-mono">
                  {sample.highlights.map((h, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <span className="text-[#1E734A]">✓</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>

                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#14213D] group-hover:text-[#8A560B] group-hover:translate-x-0.5 transition-all">
                  <span>Replay this run</span>
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-[#14213D]/15 flex items-center justify-between text-xs text-[#14213D]/70">
          <span>All 3 fixtures recorded from live Clocked API runs</span>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-[#14213D] hover:underline"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
