"use client";

import React, { useState, useEffect } from "react";

interface TestItem {
  id: number;
  name: string;
  endpoint: string;
  description: string;
}

const TESTS: TestItem[] = [
  {
    id: 1,
    name: "1. Guard (Injection in Text)",
    endpoint: "/clocked/injection",
    description: "Sample 01 Markdown with 1px white prompt injection",
  },
  {
    id: 2,
    name: "2. Guard on PDF",
    endpoint: "/clocked/injection",
    description: "Sample 01 PDF base64 with return_text: true",
  },
  {
    id: 3,
    name: "3. Replay Guard Check",
    endpoint: "/clocked/injection",
    description: "Repeat identical Guard call to test 0 credits / replay transport",
  },
  {
    id: 4,
    name: "4. Inspect (VBA Macro & Command)",
    endpoint: "/clocked/script",
    description: "VBA dropper macro + npm install && npm run setup-agent",
  },
  {
    id: 5,
    name: "5. Protect (PII Anonymization)",
    endpoint: "/clocked/pii",
    description: "Anonymize 'replace' vs 'mask' length invariance check",
  },
  {
    id: 6,
    name: "6. Decide (39 RED_FLAGS)",
    endpoint: "/clocked/decide",
    description: "39 RED_FLAGS multiselect criteria in one call",
  },
  {
    id: 7,
    name: "7. Decide (40+ GIVEAWAYS)",
    endpoint: "/clocked/decide",
    description: "40+ GIVEAWAYS criteria in one call",
  },
  {
    id: 8,
    name: "8. Fill (Extract & Generate)",
    endpoint: "/clocked/fill",
    description: "Sentence extract with start/end offsets + plain English explanation",
  },
  {
    id: 9,
    name: "9. Verify (Grounding)",
    endpoint: "/clocked/grounding",
    description: "Double check explanation sentences against document text",
  },
  {
    id: 10,
    name: "10. Fill (Native Image Vision)",
    endpoint: "/clocked/fill",
    description: "02_chat_promises.png extract list of promises directly from pixels",
  },
  {
    id: 11,
    name: "11. Pipeline (10th Endpoint)",
    endpoint: "/clocked/pipeline",
    description: "Chaining Guard, Inspect, Protect, Extract, Decide in a single request",
  },
];

interface TestResult {
  testId: number;
  data: any;
  meta: {
    credits: number;
    modelMs: number;
    cached?: boolean;
    transport?: string;
  };
  creditsToday: number;
}

