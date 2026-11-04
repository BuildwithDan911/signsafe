"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, CheckCircle2, AlertTriangle, AlertOctagon, Sparkles } from "lucide-react";
import NotarySeal, { SealColor } from "@/components/NotarySeal";
import MarkerHighlight, { HighlightColor } from "@/components/MarkerHighlight";
import CountUp from "@/components/CountUp";
import PaperCard from "@/components/PaperCard";

export default function DesignPage() {
  const [sealReplayKey, setSealReplayKey] = useState(0);
  const [highlightReplayKey, setHighlightReplayKey] = useState(0);
  const [activeTab, setActiveTab] = useState<string>("tab1");

  const replaySeals = () => setSealReplayKey((k) => k + 1);
  const replayHighlights = () => setHighlightReplayKey((k) => k + 1);

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-[#E8A33D]/25">
      {/* Top Header */}
      <header className="w-full border-b border-[#14213D]/10 bg-[#FBF8F1]/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#14213D] hover:opacity-75 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to SignSafe Home</span>
          </Link>
          <span className="text-xs font-mono uppercase tracking-widest text-[#14213D]/70">
            Design System Spec
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12 sm:space-y-16">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#14213D]/5 border border-[#14213D]/10 text-xs font-mono text-[#14213D]/70 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#8A560B]" />
            SignSafe Visual Tokens
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-[#14213D]">
            Editorial Paper Design System
          </h1>
          <p className="mt-2 text-sm sm:text-base text-[#14213D]/75 max-w-2xl">
            A tactile, authoritative light theme engineered for high-stakes contract inspection.
            Warm off-white paper substrate, deep navy ink, and physical archival textures.
          </p>
        </div>

        {/* 1. Notary Seal Section */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#14213D]/10 pb-3">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#14213D]">
                1. NotarySeal Component
              </h2>
              <p className="text-xs sm:text-sm text-[#14213D]/70">
                Embossed vector seal with 32 scalloped teeth, circular text path, and tactile press-in animation.
              </p>
            </div>
            <button
              onClick={replaySeals}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#14213D] text-[#FBF8F1] text-xs font-semibold hover:bg-[#14213D]/90 transition-all self-start sm:self-auto shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Replay Stamp Animation</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 items-center justify-items-center bg-[#FFFFFF]/60 p-6 sm:p-10 rounded-xl border border-[#14213D]/10">
            {/* Green Seal */}
            <div className="flex flex-col items-center text-center gap-3">
              <NotarySeal
                color="green"
                score={92}
                size="md"
                replayKey={sealReplayKey}
              />
              <div className="text-xs">
                <span className="font-semibold text-[#1E734A]">Green (Looks fair)</span>
                <p className="text-[#14213D]/70 font-mono text-[11px]">Score 75–100</p>
              </div>
            </div>

            {/* Amber Seal */}
            <div className="flex flex-col items-center text-center gap-3">
              <NotarySeal
                color="amber"
                score={64}
                size="md"
                replayKey={sealReplayKey}
              />
              <div className="text-xs">
                <span className="font-semibold text-[#B87518]">Amber (Ask first)</span>
                <p className="text-[#14213D]/70 font-mono text-[11px]">Score 40–74</p>
              </div>
            </div>

            {/* Red Seal */}
            <div className="flex flex-col items-center text-center gap-3">
              <NotarySeal
                color="red"
                score={22}
                size="md"
                replayKey={sealReplayKey}
              />
              <div className="text-xs">
                <span className="font-semibold text-[#A62626]">Red (Don&apos;t sign yet)</span>
                <p className="text-[#14213D]/70 font-mono text-[11px]">Score 0–39</p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Marker Highlight Section */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#14213D]/10 pb-3">
            <div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#14213D]">
                2. MarkerHighlight Component
              </h2>
              <p className="text-xs sm:text-sm text-[#14213D]/70">
                Hand-drawn translucent marker band with responsive left-to-right sweep across contract clauses.
              </p>
            </div>
            <button
              onClick={replayHighlights}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#14213D] text-[#FBF8F1] text-xs font-semibold hover:bg-[#14213D]/90 transition-all self-start sm:self-auto shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Replay Sweep</span>
            </button>
          </div>

          <div className="space-y-4 bg-[#FFFFFF]/60 p-6 sm:p-8 rounded-xl border border-[#14213D]/10">
            <p className="text-sm sm:text-base leading-relaxed">
              <span className="font-mono text-xs text-[#14213D]/70 mr-2">[CLAUSE 8.2]</span>
              The Contractor agrees that{" "}
              <MarkerHighlight color="red" replayKey={highlightReplayKey}>
                liability shall be uncapped, immediate, and fully indemnified without limitation
              </MarkerHighlight>
              , regardless of whether negligence or willful default occurred.
            </p>

            <p className="text-sm sm:text-base leading-relaxed">
              <span className="font-mono text-xs text-[#14213D]/70 mr-2">[CLAUSE 3.1]</span>
              Payments shall be issued within{" "}
              <MarkerHighlight color="amber" replayKey={highlightReplayKey}>
                sixty (60) calendar days following month-end reconciliation
              </MarkerHighlight>
              , contrary to the 14-day verbal commitment in the preliminary onboarding chat.
            </p>

            <p className="text-sm sm:text-base leading-relaxed">
              <span className="font-mono text-xs text-[#14213D]/70 mr-2">[CLAUSE 9.4]</span>
              The Company affirms that{" "}
              <MarkerHighlight color="green" replayKey={highlightReplayKey}>
                it shall never request banking passwords, OTP credentials, or up-front disbursement fees
              </MarkerHighlight>{" "}
              under any circumstance prior to commencement.
            </p>
          </div>
        </section>

        {/* 3. CountUp Component */}
        <section className="space-y-6">
          <div className="border-b border-[#14213D]/10 pb-3">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#14213D]">
              3. CountUp Component
            </h2>
            <p className="text-xs sm:text-sm text-[#14213D]/70">
              Smooth, cubic-eased numerical animation for the Sign Score and credit telemetry counters.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="paper-card p-5 text-center">
              <span className="text-xs font-mono text-[#14213D]/70 uppercase">Sign Score</span>
              <div className="font-serif text-4xl sm:text-5xl font-bold text-[#1E734A] mt-1">
                <CountUp end={94} duration={1200} />
              </div>
              <span className="text-xs text-[#1E734A] font-medium">Safe margin</span>
            </div>

            <div className="paper-card p-5 text-center">
              <span className="text-xs font-mono text-[#14213D]/70 uppercase">Warning Flags</span>
              <div className="font-serif text-4xl sm:text-5xl font-bold text-[#8A560B] mt-1">
                <CountUp end={3} duration={1000} />
              </div>
              <span className="text-xs text-[#B87518] font-medium">Points: 3 (Ask first)</span>
            </div>

            <div className="paper-card p-5 text-center">
              <span className="text-xs font-mono text-[#14213D]/70 uppercase">Credits Charged</span>
              <div className="font-serif text-4xl sm:text-5xl font-bold text-[#14213D] mt-1">
                <CountUp end={412} duration={1400} />
              </div>
              <span className="text-xs text-[#14213D]/70 font-medium">3 steps cached (0 credits)</span>
            </div>
          </div>
        </section>

        {/* 4. Paper Cards & Badges */}
        <section className="space-y-6">
          <div className="border-b border-[#14213D]/10 pb-3">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#14213D]">
              4. Paper Cards & States
            </h2>
            <p className="text-xs sm:text-sm text-[#14213D]/70">
              Multi-device tactile document cards with subtle 1px hairline borders and layered elevation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <PaperCard
              interactive
              badge="RF1.2 • Upfront Fee"
              badgeColor="red"
            >
              <h3 className="font-serif text-lg font-bold text-[#14213D] mb-1">
                Fee to Receive Payment
              </h3>
              <p className="text-xs sm:text-sm text-[#14213D]/75 leading-relaxed">
                They rush you to pay an onboarding fee before your first day.
                Confirmed by you in adaptive question 1.
              </p>
              <div className="mt-4 pt-3 border-t border-[#14213D]/10 text-xs font-mono text-[#A62626]">
                Verify: Ask them to deduct fees from disbursements.
              </div>
            </PaperCard>

            <PaperCard
              interactive
              badge="RF3.13 • One-Sided Liability"
              badgeColor="amber"
            >
              <h3 className="font-serif text-lg font-bold text-[#14213D] mb-1">
                Unlimited Personal Liability
              </h3>
              <p className="text-xs sm:text-sm text-[#14213D]/75 leading-relaxed">
                You indemnify the client for all losses, even when the client made the mistake.
              </p>
              <div className="mt-4 pt-3 border-t border-[#14213D]/10 text-xs font-mono text-[#B87518]">
                Verify: Make liability mutual with negligence carved out.
              </div>
            </PaperCard>
          </div>
        </section>

        {/* 5. Buttons & Tabs */}
        <section className="space-y-6">
          <div className="border-b border-[#14213D]/10 pb-3">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#14213D]">
              5. Interactive Buttons & Controls
            </h2>
            <p className="text-xs sm:text-sm text-[#14213D]/70">
              Standardized touch targets designed to be accessible on phones, tablets, and desktop.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <button className="px-6 py-3 rounded-lg bg-[#14213D] text-[#FBF8F1] font-semibold text-sm hover:bg-[#14213D]/90 shadow-sm transition-all">
              Primary Action
            </button>
            <button className="px-6 py-3 rounded-lg border-2 border-[#14213D] bg-transparent text-[#14213D] font-semibold text-sm hover:bg-[#14213D]/5 transition-all">
              Secondary Folio
            </button>
            <button className="px-6 py-3 rounded-lg bg-[#D64545] text-[#FFFFFF] font-semibold text-sm hover:bg-[#D64545]/90 shadow-sm transition-all">
              Warning Action
            </button>
            <button className="px-4 py-2.5 rounded-lg border border-[#14213D]/20 text-[#14213D] font-medium text-xs hover:bg-[#14213D]/5 transition-all">
              Copy Message
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#14213D]/10 py-6 mt-12 bg-[#FBF8F1] text-center text-xs text-[#14213D]/70 font-mono">
        SignSafe Design System • All components strictly respect prefers-reduced-motion
      </footer>
    </div>
  );
}
