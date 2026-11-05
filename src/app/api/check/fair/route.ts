import { NextRequest, NextResponse } from "next/server";
import { callClocked, ClockedResponse } from "@/server/clocked";
import { formatApiError } from "@/server/errors";
import { checkRateLimit } from "@/server/store";
import { validateBody, FairSchema } from "@/lib/validation";

export const maxDuration = 60;
export const runtime = "nodejs";

interface QuoteItem {
  id?: string;
  title?: string;
  quote: string;
}

export async function POST(req: NextRequest) {
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = (
      forwarded
        ? forwarded.split(",")[0].trim()
        : req.headers.get("x-real-ip") || "127.0.0.1"
    ).trim();
    const rl = await checkRateLimit(ip);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          error:
            "Rate limit reached: at most 5 live checks per hour. You can view Judge Mode to explore recorded runs.",
          code: 429,
          resetSeconds: rl.resetSeconds,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const validation = validateBody(FairSchema, body);
    if ("error" in validation) return validation.error;
    const {
      quotes = [],
      facts = {},
      cleanText = "",
    } = validation.data;

    // Filter to at most 6 valid quotes
    const targetQuotes = quotes
      .filter((q) => q.quote && q.quote.trim().length > 10)
      .slice(0, 6);

    if (targetQuotes.length === 0) {
      return NextResponse.json({
        clauses: [],
        allFactsKept: true,
        unsupportedFacts: [],
        meta: { credits: 0, cached: true, modelMs: 0 },
      });
    }

    // 1. Build Fill fields to rewrite clauses (one generate field per quote, max 400 tokens)
    const fillFields: Record<string, unknown> = {};

    targetQuotes.forEach((q, idx) => {
      fillFields[`fair_${idx}`] = {
        type: "generate",
        format: "text",
        max_tokens: 400,
        description: `Rewrite this clause so it is fair to both sides in plain English. Keep every agreed fact exactly the same: names, amounts, dates, deliverables. Clause: ${q.quote}`,
      };
    });

    const fillRes = await callClocked("fill", {
      text: cleanText ? cleanText.slice(0, 50000) : targetQuotes.map((q) => q.quote).join("\n\n"),
      instructions:
        "You are an expert contract reviewer. Rewrite one-sided or unfair clauses into balanced, clear, plain-English terms that protect both parties while preserving all agreed names, prices, deliverables, and dates.",
      fields: fillFields,
    });

    const fillData = fillRes.data.fields || {};

    // Collect rewritten clauses
    const rewrittenClauses = targetQuotes.map((q, idx) => {
      const fairVal = fillData[`fair_${idx}`]?.value || "";
      return {
        id: q.id || `clause_${idx}`,
        title: q.title || `Clause ${idx + 1}`,
        originalQuote: q.quote,
        fairClause: fairVal || q.quote,
      };
    });

    const rewrittenJoined = rewrittenClauses.map((c) => c.fairClause).join("\n\n");

    // 2. Build factual claims from Extract to verify via Grounding
    const factClaims: string[] = [];

    const getVal = (key: string) => {
      const v = facts[key]?.value;
      if (v === null || v === undefined) return null;
      if (Array.isArray(v)) return v.length > 0 ? v.join(", ") : null;
      return String(v).trim();
    };

    const fee = getVal("pay_you_receive");
    if (fee) factClaims.push(`The fee is ${fee}.`);

    const client = getVal("issuer_name");
    if (client) factClaims.push(`The client or company is ${client}.`);

    const delivery = getVal("term_or_end_date") || getVal("deadline_to_sign_or_pay");
    if (delivery) factClaims.push(`Final delivery is by ${delivery}.`);

    const startDate = getVal("start_date");
    if (startDate) factClaims.push(`The start date is ${startDate}.`);

    const govLaw = getVal("governing_law");
    if (govLaw) factClaims.push(`The governing law is ${govLaw}.`);

    let allFactsKept = true;
    const unsupportedFacts: string[] = [];
    let groundingRes: ClockedResponse | null = null;

    if (factClaims.length > 0 && rewrittenJoined.length > 10) {
      try {
        groundingRes = await callClocked("grounding", {
          documents: [{ id: "fair", text: rewrittenJoined }],
          answer: factClaims.join(" "),
          claims: factClaims,
          evidence: "flagged",
        });

        const returnedClaims: Array<{ claim: string; verdict: string }> =
          groundingRes.data.claims || [];

        for (const rc of returnedClaims) {
          if (rc.verdict !== "supported") {
            unsupportedFacts.push(rc.claim);
          }
        }

        allFactsKept = unsupportedFacts.length === 0;
      } catch (e) {
        console.error("Grounding check on fair rewrite failed:", e);
      }
    }

    const totalCredits = (fillRes.meta?.credits || 0) + (groundingRes?.meta?.credits || 0);

    return NextResponse.json({
      clauses: rewrittenClauses,
      allFactsKept,
      unsupportedFacts,
      factClaims,
      meta: {
        credits: totalCredits,
        cached: Boolean(fillRes.meta?.cached && (!groundingRes || groundingRes?.meta?.cached)),
        modelMs: (fillRes.meta?.modelMs || 0) + (groundingRes?.meta?.modelMs || 0),
      },
    });
  } catch (err: any) {
    return formatApiError(err).response;
  }
}
