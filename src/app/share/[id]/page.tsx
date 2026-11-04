"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  Printer,
  Download,
  CheckCircle2,
  Clock,
  Check,
  FileText,
} from "lucide-react";
import NotarySeal from "@/components/NotarySeal";
import CountUp from "@/components/CountUp";
import { ShareRecord, ProposedFix } from "@/server/share";

export default function SharePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = (params?.id as string) || "";
  const token = searchParams.get("k");

  const [loading, setLoading] = useState(true);
  const [invalidLink, setInvalidLink] = useState(false);
  const [share, setShare] = useState<ShareRecord | null>(null);
  const [currentRole, setCurrentRole] = useState<"you" | "other" | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [justRescored, setJustRescored] = useState(false);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevPointsRef = useRef<number | null>(null);

  const fetchShareData = async (isPolling = false) => {
    if (!id || !token) {
      setInvalidLink(true);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/share/${id}?k=${encodeURIComponent(token)}`);
      if (res.status === 401 || res.status === 403) {
        setInvalidLink(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        if (!isPolling) setInvalidLink(true);
        setLoading(false);
        return;
      }

      const data = await res.json();
      const updatedShare: ShareRecord = data.share;
      const role: "you" | "other" = data.currentRole;

      if (
        prevPointsRef.current !== null &&
        updatedShare.scoreResult.totalPoints < prevPointsRef.current
      ) {
        setJustRescored(true);
        setTimeout(() => setJustRescored(false), 8000);
      }
      prevPointsRef.current = updatedShare.scoreResult.totalPoints;

      setShare(updatedShare);
      setCurrentRole(role);
      setInvalidLink(false);
    } catch {
      if (!isPolling) setInvalidLink(true);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and 3-second polling
  useEffect(() => {
    fetchShareData(false);

    pollTimerRef.current = setInterval(() => {
      fetchShareData(true);
    }, 3000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [id, token]);

  const handleToggleAccept = async (fixId: string, currentVal: boolean) => {
    if (!token || !id || !currentRole) return;
    setActionLoading(fixId);

    const nextVal = !currentVal;

    // Optimistic update
    setShare((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        fixes: prev.fixes.map((f) => {
          if (f.id === fixId) {
            return {
              ...f,
              youAccepted: currentRole === "you" ? nextVal : f.youAccepted,
              otherAccepted: currentRole === "other" ? nextVal : f.otherAccepted,
            };
          }
          return f;
        }),
      };
    });

    try {
      const res = await fetch(`/api/share/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          fixId,
          accepted: nextVal,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setShare(data.share);
        if (data.share.rescoredWithClocked) {
          setJustRescored(true);
          setTimeout(() => setJustRescored(false), 8000);
        }
      } else {
        // Re-fetch on error to restore source of truth
        fetchShareData(true);
      }
    } catch {
      fetchShareData(true);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadJSON = () => {
    if (!share) return;
    const record = {
      decisionRecordId: share.id,
      generatedAt: new Date().toISOString(),
      expiresAt: share.expiresAt,
      documentHashSha256: share.docHash,
      documentType: share.docType,
      fileName: share.fileName,
      finalScore: share.scoreResult.signScore,
      sealColor: share.scoreResult.color,
      sealLabel: share.scoreResult.label,
      headline: share.scoreResult.headline,
      fixes: share.fixes.map((f) => ({
        id: f.id,
        title: f.title,
        beforeClause: f.beforeClause,
        afterClause: f.afterClause,
        youAccepted: f.youAccepted,
        otherAccepted: f.otherAccepted,
        status:
          f.youAccepted && f.otherAccepted
            ? "Accepted by both"
            : f.youAccepted
            ? "Accepted by You (waiting for other side)"
            : f.otherAccepted
            ? "Accepted by Other side (waiting for you)"
            : "Open",
        rescoredWithClockedDecide: f.rescored,
      })),
      checksRun: share.checksRun,
      totalCreditsUsed: share.totalCredits,
      disclaimer: "SignSafe is not legal advice.",
    };

    const blob = new Blob([JSON.stringify(record, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `signsafe-decision-record-${share.id.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  // 1. INVALID LINK STATE
  if (invalidLink) {
    return (
      <div className="min-h-screen bg-[#FBF8F1] flex flex-col justify-between selection:bg-[#E8A33D]/25 font-sans">
        <header className="w-full border-b border-[#14213D]/10 bg-[#FBF8F1]/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#14213D] hover:opacity-75 transition-opacity"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>SignSafe</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 w-full max-w-lg mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
          <div className="paper-card w-full p-8 sm:p-10 bg-white border border-[#D64545]/30 rounded-2xl space-y-5 shadow-lg">
            <div className="w-14 h-14 rounded-full bg-[#D64545]/10 text-[#A62626] mx-auto flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#14213D]">
              This link isn&apos;t valid
            </h1>
            <p className="text-sm text-stone-600 leading-relaxed">
              The role token in this URL is incorrect or has been edited. Each fair-deal
              collaboration link requires a signed HMAC token.
            </p>
            <div className="pt-3">
              <Link
                href="/"
                className="inline-flex items-center px-6 py-2.5 rounded-lg bg-[#14213D] text-[#FBF8F1] text-xs font-semibold hover:bg-[#14213D]/90 transition-colors"
              >
                Return to SignSafe
              </Link>
            </div>
          </div>
        </main>

        <footer className="w-full border-t border-[#14213D]/10 py-6 bg-[#FBF8F1] text-center text-xs text-[#14213D]/70">
          SignSafe is not legal advice. It helps you spot things to ask about.
        </footer>
      </div>
    );
  }

  // 2. LOADING STATE
  if (loading || !share) {
    return (
      <div className="min-h-screen bg-[#FBF8F1] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-[#14213D]/20 border-t-[#2FA36B] rounded-full animate-spin" />
        <p className="font-serif text-base text-[#14213D] font-medium">
          Verifying secure fair-deal link...
        </p>
      </div>
    );
  }

  const { scoreResult, fixes, redactedText, docHash, rescoredWithClocked } = share;
  const isYou = currentRole === "you";
  const allAccepted = fixes.length > 0 && fixes.every((f) => f.youAccepted && f.otherAccepted);

  return (
    <div className="min-h-screen bg-[#FBF8F1] flex flex-col justify-between selection:bg-[#E8A33D]/25 font-sans">
      {/* Printable Certificate View (Visible only during window.print) */}
      <div className="hidden print:block p-8 bg-white text-black font-serif space-y-6">
        <div className="border-b-2 border-black pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SignSafe Decision Record</h1>
            <p className="text-xs text-neutral-600">Fair-Deal Collaboration Certificate</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-mono">ID: {share.id}</p>
            <p>Date: {new Date(share.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border p-4 text-xs font-sans">
          <div>
            <span className="font-bold">Document Fingerprint (SHA-256):</span>
            <p className="font-mono text-[10px] break-all">{docHash}</p>
          </div>
          <div>
            <span className="font-bold">Final Verdict:</span>
            <p className="font-bold text-sm uppercase">
              {scoreResult.label} ({scoreResult.signScore}/100)
            </p>
          </div>
        </div>

        <div className="space-y-3 font-sans">
          <h3 className="font-bold text-sm uppercase tracking-wide">Agreed Fair Fixes</h3>
          <table className="w-full text-xs border-collapse border border-neutral-300">
            <thead>
              <tr className="bg-neutral-100 text-left">
                <th className="border p-2">Clause / Fix</th>
                <th className="border p-2">You</th>
                <th className="border p-2">Other Side</th>
                <th className="border p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {fixes.map((f) => (
                <tr key={f.id}>
                  <td className="border p-2 font-medium">{f.title}</td>
                  <td className="border p-2">{f.youAccepted ? "Accepted ✓" : "Pending"}</td>
                  <td className="border p-2">{f.otherAccepted ? "Accepted ✓" : "Pending"}</td>
                  <td className="border p-2 font-bold">
                    {f.youAccepted && f.otherAccepted ? "MUTUALLY AGREED" : "OPEN"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t pt-4 text-xs text-neutral-500 font-sans space-y-1">
          <p>SignSafe is not legal advice. It helps you spot things to ask about.</p>
          <p>Total credits used for this audit: {share.totalCredits}</p>
        </div>
      </div>

      {/* Screen Header */}
      <header className="print:hidden w-full border-b border-[#14213D]/10 bg-[#FBF8F1]/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#14213D] hover:opacity-75 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>SignSafe</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border ${
                isYou
                  ? "bg-[#14213D]/10 text-[#14213D] border-[#14213D]/20"
                  : "bg-[#2FA36B]/15 text-[#1E734A] border-[#2FA36B]/30"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
              Viewing as: {isYou ? "You (Signer)" : "Other Side"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="print:hidden flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Real-time Rescored Banner */}
        {(justRescored || rescoredWithClocked) && (
          <div className="p-4 rounded-2xl bg-[#2FA36B]/15 border-2 border-[#2FA36B]/40 flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1E734A] text-white flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#14213D]">
{rescoredWithClocked ? "Rescored with Clocked Decide ✓" : "Rescored locally (live check unavailable)"}
                </p>
                <p className="text-xs text-stone-700">
                  Mutually accepted fair terms have replaced unfair clauses and improved the Sign Score.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-semibold text-[#1E734A] uppercase shrink-0">
              Live Synced
            </span>
          </div>
        )}

        {/* Top Overview Paper Card */}
        <div className="paper-card bg-white p-6 sm:p-8 rounded-2xl border border-[#14213D]/10 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#14213D]/10">
            <div>
              <div className="flex items-center gap-2 text-xs text-stone-600 font-mono mb-1">
                <ShieldCheck className="w-4 h-4 text-[#1E734A]" />
                <span>REDACTED FAIR-DEAL LINK</span>
                <span>•</span>
                <span>30-DAY EXPIRY</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#14213D]">
                Fair-Deal Collaboration
              </h1>
              <p className="text-xs text-stone-600 mt-1 max-w-lg">
                Both parties can review proposed fair rewrites and toggle their acceptances.
                Real names and addresses are replaced with placeholders. Original text is never saved.
              </p>
            </div>

            {/* Decision Record Actions */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-3.5 py-2 rounded-lg bg-[#14213D]/5 hover:bg-[#14213D]/10 text-[#14213D] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Print decision record"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Download decision record</span>
              </button>
              <button
                onClick={handleDownloadJSON}
                className="px-3.5 py-2 rounded-lg bg-[#14213D] text-[#FBF8F1] text-xs font-semibold hover:bg-[#14213D]/90 flex items-center gap-1.5 transition-colors"
                title="Download JSON decision record"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JSON Record</span>
              </button>
            </div>
          </div>

          {/* Notary Seal & Live Score */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
            <div className="flex items-center gap-6">
              <NotarySeal
                color={scoreResult.color}
                score={scoreResult.signScore}
                size="md"
              />
              <div className="space-y-1">
                <span className="text-xs font-mono uppercase tracking-wider text-stone-600">
                  Current Sign Score
                </span>
                <div className="font-serif text-2xl sm:text-3xl font-bold text-[#14213D] flex items-center gap-2">
                  <CountUp end={scoreResult.signScore} />
                  <span className="text-sm font-sans font-normal text-stone-600">/ 100</span>
                </div>
                <p className="text-xs sm:text-sm text-stone-700 font-medium max-w-md">
                  {scoreResult.headline}
                </p>
              </div>
            </div>

            <div className="w-full sm:w-auto p-3.5 rounded-xl bg-[#14213D]/5 border border-[#14213D]/10 text-xs text-stone-600 space-y-1 sm:text-right font-mono">
              <div className="text-[11px] uppercase tracking-wider text-stone-600 font-bold">
                Document SHA-256
              </div>
              <div className="text-[11px] text-[#14213D] break-all max-w-xs">
                {docHash.slice(0, 24)}...
              </div>
            </div>
          </div>
        </div>

        {/* Proposed Fair Fixes Checklist */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#1E734A]" />
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#14213D]">
                Proposed Fair Fixes ({fixes.length})
              </h2>
            </div>
            <span className="text-xs font-mono text-stone-600">
              {allAccepted
                ? "All fixes mutually agreed ✓"
                : "Awaiting mutual acceptance"}
            </span>
          </div>

          {fixes.length === 0 ? (
            <div className="paper-card bg-white p-8 rounded-2xl border border-[#14213D]/10 text-center text-stone-600 text-sm">
              No specific clause fixes required for this agreement.
            </div>
          ) : (
            <div className="space-y-4">
              {fixes.map((fix) => {
                const isMutuallyAccepted = fix.youAccepted && fix.otherAccepted;
                const canCheckYou = isYou;
                const canCheckOther = !isYou;

                return (
                  <div
                    key={fix.id}
                    className={`paper-card p-6 rounded-2xl border transition-all ${
                      isMutuallyAccepted
                        ? "bg-emerald-50/40 border-[#2FA36B]/30"
                        : "bg-white border-[#14213D]/15"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <h3 className="font-serif text-base sm:text-lg font-bold text-[#14213D]">
                        {fix.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        {isMutuallyAccepted ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#2FA36B]/15 text-[#1E734A] border border-[#2FA36B]/30">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            Accepted by both
                          </span>
                        ) : fix.youAccepted || fix.otherAccepted ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#E8A33D]/15 text-[#8A560B] border border-[#E8A33D]/30">
                            <Clock className="w-3.5 h-3.5" />
                            {fix.youAccepted ? "Waiting for other side" : "Waiting for you"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-stone-100 text-stone-600 border border-stone-200">
                            Open proposal
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Before & After side by side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="p-3.5 rounded-xl bg-red-50/60 border border-red-200/80 text-xs">
                        <span className="font-bold text-red-900 block mb-1">
                          Original clause:
                        </span>
                        <p className="text-red-950/80 italic leading-relaxed">
                          &ldquo;{fix.beforeClause}&rdquo;
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 text-xs">
                        <span className="font-bold text-emerald-900 block mb-1">
                          Proposed fair rewrite:
                        </span>
                        <p className="text-emerald-950/90 leading-relaxed font-medium">
                          &ldquo;{fix.afterClause}&rdquo;
                        </p>
                      </div>
                    </div>

                    {/* Acceptance Toggles */}
                    <div className="pt-3 border-t border-[#14213D]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-6">
                        {/* Checkbox 1: You accept */}
                        <label
                          className={`inline-flex items-center gap-2.5 text-xs font-semibold ${
                            canCheckYou
                              ? "cursor-pointer text-[#14213D]"
                              : "cursor-not-allowed opacity-60 text-stone-600"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={fix.youAccepted}
                            disabled={!canCheckYou || actionLoading === fix.id}
                            onChange={() => handleToggleAccept(fix.id, fix.youAccepted)}
                            className="w-4 h-4 rounded border-[#14213D]/30 text-[#1E734A] focus:ring-[#2FA36B]"
                          />
                          <span>
                            You accept {isYou && <span className="text-[10px] text-stone-600">(Your side)</span>}
                          </span>
                        </label>

                        {/* Checkbox 2: Other side accepts */}
                        <label
                          className={`inline-flex items-center gap-2.5 text-xs font-semibold ${
                            canCheckOther
                              ? "cursor-pointer text-[#14213D]"
                              : "cursor-not-allowed opacity-60 text-stone-600"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={fix.otherAccepted}
                            disabled={!canCheckOther || actionLoading === fix.id}
                            onChange={() => handleToggleAccept(fix.id, fix.otherAccepted)}
                            className="w-4 h-4 rounded border-[#14213D]/30 text-[#1E734A] focus:ring-[#2FA36B]"
                          />
                          <span>
                            Other side accepts {!isYou && <span className="text-[10px] text-stone-600">(Your side)</span>}
                          </span>
                        </label>
                      </div>

                      {fix.rescored && (
                        <span
                          className={`text-[11px] font-mono font-bold ${
                            share.rescoredWithClocked
                              ? "text-[#1E734A]"
                              : "text-[#14213D]/70"
                          }`}
                        >
                          {fix.rescoreNote ||
                            (share.rescoredWithClocked
                              ? "Rescored with Clocked Decide ✓"
                              : "Rescored locally (live check unavailable)")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Redacted Document Preview Sheet */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#14213D]" />
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#14213D]">
              Redacted Document View
            </h2>
          </div>
          <div className="paper-card bg-white p-6 sm:p-8 rounded-2xl border border-[#14213D]/10 font-mono text-xs sm:text-sm text-stone-800 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
            {redactedText}
          </div>
          <p className="text-[11px] text-stone-600 italic">
            When both sides accept a proposed fix, the clause in this view updates automatically.
          </p>
        </section>
      </main>

      {/* Screen Footer */}
      <footer className="print:hidden w-full border-t border-[#14213D]/10 py-6 bg-[#FBF8F1] text-center text-xs text-[#14213D]/70">
        SignSafe is not legal advice. It helps you spot things to ask about.
      </footer>
    </div>
  );
}
