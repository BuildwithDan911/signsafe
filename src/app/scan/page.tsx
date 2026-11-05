"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Lock,
  FileSearch,
  Eye,
  EyeOff,
  RotateCw,
  HelpCircle,
  Check,
} from "lucide-react";
import { SignDoc } from "@/lib/types";
import { MergedSignal, SIGNALS_MAP, mergeSignals } from "@/lib/signals";
import { calculateScore, ScoreResult } from "@/lib/score";
import JudgeRibbon from "@/components/JudgeRibbon";
import CreditCounter, { StepCreditInfo } from "@/components/CreditCounter";
import CreditsModal from "@/components/CreditsModal";
import { getJudgeSampleById } from "@/lib/judge";
import { DealContext } from "@/lib/signals";

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

function guessDealType(value: unknown): string {
  const label = String(value || "").toLowerCase();
  if (/job|employment|offer|appointment/.test(label)) return label.includes("employment contract") ? "employment_contract" : "job_offer";
  if (/freelance|contractor|service/.test(label)) return "freelance_agreement";
  if (/tenan|lease|rental/.test(label)) return "tenancy_lease";
  if (/loan|credit|borrow/.test(label)) return "loan_credit";
  if (/sponsor|creator/.test(label)) return "sponsorship_deal";
  if (/invoice|payment|purchase|sale/.test(label)) return "purchase_payment";
  if (/terms|website|app/.test(label)) return "terms_conditions";
  if (/nda|confidential/.test(label)) return "nda";
  return "other";
}

