import { NextRequest, NextResponse } from "next/server";
import { callClocked } from "@/server/clocked";
import { ScriptItem } from "@/lib/types";
import { formatApiError } from "@/server/errors";
import { splitForClocked } from "@/lib/chunking";

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

    const results: any[] = [];
    let totalCredits = 0;
    let totalModelMs = 0;
    let allCached = true;

    for (const item of scripts) {
      const chunks = splitForClocked(item.code || "");
      const scriptResults = [];
      for (const chunk of chunks) {
        const res = await callClocked("script", { script: chunk.text, evidence: true });
        scriptResults.push(res);
        totalCredits += res.meta.credits;
        totalModelMs += res.meta.modelMs;
        if (!res.meta.cached) allCached = false;
      }
      results.push({
        origin: item.origin,
        code: item.code,
        verdict: scriptResults.some((res) => res.data.verdict === "malicious") ? "malicious" : scriptResults.some((res) => res.data.verdict === "suspicious") ? "suspicious" : "benign",
        malicious: scriptResults.some((res) => res.data.malicious || res.data.verdict === "malicious"),
        suspicious: scriptResults.some((res) => res.data.suspicious || res.data.verdict === "suspicious"),
        category: scriptResults.find((res) => res.data.category)?.data.category,
        severity: scriptResults.find((res) => res.data.severity)?.data.severity,
        evidence: scriptResults.flatMap((res) => res.data.evidence || []),
        sectionsChecked: chunks.length,
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
    return formatApiError(err).response;
  }
}
