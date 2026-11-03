"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldAlert,
  Lock,
  FileSearch,
  Eye,
  EyeOff,
  RotateCw,
  Info,
} from "lucide-react";
import { SignDoc } from "@/lib/types";

interface StepState {
  id: string;
  name: string;
  description: string;
  status: "idle" | "running" | "done" | "error" | "skipped";
  credits: number;
  cached: boolean;
  summary: string;
  error?: string;
}

export default function ScanPage() {
  const [doc, setDoc] = useState<SignDoc | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);

  // Scan state
  const [cleanText, setCleanText] = useState<string>("");
  const [quarantinedQuotes, setQuarantinedQuotes] = useState<string[]>([]);
  const [hasInjection, setHasInjection] = useState(false);
  const [guardVerdict, setGuardVerdict] = useState<string>("");

  const [inspectData, setInspectData] = useState<any>(null);
  const [protectData, setProtectData] = useState<any>(null);
  const [showRedacted, setShowRedacted] = useState(false);
  const [extractData, setExtractData] = useState<any>(null);

  const [totalCredits, setTotalCredits] = useState<number>(0);
  const [systemAlert, setSystemAlert] = useState<string | null>(null);
  const pipelineStarted = useRef(false);

  const [steps, setSteps] = useState<StepState[]>([
    {
      id: "read",
      name: "Reading your document",
      description: "Extracting readable text, hidden layers, and metadata",
      status: "done",
      credits: 0,
      cached: true,
      summary: "Document ingested into session memory",
    },
    {
      id: "guard",
      name: "Checking for hidden tricks (Guard)",
      description: "Quarantining white-text prompt injections & AI instructions",
      status: "idle",
      credits: 0,
      cached: false,
      summary: "",
    },
    {
      id: "inspect",
      name: "Checking for hidden code (Inspect)",
      description: "Scanning embedded macros, page scripts, and command lines",
      status: "idle",
      credits: 0,
      cached: false,
      summary: "",
    },
    {
      id: "protect",
      name: "Protecting your private details (Protect)",
      description: "Identifying and redacting personal and financial identifiers",
      status: "idle",
      credits: 0,
      cached: false,
      summary: "",
    },
    {
      id: "extract",
      name: "Pulling out the key facts (Extract)",
      description: "Extracting parties, fees, salaries, dates, and obligations",
      status: "idle",
      credits: 0,
      cached: false,
      summary: "",
    },
  ]);

  // Load doc from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("signsafe_doc");
      if (stored) {
        const parsedDoc: SignDoc = JSON.parse(stored);
        setDoc(parsedDoc);
        setCleanText(parsedDoc.text);
      }
    } catch (e) {
      console.error("Failed to load sessionStorage", e);
    } finally {
      setLoadingDoc(false);
    }
  }, []);

  // Update a single step
  const updateStep = (id: string, updates: Partial<StepState>) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  // Run the sequential pipeline
  const runPipeline = async (activeDoc: SignDoc) => {
    let currentClean = activeDoc.text;
    let runningCredits = 0;

    // STEP 1: Guard
    updateStep("guard", { status: "running" });
    try {
      const res = await fetch("/api/check/guard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: activeDoc.text,
          pdfBase64: activeDoc.pdfBase64,
          sourceType: activeDoc.sourceType,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (
          data.error?.includes("paused") ||
          data.error?.includes("credits") ||
          data.error?.includes("Mock")
        ) {
          setSystemAlert(data.error);
        }
        updateStep("guard", {
          status: "error",
          error: data.error || "Guard check failed",
          summary: "Hidden-trick check unavailable",
        });
      } else {
        const credits = data.meta?.credits || 0;
        const cached = !!data.meta?.cached;
        runningCredits += credits;
        setTotalCredits(runningCredits);

        if (data.injection) {
          setHasInjection(true);
          setGuardVerdict(data.category || "Prompt injection instruction");
          setQuarantinedQuotes(data.quarantinedQuotes || []);
        }

        if (data.cleanText) {
          currentClean = data.cleanText;
          setCleanText(data.cleanText);
        }

        updateStep("guard", {
          status: "done",
          credits,
          cached,
          summary: data.injection
            ? `Flagged ${data.quarantinedQuotes?.length || 1} AI prompt injection span(s)`
            : "No hidden prompt injection tricks detected",
        });
      }
    } catch (err: any) {
      updateStep("guard", {
        status: "error",
        error: err.message,
        summary: "Hidden-trick check unavailable",
      });
    }

    // STEP 2: Inspect
    updateStep("inspect", { status: "running" });
    try {
      const res = await fetch("/api/check/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scripts: activeDoc.scripts || [],
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        updateStep("inspect", {
          status: "error",
          error: data.error || "Inspect failed",
          summary: "Hidden code check unavailable",
        });
      } else {
        const credits = data.meta?.credits || 0;
        const cached = !!data.meta?.cached;
        runningCredits += credits;
        setTotalCredits(runningCredits);

        setInspectData(data);

        if (data.skipped) {
          updateStep("inspect", {
            status: "done",
            credits: 0,
            cached: true,
            summary: "No code or macro snippets found (skipped)",
          });
        } else {
          const maliciousCount = data.results?.filter((r: any) => r.malicious).length || 0;
          const suspiciousCount = data.results?.filter((r: any) => r.suspicious).length || 0;
          updateStep("inspect", {
            status: "done",
            credits,
            cached,
            summary:
              maliciousCount > 0
                ? `Flagged ${maliciousCount} malicious script / command line(s)`
                : suspiciousCount > 0
                ? `Flagged ${suspiciousCount} suspicious command(s)`
                : "All command lines and scripts checked: benign",
          });
        }
      }
    } catch (err: any) {
      updateStep("inspect", {
        status: "error",
        error: err.message,
        summary: "Code inspection unavailable",
      });
    }

    // STEP 3: Protect
    updateStep("protect", { status: "running" });
    try {
      const res = await fetch("/api/check/protect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cleanText: currentClean }),
      });
      const data = await res.json();

      if (!res.ok) {
        updateStep("protect", {
          status: "error",
          error: data.error || "Protect check failed",
          summary: "PII redaction unavailable",
        });
      } else {
        const credits = data.meta?.credits || 0;
        const cached = !!data.meta?.cached;
        runningCredits += credits;
        setTotalCredits(runningCredits);

        setProtectData(data);

        const count = data.totalCount || data.entities?.length || 0;
        updateStep("protect", {
          status: "done",
          credits,
          cached,
          summary: `Identified and redacted ${count} personal details`,
        });
      }
    } catch (err: any) {
      updateStep("protect", {
        status: "error",
        error: err.message,
        summary: "PII redaction unavailable",
      });
    }

    // STEP 4: Extract
    updateStep("extract", { status: "running" });
    try {
      const res = await fetch("/api/check/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cleanText: currentClean }),
      });
      const data = await res.json();

      if (!res.ok) {
        updateStep("extract", {
          status: "error",
          error: data.error || "Extract check failed",
          summary: "Fact extraction unavailable",
        });
      } else {
        const credits = data.meta?.credits || 0;
        const cached = !!data.meta?.cached;
        runningCredits += credits;
        setTotalCredits(runningCredits);

        setExtractData(data);

        const foundCount = Object.values(data.fields || {}).filter(
          (f: any) => f.value !== null && f.value !== undefined
        ).length;

        updateStep("extract", {
          status: "done",
          credits,
          cached,
          summary: `Extracted ${foundCount} verifiable agreement facts`,
        });
      }
    } catch (err: any) {
      updateStep("extract", {
        status: "error",
        error: err.message,
        summary: "Fact extraction unavailable",
      });
    }
  };

  useEffect(() => {
    if (doc && !pipelineStarted.current) {
      pipelineStarted.current = true;
      runPipeline(doc);
    }
  }, [doc]);

  if (loadingDoc) {
    return (
      <div className="min-h-screen bg-[#FBF8F1] flex items-center justify-center p-6 text-[#14213D]">
        <div className="text-sm font-medium flex items-center gap-2.5">
          <Loader2 className="w-4 h-4 animate-spin text-[#E8A33D]" />
          <span>Loading document from memory...</span>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen bg-[#FBF8F1] flex flex-col justify-between font-sans text-[#14213D]">
        <header className="border-b border-[#14213D]/10 bg-[#FBF8F1]/80 backdrop-blur-sm sticky top-0 z-40 p-4">
          <div className="max-w-[1100px] mx-auto">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
          </div>
        </header>
        <main className="max-w-md mx-auto text-center p-8">
          <h1 className="font-serif text-2xl font-bold">No document loaded</h1>
          <p className="text-sm text-stone-600 mt-2">
            Please select or upload a document from the Home page first.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block px-5 py-2.5 rounded-lg bg-[#14213D] text-white text-sm font-semibold"
          >
            Go to Home
          </Link>
        </main>
        <footer className="border-t border-[#14213D]/10 p-6 text-center text-xs text-stone-500">
          SignSafe is not legal advice.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF8F1] text-[#14213D] flex flex-col justify-between selection:bg-[#E8A33D]/25 font-sans">
      {/* Top Header */}
      <header className="w-full border-b border-[#14213D]/10 bg-[#FBF8F1]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#14213D] hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>SignSafe Home</span>
          </Link>

          {/* Running Credit Counter */}
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-[#14213D] text-[#FBF8F1] text-xs font-mono font-medium shadow-xs">
              This check:{" "}
              <strong className="text-[#E8A33D]">{totalCredits}</strong> credits
            </div>
            <div className="hidden sm:inline-flex items-center gap-1.5 text-xs text-stone-500 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2FA36B]" />
              Not legal advice
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
        {/* System Alert (Quota / Mock / Paused) */}
        {systemAlert && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start justify-between gap-3 text-amber-950 text-sm">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Notice: {systemAlert}</strong>
                <p className="text-xs text-amber-900 mt-0.5">
                  Live Clocked requests are paused. You can inspect pre-recorded runs in Judge Mode.
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="px-3 py-1 bg-amber-200 hover:bg-amber-300 rounded-md text-xs font-bold transition whitespace-nowrap"
            >
              Try Judge Mode
            </Link>
          </div>
        )}

        {/* FULL-WIDTH RED-BORDERED BANNER: PROMPT INJECTION QUARANTINE */}
        {hasInjection && (
          <div className="border-2 border-[#D64545] bg-[#FEF2F2] rounded-2xl p-6 sm:p-7 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5 text-[#D64545]">
              <ShieldAlert className="w-6 h-6 flex-shrink-0" />
              <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight">
                This document is trying to trick AI checkers.
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#D64545]/90">
              We removed this text before checking the rest, so it can&apos;t change our answer.
            </p>

            <div className="space-y-2 pt-1">
              {quarantinedQuotes.map((quote, idx) => (
                <div
                  key={idx}
                  className="bg-white/95 border border-[#D64545]/30 rounded-xl p-3.5 shadow-2xs"
                >
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#D64545] font-bold mb-1">
                    Quarantined Prompt Injection Quote #{idx + 1}
                  </div>
                  <pre className="text-xs sm:text-[13px] font-mono text-stone-900 bg-stone-50 p-2.5 rounded-lg whitespace-pre-wrap break-words border border-stone-200/70 leading-relaxed">
                    &ldquo;{quote}&rdquo;
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HIDDEN CODE ALERT CARD (INSPECT RESULT) */}
        {inspectData && (inspectData.hasMalicious || inspectData.hasSuspicious) && (
          <div className="border-2 border-[#D64545] bg-[#FEF2F2] rounded-2xl p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-[#D64545]">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="font-serif text-lg font-bold">
                Hidden code detected:{" "}
                <span className="font-sans font-semibold text-base">
                  {inspectData.results?.find((r: any) => r.category)?.category ||
                    "Dangerous commands or macros"}
                </span>
              </h3>
            </div>
            <p className="text-xs text-[#D64545]/85">
              Code or terminal commands found inside the document that request execution:
            </p>
            <div className="space-y-2">
              {inspectData.results
                ?.filter((r: any) => r.malicious || r.suspicious)
                .map((r: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-stone-900 text-stone-100 p-3 rounded-xl font-mono text-xs overflow-x-auto"
                  >
                    <div className="flex justify-between text-stone-400 text-[10px] pb-1 border-b border-stone-800">
                      <span>VERDICT: {r.verdict.toUpperCase()}</span>
                      <span>ORIGIN: {r.origin}</span>
                    </div>
                    <div className="mt-1 text-emerald-300 whitespace-pre-wrap">
                      {r.code}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* PRIVACY CHIP (PROTECT RESULT) */}
        {protectData && (
          <div className="bg-white border border-[#14213D]/12 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-800">
              <Lock className="w-4 h-4 text-[#2FA36B] flex-shrink-0" />
              <span>
                We found <strong>{protectData.totalCount}</strong> personal details. Anything shared or saved is redacted.
              </span>
            </div>
            <button
              onClick={() => setShowRedacted(!showRedacted)}
              className="inline-flex items-center gap-1.5 text-xs font-mono font-medium px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 transition cursor-pointer"
            >
              {showRedacted ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showRedacted ? "Hide redacted text" : "Show redacted text"}</span>
            </button>
          </div>
        )}

        {/* REDACTED TEXT VIEWER (IF TOGGLED) */}
        {showRedacted && protectData?.anonymized_text && (
          <div className="bg-white border border-[#14213D]/15 rounded-xl p-5 shadow-sm space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between text-xs text-stone-500 font-mono pb-2 border-b border-stone-100">
              <span>PROTECT REDACTED COPY</span>
              <span>Tokens: &lt;PERSON&gt;, &lt;EMAIL&gt;, &lt;BANK_ACCOUNT&gt;</span>
            </div>
            <pre className="text-xs font-sans text-stone-800 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto p-3 bg-[#FAF7F0] rounded-lg">
              {protectData.anonymized_text}
            </pre>
          </div>
        )}

        {/* 5-STEP VERTICAL PAPER PROGRESS LIST */}
        <div className="space-y-3">
          <div className="pb-1 flex justify-between items-center text-xs text-stone-500 font-mono uppercase tracking-wider">
            <span>Audit Pipeline Progression</span>
            <span>Clocked Multi-Stage Engine</span>
          </div>

          {steps.map((step, idx) => (
            <div
              key={step.id}
              className={`paper-card p-4 sm:p-5 rounded-xl border transition-all ${
                step.status === "running"
                  ? "border-[#E8A33D] bg-white shadow-md scale-[1.01]"
                  : step.status === "error"
                  ? "border-amber-300 bg-amber-50/40"
                  : "border-[#14213D]/10 bg-white shadow-2xs"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {/* Status Indicator Icon */}
                  <div className="mt-0.5 flex-shrink-0">
                    {step.status === "running" && (
                      <Loader2 className="w-5 h-5 text-[#E8A33D] animate-spin" />
                    )}
                    {step.status === "done" && (
                      <CheckCircle2 className="w-5 h-5 text-[#2FA36B]" />
                    )}
                    {step.status === "error" && (
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    )}
                    {step.status === "idle" && (
                      <div className="w-5 h-5 rounded-full border border-stone-300 bg-stone-100" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase text-stone-400">
                        Step {idx + 1}
                      </span>
                      <h3 className="font-serif text-base font-bold text-[#14213D]">
                        {step.name}
                      </h3>
                    </div>
                    <p className="text-xs text-stone-600 mt-0.5">{step.description}</p>

                    {/* Completion Summary */}
                    {step.summary && (
                      <div className="mt-2 text-xs font-medium text-stone-800 bg-stone-50 px-2.5 py-1 rounded inline-block border border-stone-200/50">
                        {step.summary}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Credits / Cached Badge or Retry */}
                <div className="text-right flex-shrink-0 text-xs font-mono">
                  {step.status === "done" && (
                    <span className="text-stone-500">
                      {step.cached ? (
                        <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                          cached • 0 cr
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-800 font-semibold">
                          {step.credits} credits
                        </span>
                      )}
                    </span>
                  )}
                  {step.status === "error" && (
                    <button
                      onClick={() => runPipeline(doc)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 font-medium transition"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FACTS PANEL (EXTRACT RESULT) */}
        {extractData?.fields && (
          <div className="paper-card rounded-2xl p-6 sm:p-8 bg-white border border-[#14213D]/12 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#14213D]/10 pb-3">
              <div className="flex items-center gap-2">
                <FileSearch className="w-5 h-5 text-[#14213D]/70" />
                <h2 className="font-serif text-xl font-bold text-[#14213D]">
                  Key Facts Extracted
                </h2>
              </div>
              <span className="text-xs font-mono text-stone-500">
                Verbatim facts copied from document
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries<any>(extractData.fields).map(([fieldName, fieldInfo]) => {
                const label = fieldName.replace(/_/g, " ");
                const val = fieldInfo?.value;
                const isNotStated =
                  val === null ||
                  val === undefined ||
                  (Array.isArray(val) && val.length === 0);

                let displayValue = "not stated";
                if (!isNotStated) {
                  if (Array.isArray(val)) {
                    displayValue = val
                      .map((item) => (typeof item === "object" ? JSON.stringify(item) : item))
                      .join(", ");
                  } else {
                    displayValue = String(val);
                  }
                }

                return (
                  <div
                    key={fieldName}
                    className="p-3.5 rounded-xl border border-stone-100 bg-[#FAF7F0] space-y-1"
                  >
                    <span className="text-[11px] font-mono uppercase tracking-wider text-stone-500 font-semibold block">
                      {label}
                    </span>
                    <div
                      className={`text-sm font-medium ${
                        isNotStated
                          ? "text-stone-400 italic font-mono text-xs"
                          : "text-stone-900"
                      }`}
                    >
                      {displayValue}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#14213D]/10 py-6 sm:py-8 bg-[#FBF8F1] text-center text-xs text-[#14213D]/65">
        SignSafe is not legal advice. It helps you spot things to ask about.
      </footer>
    </div>
  );
}
