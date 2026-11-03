"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  UploadCloud,
  FileText,
  Link as LinkIcon,
  GitCompare,
  ShieldAlert,
  ArrowRight,
  FileCheck,
  CheckCircle2,
  Sparkles,
  Info,
} from "lucide-react";
import PaperCard from "@/components/PaperCard";
import NotarySeal from "@/components/NotarySeal";

type TabType = "file" | "paste" | "link" | "compare";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>("file");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const tabs = [
    { id: "file" as TabType, label: "Upload file", icon: UploadCloud, hint: "PDF, Word, Text, Photo" },
    { id: "paste" as TabType, label: "Paste text", icon: FileText, hint: "Paste raw clauses" },
    { id: "link" as TabType, label: "Paste a link", icon: LinkIcon, hint: "Live website or terms" },
    { id: "compare" as TabType, label: "Compare versions", icon: GitCompare, hint: "Check quiet changes" },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-[#E8A33D]/25">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#14213D] text-[#FBF8F1] px-5 py-3 rounded-lg shadow-xl text-sm font-medium animate-bounce"
        >
          <Info className="w-4 h-4 text-[#E8A33D]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar */}
      <header className="w-full border-b border-[#14213D]/10 bg-[#FBF8F1]/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group">
            <NotarySeal size="sm" score={98} color="green" animate={false} />
            <div className="flex flex-col">
              <span className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#14213D] group-hover:opacity-90">
                SignSafe
              </span>
              <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-[#14213D]/60 -mt-1">
                Contract Audit
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/design"
              className="text-xs sm:text-sm font-medium text-[#14213D]/70 hover:text-[#14213D] transition-colors px-2.5 py-1 rounded border border-[#14213D]/15 hover:border-[#14213D]/30"
            >
              Design System
            </Link>
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#14213D]/5 border border-[#14213D]/10 text-xs text-[#14213D]/75 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2FA36B]" />
              Not legal advice
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 flex flex-col items-center">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8A33D]/15 border border-[#E8A33D]/30 text-[#B87518] text-xs font-semibold mb-4 sm:mb-6 font-mono">
            <Sparkles className="w-3.5 h-3.5" />
            9-Endpoint Realtime Document Verification
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#14213D] leading-[1.15]">
            Check it before you sign it.
          </h1>
          <p className="mt-4 sm:mt-5 text-base sm:text-lg md:text-xl text-[#14213D]/80 leading-relaxed max-w-2xl mx-auto">
            Job offers, contracts, tenancies, sponsorship deals, terms, and invoices.
            Find the traps, ask the right questions, and get a fair version.
          </p>
        </div>

        {/* Legal Pad Upload Workspace */}
        <div className="w-full max-w-3xl mb-12 sm:mb-16">
          <div className="paper-card overflow-hidden rounded-xl border border-[#14213D]/15 shadow-lg">
            {/* Pad Tabs */}
            <div className="flex border-b border-[#14213D]/10 bg-[#F4EFE6]/60 p-1.5 gap-1 overflow-x-auto scrollbar-none">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 min-w-[120px] sm:min-w-0 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-xs sm:text-sm font-medium transition-all ${
                      isActive
                        ? "bg-[#FFFFFF] text-[#14213D] shadow-sm font-semibold border border-[#14213D]/10"
                        : "text-[#14213D]/70 hover:text-[#14213D] hover:bg-[#FFFFFF]/40"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-[#E8A33D]" : "text-[#14213D]/50"}`} />
                    <span className="whitespace-nowrap">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Legal Pad Ruled Body */}
            <div className="legal-pad-bg p-6 sm:p-10 md:p-12 relative min-h-[280px] sm:min-h-[320px] flex flex-col justify-center">
              <div className="legal-pad-margin" aria-hidden="true" />

              <div className="relative z-10 pl-6 sm:pl-10">
                {activeTab === "file" && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      showToast("Document ingestion engine connected (Phase 3)");
                    }}
                    onClick={() => showToast("File picker connected (Phase 3)")}
                    className={`border-2 border-dashed rounded-lg p-6 sm:p-10 text-center cursor-pointer transition-all ${
                      isDragging
                        ? "border-[#2FA36B] bg-[#2FA36B]/5 scale-[0.99]"
                        : "border-[#14213D]/20 hover:border-[#14213D]/40 bg-[#FFFFFF]/70 hover:bg-[#FFFFFF]/90"
                    }`}
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 rounded-full bg-[#14213D]/5 flex items-center justify-center text-[#14213D]/70">
                      <UploadCloud className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <p className="font-serif text-lg sm:text-xl font-semibold text-[#14213D]">
                      Drop your document here, or <span className="underline decoration-[#E8A33D] decoration-2">browse</span>
                    </p>
                    <p className="mt-2 text-xs sm:text-sm text-[#14213D]/65">
                      Accepts PDF, Word (.docx), Plain Text (.txt, .md), and phone photos or screenshots (up to 3 MB)
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#14213D]/5 text-[#14213D]/70">
                        Zero data retained
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#14213D]/5 text-[#14213D]/70">
                        Automatic AI prompt injection quarantine
                      </span>
                    </div>
                  </div>
                )}

                {activeTab === "paste" && (
                  <div className="space-y-3">
                    <label htmlFor="paste-textarea" className="block text-xs font-mono font-semibold uppercase text-[#14213D]/70">
                      Paste document text or clauses:
                    </label>
                    <textarea
                      id="paste-textarea"
                      rows={7}
                      placeholder="Paste contract clauses, terms, or email commitments here..."
                      className="w-full p-4 rounded-lg bg-[#FFFFFF]/85 border border-[#14213D]/20 focus:border-[#14213D] focus:ring-1 focus:ring-[#14213D] text-sm text-[#14213D] placeholder-[#14213D]/40 resize-none font-sans"
                    />
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-xs text-[#14213D]/60 font-mono">Max 200,000 characters</span>
                      <button
                        onClick={() => showToast("Scanning will run in Phase 3/4")}
                        className="px-5 py-2.5 rounded-lg bg-[#14213D] hover:bg-[#14213D]/90 text-[#FBF8F1] text-xs sm:text-sm font-semibold transition-all shadow-sm"
                      >
                        Check Text
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "link" && (
                  <div className="space-y-4">
                    <label htmlFor="link-input" className="block text-xs font-mono font-semibold uppercase text-[#14213D]/70">
                      Paste a public contract or terms URL:
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        id="link-input"
                        type="url"
                        placeholder="https://example.com/terms-and-conditions"
                        className="flex-1 p-3.5 rounded-lg bg-[#FFFFFF]/85 border border-[#14213D]/20 focus:border-[#14213D] focus:ring-1 focus:ring-[#14213D] text-sm text-[#14213D] placeholder-[#14213D]/40 font-mono"
                      />
                      <button
                        onClick={() => showToast("Link fetcher with SSRF guard runs in Phase 3")}
                        className="px-6 py-3 rounded-lg bg-[#14213D] hover:bg-[#14213D]/90 text-[#FBF8F1] text-sm font-semibold transition-all shadow-sm whitespace-nowrap"
                      >
                        Fetch & Check
                      </button>
                    </div>
                    <p className="text-xs text-[#14213D]/65 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2FA36B]" />
                      Protected by SSRF firewall (internal and cloud metadata IPs blocked)
                    </p>
                  </div>
                )}

                {activeTab === "compare" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <span className="block text-xs font-mono font-semibold uppercase text-[#14213D]/70 mb-1.5">
                          Version 1 (Initial / Original)
                        </span>
                        <div
                          onClick={() => showToast("Version 1 selector ready in Phase 9")}
                          className="border border-dashed border-[#14213D]/25 rounded-lg p-5 bg-[#FFFFFF]/75 text-center cursor-pointer hover:bg-[#FFFFFF]"
                        >
                          <FileText className="w-5 h-5 mx-auto text-[#14213D]/50 mb-1" />
                          <span className="text-xs text-[#14213D]/75 font-medium">Select or paste Version 1</span>
                        </div>
                      </div>
                      <div>
                        <span className="block text-xs font-mono font-semibold uppercase text-[#14213D]/70 mb-1.5">
                          Version 2 (New / Revised)
                        </span>
                        <div
                          onClick={() => showToast("Version 2 selector ready in Phase 9")}
                          className="border border-dashed border-[#14213D]/25 rounded-lg p-5 bg-[#FFFFFF]/75 text-center cursor-pointer hover:bg-[#FFFFFF]"
                        >
                          <FileText className="w-5 h-5 mx-auto text-[#14213D]/50 mb-1" />
                          <span className="text-xs text-[#14213D]/75 font-medium">Select or paste Version 2</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => showToast("Compare engine runs in Phase 9")}
                      className="w-full py-3 rounded-lg bg-[#14213D] hover:bg-[#14213D]/90 text-[#FBF8F1] text-sm font-semibold transition-all shadow-sm"
                    >
                      Compare Meaning Changes
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pre-Loaded Samples & Judge Mode */}
        <div className="w-full max-w-4xl space-y-6">
          <div className="text-center">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#14213D]">
              Or test with real-world sample agreements
            </h2>
            <p className="text-xs sm:text-sm text-[#14213D]/70 mt-1">
              Synthetic test documents planted with real legal and fraud patterns
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Sample 1 */}
            <PaperCard
              interactive
              onClick={() => showToast("Sample 1 will execute via Judge Mode / Scan in Phase 3-5")}
              badge="Expected Red • Scam Tells"
              badgeColor="red"
              className="flex flex-col justify-between"
            >
              <div>
                <h3 className="font-serif text-lg font-bold text-[#14213D] mb-1.5">
                  Remote Job Offer
                </h3>
                <p className="text-xs sm:text-sm text-[#14213D]/75 leading-relaxed">
                  Data entry offer with advance fee, cheque overpayment equipment trap, and 1px hidden white text prompt injection.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#14213D]/10 flex items-center justify-between text-xs font-semibold text-[#D64545]">
                <span>Load Sample (.docx / .pdf)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </PaperCard>

            {/* Sample 2 */}
            <PaperCard
              interactive
              onClick={() => showToast("Sample 2 will execute in Phase 3-8")}
              badge="Expected Amber • Fair Deal"
              badgeColor="amber"
              className="flex flex-col justify-between"
            >
              <div>
                <h3 className="font-serif text-lg font-bold text-[#14213D] mb-1.5">
                  Freelance + Chat Promises
                </h3>
                <p className="text-xs sm:text-sm text-[#14213D]/75 leading-relaxed">
                  Mostly solid design contract with one-sided unlimited liability trap in clause 8 and conflicting chat payment promises.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#14213D]/10 flex items-center justify-between text-xs font-semibold text-[#B87518]">
                <span>Load Contract + Screenshot</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </PaperCard>

            {/* Sample 3 */}
            <PaperCard
              interactive
              onClick={() => showToast("Sample 3 will execute in Phase 9")}
              badge="Meaning Diff • Lease V1/V2"
              badgeColor="default"
              className="flex flex-col justify-between"
            >
              <div>
                <h3 className="font-serif text-lg font-bold text-[#14213D] mb-1.5">
                  Tenancy: What Changed?
                </h3>
                <p className="text-xs sm:text-sm text-[#14213D]/75 leading-relaxed">
                  Landlord claims &ldquo;only formatting fixed&rdquo;, but quietly converts deposit into non-refundable fee and adds auto-renewal.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#14213D]/10 flex items-center justify-between text-xs font-semibold text-[#14213D]">
                <span>Load Both Versions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </PaperCard>
          </div>

          {/* Judge Mode Secondary CTA */}
          <div className="pt-4 flex justify-center">
            <button
              onClick={() => showToast("Judge Mode replay fixtures load in Phase 10")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-lg border-2 border-[#14213D] bg-[#FBF8F1] hover:bg-[#14213D] text-[#14213D] hover:text-[#FBF8F1] text-sm font-semibold transition-all shadow-sm group"
            >
              <ShieldAlert className="w-4 h-4 text-[#D64545] group-hover:text-[#FBF8F1]" />
              <span>Judge Mode: see recorded live runs (no key needed)</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#14213D]/10 py-6 sm:py-8 mt-12 bg-[#FBF8F1]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-xs sm:text-sm text-[#14213D]/65">
          <p>SignSafe is not legal advice. It helps you spot things to ask about.</p>
          <div className="flex items-center gap-4 font-mono text-xs">
            <Link href="/scan" className="hover:text-[#14213D] transition-colors">
              Scan
            </Link>
            <span>•</span>
            <Link href="/results" className="hover:text-[#14213D] transition-colors">
              Results
            </Link>
            <span>•</span>
            <Link href="/changes" className="hover:text-[#14213D] transition-colors">
              Changes
            </Link>
            <span>•</span>
            <Link href="/design" className="hover:text-[#14213D] transition-colors">
              Design
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
