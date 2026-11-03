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
  CheckCircle2,
  Info,
} from "lucide-react";
import PaperCard from "@/components/PaperCard";
import NotarySeal from "@/components/NotarySeal";
import HeroDemoStrip from "@/components/HeroDemoStrip";
import HowItWorks from "@/components/HowItWorks";
import TrustRow from "@/components/TrustRow";

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
    { id: "file" as TabType, label: "Upload file", icon: UploadCloud },
    { id: "paste" as TabType, label: "Paste text", icon: FileText },
    { id: "link" as TabType, label: "Paste a link", icon: LinkIcon },
    { id: "compare" as TabType, label: "Compare versions", icon: GitCompare },
  ];

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-[#E8A33D]/25 bg-[#FBF8F1] text-[#14213D] font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-[#14213D] text-[#FBF8F1] px-5 py-3 rounded-xl shadow-xl text-sm font-medium transition-all duration-300 animate-fadeIn"
        >
          <Info className="w-4 h-4 text-[#E8A33D] flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar Header */}
      <header className="w-full border-b border-[#14213D]/10 bg-[#FBF8F1]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3">
          {/* Brand Logo & Wordmark */}
          <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
            <NotarySeal size="xs" score={98} color="green" animate={false} />
            <div className="flex flex-col">
              <span className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#14213D] group-hover:opacity-90 leading-tight">
                SignSafe
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-[#14213D]/60 -mt-0.5">
                Contract Audit
              </span>
            </div>
          </Link>

          {/* Header Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Top Right Judge Mode Button */}
            <button
              onClick={() => showToast("Judge Mode replay fixtures load in Phase 10")}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg border border-[#14213D]/20 bg-white/80 hover:bg-white text-xs sm:text-sm font-semibold text-[#14213D] transition-all shadow-2xs hover:shadow-xs active:scale-[0.98]"
            >
              <ShieldAlert className="w-4 h-4 text-[#D64545]" />
              <span className="hidden sm:inline">Judge Mode: see a full check in one click</span>
              <span className="sm:hidden">Judge Mode</span>
            </button>

            {/* Not Legal Advice Badge */}
            <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#14213D]/5 border border-[#14213D]/10 text-xs text-[#14213D]/75 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2FA36B]" />
              Not legal advice
            </div>
          </div>
        </div>
      </header>

      {/* Main Page Body */}
      <main className="flex-1 w-full max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 flex flex-col items-center">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mb-4 sm:mb-6">
          <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-[#14213D] leading-[1.14]">
            Check it before you sign it.
          </h1>
          <p className="mt-4 sm:mt-5 text-[17px] sm:text-xl text-[#14213D]/80 leading-relaxed max-w-2xl mx-auto">
            Job offers, contracts, tenancies, sponsorship deals, terms, and invoices.
            Find the traps, ask the right questions, and get a fair version.
          </p>
        </div>

        {/* Live Interactive Hero Demo Strip */}
        <HeroDemoStrip />

        {/* Upload Workspace Section */}
        <div className="w-full max-w-3xl mt-6 sm:mt-8 mb-12 sm:mb-16">
          <div className="paper-card overflow-hidden rounded-2xl border border-[#14213D]/15 shadow-[0_6px_24px_-6px_rgba(20,33,61,0.08)] bg-white">
            {/* Tabs Header */}
            <div className="flex border-b border-[#14213D]/10 bg-[#F8F5EE] p-1.5 gap-1 overflow-x-auto scrollbar-none">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 min-w-[110px] sm:min-w-0 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                      isActive
                        ? "bg-[#FFFFFF] text-[#14213D] shadow-2xs font-semibold border border-[#14213D]/10"
                        : "text-[#14213D]/70 hover:text-[#14213D] hover:bg-[#FFFFFF]/50"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? "text-[#E8A33D]" : "text-[#14213D]/50"
                      }`}
                    />
                    <span className="whitespace-nowrap">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Legal Pad Ruled Body */}
            <div className="legal-pad-bg p-6 sm:p-10 md:p-12 relative min-h-[300px] flex flex-col justify-center">
              <div className="legal-pad-margin" aria-hidden="true" />

              <div className="relative z-10 pl-5 sm:pl-10">
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
                    className={`border-2 border-dashed rounded-xl p-6 sm:p-10 text-center transition-all ${
                      isDragging
                        ? "border-[#2FA36B] bg-[#2FA36B]/5 scale-[0.99]"
                        : "border-[#14213D]/20 bg-[#FFFFFF]/80 hover:bg-[#FFFFFF]"
                    }`}
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 rounded-full bg-[#14213D]/5 flex items-center justify-center text-[#14213D]/70">
                      <UploadCloud className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                    <p className="font-serif text-lg sm:text-xl font-semibold text-[#14213D]">
                      Drag and drop your document here
                    </p>
                    <p className="mt-1.5 text-xs sm:text-sm text-[#14213D]/65">
                      Accepts PDF, Word (.docx), plain text, or contract photos (up to 3 MB)
                    </p>

                    {/* Big Navy Primary Action Button */}
                    <button
                      onClick={() => showToast("File picker connected (Phase 3)")}
                      className="mt-5 w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-[#14213D] hover:bg-[#1f3158] text-[#FBF8F1] text-base sm:text-[17px] font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 inline-flex items-center justify-center gap-2.5 active:scale-[0.98] cursor-pointer"
                    >
                      <UploadCloud className="w-5 h-5" />
                      <span>Check a document</span>
                    </button>
                  </div>
                )}

                {activeTab === "paste" && (
                  <div className="space-y-3">
                    <label
                      htmlFor="paste-textarea"
                      className="block text-xs font-mono font-semibold uppercase text-[#14213D]/70"
                    >
                      Paste document text or clauses:
                    </label>
                    <textarea
                      id="paste-textarea"
                      rows={6}
                      placeholder="Paste contract clauses, terms, or email commitments here..."
                      className="w-full p-4 rounded-xl bg-[#FFFFFF]/90 border border-[#14213D]/20 focus:border-[#14213D] focus:ring-1 focus:ring-[#14213D] text-sm text-[#14213D] placeholder-[#14213D]/40 resize-none font-sans"
                    />
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-1">
                      <span className="text-xs text-[#14213D]/60 font-mono">
                        Max 200,000 characters
                      </span>
                      <button
                        onClick={() => showToast("Scanning will run in Phase 3/4")}
                        className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#14213D] hover:bg-[#1f3158] text-[#FBF8F1] text-sm font-semibold transition-all shadow-sm"
                      >
                        Check Text
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "link" && (
                  <div className="space-y-4">
                    <label
                      htmlFor="link-input"
                      className="block text-xs font-mono font-semibold uppercase text-[#14213D]/70"
                    >
                      Paste a contract or terms URL:
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        id="link-input"
                        type="url"
                        placeholder="https://example.com/terms-and-conditions"
                        className="flex-1 p-3.5 rounded-xl bg-[#FFFFFF]/90 border border-[#14213D]/20 focus:border-[#14213D] focus:ring-1 focus:ring-[#14213D] text-sm text-[#14213D] placeholder-[#14213D]/40 font-mono"
                      />
                      <button
                        onClick={() => showToast("Link fetcher runs in Phase 3")}
                        className="px-6 py-3.5 rounded-xl bg-[#14213D] hover:bg-[#1f3158] text-[#FBF8F1] text-sm font-semibold transition-all shadow-sm whitespace-nowrap"
                      >
                        Fetch & Check
                      </button>
                    </div>
                    <p className="text-xs text-[#14213D]/65 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#2FA36B]" />
                      Protected by SSRF firewall
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
                          className="border border-dashed border-[#14213D]/25 rounded-xl p-5 bg-[#FFFFFF]/80 text-center cursor-pointer hover:bg-[#FFFFFF]"
                        >
                          <FileText className="w-5 h-5 mx-auto text-[#14213D]/50 mb-1" />
                          <span className="text-xs text-[#14213D]/75 font-medium">
                            Select or paste Version 1
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="block text-xs font-mono font-semibold uppercase text-[#14213D]/70 mb-1.5">
                          Version 2 (New / Revised)
                        </span>
                        <div
                          onClick={() => showToast("Version 2 selector ready in Phase 9")}
                          className="border border-dashed border-[#14213D]/25 rounded-xl p-5 bg-[#FFFFFF]/80 text-center cursor-pointer hover:bg-[#FFFFFF]"
                        >
                          <FileText className="w-5 h-5 mx-auto text-[#14213D]/50 mb-1" />
                          <span className="text-xs text-[#14213D]/75 font-medium">
                            Select or paste Version 2
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => showToast("Compare engine runs in Phase 9")}
                      className="w-full py-3.5 rounded-xl bg-[#14213D] hover:bg-[#1f3158] text-[#FBF8F1] text-sm font-semibold transition-all shadow-sm"
                    >
                      Compare Meaning Changes
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Under Upload Assurance Line */}
          <p className="text-center text-sm sm:text-[16px] text-[#14213D]/70 font-medium italic mt-3.5">
            Nothing is a verdict. We show you what to watch for, and you decide.
          </p>
        </div>

        {/* 3-Step How It Works Row */}
        <HowItWorks />

        {/* Pre-Loaded Real-World Sample Cards */}
        <section className="w-full max-w-[1100px] my-10 sm:my-14 space-y-8">
          <div className="text-center">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#14213D] tracking-tight">
              Or test with real-world sample agreements
            </h2>
            <p className="text-sm sm:text-[17px] text-[#14213D]/70 mt-1 max-w-xl mx-auto">
              Realistic test documents planted with common warning signs and legal traps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Sample 1: Remote Job Offer */}
            <div className="md:-rotate-1 hover:rotate-0 transition-transform duration-200">
              <PaperCard
                interactive
                foldedCorner={true}
                colorTab="red"
                tabLabel="High Risk • 6 Tells"
                onClick={() =>
                  showToast("Sample 1 will execute via Judge Mode / Scan in Phase 3-5")
                }
                className="h-full flex flex-col justify-between"
              >
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#14213D] mb-2">
                    Remote Job Offer
                  </h3>
                  <p className="text-sm sm:text-[15px] text-[#14213D]/75 leading-relaxed">
                    High-paying data entry role asking for $150 upfront equipment fee.
                  </p>
                </div>
                <div className="mt-6 pt-3.5 border-t border-[#14213D]/10 flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#D64545] font-bold">
                    Advance fee scam
                  </span>
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D64545]/10 text-[#D64545] hover:bg-[#D64545] hover:text-white text-xs font-semibold transition-all">
                    <span>Try this</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </PaperCard>
            </div>

            {/* Sample 2: Freelance + Chat */}
            <div className="md:rotate-0 hover:-translate-y-1 transition-transform duration-200">
              <PaperCard
                interactive
                foldedCorner={true}
                colorTab="amber"
                tabLabel="Caution • Chat Conflict"
                onClick={() => showToast("Sample 2 will execute in Phase 3-8")}
                className="h-full flex flex-col justify-between"
              >
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#14213D] mb-2">
                    Freelance + Chat Promises
                  </h3>
                  <p className="text-sm sm:text-[15px] text-[#14213D]/75 leading-relaxed">
                    Fair design gig with unlimited liability and mismatched chat payment dates.
                  </p>
                </div>
                <div className="mt-6 pt-3.5 border-t border-[#14213D]/10 flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#B87518] font-bold">
                    Broken promises
                  </span>
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E8A33D]/15 text-[#B87518] hover:bg-[#E8A33D] hover:text-white text-xs font-semibold transition-all">
                    <span>Try this</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </PaperCard>
            </div>

            {/* Sample 3: Tenancy V1 vs V2 */}
            <div className="md:rotate-1 hover:rotate-0 transition-transform duration-200">
              <PaperCard
                interactive
                foldedCorner={true}
                colorTab="navy"
                tabLabel="Lease V1 vs V2"
                onClick={() => showToast("Sample 3 will execute in Phase 9")}
                className="h-full flex flex-col justify-between"
              >
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#14213D] mb-2">
                    Tenancy: What Changed?
                  </h3>
                  <p className="text-sm sm:text-[15px] text-[#14213D]/75 leading-relaxed">
                    Landlord claimed &ldquo;only formatting fixed&rdquo;, but quietly forfeited the deposit.
                  </p>
                </div>
                <div className="mt-6 pt-3.5 border-t border-[#14213D]/10 flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#14213D] font-bold">
                    Quiet trap changes
                  </span>
                  <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#14213D]/10 text-[#14213D] hover:bg-[#14213D] hover:text-white text-xs font-semibold transition-all">
                    <span>Try this</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </PaperCard>
            </div>
          </div>
        </section>

        {/* Bottom Judge Mode Section */}
        <div className="w-full max-w-[1100px] my-8 sm:my-12">
          <div className="bg-[#FFFFFF] border border-[#14213D]/12 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="text-left space-y-1">
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[#14213D]">
                Evaluating SignSafe during hackathon judging?
              </h3>
              <p className="text-sm sm:text-[15px] text-[#14213D]/75">
                Run pre-recorded live audits instantly without connecting an API key.
              </p>
            </div>
            <button
              onClick={() => showToast("Judge Mode replay fixtures load in Phase 10")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl border-2 border-[#14213D] bg-white hover:bg-[#14213D] text-[#14213D] hover:text-[#FBF8F1] text-sm sm:text-base font-semibold transition-all duration-200 shadow-2xs hover:shadow-xs active:scale-[0.98] group flex-shrink-0 cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-[#D64545] group-hover:text-[#FBF8F1]" />
              <span>Judge Mode: see a full check in one click</span>
            </button>
          </div>
        </div>

        {/* Trust Row Section */}
        <TrustRow />
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#14213D]/10 py-6 sm:py-8 bg-[#FBF8F1]">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left text-xs sm:text-sm text-[#14213D]/65">
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
