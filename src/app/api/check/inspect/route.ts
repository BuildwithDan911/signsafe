import { NextRequest, NextResponse } from "next/server";
import { callClocked } from "@/server/clocked";
import { ScriptItem } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const scripts: ScriptItem[] = body.scripts || [];

    if (!scripts || scripts.length === 0) {
      return NextResponse.json({
        skipped: true,
        credits: 0,
        results: [],
        meta: { credits: 0, modelMs: 0, cached: false },
      });
    }

    const targetScripts = scripts.slice(0, 3);
    const results: any[] = [];
    let totalCredits = 0;
    let totalModelMs = 0;
    let allCached = true;

    for (const item of targetScripts) {
      let scriptCode = item.code || "";
      if (scriptCode.length > 200000) {
        scriptCode = scriptCode.slice(0, 200000);
      }

      const res = await callClocked("script", {
        script: scriptCode,
        evidence: true,
      });

      const d = res.data;
      totalCredits += res.meta.credits;
      totalModelMs += res.meta.modelMs;
      if (!res.meta.cached) allCached = false;

      results.push({
        origin: item.origin,
        code: item.code,
        verdict: d.verdict,
        malicious: d.malicious || d.verdict === "malicious",
        suspicious: d.suspicious || d.verdict === "suspicious",
        category: d.category,
        severity: d.severity,
        evidence: d.evidence || [],
      });
    }

    const hasMalicious = results.some((r) => r.malicious);
    const hasSuspicious = results.some((r) => r.suspicious);

    return NextResponse.json({
      skipped: false,
      results,
      hasMalicious,
      hasSuspicious,
      meta: {
        credits: totalCredits,
        modelMs: totalModelMs,
        cached: allCached,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Inspect check failed" },
      { status: 500 }
    );
  }
}