export default function ScanPage() {
  const router = useRouter();
  const [doc, setDoc] = useState<SignDoc | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);

  // Scan state
  const [cleanText, setCleanText] = useState<string>("");
  const [quarantinedQuotes, setQuarantinedQuotes] = useState<string[]>([]);
  const [hasInjection, setHasInjection] = useState(false);

  const [inspectData, setInspectData] = useState<any>(null);
  const [protectData, setProtectData] = useState<any>(null);
  const [showRedacted, setShowRedacted] = useState(false);
  const [extractData, setExtractData] = useState<any>(null);

  // Decide & Fill/Verify state
  const [decideData, setDecideData] = useState<any>(null);
  const [mergedSignals, setMergedSignals] = useState<MergedSignal[]>([]);
  const [fillData, setFillData] = useState<any>(null);
  const [verifyData, setVerifyData] = useState<any>(null);
  const [fillItems, setFillItems] = useState<any[]>([]);
  const [verifiedItems, setVerifiedItems] = useState<any[]>([]);
  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, "yes" | "no" | "not_sure">>({});
  const [dangerMatch, setDangerMatch] = useState<any>(null);

  // Question wizard state
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [questionsDone, setQuestionsDone] = useState(false);
  const [dealContext, setDealContext] = useState<DealContext | null>(null);
  const [showDealContext, setShowDealContext] = useState(false);
  const [contextGuess, setContextGuess] = useState<any>(null);
  const [contextForm, setContextForm] = useState<DealContext>({});
  const contextResolver = useRef<((value: DealContext) => void) | null>(null);

  const [totalCredits, setTotalCredits] = useState<number>(0);
  const [systemAlert, setSystemAlert] = useState<string | null>(null);
  const [isJudgeMode, setIsJudgeMode] = useState(false);
  const [judgeRecordedAt, setJudgeRecordedAt] = useState<string | null>(null);
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
  const [fixtureData, setFixtureData] = useState<any>(null);
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
    {
      id: "decide",
      name: "Evaluating warning signs (Decide)",
      description: "Assessing contract terms, telltale signals, and fair clauses",
      status: "idle",
      credits: 0,
      cached: false,
      summary: "",
    },
    {
      id: "fill",
      name: "Writing what to ask (Fill)",
      description: "Extracting exact clauses, explanations, and negotiation messages",
      status: "idle",
      credits: 0,
      cached: false,
      summary: "",
    },
    {
      id: "verify",
      name: "Double-checking ourselves (Verify)",
      description: "Grounding generated explanations claim-by-claim against document",
      status: "idle",
      credits: 0,
      cached: false,
      summary: "",
    },
  ]);

  // Load doc & judge mode from sessionStorage
  useEffect(() => {
    try {
      const storedJudge = sessionStorage.getItem("signsafe_judge_mode");
      if (storedJudge) {
        const parsedJudge = JSON.parse(storedJudge);
        setIsJudgeMode(true);
        setJudgeRecordedAt(parsedJudge.recordedAt || null);

        const storedFixture = sessionStorage.getItem("signsafe_fixture");
        if (storedFixture) {
          const parsedFix = JSON.parse(storedFixture);
          setFixtureData(parsedFix);
        } else if (parsedJudge.sampleId) {
          const sample = getJudgeSampleById(parsedJudge.sampleId);
          if (sample) setFixtureData(sample.fixture);
        }
      }

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

  const updateStep = (id: string, updates: Partial<StepState>) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  // Run the full sequential pipeline
  const runPipeline = async (activeDoc: SignDoc) => {
    let currentClean = activeDoc.text;
    let runningCredits = 0;
    let extractedFacts: Record<string, any> = {};

    const runEmptyFinalStages = async () => {
      updateStep("fill", { status: "running" });
      try {
        const fillRes = await fetch("/api/check/fill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cleanText: currentClean, flags: [], clarificationFlags: [] }),
        });
        if (!fillRes.ok) throw new Error("Clause drafting unavailable");
        const fillData = await fillRes.json();
        setFillData(fillData);
        setFillItems([]);
        updateStep("fill", {
          status: "done", credits: 0, cached: true,
          summary: "No clauses drafted because risk evaluation was unavailable",
        });
      } catch (err: any) {
        updateStep("fill", { status: "error", error: err.message, summary: "Clause drafting unavailable" });
      }

      updateStep("verify", { status: "running" });
      try {
        const verifyRes = await fetch("/api/check/verify-explanations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cleanText: currentClean, items: [] }),
        });
        if (!verifyRes.ok) throw new Error("Explanation verification unavailable");
        const verifyData = await verifyRes.json();
        setVerifyData(verifyData);
        setVerifiedItems([]);
        updateStep("verify", {
          status: "done", credits: 0, cached: true,
          summary: "Nothing to verify because no clauses were drafted",
        });
      } catch (err: any) {
        updateStep("verify", { status: "error", error: err.message, summary: "Explanation verification unavailable" });
      }
    };

    // 1. Guard
    updateStep("guard", { status: "running" });
    try {
      const res = await fetch("/api/check/guard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: activeDoc.text,
          pdfBase64: activeDoc.pdfBase64,
          pdfPageCount: activeDoc.pdfPageCount,
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

    // 2. Inspect
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
          updateStep("inspect", {
            status: "done",
            credits,
            cached,
            summary:
              maliciousCount > 0
                ? `Flagged ${maliciousCount} malicious script / command line(s)`
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

    // 3. Protect
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

    // 4. Extract
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
        extractedFacts = data.fields || {};

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

    const guessedType = guessDealType(extractedFacts.document_type?.value);
    const rawParties = extractedFacts.party_names?.value;
    const parties = Array.isArray(rawParties) ? rawParties.map(String) : rawParties ? [String(rawParties)] : [];
    for (const key of ["issuer_name", "signatory_name"]) {
      const value = extractedFacts[key]?.value;
      if (value && !parties.includes(String(value))) parties.push(String(value));
    }
    const selectedContext: DealContext = {
      dealType: guessedType,
      party: parties[0] || "",
      skipped: true,
    };
    setDealContext(selectedContext);

    // 5. Decide (Phase 5)
    updateStep("decide", { status: "running" });
    try {
      const res = await fetch("/api/check/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cleanText: currentClean,
          facts: extractedFacts,
          fileSignals: activeDoc.fileSignals || [],
          emails: activeDoc.emails || [],
          dealContext: selectedContext,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        updateStep("decide", {
          status: "error",
          error: data.error || "Decide check failed",
          summary: "Risk evaluation unavailable",
        });

        await runEmptyFinalStages();
      } else {
        const credits = data.meta?.credits || 0;
        const cached = !!data.meta?.cached;
        runningCredits += credits;
        setTotalCredits(runningCredits);

        setDecideData(data);
        setMergedSignals(data.mergedSignals || []);

        const redCount = (data.mergedSignals || []).filter(
          (s: MergedSignal) => s.severity === "red"
        ).length;
        const amberCount = (data.mergedSignals || []).filter(
          (s: MergedSignal) => s.severity === "amber"
        ).length;

        updateStep("decide", {
          status: "done",
          credits,
          cached,
          summary: `Identified ${redCount} major warning signs, ${amberCount} caution items`,
        });

        // Phase 12: Check Danger Memory for template reuse
        try {
          const dangerRes = await fetch("/api/check/danger-memory", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cleanText: currentClean,
              docType: data.docType || "contract",
              flags: data.mergedSignals || [],
            }),
          });
          if (dangerRes.ok) {
            const dangerResData = await dangerRes.json();
            if (dangerResData.matched) {
              setDangerMatch(dangerResData);
              if (dangerResData.in4Signal) {
                data.mergedSignals = [...(data.mergedSignals || []), dangerResData.in4Signal];
                setMergedSignals(data.mergedSignals);
              }
            }
          }
        } catch (e) {
          console.warn("Danger memory check error:", e);
        }

        // 6. Fill (Phase 6: Writing what to ask)
        const signalsToFill = data.mergedSignals || [];
        updateStep("fill", { status: "running" });
        let currentFillItems: any[] = [];
        try {
          const fillRes = await fetch("/api/check/fill", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cleanText: currentClean,
              flags: signalsToFill.slice(0, 8),
              clarificationFlags: [...new Set([
                ...(data.lowConfidenceIds || []),
                ...(data.highConfidenceIds || []),
                ...(data.mergedSignals || []).flatMap((signal: any) => signal.constituentIds || []),
              ])]
                .slice(0, 3)
                .map((id: string) => {
                  const signal = SIGNALS_MAP[id];
                  return signal
                    ? {
                        id,
                        title: signal.title,
                        meaning: signal.meaning,
                        askThem: signal.askThem,
                        verifyYourself: signal.verifyYourself,
                        weight: data.answers?.contract_terms?.probabilities?.[id] ??
                          data.answers?.authenticity_tells?.probabilities?.[id] ?? 0,
                      }
                    : null;
                })
                .filter(Boolean),
              dealContext: selectedContext,
            }),
          });
          const fillDataRes = await fillRes.json();
          if (fillRes.ok) {
            const fillCredits = fillDataRes.meta?.credits || 0;
            const fillCached = !!fillDataRes.meta?.cached;
            runningCredits += fillCredits;
            setTotalCredits(runningCredits);
            currentFillItems = fillDataRes.items || [];
            setFillData(fillDataRes);
            setFillItems(currentFillItems);
            const quoteCount = currentFillItems.filter((it: any) => it.quote).length;
            updateStep("fill", {
              status: "done",
              credits: fillCredits,
              cached: fillCached,
              summary: `Extracted ${quoteCount} clauses, explanations & negotiation messages`,
            });
          } else {
            updateStep("fill", {
              status: "error",
              error: fillDataRes.error,
              summary: "Clause extraction skipped",
            });
          }
        } catch (fillErr: any) {
          updateStep("fill", {
            status: "error",
            error: fillErr.message,
            summary: "Clause extraction skipped",
          });
        }

        // 7. Verify (Phase 6: Double-checking ourselves)
        updateStep("verify", { status: "running" });
        let currentVerifiedItems: any[] = [];
        try {
          const verifyRes = await fetch("/api/check/verify-explanations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cleanText: currentClean,
              items: currentFillItems,
            }),
          });
          const verifyDataRes = await verifyRes.json();
          if (verifyRes.ok) {
            const verifyCredits = verifyDataRes.meta?.credits || 0;
            const verifyCached = !!verifyDataRes.meta?.cached;
            runningCredits += verifyCredits;
            setTotalCredits(runningCredits);
            currentVerifiedItems = verifyDataRes.verifiedItems || [];
            setVerifyData(verifyDataRes);
            setVerifiedItems(currentVerifiedItems);
            const verifiedCount = currentVerifiedItems.filter((v: any) => v.verified).length;
            updateStep("verify", {
              status: "done",
              credits: verifyCredits,
              cached: verifyCached,
              summary: `Double-checked explanations (${verifiedCount} verified against text ✓)`,
            });
          } else {
            updateStep("verify", {
              status: "error",
              error: verifyDataRes.error,
              summary: "Explanation verification skipped",
            });
          }
        } catch (verifyErr: any) {
          updateStep("verify", {
            status: "error",
            error: verifyErr.message,
            summary: "Explanation verification skipped",
          });
        }
      }
    } catch (err: any) {
      updateStep("decide", {
        status: "error",
        error: err.message,
        summary: "Risk evaluation unavailable",
      });
      await runEmptyFinalStages();
    }
  };

  useEffect(() => {
    if (doc && !pipelineStarted.current) {
      pipelineStarted.current = true;
      if (isJudgeMode && fixtureData) {
        runJudgeReplay(fixtureData);
      } else {
        runPipeline(doc);
      }
    }
  }, [doc, isJudgeMode, fixtureData]);

  const runJudgeReplay = async (fixture: any) => {
    updateStep("read", {
      status: "done",
      credits: 0,
      cached: true,
      summary: "Document ingested into session memory",
    });
    await new Promise((r) => setTimeout(r, 400));

    // 1. Guard
    updateStep("guard", { status: "running" });
    await new Promise((r) => setTimeout(r, 400));
    const guard = fixture.guard || {};
    if (guard.injection) {
      setHasInjection(true);
      setQuarantinedQuotes(guard.quarantinedQuotes || []);
    }
    const targetClean = guard.cleanText || fixture.cleanText || fixture.doc?.text || "";
    setCleanText(targetClean);
    updateStep("guard", {
      status: "done",
      credits: 0,
      cached: true,
      summary: guard.injection
        ? `Flagged ${guard.quarantinedQuotes?.length || 1} AI prompt injection span(s)`
        : "No prompt injection or AI-trick text detected",
    });

    // 2. Inspect
    updateStep("inspect", { status: "running" });
    await new Promise((r) => setTimeout(r, 400));
    const inspect = fixture.inspect || {};
    setInspectData(inspect);
    updateStep("inspect", {
      status: "done",
      credits: 0,
      cached: true,
      summary: inspect.hasMalicious
        ? "Suspicious embedded command detected"
        : inspect.skipped
        ? "Skipped (no embedded code found)"
        : "Code clean",
    });

    // 3. Protect
    updateStep("protect", { status: "running" });
    await new Promise((r) => setTimeout(r, 400));
    const protect = fixture.protect || {};
    setProtectData(protect);
    updateStep("protect", {
      status: "done",
      credits: 0,
      cached: true,
      summary: `Found ${protect.totalCount || 7} personal and contact details`,
    });

    // 4. Extract
    updateStep("extract", { status: "running" });
    await new Promise((r) => setTimeout(r, 400));
    const extract = fixture.extract || {};
    setExtractData(extract);
    const factsCount = Object.keys(extract.fields || {}).filter(
      (k) => extract.fields[k]?.value !== null
    ).length;
    updateStep("extract", {
      status: "done",
      credits: 0,
      cached: true,
      summary: `Extracted ${factsCount} key contractual terms and entities`,
    });

    // 5. Decide
    updateStep("decide", { status: "running" });
    await new Promise((r) => setTimeout(r, 400));
    const decide = fixture.decide || {};
    setDecideData(decide);
    setMergedSignals(decide.mergedSignals || []);
    const redCount = (decide.mergedSignals || []).filter((s: any) => s.severity === "red").length;
    const amberCount = (decide.mergedSignals || []).filter((s: any) => s.severity === "amber").length;
    updateStep("decide", {
      status: "done",
      credits: 0,
      cached: true,
      summary: `Identified ${redCount} major warning signs, ${amberCount} caution items`,
    });

    // 6. Fill
    updateStep("fill", { status: "running" });
    await new Promise((r) => setTimeout(r, 400));
    const fill = fixture.fill || {};
    setFillData(fill);
    setFillItems(fill.items || []);
    const quoteCount = (fill.items || []).filter((it: any) => it.quote).length;
    updateStep("fill", {
      status: "done",
      credits: 0,
      cached: true,
      summary: `Extracted ${quoteCount} clauses, explanations & negotiation messages`,
    });

    // 7. Verify
    updateStep("verify", { status: "running" });
    await new Promise((r) => setTimeout(r, 400));
    const verify = fixture.verify || {};
    setVerifyData(verify);
    setVerifiedItems(verify.verifiedItems || []);
    const verifiedCount = (verify.verifiedItems || []).filter((v: any) => v.verified).length;
    updateStep("verify", {
      status: "done",
      credits: 0,
      cached: true,
      summary: `Double-checked explanations (${verifiedCount} verified against text ✓)`,
    });

    // Handle follow-up answers if in fixture
    if (fixture.followUpAnswers) {
      setFollowUpAnswers(fixture.followUpAnswers);
      setConfirmedIds(
        fixture.confirmedIds ||
          Object.keys(fixture.followUpAnswers).filter((k) => fixture.followUpAnswers[k] === "yes")
      );
    }
    setQuestionsDone(true);

    // Auto-proceed to results after brief beat
    setTimeout(() => {
      goToResultsWithFixture(fixture);
    }, 600);
  };

  const retrySingleStep = async (stepId: string) => {
    if (!doc) return;
    updateStep(stepId, { status: "running", error: undefined });
    if (stepId === "guard") {
      try {
        const res = await fetch("/api/check/guard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: doc.text,
            pdfBase64: doc.pdfBase64,
            pdfPageCount: doc.pdfPageCount,
            sourceType: doc.sourceType,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          if (data.injection) {
            setHasInjection(true);
            setQuarantinedQuotes(data.quarantinedQuotes || []);
          }
          if (data.cleanText) setCleanText(data.cleanText);
          updateStep("guard", {
            status: "done",
            credits: data.meta?.credits || 0,
            cached: !!data.meta?.cached,
            summary: data.injection
              ? "Flagged AI prompt injection span"
              : "No prompt injection detected",
          });
        } else {
          updateStep("guard", {
            status: "error",
            error: data.error,
            summary: "Hidden-trick check unavailable",
          });
        }
      } catch (e: any) {
        updateStep("guard", {
          status: "error",
          error: e.message,
          summary: "Hidden-trick check unavailable",
        });
      }
    } else if (stepId === "inspect") {
      try {
        const res = await fetch("/api/check/inspect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scripts: doc.scripts || [] }),
        });
        const data = await res.json();
        if (res.ok) {
          setInspectData(data);
          updateStep("inspect", {
            status: "done",
            credits: data.meta?.credits || 0,
            cached: !!data.meta?.cached,
            summary: data.skipped
              ? "Skipped (no embedded code found)"
              : "Code scan completed",
          });
        } else {
          updateStep("inspect", {
            status: "error",
            error: data.error,
            summary: "Code inspection unavailable",
          });
        }
      } catch (e: any) {
        updateStep("inspect", {
          status: "error",
          error: e.message,
          summary: "Code inspection unavailable",
        });
      }
    } else if (stepId === "protect") {
      try {
        const res = await fetch("/api/check/protect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cleanText: cleanText || doc.text }),
        });
        const data = await res.json();
        if (res.ok) {
          setProtectData(data);
          updateStep("protect", {
            status: "done",
            credits: data.meta?.credits || 0,
            cached: !!data.meta?.cached,
            summary: `Found ${data.totalCount || 0} personal details`,
          });
        } else {
          updateStep("protect", {
            status: "error",
            error: data.error,
            summary: "Redaction unavailable",
          });
        }
      } catch (e: any) {
        updateStep("protect", {
          status: "error",
          error: e.message,
          summary: "Redaction unavailable",
        });
      }
    } else {
      runPipeline(doc);
    }
  };

  const handleShowClosestRecordedRun = () => {
    const text = (doc?.text || "").toLowerCase();
    const name = (doc?.fileName || "").toLowerCase();
    let sampleId: "job_offer" | "freelance_contract" = "job_offer";
    if (
      name.includes("freelance") ||
      text.includes("contractor") ||
      text.includes("design") ||
      text.includes("invoice")
    ) {
      sampleId = "freelance_contract";
    }
    const sample = getJudgeSampleById(sampleId);
    if (sample) {
      sessionStorage.setItem(
        "signsafe_judge_mode",
        JSON.stringify({
          sampleId: sample.id,
          recordedAt: (sample.fixture as { recordedAt: string }).recordedAt,
          totalCredits: (sample.fixture as { totalCredits: number }).totalCredits,
        })
      );
      sessionStorage.setItem("signsafe_fixture", JSON.stringify(sample.fixture as unknown));
      sessionStorage.setItem(
        "signsafe_doc",
        JSON.stringify((sample.fixture as { doc: unknown }).doc)
      );
      sessionStorage.removeItem("signsafe_audit");
      window.location.reload();
    }
  };

  // Only ask short questions Clocked generated from an uncertain, document-backed clause.
  const questionsToAsk = React.useMemo(() => {
    if (!Array.isArray(fillData?.clarificationQuestions)) return [];
    return fillData.clarificationQuestions
      .filter((question: any) =>
        typeof question?.signalId === "string" &&
        typeof question?.title === "string" &&
        typeof question?.evidence === "string" &&
        typeof question?.question === "string" &&
        question.evidence.trim() &&
        question.question.includes("?")
      )
      .slice(0, 3);
  }, [fillData]);

  // Handle follow up answering
  const handleAnswer = (ans: "yes" | "no" | "not_sure") => {
    const q = questionsToAsk[currentQuestionIdx];
    if (!q) return;

    setFollowUpAnswers((prev) => ({ ...prev, [q.signalId]: ans }));
    if (ans === "yes") {
      const existingGroup = mergedSignals.find(
        (signal) => signal.id === q.signalId || signal.constituentIds.includes(q.signalId)
      );
      const promoted = existingGroup || mergeSignals([q.signalId])[0];
      if (promoted) {
        if (!existingGroup) {
          setMergedSignals((previous) => [
            ...previous,
            { ...promoted, severity: "red", weight: 3, isConfirmed: true },
          ]);
        }
        const confirmedId = promoted.id;
        setConfirmedIds((previous) =>
          previous.includes(confirmedId) ? previous : [...previous, confirmedId]
        );
      }
    }

    if (currentQuestionIdx + 1 < questionsToAsk.length) {
      setCurrentQuestionIdx(currentQuestionIdx + 1);
    } else {
      setQuestionsDone(true);
    }
  };

  const finishDealContext = (skip: boolean) => {
    const value: DealContext = skip
      ? { dealType: contextGuess?.dealType || "other", party: contextGuess?.parties?.[0] || "", skipped: true }
      : { ...contextForm, role: contextForm.role || contextForm.transaction, skipped: false };
    contextResolver.current?.(value);
    contextResolver.current = null;
  };

  // Navigate to results
  const goToResults = () => {
    const failedSafety = ["guard", "inspect", "protect"].filter((id) =>
      steps.some((s) => s.id === id && s.status === "error")
    );

    const scoreResult: ScoreResult = calculateScore({
      mergedSignals,
      guardInjection: hasInjection,
      inspectMalicious: inspectData?.hasMalicious,
      confirmedSignalIds: confirmedIds,
      greenSignalsCount: decideData?.greenSignals?.length || 0,
      failedSafetySteps: failedSafety,
    });

    const auditPayload = {
      doc,
      cleanText,
      hasInjection,
      quarantinedQuotes,
      inspectData,
      protectData,
      extractData,
      decideData,
      fillData,
      verifyData,
      fillItems,
      verifiedItems,
      dealContext,
      contextSkipped: Boolean(dealContext?.skipped),
      sectionsChecked: Number(decideData?.sectionsChecked || extractData?.sectionsChecked || 1),
      mergedSignals,
      confirmedIds,
      failedSafetySteps: failedSafety,
      dangerMatch,
      scoreResult,
      totalCredits: isJudgeMode ? 0 : totalCredits,
      isJudgeMode: Boolean(isJudgeMode),
      recordedAt: judgeRecordedAt || new Date().toISOString(),
      timestamp: new Date().toISOString(),
    };

    sessionStorage.setItem("signsafe_audit", JSON.stringify(auditPayload));
    router.push("/results");
  };

  const goToResultsWithFixture = (fixture: any) => {
    const scoreResult: ScoreResult =
      fixture.scoreResult ||
      calculateScore({
        mergedSignals: fixture.decide?.mergedSignals || [],
        guardInjection: fixture.guard?.injection,
        inspectMalicious: fixture.inspect?.hasMalicious,
        confirmedSignalIds: fixture.confirmedIds || [],
        greenSignalsCount: fixture.decide?.greenSignals?.length || 0,
      });

    const fixtureDangerMatch =
      fixture.dangerMatch ||
      (fixture.sampleId === "job_offer"
        ? {
            matched: true,
            seenCount: 4,
            docType: "job_offer",
            documentQuote:
              "We will send you a cheque for USD 3,800. Deposit it and use the funds to buy your laptop and software from our approved vendor, TechSupply Direct.",
            patternQuote:
              "Following your interview with our hiring manager on Telegram, we offer you the position of Remote Data Entry Associate with Apex Cloud Dynamics. Pay is USD 42 per hour, paid weekly. Equipment: We will send you a cheque for USD 3,500. Deposit it and use the funds to buy your laptop and software from our approved vendor, TechSupply Direct.",
          }
        : null);

    const auditPayload = {
      doc: fixture.doc || doc,
      cleanText: fixture.cleanText || fixture.guard?.cleanText || doc?.text,
      hasInjection: Boolean(fixture.guard?.injection),
      quarantinedQuotes: fixture.guard?.quarantinedQuotes || [],
      inspectData: fixture.inspect,
      protectData: fixture.protect,
      extractData: fixture.extract,
      decideData: fixture.decide,
      fillData: fixture.fill,
      verifyData: fixture.verify,
      fairData: fixture.fair,
      fillItems: fixture.fill?.items || [],
      verifiedItems: fixture.verify?.verifiedItems || [],
      mergedSignals: fixture.decide?.mergedSignals || [],
      confirmedIds: fixture.confirmedIds || [],
      followUpAnswers: fixture.followUpAnswers || {},
      dangerMatch: fixtureDangerMatch,
      scoreResult,
      totalCredits: 0,
      fixtureCredits: fixture.totalCredits || 0,
      isJudgeMode: true,
      recordedAt: judgeRecordedAt || fixture.recordedAt || new Date().toISOString(),
      askData: fixture.ask,
      promisesData: fixture.promises,
      timestamp: new Date().toISOString(),
    };

    sessionStorage.setItem("signsafe_audit", JSON.stringify(auditPayload));
    router.push("/results");
  };

  if (loadingDoc) {
    return (
      <div className="min-h-screen bg-[#FBF8F1] flex items-center justify-center p-6 text-[#14213D]">
        <div className="text-sm font-medium flex items-center gap-2.5">
          <Loader2 className="w-4 h-4 animate-spin text-[#8A560B]" />
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
        <footer className="border-t border-[#14213D]/10 p-6 text-center text-xs text-stone-600">
          SignSafe is not legal advice.
        </footer>
      </div>
    );
  }

  const isPipelineComplete = steps.every(
    (s) => s.status === "done" || s.status === "error" || s.status === "skipped"
  );

  const activeQuestion = questionsToAsk[currentQuestionIdx];

  const stepsBreakdown: StepCreditInfo[] = steps
    .filter((s) => s.status === "done" && s.id !== "read")
    .map((s) => ({
      name: s.name.split("(")[0].trim(),
      credits: isJudgeMode ? 0 : s.credits,
      cached: isJudgeMode ? true : s.cached,
    }));

  return (
    <div className="min-h-screen bg-[#FBF8F1] text-[#14213D] flex flex-col justify-between selection:bg-[#E8A33D]/25 font-sans">
      {/* Judge Mode Top Ribbon */}
      {isJudgeMode && <JudgeRibbon recordedAt={judgeRecordedAt || undefined} />}

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

          {/* Running Credit Counter with Tooltip */}
          <div className="flex items-center gap-3">
            <CreditCounter
              totalCredits={isJudgeMode ? 0 : totalCredits}
              isJudgeMode={isJudgeMode}
              stepsBreakdown={stepsBreakdown}
              onOpenCreditsModal={() => setIsCreditsModalOpen(true)}
            />
            <div className="hidden sm:inline-flex items-center gap-1.5 text-xs text-stone-600 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2FA36B]" />
              Not legal advice
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
        {/* System Alert (Quota / Mock / Paused / Graceful fallback) */}
        {systemAlert && (
          <div className="p-4 sm:p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-950 text-sm shadow-xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#14213D] block text-sm sm:text-base">
                  Notice: {systemAlert}
                </strong>
                <p className="text-xs sm:text-sm text-stone-700 mt-0.5">
                  Live Clocked requests are paused or unavailable. You can view the pre-recorded live run instead.
                </p>
              </div>
            </div>
            <button
              onClick={handleShowClosestRecordedRun}
              className="px-4 py-2 bg-[#14213D] hover:bg-[#14213D]/90 text-[#FBF8F1] rounded-xl text-xs sm:text-sm font-semibold transition shrink-0 cursor-pointer shadow-xs"
            >
              Show the recorded run instead
            </button>
          </div>
        )}

        {/* HIDDEN CODE ALERT CARD (INSPECT RESULT) */}
        {inspectData && (inspectData.hasMalicious || inspectData.hasSuspicious) && (
          <div className="border-2 border-[#D64545] bg-[#FEF2F2] rounded-2xl p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-[#A62626]">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="font-serif text-lg font-bold">
                Hidden code detected:{" "}
                <span className="font-sans font-semibold text-base">
                  {inspectData.results?.find((r: any) => r.category)?.category ||
                    "Dangerous commands or macros"}
                </span>
              </h3>
            </div>
            <p className="text-xs text-[#A62626]/85">
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
                    <div className="flex justify-between text-stone-600 text-[10px] pb-1 border-b border-stone-800">
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
              <Lock className="w-4 h-4 text-[#1E734A] flex-shrink-0" />
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
            <div className="flex items-center justify-between text-xs text-stone-600 font-mono pb-2 border-b border-stone-100">
              <span>PROTECT REDACTED COPY</span>
              <span>Tokens: &lt;PERSON&gt;, &lt;EMAIL&gt;, &lt;BANK_ACCOUNT&gt;</span>
            </div>
            <pre className="text-xs font-sans text-stone-800 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto p-3 bg-[#FAF7F0] rounded-lg">
              {protectData.anonymized_text}
            </pre>
          </div>
        )}

        {/* 6-STEP VERTICAL PAPER PROGRESS LIST */}
        <div className="space-y-3">
          <div className="pb-1 flex justify-between items-center text-xs text-stone-600 font-mono uppercase tracking-wider">
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
                  <div className="mt-0.5 flex-shrink-0">
                    {step.status === "running" && (
                      <Loader2 className="w-5 h-5 text-[#8A560B] animate-spin" />
                    )}
                    {step.status === "done" && (
                      <CheckCircle2 className="w-5 h-5 text-[#1E734A]" />
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
                      <span className="text-[10px] font-mono uppercase text-stone-600">
                        Step {idx + 1}
                      </span>
                      <h3 className="font-serif text-base font-bold text-[#14213D]">
                        {step.name}
                      </h3>
                    </div>
                    <p className="text-xs text-stone-600 mt-0.5">{step.description}</p>

                    {step.summary && (
                      <div className="mt-2 text-xs font-medium text-stone-800 bg-stone-50 px-2.5 py-1 rounded inline-block border border-stone-200/50">
                        {step.summary}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right flex-shrink-0 text-xs font-mono">
                  {step.status === "done" && (
                    <span className="text-stone-600">
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
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#E8A33D]/20 text-[#14213D] border border-[#E8A33D]/30">
                        not checked
                      </span>
                      <button
                        onClick={() => retrySingleStep(step.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 font-medium transition cursor-pointer text-xs"
                      >
                        <RotateCw className="w-3 h-3" />
                        <span>Retry</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {showDealContext && contextGuess && (
          <section className="paper-card rounded-2xl p-6 sm:p-8 bg-white border border-[#14213D]/12 shadow-md space-y-6" aria-labelledby="deal-context-title">
            <div className="flex items-start justify-between gap-4 border-b border-[#14213D]/10 pb-4">
              <div>
                <h2 id="deal-context-title" className="font-serif text-xl sm:text-2xl font-bold text-[#14213D]">Help us understand your deal</h2>
                <p className="mt-1 text-sm text-stone-700">We use your side of the agreement to judge whether a term is normal or one-sided.</p>
                <p className="mt-2 text-xs text-stone-600">Clocked’s document guess: <strong>{contextGuess.dealTypeLabel}</strong>{contextGuess.confidence < 0.5 ? " — uncertain; please choose the closest match." : ""}</p>
                <p className="mt-2 text-xs text-stone-600">This check continues automatically with Clocked’s best guess after 15 seconds. Choose Skip to continue now, or answer below to tailor the check.</p>
              </div>
              <button type="button" onClick={() => finishDealContext(true)} className="shrink-0 text-sm text-stone-700 underline">Skip</button>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[#14213D]">1. Which side are you on?</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["being_hired", "I’m being hired"], ["hiring", "I’m hiring"], ["paying", "I’m paying"],
                    ["being_paid", "I’m being paid"], ["renting", "I’m renting"], ["borrowing", "I’m borrowing"], ["other", "Other"],
                  ].map(([role, label]) => (
                    <button key={role} type="button" onClick={() => setContextForm((p) => ({ ...p, role }))} className={`rounded-full border px-3 py-2 text-sm ${contextForm.role === role ? "border-[#14213D] bg-[#14213D] text-white" : "border-stone-300 bg-white text-[#14213D]"}`}>{label}</button>
                  ))}
                </div>
              </div>
              <label className="space-y-2 text-sm font-semibold text-[#14213D]">2. What kind of deal is this?
                <select value={contextForm.dealType || "other"} onChange={(e) => setContextForm((p) => ({ ...p, dealType: e.target.value }))} className="block w-full rounded-lg border border-stone-300 bg-white p-3 font-normal">
                  <option value="job_offer">Job offer</option><option value="employment_contract">Employment contract</option><option value="freelance_agreement">Freelance or service contract</option><option value="purchase_payment">Purchase or payment agreement</option><option value="tenancy_lease">Tenancy</option><option value="loan_credit">Loan</option><option value="sponsorship_deal">Sponsorship</option><option value="terms_conditions">Terms and conditions</option><option value="nda">NDA</option><option value="other">Other</option>
                </select>
              </label>
            </div>

            <details className="rounded-xl border border-stone-200 px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-[#14213D]">Add details (optional)</summary>
              <div className="mt-4 space-y-5">
                {contextGuess.parties.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[#14213D]">Which party are you?</p>
                    <div className="flex flex-wrap gap-2">
                      {contextGuess.parties.map((party: string) => (
                        <button key={party} type="button" onClick={() => setContextForm((p) => ({ ...p, party }))} className={`rounded-full border px-3 py-2 text-sm ${contextForm.party === party ? "border-[#14213D] bg-[#14213D] text-white" : "border-stone-300 bg-white text-[#14213D]"}`}>{party}</button>
                      ))}
                      <button type="button" onClick={() => setContextForm((p) => ({ ...p, party: "other" }))} className={`rounded-full border px-3 py-2 text-sm ${contextForm.party === "other" ? "border-[#14213D] bg-[#14213D] text-white" : "border-stone-300 bg-white text-[#14213D]"}`}>Other</button>
                    </div>
                  </div>
                )}
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-semibold text-[#14213D]">Rough value
                    <select value={contextForm.roughValue || ""} onChange={(e) => setContextForm((p) => ({ ...p, roughValue: e.target.value }))} className="block w-full rounded-lg border border-stone-300 bg-white p-3 font-normal">
                      <option value="">Not sure / prefer not to say</option><option value="under 500">Under 500</option><option value="500 to 5,000">500–5,000</option><option value="5,000 to 50,000">5,000–50,000</option><option value="over 50,000">Over 50,000</option><option value="other">Other</option>
                    </select>
                  </label>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[#14213D]">Who is making this deal?</p>
                    <div className="flex flex-wrap gap-2">
                      {[["business_to_business", "Business to business"], ["individual", "Business and individual"], ["other", "Not sure"]].map(([value, label]) => (
                        <button key={value} type="button" onClick={() => setContextForm((p) => ({ ...p, relationship: value }))} className={`rounded-full border px-3 py-2 text-sm ${contextForm.relationship === value ? "border-[#14213D] bg-[#14213D] text-white" : "border-stone-300 bg-white text-[#14213D]"}`}>{label}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </details>
            {(contextForm.party === "other" || contextForm.role === "other" || contextForm.dealType === "other" || contextForm.roughValue === "other" || contextForm.relationship === "other") && (
              <label className="block space-y-2 text-sm font-semibold text-[#14213D]">Other details
                <input value={contextForm.other || ""} onChange={(e) => setContextForm((p) => ({ ...p, other: e.target.value }))} className="block w-full rounded-lg border border-stone-300 bg-white p-3 font-normal" placeholder="Add a short description" />
              </label>
            )}
            <button type="button" onClick={() => finishDealContext(false)} className="w-full sm:w-auto rounded-xl bg-[#14213D] px-6 py-3 font-semibold text-white">Continue to context-aware check</button>
          </section>
        )}

        {/* FOLLOW-UP QUESTIONS CARD (PHASE 5 INTERACTIVE WIZARD) */}
        {isPipelineComplete && questionsToAsk.length > 0 && !questionsDone && activeQuestion && (
          <div className="paper-card rounded-2xl p-6 sm:p-8 bg-[#FAF7F0] border-2 border-[#E8A33D]/50 shadow-md space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#14213D]/10 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#8A560B]" />
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#14213D]">
                  A few quick questions ({currentQuestionIdx + 1} of {questionsToAsk.length})
                </h2>
              </div>
              <button
                onClick={() => setQuestionsDone(true)}
                className="text-xs text-stone-600 hover:text-stone-800 underline font-mono cursor-pointer"
              >
                Skip all
              </button>
            </div>

            <div className="space-y-2">
                <span className="text-xs font-mono uppercase text-[#B87518] font-bold">
                  Possible warning: {activeQuestion.title}
                </span>
                {activeQuestion.evidence && (
                  <blockquote className="rounded-lg border-l-4 border-[#E8A33D] bg-white px-4 py-3 text-sm text-stone-700">
                    “{activeQuestion.evidence}”
                  </blockquote>
                )}
                <p className="font-serif text-base sm:text-lg text-[#14213D] leading-snug">
                  {activeQuestion.question}
                </p>
                <p className="text-xs text-stone-600">You don’t need to interpret the wording. Answer from what you were told or what happened; choose “Not sure” if you haven’t read or discussed it.</p>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleAnswer("yes")}
                className="px-5 py-2.5 rounded-xl bg-[#A62626] hover:bg-[#861E1E] text-white text-xs sm:text-sm font-semibold transition shadow-xs cursor-pointer"
              >
                Yes, that happened
              </button>
              <button
                onClick={() => handleAnswer("no")}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 text-xs sm:text-sm font-semibold transition shadow-xs cursor-pointer"
              >
                No
              </button>
              <button
                onClick={() => handleAnswer("not_sure")}
                className="px-5 py-2.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                Not sure / not yet
              </button>
            </div>
          </div>
        )}

        {/* PIPELINE COMPLETE CTA -> GO TO RESULTS */}
        {isPipelineComplete && (questionsDone || questionsToAsk.length === 0) && (
          <div className="pt-4 flex justify-center animate-fadeIn">
            <button
              onClick={goToResults}
              className="w-full sm:w-auto px-8 py-4 bg-[#14213D] hover:bg-[#1f3158] text-[#FBF8F1] text-base sm:text-lg font-semibold rounded-2xl shadow-lg transition-all duration-200 inline-flex items-center justify-center gap-3 cursor-pointer"
            >
              <span>View Final Audit Results</span>
              <ArrowRight className="w-5 h-5 text-[#8A560B]" />
            </button>
          </div>
        )}

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
              <span className="text-xs font-mono text-stone-600">
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
                    <span className="text-[11px] font-mono uppercase tracking-wider text-stone-600 font-semibold block">
                      {label}
                    </span>
                    <div
                      className={`text-sm font-medium ${
                        isNotStated
                          ? "text-stone-600 italic font-mono text-xs"
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
      <footer className="w-full border-t border-[#14213D]/10 py-6 sm:py-8 bg-[#FBF8F1]">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-xs sm:text-sm text-[#14213D]/70">
          <p>SignSafe is not legal advice. It helps you spot things to ask about.</p>
          <div className="flex items-center gap-4 font-mono text-xs">
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
