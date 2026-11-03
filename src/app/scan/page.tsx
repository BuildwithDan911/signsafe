"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  AlertTriangle,
  Mail,
  Terminal,
  Info,
  ShieldAlert,
} from "lucide-react";
import { SignDoc } from "@/lib/types";

export default function ScanPage() {
  const [doc, setDoc] = useState<SignDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("signsafe_doc");
      if (stored) {
        setDoc(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to read sessionStorage", e);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF8F1] flex items-center justify-center p-6 text-[#14213D]">
        <div className="text-sm font-medium flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-[#14213D] border-t-transparent rounded-full animate-spin" />
          <span>Loading scanned document...</span>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen bg-[#FBF8F1] flex flex-col justify-between selection:bg-[#E8A33D]/25 font-sans">
        <header className="w-full border-b border-[#14213D]/10 bg-[#FBF8F1]/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#14213D] hover:opacity-80 transition-opacity"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 max-w-xl mx-auto px-4 py-16 text-center flex flex-col items-center justify-center">
          <div className="paper-card p-8 sm:p-10 rounded-2xl border border-[#14213D]/15 w-full space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#14213D]/5 mx-auto flex items-center justify-center text-[#14213D]/60">
              <FileText className="w-6 h-6" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-[#14213D]">
              No document in session
            </h1>
            <p className="text-sm text-[#14213D]/70">
              Upload a document or choose a sample on the home page to inspect what we read.
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center px-6 py-3 rounded-xl bg-[#14213D] text-[#FBF8F1] text-sm font-semibold hover:bg-[#1f3158] transition-all shadow-sm"
              >
                Go to Home Page
              </Link>
            </div>
          </div>
        </main>

        <footer className="w-full border-t border-[#14213D]/10 py-6 text-center text-xs text-[#14213D]/65">
          SignSafe is not legal advice. It helps you spot things to ask about.
        </footer>
      </div>
    );
  }

  const first600 = doc.text.slice(0, 600);
  const isTruncated = doc.text.length > 600;

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
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded bg-[#14213D]/5 border border-[#14213D]/10 text-[#14213D]/80">
              {doc.sourceType.toUpperCase()}
            </span>
            <span className="text-xs font-mono text-[#14213D]/60 truncate max-w-[200px] sm:max-w-[320px]">
              {doc.fileName}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Title Bar */}
        <div className="border-b border-[#14213D]/10 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#14213D]">
              Here is what we read
            </h1>
            <p className="text-xs sm:text-sm text-[#14213D]/70 mt-1">
              Extracted from {doc.fileName} ({doc.text.length} characters parsed)
            </p>
          </div>
          <div className="text-xs font-mono text-[#14213D]/60">
            Stored in browser sessionStorage only
          </div>
        </div>

        {/* 1. Red-bordered Hidden text found box (if present) */}
        {doc.hiddenText && doc.hiddenText.length > 0 && (
          <div className="border-2 border-[#D64545] bg-[#FEF2F2] rounded-2xl p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 text-[#D64545]">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight">
                Hidden text found in this file ({doc.hiddenText.length})
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#D64545]/85">
              Text concealed from the human reader using zero-point font, invisible white styling, or Word hidden tags:
            </p>

            <div className="space-y-3">
              {doc.hiddenText.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white/90 border border-[#D64545]/30 rounded-xl p-4 space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#D64545] font-semibold uppercase tracking-wider">
                    <span>Reason: {item.reason}</span>
                    <span>Item #{idx + 1}</span>
                  </div>
                  <pre className="text-xs sm:text-sm font-mono text-[#14213D] bg-stone-50 p-2.5 rounded-lg whitespace-pre-wrap break-words leading-relaxed border border-stone-200/60">
                    &ldquo;{item.text}&rdquo;
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Primary Card: Visible Text Preview (First 600 chars) */}
        <div className="paper-card rounded-2xl p-6 sm:p-8 bg-white border border-[#14213D]/12 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#14213D]/10 pb-3">
            <h2 className="font-serif text-lg font-bold text-[#14213D] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#14213D]/70" />
              <span>Visible Document Text (First 600 Characters)</span>
            </h2>
            <span className="text-xs font-mono text-[#14213D]/60">
              {Math.min(doc.text.length, 600)} of {doc.text.length} chars
            </span>
          </div>

          <div className="bg-[#FAF7F0] border border-[#14213D]/10 rounded-xl p-4 sm:p-6 font-serif text-sm sm:text-base leading-relaxed text-[#14213D]/90 whitespace-pre-wrap">
            {first600}
            {isTruncated && <span className="text-stone-400">... [remaining text stored]</span>}
          </div>
        </div>

        {/* 3. Three-Column Inspection Panel: Signals, Metadata, Emails */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* File Signals */}
          <div className="paper-card rounded-2xl p-5 sm:p-6 bg-white border border-[#14213D]/12 shadow-sm space-y-3">
            <h3 className="font-serif text-base font-bold text-[#14213D] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#E8A33D]" />
              <span>File Signals</span>
            </h3>
            {doc.fileSignals && doc.fileSignals.length > 0 ? (
              <ul className="space-y-2">
                {doc.fileSignals.map((sig, idx) => (
                  <li
                    key={idx}
                    className="text-xs p-2.5 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-950"
                  >
                    <span className="font-mono font-bold uppercase tracking-wider block text-amber-900 mb-0.5">
                      {sig.id}
                    </span>
                    <span>{sig.note}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#14213D]/60 italic">No special file container flags.</p>
            )}
          </div>

          {/* Metadata */}
          <div className="paper-card rounded-2xl p-5 sm:p-6 bg-white border border-[#14213D]/12 shadow-sm space-y-3">
            <h3 className="font-serif text-base font-bold text-[#14213D] flex items-center gap-2">
              <Info className="w-4 h-4 text-[#14213D]/70" />
              <span>Metadata</span>
            </h3>
            <dl className="text-xs space-y-1.5 font-mono">
              <div>
                <dt className="text-stone-500">Author / Creator:</dt>
                <dd className="font-semibold text-stone-900 break-all">
                  {doc.metadata?.author || "Not stated"}
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Company:</dt>
                <dd className="font-semibold text-stone-900">
                  {doc.metadata?.company || "Not stated"}
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Producer / App:</dt>
                <dd className="font-semibold text-stone-900 break-all">
                  {doc.metadata?.producer || doc.metadata?.creator || "Not stated"}
                </dd>
              </div>
              {doc.metadata?.created && (
                <div>
                  <dt className="text-stone-500">Created Date:</dt>
                  <dd className="font-semibold text-stone-900">{doc.metadata.created}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Emails & Free Webmail Check */}
          <div className="paper-card rounded-2xl p-5 sm:p-6 bg-white border border-[#14213D]/12 shadow-sm space-y-3">
            <h3 className="font-serif text-base font-bold text-[#14213D] flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#14213D]/70" />
              <span>Emails Found ({doc.emails?.length || 0})</span>
            </h3>
            {doc.emails && doc.emails.length > 0 ? (
              <ul className="space-y-2">
                {doc.emails.map((em, idx) => (
                  <li
                    key={idx}
                    className={`text-xs p-2.5 rounded-lg border ${
                      em.isFreeWebmail
                        ? "bg-amber-50 border-amber-200 text-amber-950"
                        : "bg-stone-50 border-stone-200 text-stone-800"
                    }`}
                  >
                    <div className="font-mono font-medium break-all">{em.email}</div>
                    {em.isFreeWebmail && (
                      <span className="inline-block mt-1 text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#E8A33D] text-white">
                        Free Webmail ({em.domain})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#14213D]/60 italic">No email addresses found.</p>
            )}
          </div>
        </div>

        {/* 4. Scripts & Command Lines Found */}
        {doc.scripts && doc.scripts.length > 0 && (
          <div className="paper-card rounded-2xl p-6 sm:p-8 bg-white border border-[#14213D]/12 shadow-sm space-y-4">
            <h2 className="font-serif text-lg font-bold text-[#14213D] flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#14213D]/70" />
              <span>Scripts & Command Lines Detected ({doc.scripts.length})</span>
            </h2>

            <div className="space-y-3">
              {doc.scripts.map((s, idx) => (
                <div
                  key={idx}
                  className="bg-stone-900 text-stone-100 p-4 rounded-xl font-mono text-xs space-y-2 overflow-x-auto"
                >
                  <div className="flex items-center justify-between text-stone-400 text-[11px] pb-1 border-b border-stone-800">
                    <span className="uppercase tracking-wider font-semibold text-amber-400">
                      Origin: {s.origin}
                    </span>
                    <span>Item #{idx + 1}</span>
                  </div>
                  <pre className="whitespace-pre-wrap break-all leading-relaxed text-emerald-300">
                    {s.code}
                  </pre>
                </div>
              ))}
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
