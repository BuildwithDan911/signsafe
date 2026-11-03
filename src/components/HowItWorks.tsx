import React from "react";

export default function HowItWorks() {
  return (
    <section className="w-full max-w-[1100px] mx-auto my-12 sm:my-16 px-4">
      <div className="text-center mb-8 sm:mb-10">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#14213D] tracking-tight">
          How SignSafe works
        </h2>
        <p className="text-sm sm:text-[17px] text-[#14213D]/70 mt-1 max-w-xl mx-auto">
          From upload to balanced agreement in three calm steps.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        {/* Step 1: Drop it in */}
        <div className="paper-card p-6 sm:p-7 rounded-xl bg-white border border-[#14213D]/10 shadow-sm flex flex-col items-center text-center hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="w-14 h-14 mb-4 rounded-xl bg-[#F8F5EE] border border-[#14213D]/10 flex items-center justify-center text-[#14213D]">
            {/* Hand-drawn style document drop SVG */}
            <svg
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-7 h-7 text-[#14213D]"
            >
              <path d="M14 6H28L36 14V42H14C12.8954 42 12 41.1046 12 40V8C12 6.89543 12.8954 6 14 6Z" />
              <path d="M28 6V14H36" />
              <path d="M24 22V32" stroke="#E8A33D" strokeWidth="2.5" />
              <path d="M20 28L24 32L28 28" stroke="#E8A33D" strokeWidth="2.5" />
            </svg>
          </div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#E8A33D] mb-1">
            Step 1
          </span>
          <h3 className="font-serif text-lg sm:text-xl font-bold text-[#14213D] mb-2">
            Drop it in
          </h3>
          <p className="text-sm sm:text-[15px] text-[#14213D]/75 leading-relaxed">
            Upload a PDF, Word doc, website link, or snap a photo of any contract or offer letter.
          </p>
        </div>

        {/* Step 2: See what to watch for */}
        <div className="paper-card p-6 sm:p-7 rounded-xl bg-white border border-[#14213D]/10 shadow-sm flex flex-col items-center text-center hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="w-14 h-14 mb-4 rounded-xl bg-[#F8F5EE] border border-[#14213D]/10 flex items-center justify-center text-[#14213D]">
            {/* Hand-drawn style highlighter / search SVG */}
            <svg
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-7 h-7 text-[#14213D]"
            >
              <path d="M10 38L32 16L38 22L16 44L8 46L10 38Z" />
              <path d="M27 21L33 27" />
              <path
                d="M18 36C24 35 32 37 42 35"
                stroke="#E8A33D"
                strokeWidth="3"
                strokeOpacity="0.8"
              />
            </svg>
          </div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#E8A33D] mb-1">
            Step 2
          </span>
          <h3 className="font-serif text-lg sm:text-xl font-bold text-[#14213D] mb-2">
            See what to watch for
          </h3>
          <p className="text-sm sm:text-[15px] text-[#14213D]/75 leading-relaxed">
            We highlight risky clauses, hidden surprises, and ask targeted questions to verify.
          </p>
        </div>

        {/* Step 3: Get a fairer version */}
        <div className="paper-card p-6 sm:p-7 rounded-xl bg-white border border-[#14213D]/10 shadow-sm flex flex-col items-center text-center hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="w-14 h-14 mb-4 rounded-xl bg-[#F8F5EE] border border-[#14213D]/10 flex items-center justify-center text-[#14213D]">
            {/* Hand-drawn style balanced check stamp SVG */}
            <svg
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-7 h-7 text-[#14213D]"
            >
              <circle cx="24" cy="24" r="16" strokeDasharray="3 3" />
              <circle cx="24" cy="24" r="12" />
              <path
                d="M19 24L23 28L30 19"
                stroke="#2FA36B"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#2FA36B] mb-1">
            Step 3
          </span>
          <h3 className="font-serif text-lg sm:text-xl font-bold text-[#14213D] mb-2">
            Get a fairer version
          </h3>
          <p className="text-sm sm:text-[15px] text-[#14213D]/75 leading-relaxed">
            Receive plain-English questions to ask them and balanced clauses that protect both sides.
          </p>
        </div>
      </div>
    </section>
  );
}
