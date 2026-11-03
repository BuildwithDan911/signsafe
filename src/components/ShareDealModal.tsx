"use client";

import React, { useState } from "react";
import { Share2, Copy, Check, ExternalLink, ShieldCheck, X } from "lucide-react";

interface ShareDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  anonymizedText: string;
  cleanText?: string;
  protectEntities?: any[];
  fairClauses?: any[];
  flags?: any[];
  scoreResult?: any;
  checksRun?: any[];
  totalCredits?: number;
  docType?: string;
  fileName?: string;
  brokenPromises?: any[];
}

export function ShareDealModal({
  isOpen,
  onClose,
  anonymizedText,
  cleanText,
  protectEntities,
  fairClauses,
  flags,
  scoreResult,
  checksRun,
  totalCredits,
  docType,
  fileName,
  brokenPromises,
}: ShareDealModalProps) {
  const [loading, setLoading] = useState(false);
  const [links, setLinks] = useState<{
    youLink: string;
    otherLink: string;
    relativeYouLink: string;
    relativeOtherLink: string;
    expiresAt: string;
  } | null>(null);
  const [copiedRole, setCopiedRole] = useState<"you" | "other" | null>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && !links && !loading) {
      handleCreateShare();
    }
  }, [isOpen]);

  const handleCreateShare = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/share/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonymizedText,
          cleanText,
          entities: protectEntities || [],
          fairClauses: fairClauses || [],
          flags: flags || [],
          scoreResult,
          checksRun,
          totalCredits,
          docType,
          fileName,
          brokenPromises: brokenPromises || [],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate share link");
      }

      const data = await res.json();
      setLinks(data);
    } catch (e: any) {
      setError(e.message || "Failed to create fair-deal share link");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, role: "you" | "other") => {
    navigator.clipboard.writeText(text);
    setCopiedRole(role);
    setTimeout(() => setCopiedRole(null), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#14213D]/40 backdrop-blur-sm animate-fadeIn">
      <div className="paper-card w-full max-w-lg bg-[#FBF8F1] border-2 border-[#14213D]/20 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2FA36B]/15 text-[#2FA36B] flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#14213D]">
                Fair-Deal Share Link
              </h3>
              <p className="text-xs text-stone-600">
                Collaborate on fixes with the other side in real-time
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-500 hover:text-[#14213D] hover:bg-[#14213D]/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-[#14213D]/20 border-t-[#2FA36B] rounded-full animate-spin" />
            <p className="text-xs sm:text-sm text-stone-600 font-medium">
              Scrubbing private entities & preparing fair links...
            </p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 space-y-2">
            <p className="font-semibold">{error}</p>
            <button
              onClick={handleCreateShare}
              className="px-3 py-1 bg-red-600 text-white rounded text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        ) : links ? (
          <div className="space-y-4">
            {/* Note banner */}
            <div className="p-3.5 rounded-xl bg-[#14213D]/5 border border-[#14213D]/10 text-xs text-[#14213D]/80 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#2FA36B] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#14213D]">
                  Both links show a redacted copy. Anyone with a link can view it.
                </span>{" "}
                Personal names, addresses, and contacts are replaced with placeholders. Original text is never stored.
              </div>
            </div>

            {/* Link for You */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#14213D] uppercase tracking-wider">
                1. Your Link (Signer view)
              </label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={links.youLink}
                  className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-[#14213D]/20 rounded-lg text-stone-700 select-all"
                />
                <button
                  onClick={() => handleCopy(links.youLink, "you")}
                  className="px-3 py-2 bg-[#14213D] text-[#FBF8F1] rounded-lg text-xs font-semibold hover:bg-[#14213D]/90 transition-colors flex items-center gap-1.5 shrink-0"
                >
                  {copiedRole === "you" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#2FA36B]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Link for Other Side */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#14213D] uppercase tracking-wider">
                2. Other Side&apos;s Link (Send to client / landlord / employer)
              </label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={links.otherLink}
                  className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-[#14213D]/20 rounded-lg text-stone-700 select-all"
                />
                <button
                  onClick={() => handleCopy(links.otherLink, "other")}
                  className="px-3 py-2 bg-[#14213D] text-[#FBF8F1] rounded-lg text-xs font-semibold hover:bg-[#14213D]/90 transition-colors flex items-center gap-1.5 shrink-0"
                >
                  {copiedRole === "other" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#2FA36B]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Action button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 justify-between">
              <a
                href={links.relativeYouLink}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2FA36B] text-white text-xs font-bold rounded-lg hover:bg-[#2FA36B]/90 transition-colors shadow-sm"
              >
                <span>Open Your Link</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <span className="text-[11px] text-stone-500">
                Expires in 30 days
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
