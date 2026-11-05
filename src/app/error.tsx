"use client";

import { useEffect, useState } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const [showReset, setShowReset] = useState(false);

  // Log the error server-side / to an error tracker in production.
  // eslint-disable-next-line no-console
  useEffect(() => {
    console.error("[ErrorBoundary]", error);
    if (typeof window !== "undefined" && (window as any).Sentry) {
      (window as any).Sentry.captureException(error);
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FBF8F1] flex flex-col items-center justify-center p-6 text-[#14213D]">
      <div className="text-center max-w-md mx-auto">
        <h1 className="font-serif text-3xl font-bold text-[#14213D] mb-4">
          Something went wrong
        </h1>
        <p className="text-sm text-stone-600 mb-6">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={() => {
            reset();
            setShowReset(false);
          }}
          className="px-6 py-3 rounded-xl bg-[#14213D] text-[#FBF8F1] font-semibold hover:bg-[#1f3158] transition-colors"
        >
          Try again
        </button>
        <button
          onClick={() => setShowReset(true)}
          className="mt-4 text-xs text-stone-500 underline hover:text-stone-800"
        >
          Refresh page
        </button>
        {showReset && (
          <button
            onClick={() => window.location.reload()}
            className="mt-2 inline-block px-6 py-3 rounded-xl bg-[#14213D] text-[#FBF8F1] font-semibold hover:bg-[#1f3158] transition-colors"
          >
            Confirm refresh
          </button>
        )}
      </div>
    </div>
  );
}