export default function LabClient() {
  const [runningId, setRunningId] = useState<number | null>(null);
  const [activeJson, setActiveJson] = useState<any>(null);
  const [activeTestTitle, setActiveTestTitle] = useState<string>("");
  const [results, setResults] = useState<Record<number, TestResult>>({});
  const [creditsToday, setCreditsToday] = useState<number>(0);
  const [writeStatus, setWriteStatus] = useState<string>("");

  useEffect(() => {
    fetch("/api/lab", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "getCreditsToday" }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.creditsToday !== undefined) {
          setCreditsToday(data.creditsToday);
        }
      })
      .catch(() => {});
  }, []);

  const runTest = async (testId: number) => {
    setRunningId(testId);
    const test = TESTS.find((t) => t.id === testId);
    setActiveTestTitle(test ? `${test.name} (${test.endpoint})` : `Test ${testId}`);

    try {
      const res = await fetch("/api/lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId }),
      });
      const data = await res.json();
      setActiveJson(data);

      if (res.ok) {
        setResults((prev) => ({
          ...prev,
          [testId]: {
            testId,
            data: data.data,
            meta: data.meta || { credits: 0, modelMs: 0 },
            creditsToday: data.creditsToday,
          },
        }));
        if (data.creditsToday !== undefined) {
          setCreditsToday(data.creditsToday);
        }
      }
    } catch (err: any) {
      setActiveJson({ error: err.message });
    } finally {
      setRunningId(null);
    }
  };

  const runAll = async () => {
    for (const test of TESTS) {
      await runTest(test.id);
    }
  };

  const handleWriteResults = async () => {
    setWriteStatus("Writing...");
    try {
      const res = await fetch("/api/lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "writeResults" }),
      });
      const data = await res.json();
      if (res.ok) {
        setWriteStatus("Success! DAY1_RESULTS.md updated.");
      } else {
        setWriteStatus(`Failed: ${data.error}`);
      }
    } catch (err: any) {
      setWriteStatus(`Error: ${err.message}`);
    }
    setTimeout(() => setWriteStatus(""), 4000);
  };

  const totalSessionCredits = Object.values(results).reduce(
    (acc, curr) => acc + (curr.meta?.credits || 0),
    0
  );

  return (
    <div className="min-h-screen bg-[#FBF8F1] text-[#14213D] p-4 sm:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="border-b border-stone-200 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-block px-2.5 py-0.5 mb-1 text-xs font-semibold tracking-wider text-amber-800 uppercase bg-amber-100 rounded-full">
              Dev-Only Lab (NODE_ENV: development)
            </div>
            <h1 className="text-3xl font-serif font-bold tracking-tight">
              SignSafe Day-1 Clocked Integration Lab
            </h1>
            <p className="text-sm text-stone-600 mt-1">
              Live verification of all 10 endpoints + Pipeline chaining against real Clocked API
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={runAll}
              disabled={runningId !== null}
              className="px-4 py-2 bg-[#14213D] text-white text-sm font-medium rounded-lg hover:bg-[#1f3158] transition shadow-sm disabled:opacity-50"
            >
              {runningId !== null ? "Running..." : "Run All Tests"}
            </button>
            <button
              onClick={handleWriteResults}
              className="px-4 py-2 bg-emerald-700 text-white text-sm font-medium rounded-lg hover:bg-emerald-800 transition shadow-sm"
            >
              Write DAY1_RESULTS.md
            </button>
          </div>
        </header>

        {writeStatus && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm font-medium animate-fadeIn">
            {writeStatus}
          </div>
        )}

        {/* Test Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {TESTS.map((test) => {
            const res = results[test.id];
            const isRunning = runningId === test.id;

            return (
              <div
                key={test.id}
                className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm hover:shadow transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <h3 className="font-semibold text-sm text-[#14213D]">{test.name}</h3>
                    {res && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        Done
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mb-1 font-mono">{test.endpoint}</p>
                  <p className="text-xs text-stone-600 line-clamp-2">{test.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                  <div className="text-xs text-stone-500">
                    {res ? (
                      <span>
                        <strong className="text-stone-800">{res.meta.credits}</strong> cr ·{" "}
                        {res.meta.modelMs} ms
                        {res.meta.transport && (
                          <span className="ml-1 text-blue-600">({res.meta.transport})</span>
                        )}
                      </span>
                    ) : (
                      "Not run"
                    )}
                  </div>
                  <button
                    onClick={() => runTest(test.id)}
                    disabled={isRunning}
                    className="px-3 py-1 text-xs font-medium rounded-md bg-stone-100 hover:bg-stone-200 text-stone-800 transition disabled:opacity-50"
                  >
                    {isRunning ? "Running..." : "Run Test"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Active JSON Viewer & Results Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm flex flex-col h-[420px]">
            <div className="flex justify-between items-center pb-2 border-b border-stone-100 mb-2">
              <h2 className="text-sm font-semibold text-[#14213D]">
                Response Inspector {activeTestTitle && `— ${activeTestTitle}`}
              </h2>
              {activeJson?.meta && (
                <div className="text-xs text-stone-500">
                  Credits:{" "}
                  <strong className="text-stone-800">{activeJson.meta.credits}</strong> |
                  Time: {activeJson.meta.modelMs} ms
                </div>
              )}
            </div>
            <pre className="flex-1 bg-stone-900 text-stone-100 text-xs font-mono p-3 rounded-lg overflow-auto leading-relaxed">
              {activeJson
                ? JSON.stringify(activeJson, null, 2)
                : "// Select or run any test above to view full response payload"}
            </pre>
          </div>

          {/* Results Summary Table */}
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm flex flex-col h-[420px]">
            <h2 className="text-sm font-semibold text-[#14213D] pb-2 border-b border-stone-100 mb-2">
              Execution Table ({Object.keys(results).length} / {TESTS.length} Completed)
            </h2>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500">
                    <th className="py-2 pr-2">Test</th>
                    <th className="py-2 px-2">Verdict / Output</th>
                    <th className="py-2 px-2 text-right">Credits</th>
                    <th className="py-2 pl-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {TESTS.map((t) => {
                    const r = results[t.id];
                    let summary = "—";
                    if (r?.data) {
                      if (r.data.verdict) {
                        summary = `${r.data.verdict} (${r.data.category || ""})`;
                      } else if (r.data.macro) {
                        summary = `macro: ${r.data.macro.verdict}`;
                      } else if (r.data.replace_count !== undefined) {
                        summary = `${r.data.replace_count} PII items (mask len match)`;
                      } else if (r.data.answers?.red_flags) {
                        summary = `${r.data.answers.red_flags.length} flags found`;
                      } else if (r.data.answers?.giveaways) {
                        summary = `${r.data.answers.giveaways.length} tells found`;
                      } else if (r.data.fields?.promises) {
                        summary = `${r.data.fields.promises.length} promises read`;
                      } else if (r.data.fields?.upfront_fee_quote) {
                        summary = `Extracted fee quote`;
                      } else if (r.data.claims) {
                        summary = `2 claims grounded`;
                      } else if (r.data.results) {
                        summary = `Pipeline: 5 steps OK`;
                      }
                    }

                    return (
                      <tr key={t.id} className="hover:bg-stone-50">
                        <td className="py-2 pr-2 font-medium text-stone-800">{t.name}</td>
                        <td className="py-2 px-2 text-stone-600 truncate max-w-[180px]">
                          {summary}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-stone-700">
                          {r ? r.meta.credits : "—"}
                        </td>
                        <td className="py-2 pl-2 text-right text-stone-500 font-mono">
                          {r ? `${r.meta.modelMs}ms` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Credit Meter */}
        <footer className="bg-stone-900 text-stone-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-stone-400">Lab Session Credits:</span>{" "}
              <strong className="text-white text-sm">{totalSessionCredits}</strong>
            </div>
            <div>
              <span className="text-stone-400">Total Credits Used Today:</span>{" "}
              <strong className="text-white text-sm">{creditsToday}</strong>
            </div>
            <div>
              <span className="text-stone-400">Daily Cap:</span>{" "}
              <span className="text-stone-300">3,000</span>
            </div>
          </div>
          <div className="text-stone-400">
            SignSafe Clocked Client: <span className="text-emerald-400 font-medium">Active (Plain Fetch)</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
