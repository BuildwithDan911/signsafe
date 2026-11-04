"use client";

import React from "react";
import { X, Coins, Zap, ShieldCheck, ExternalLink, RefreshCw } from "lucide-react";

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreditsModal({ isOpen, onClose }: CreditsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#14213D]/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="credits-modal-title"
        className="w-full max-w-lg bg-[#FBF8F1] border-2 border-[#14213D] rounded-2xl shadow-2xl p-6 sm:p-7 relative text-[#14213D]"
      >
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-2 text-[#14213D]/70 hover:text-[#14213D] hover:bg-[#14213D]/5 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#E8A33D]/15 border border-[#E8A33D]/30 flex items-center justify-center text-[#8A560B]">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h2 id="credits-modal-title" className="font-serif text-xl sm:text-2xl font-bold">
              How Credits Work
            </h2>
            <p className="text-xs sm:text-sm text-[#14213D]/70 font-mono">
              Transparent, metered AI operations
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm leading-relaxed text-[#14213D]/85">
          <div className="p-3.5 bg-white/70 border border-[#14213D]/10 rounded-xl flex items-start gap-3">
            <Zap className="w-5 h-5 text-[#8A560B] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#14213D]">25 ms model time = 1 credit</p>
              <p className="text-xs sm:text-sm text-[#14213D]/75 mt-0.5">
                Each call to Clocked AI charges 1 credit per 25 ms of active model inference time,
                with a minimum of 1 credit per request.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-white/70 border border-[#14213D]/10 rounded-xl flex items-start gap-3">
            <RefreshCw className="w-5 h-5 text-[#1E734A] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#14213D]">Zero credits on cache</p>
              <p className="text-xs sm:text-sm text-[#14213D]/75 mt-0.5">
                Every step is cached idempotently for 30 days. Repeating the exact same check or
                document costs 0 credits.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-white/70 border border-[#14213D]/10 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#14213D] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#14213D]">Judge Mode replays</p>
              <p className="text-xs sm:text-sm text-[#14213D]/75 mt-0.5">
                Judge Mode replays real recorded live runs without consuming credits or requiring an
                API key.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#14213D]/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <a
            href="https://clocked.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-[#14213D]/80 hover:text-[#14213D] inline-flex items-center gap-1.5 transition-colors"
          >
            <span>Check balance on Clocked dashboard</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-[#14213D] text-[#FBF8F1] rounded-xl text-xs sm:text-sm font-semibold hover:bg-[#14213D]/90 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
