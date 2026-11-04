"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Check,
  AlertTriangle,
  GitCompare,
  FileText,
  ChevronDown,
  Loader2,
  Info,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import PaperCard from "@/components/PaperCard";
import NotarySeal from "@/components/NotarySeal";
import JudgeRibbon from "@/components/JudgeRibbon";
import CreditCounter, { StepCreditInfo } from "@/components/CreditCounter";
import CreditsModal from "@/components/CreditsModal";
import { MeaningChange, WordingOnlyChange } from "@/lib/compare";

interface CompareApiResponse {
  changes: MeaningChange[];
  wordingOnlyChanges: WordingOnlyChange[];
  sealColor: "red" | "amber" | "green";
  summaryText: string;
  meaningUnavailable?: boolean;
  meta: {
    credits: number;
    cached: boolean;
  };
}

export default function ChangesPage() {
  const [data, setData] = useState<CompareApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showWordingDetails, setShowWordingDetails] = useState(false);
  const [isJudgeMode, setIsJudgeMode] = useState(false);
  const [judgeRecordedAt, setJudgeRecordedAt] = useState<string | null>(null);
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);

  const runComparison = async (text1: string, text2: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/check/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text1, text2 }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to compare document versions");
      }

      setData(json);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during comparison");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadAndCompare = async () => {
      // 0. Check Judge Mode replay
      const storedJudge = sessionStorage.getItem("signsafe_judge_mode");
      if (storedJudge) {
        try {
          const parsedJudge = JSON.parse(storedJudge);
          setIsJudgeMode(true);
          setJudgeRecordedAt(parsedJudge.recordedAt || null);

          const storedChanges = sessionStorage.getItem("signsafe_changes");
          if (storedChanges) {
            setData(JSON.parse(storedChanges));
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.error("Failed to parse judge mode changes:", e);
        }
      }

      // 1. Check if comparison input exists in sessionStorage
      const storedInput = sessionStorage.getItem("signsafe_compare_input");
      if (storedInput) {
        try {
          const parsed = JSON.parse(storedInput);
          if (parsed.text1 && parsed.text2) {
            await runComparison(parsed.text1, parsed.text2);
            return;
          }
        } catch (e) {
          console.error("Failed to parse signsafe_compare_input:", e);
        }
      }

      // 2. Default: fetch the Tenancy sample versions from public/samples
      try {
        const [v1Res, v2Res] = await Promise.all([
          fetch("/samples/04_tenancy_v1.md"),
          fetch("/samples/04_tenancy_v2.md"),
        ]);

        if (v1Res.ok && v2Res.ok) {
          const text1 = await v1Res.text();
          const text2 = await v2Res.text();
          await runComparison(text1, text2);
        } else {
          throw new Error("Unable to load default tenancy samples");
        }
      } catch (e: any) {
        setError(e.message || "Could not load sample files");
        setIsLoading(false);
      }
    };

    loadAndCompare();
  }, []);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getSealScore = (color: "red" | "amber" | "green") => {
    if (color === "red") return 32;
    if (color === "amber") return 62;
    return 94;
  };

  const compareStepsBreakdown: StepCreditInfo[] = [
    {
      name: "Compare (Meaning & Local Diff)",
      credits: isJudgeMode ? 0 : data?.meta?.credits || 0,
      cached: isJudgeMode ? true : data?.meta?.cached,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-[#E8A33D]/25 bg-[#FBF8F1] text-[#14213D] font-sans">
      {/* Judge Mode Top Ribbon */}
      {isJudgeMode && <JudgeRibbon recordedAt={judgeRecordedAt || undefined} />}

      {/* Top Header */}
      <header className="w-full border-b border-[#14213D]/10 bg-[#FBF8F1]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group flex-shrink-0">
            <ArrowLeft className="w-4 h-4 text-[#14213D]/70 group-hover:text-[#14213D] transition-colors" />
            <NotarySeal size="xs" score={data ? getSealScore(data.sealColor) : 98} color={data?.sealColor || "green"} animate={false} />
            <div className="flex flex-col">
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#14213D] leading-tight">
                SignSafe
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#14213D]/70 -mt-0.5">
                Version Compare
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <CreditCounter
              totalCredits={isJudgeMode ? 0 : data?.meta?.credits || 0}
              isJudgeMode={isJudgeMode}
              stepsBreakdown={compareStepsBreakdown}
              onOpenCreditsModal={() => setIsCreditsModalOpen(true)}
            />
            <span className="hidden sm:inline-block text-xs font-mono uppercase tracking-wider text-[#14213D]/70 border-l border-[#14213D]/10 pl-3">
              Not legal advice
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Loading State */}
        {isLoading && (
          <div className="paper-card p-12 text-center space-y-4 max-w-lg mx-auto">
            <Loader2 className="w-8 h-8 text-[#14213D] animate-spin mx-auto" />
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#14213D]">
              Comparing Document Versions...
            </h2>
            <p className="text-sm text-[#14213D]/70">
              Aligning clauses, computing word-level diffs, and evaluating meaning changes with Clocked Compare &amp; Decide.
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="paper-card p-8 border-[#D64545]/40 text-center space-y-4 max-w-lg mx-auto">
            <AlertTriangle className="w-8 h-8 text-[#A62626] mx-auto" />
            <h2 className="font-serif text-xl font-bold text-[#A62626]">
              Comparison Failed
            </h2>
            <p className="text-sm text-[#14213D]/75">{error}</p>
            <div className="pt-2">
              <Link
                href="/"
                className="px-5 py-2.5 bg-[#14213D] text-[#FBF8F1] text-xs font-semibold rounded-xl hover:bg-[#1f3158] inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Home</span>
              </Link>
            </div>
          </div>
        )}

        {/* Results View */}
        {data && !isLoading && (
          <>
            {/* Meaning check unavailable banner fallback */}
            {data.meaningUnavailable && (
              <div className="paper-card p-4 sm:p-5 border-l-4 border-l-[#E8A33D] bg-[#E8A33D]/10 flex items-center gap-3 text-sm text-[#14213D]">
                <AlertTriangle className="w-5 h-5 text-[#8A560B] flex-shrink-0" />
                <div>
                  <span className="font-semibold block">Meaning check unavailable</span>
                  <span className="text-[#14213D]/80">
                    Meaning check unavailable, showing word changes only.
                  </span>
                </div>
              </div>
            )}

            {/* Top Summary Card */}
            <PaperCard
              colorTab={data.sealColor}
              tabLabel={
                data.sealColor === "red"
                  ? "Trap Revisions Detected"
                  : data.sealColor === "amber"
                  ? "Revisions Need Review"
                  : "Fair Revisions"
              }
              className="p-6 sm:p-8"
            >
              <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
                <div className="space-y-2 text-center sm:text-left flex-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#14213D]/5 text-xs font-mono uppercase tracking-wider text-[#14213D]/75">
                    <GitCompare className="w-3.5 h-3.5" />
                    <span>Version Comparison</span>
                  </div>
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#14213D]">
                    {data.summaryText}
                  </h1>
                  <p className="text-sm sm:text-base text-[#14213D]/75 leading-relaxed max-w-xl">
                    {data.sealColor === "red"
                      ? "The second version introduces critical changes that worsen your obligations, reduce your rights, or impose penalties compared to the original."
                      : data.sealColor === "amber"
                      ? "We spotted semantic differences between the two versions. Review each change carefully before agreeing."
                      : "The differences are wording and formatting adjustments with no detected worsening of contractual terms."}
                  </p>
                </div>

                <div className="flex-shrink-0 flex flex-col items-center justify-center p-2 bg-[#FFFFFF]/70 rounded-2xl border border-[#14213D]/10 shadow-xs">
                  <NotarySeal
                    size="sm"
                    score={getSealScore(data.sealColor)}
                    color={data.sealColor}
                    animate={true}
                  />
                  <span className="text-[11px] font-mono uppercase tracking-widest text-[#14213D]/70 mt-2 font-semibold">
                    {data.sealColor === "red"
                      ? "Don't sign yet"
                      : data.sealColor === "amber"
                      ? "Ask first"
                      : "Looks fair"}
                  </span>
                </div>
              </div>
            </PaperCard>

            {/* Meaning Changes Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-[#14213D]/10 pb-2">
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#14213D] flex items-center gap-2">
                  <span>Changes in Meaning</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#14213D]/10 text-[#14213D]">
                    {data.changes.length}
                  </span>
                </h2>
                <span className="text-xs font-mono text-[#14213D]/70 hidden sm:inline-block">
                  Verified with Clocked Compare &amp; Decide
                </span>
              </div>

              {data.changes.length === 0 ? (
                <div className="paper-card p-6 text-center text-sm text-[#14213D]/70">
                  No meaning changes were flagged between the two versions.
                </div>
              ) : (
                data.changes.map((chg, idx) => {
                  const isWorse = chg.verdict === "worse";
                  const isBetter = chg.verdict === "better";
                  const badgeColor = isWorse
                    ? "bg-[#D64545]/15 text-[#A62626] border-[#D64545]/30"
                    : isBetter
                    ? "bg-[#2FA36B]/15 text-[#1E734A] border-[#2FA36B]/30"
                    : "bg-[#14213D]/10 text-[#14213D]/80 border-[#14213D]/20";

                  const badgeText = isWorse
                    ? "Worse for you"
                    : isBetter
                    ? "Better for you"
                    : "Neutral";

                  return (
                    <PaperCard
                      key={chg.id || idx}
                      colorTab={isWorse ? "red" : isBetter ? "green" : "navy"}
                      tabLabel={chg.clauseNumber ? `Clause ${chg.clauseNumber}` : "Section"}
                      className="p-5 sm:p-7 space-y-5"
                    >
                      {/* Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-[#14213D]/10">
                        <h3 className="font-serif text-lg sm:text-xl font-bold text-[#14213D]">
                          {chg.title}
                        </h3>
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span
                            className={`text-xs font-mono uppercase tracking-wider font-bold px-3 py-1 rounded-full border ${badgeColor}`}
                          >
                            {badgeText}
                          </span>
                        </div>
                      </div>

                      {/* Side by Side Diff Panels */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Before Panel */}
                        <div className="p-4 rounded-xl bg-[#FFFFFF]/80 border border-[#14213D]/12 space-y-2">
                          <div className="flex items-center justify-between text-xs font-mono uppercase font-semibold text-[#14213D]/70">
                            <span>Before (Version 1)</span>
                            <span className="text-[#A62626] font-bold">Removed words struck</span>
                          </div>
                          <div className="text-sm sm:text-[15px] leading-relaxed text-[#14213D] font-serif pt-1">
                            {chg.diff.map((part, pIdx) => {
                              if (part.removed) {
                                return (
                                  <span
                                    key={pIdx}
                                    className="bg-[#D64545]/15 text-[#A62626] line-through font-semibold px-1 py-0.5 rounded mx-0.5 inline"
                                  >
                                    {part.value}
                                  </span>
                                );
                              }
                              if (part.added) {
                                return null; // Only show in "After" panel
                              }
                              return <span key={pIdx}>{part.value}</span>;
                            })}
                          </div>
                        </div>

                        {/* After Panel */}
                        <div className="p-4 rounded-xl bg-[#FFFFFF]/80 border border-[#14213D]/12 space-y-2">
                          <div className="flex items-center justify-between text-xs font-mono uppercase font-semibold text-[#14213D]/70">
                            <span>After (Version 2)</span>
                            <span className="text-[#1E734A] font-bold">Added words highlighted</span>
                          </div>
                          <div className="text-sm sm:text-[15px] leading-relaxed text-[#14213D] font-serif pt-1">
                            {chg.diff.map((part, pIdx) => {
                              if (part.added) {
                                return (
                                  <span
                                    key={pIdx}
                                    className="bg-[#2FA36B]/25 text-[#14213D] border-b-2 border-[#2FA36B]/70 font-semibold px-1 py-0.5 rounded mx-0.5 inline"
                                  >
                                    {part.value}
                                  </span>
                                );
                              }
                              if (part.removed) {
                                return null; // Struck in "Before" panel
                              }
                              return <span key={pIdx}>{part.value}</span>;
                            })}
                          </div>
                        </div>
                      </div>

                      {/* "What to ask them" Box for Worse Changes */}
                      {isWorse && (
                        <div className="p-4 sm:p-5 rounded-xl bg-[#FBF8F1] border border-[#14213D]/15 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono uppercase tracking-wider font-bold text-[#14213D]/70 flex items-center gap-1.5">
                              <Info className="w-3.5 h-3.5 text-[#8A560B]" />
                              <span>What to ask them:</span>
                            </span>
                            <button
                              onClick={() => handleCopy(chg.id, chg.askMessage)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#14213D] hover:bg-[#1f3158] text-[#FBF8F1] text-xs font-semibold transition-all shadow-xs"
                            >
                              {copiedId === chg.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-[#1E734A]" />
                                  <span>Copied ✓</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy message</span>
                                </>
                              )}
                            </button>
                          </div>
                          <p className="text-sm sm:text-[15px] text-[#14213D] bg-[#FFFFFF] p-3 rounded-lg border border-[#14213D]/10 font-mono text-xs sm:text-sm select-all">
                            &ldquo;{chg.askMessage}&rdquo;
                          </p>
                        </div>
                      )}

                      {/* Card Details Accordion */}
                      <details className="group pt-2 border-t border-[#14213D]/10">
                        <summary className="text-xs font-mono uppercase text-[#14213D]/70 hover:text-[#14213D] cursor-pointer flex items-center gap-1 select-none">
                          <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                          <span>Audit Details ({Math.round(chg.confidence * 100)}% confidence)</span>
                        </summary>
                        <div className="mt-3 p-3 rounded-lg bg-[#FFFFFF]/70 border border-[#14213D]/10 text-xs font-mono space-y-1.5 text-[#14213D]/80">
                          <div>
                            <strong>Decision:</strong> {chg.verdict.toUpperCase()} (Confidence:{" "}
                            {(chg.confidence * 100).toFixed(1)}%)
                          </div>
                          {chg.compareFinding?.kind && (
                            <div>
                              <strong>Compare Classification:</strong> {chg.compareFinding.kind}
                            </div>
                          )}
                          {chg.probabilities && (
                            <div className="flex gap-4 pt-1 text-[11px] text-[#14213D]/70">
                              <span>
                                Worse: {((chg.probabilities.worse ?? 0) * 100).toFixed(1)}%
                              </span>
                              <span>
                                Neutral: {((chg.probabilities.neutral ?? 0) * 100).toFixed(1)}%
                              </span>
                              <span>
                                Better: {((chg.probabilities.better ?? 0) * 100).toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </details>
                    </PaperCard>
                  );
                })
              )}
            </div>

            {/* Collapsed Wording-Only Changes List */}
            {data.wordingOnlyChanges.length > 0 && (
              <details
                open={showWordingDetails}
                onToggle={(e) => setShowWordingDetails((e.target as HTMLDetailsElement).open)}
                className="paper-card p-5 sm:p-6 group space-y-4"
              >
                <summary className="cursor-pointer font-serif text-lg font-bold text-[#14213D] flex items-center justify-between select-none">
                  <div className="flex items-center gap-2">
                    <ChevronDown className="w-5 h-5 transition-transform group-open:rotate-180 text-[#14213D]/70" />
                    <span>Wording-only changes</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#14213D]/10 text-[#14213D]">
                      {data.wordingOnlyChanges.length}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-normal text-[#14213D]/70">
                    Not flagged as meaning changes
                  </span>
                </summary>

                <div className="space-y-4 pt-3 border-t border-[#14213D]/10">
                  <p className="text-xs text-[#14213D]/70">
                    These edits change phrasing, punctuation, or headers without creating conflicting legal obligations:
                  </p>
                  {data.wordingOnlyChanges.map((word, wIdx) => (
                    <div
                      key={word.id || wIdx}
                      className="p-4 rounded-xl bg-[#FFFFFF]/70 border border-[#14213D]/10 space-y-2 text-xs sm:text-sm font-serif"
                    >
                      <div className="font-mono text-xs font-bold text-[#14213D]/80">
                        {word.title}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 rounded bg-[#FBF8F1] border border-[#14213D]/10">
                          <span className="block font-mono text-[10px] uppercase font-bold text-[#14213D]/70 mb-1">
                            Before:
                          </span>
                          <span>{word.beforeText || "(empty)"}</span>
                        </div>
                        <div className="p-2.5 rounded bg-[#FBF8F1] border border-[#14213D]/10">
                          <span className="block font-mono text-[10px] uppercase font-bold text-[#14213D]/70 mb-1">
                            After:
                          </span>
                          <span>{word.afterText || "(empty)"}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#14213D]/10">
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#14213D] hover:bg-[#1f3158] text-[#FBF8F1] text-sm font-semibold transition-all inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Check Another Document</span>
              </Link>

              <div className="text-xs text-[#14213D]/70 font-mono text-center sm:text-right">
                <span>Clocked Compare + Decide + Diff</span>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#14213D]/10 py-6 bg-[#FBF8F1] text-center text-xs sm:text-sm text-[#14213D]/70">
        <div className="max-w-[1100px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SignSafe is not legal advice. It helps you spot things to ask about.</span>
          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              type="button"
              onClick={() => setIsCreditsModalOpen(true)}
              className="text-[#14213D] hover:underline cursor-pointer font-semibold"
            >
              How credits work
            </button>
            <span>•</span>
            <Link href="/" className="hover:text-[#14213D] transition-colors">
              Home
            </Link>
          </div>
        </div>
      </footer>

      {/* Credits Modal */}
      <CreditsModal
        isOpen={isCreditsModalOpen}
        onClose={() => setIsCreditsModalOpen(false)}
      />
    </div>
  );
}
