import React from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function ScanPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-[#E8A33D]/25">
      <header className="w-full border-b border-[#14213D]/10 bg-[#FBF8F1]/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#14213D] hover:opacity-75 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>SignSafe</span>
          </Link>
          <span className="text-xs font-mono uppercase tracking-widest text-[#14213D]/60">
            Document Scan
          </span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex flex-col items-center justify-center text-center">
        <div className="paper-card w-full p-8 sm:p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#14213D]/5 mx-auto flex items-center justify-center text-[#14213D]/60">
            <Loader2 className="w-6 h-6 animate-spin text-[#E8A33D]" />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#14213D]">
            Scan Pipeline
          </h1>
          <p className="text-sm sm:text-base text-[#14213D]/75 max-w-md mx-auto">
            The multi-step Clocked scan pipeline (Guard, Inspect, Protect, Extract) will run here in Phase 4.
          </p>
          <div className="pt-4">
            <Link
              href="/"
              className="inline-flex items-center px-5 py-2.5 rounded-lg bg-[#14213D] text-[#FBF8F1] text-xs font-semibold hover:bg-[#14213D]/90 transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </main>

      <footer className="w-full border-t border-[#14213D]/10 py-6 bg-[#FBF8F1] text-center text-xs sm:text-sm text-[#14213D]/65">
        SignSafe is not legal advice. It helps you spot things to ask about.
      </footer>
    </div>
  );
}
