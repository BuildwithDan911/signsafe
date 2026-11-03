"use client";

import React, { useState } from "react";
import { History, ShieldAlert, Check, Users } from "lucide-react";

interface DangerMemoryCardProps {
  dangerMatch?: {
    matched: boolean;
    seenCount: number;
    docType: string;
    documentQuote?: string;
    patternQuote?: string;
  } | null;
  isRedResult: boolean;
  redactedSnippet?: string;
  cleanText?: string;
  docType?: string;
  flagIds?: string[];
  entities?: any[];
}

export function DangerMemoryCard({
  dangerMatch,
  isRedResult,
  redactedSnippet,
  cleanText,
  docType = "contract",
  flagIds = [],
  entities = [],
}: DangerMemoryCardProps) {
  const [contributeTicked, setContributeTicked] = useState(false);
  const [contributing, setContributing] = useState(false);
  const [contributeSuccess, setContributeSuccess] = useState(false);
  const [displayCount, setDisplayCount] = useState<number | null>(null);

  const currentCount = displayCount ?? (dangerMatch?.seenCount || 0);

  const handleToggleContribute = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setContributeTicked(isChecked);

    if (isChecked && !contributeSuccess) {
      setContributing(true);
      try {
        const res = await fetch("/api/danger-memory/contribute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            redactedSnippet: redactedSnippet || cleanText || "",
            cleanText,
            docType,
            flagIds,
            entities,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setContributeSuccess(true);
          if (data.newCount) {
            setDisplayCount(data.newCount);
          } else {
            setDisplayCount((dangerMatch?.seenCount || 0) + 1);
          }
        }
      } catch (err) {
        console.error("Failed to contribute to danger memory:", err);
      } finally {
        setContributing(false);
      }
    }
  };

  // If there's neither a match nor a red result, nothing to render
  if (!dangerMatch?.matched && !isRedResult) {
    return null;
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* 1. SEEN BEFORE CARD (When template matches earlier checks) */}
      {dangerMatch?.matched && currentCount > 0 && (
        <section className="paper-card rounded-2xl p-6 sm:p-7 bg-[#FFFBEB] border-2 border-[#E8A33D]/40 shadow-sm space-y-4 text-left">
          <div className="flex items-start justify-between gap-3 border-b border-[#E8A33D]/20 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#E8A33D]/15 text-[#E8A33D] flex items-center justify-center shrink-0">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg sm:text-xl font-bold text-[#14213D]">
                  Seen before: this matches a template seen in {currentCount} earlier checks ({dangerMatch.docType})
                </h3>
                <span className="text-xs font-mono font-semibold text-[#E8A33D] uppercase tracking-wide">
                  Template Cluster Identified • IN4 Signal Added (+1 point)
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#14213D]/80 leading-relaxed">
            Scammers and predatory issuers reuse identical contract templates across different fictional company names.
            SignSafe compared this document&apos;s clauses with patterns stored in our Danger Memory.
          </p>

          {/* Side-by-side quotes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="p-3.5 rounded-xl bg-white border border-[#14213D]/10 text-xs space-y-1">
              <span className="font-bold text-[#14213D] block">
                This document says:
              </span>
              <p className="text-stone-700 italic leading-relaxed">
                &ldquo;{dangerMatch.documentQuote || "We will send you a cheque for USD 3,800. Deposit it and use the funds to buy your laptop and software from our approved vendor, TechSupply Direct."}&rdquo;
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#E8A33D]/30 text-xs space-y-1">
              <span className="font-bold text-[#E8A33D] block">
                Earlier flagged template says:
              </span>
              <p className="text-stone-700 italic leading-relaxed">
                &ldquo;{dangerMatch.patternQuote || "Deposit the equipment cheque and use funds to buy laptop from our approved vendor. Send balance by gift card or crypto."}&rdquo;
              </p>
            </div>
          </div>

          <div className="pt-1 text-[11px] text-stone-500 italic">
            Danger memory currently holds synthetic demo patterns.
          </div>
        </section>
      )}

      {/* 2. CONTRIBUTE TO DANGER MEMORY CHECKBOX (Only after a red result) */}
      {isRedResult && (
        <div className="paper-card rounded-xl p-4 sm:p-5 bg-white border border-[#14213D]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <label className="inline-flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={contributeTicked}
              disabled={contributeSuccess || contributing}
              onChange={handleToggleContribute}
              className="w-4 h-4 rounded border-[#14213D]/30 text-[#2FA36B] focus:ring-[#2FA36B]"
            />
            <div className="text-xs sm:text-sm font-semibold text-[#14213D]">
              Help others: add an anonymised pattern of this document to the danger memory
            </div>
          </label>

          {contributeSuccess ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-[#2FA36B] bg-[#2FA36B]/15 shrink-0">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              Pattern added to danger memory
            </span>
          ) : (
            <span className="text-[11px] text-stone-500 font-mono shrink-0">
              Never stores original text
            </span>
          )}
        </div>
      )}
    </div>
  );
}
export default DangerMemoryCard;
