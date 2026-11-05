import { NextRequest, NextResponse } from "next/server";
import { callClocked } from "@/server/clocked";
import { splitIntoClauses, Clause } from "@/lib/clauses";
import { formatApiError } from "@/server/errors";
import { checkRateLimit } from "@/server/store";

export const maxDuration = 60;

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
    const {
      question = "",
      cleanText = "",
      clauses: providedClauses,
    }: {
      question: string;
      cleanText?: string;
      clauses?: Clause[];
    } = body;

    const trimmedQuery = question.trim().slice(0, 500);
    if (!trimmedQuery) {
      return NextResponse.json(
        { error: "Question cannot be empty" },
        { status: 400 }
      );
    }

    // 1. Obtain clauses (split if not provided)
    const clauses: Clause[] =
      providedClauses && providedClauses.length > 0
        ? providedClauses
        : splitIntoClauses(cleanText);

    if (clauses.length === 0) {
      return NextResponse.json({
        answer: "This document doesn't seem to say.",
        verdict: "not_stated",
        grounded: 0,
        keptClauseIds: [],
        keptClauses: [],
        meta: { credits: 0, cached: true, modelMs: 0 },
      });
    }

    // 2. Call Clocked Rerank
    const rerankDocs = clauses.map((c) => ({
      id: c.id,
      title: c.title,
      text: c.text,
    }));

    const rerankRes = await callClocked("rerank", {
      query: trimmedQuery,
      documents: rerankDocs,
      top_n: 3,
      instructions: "Find the clauses of this contract that answer the signer's question.",
    });

    const results: Array<{
      index: number;
      id: string;
      action: "use" | "expand" | "skip";
      relevance_score: number;
      document_score?: number;
      reason?: string;
    }> = rerankRes.data.results || [];

    // Keep results whose action is "use" or "expand"
    const keptResults = results.filter(
      (r) => r.action === "use" || r.action === "expand"
    );

    if (keptResults.length === 0) {
      return NextResponse.json({
        answer: "This document doesn't seem to say.",
        verdict: "not_stated",
        grounded: 0,
        keptClauseIds: [],
        keptClauses: [],
        meta: rerankRes.meta,
      });
    }

    // Map kept results to full clause objects
    const keptClauses = keptResults
      .map((r) => {
        const cl = clauses.find((c) => c.id === r.id) || clauses[r.index];
        if (!cl) return null;
        return {
          id: cl.id,
          title: cl.title,
          text: cl.text,
          startOffset: cl.startOffset,
          endOffset: cl.endOffset,
          relevance_score: r.relevance_score,
          action: r.action,
        };
      })
      .filter(Boolean) as Array<Clause & { relevance_score: number; action: string }>;

    if (keptClauses.length === 0) {
      return NextResponse.json({
        answer: "This document doesn't seem to say.",
        verdict: "not_stated",
        grounded: 0,
        keptClauseIds: [],
        keptClauses: [],
        meta: rerankRes.meta,
      });
    }

    // 3. Call Fill on the joined text of kept clauses
    const joinedText = keptClauses.map((c) => c.text).join("\n\n");

    const fillRes = await callClocked("fill", {
      text: joinedText,
      instructions:
        "Answer the signer's question in plain English using only this text. If the text doesn't answer it, say 'The document doesn't say.'",
      fields: {
        answer: {
          type: "generate",
          format: "text",
          max_tokens: 120,
          description: `Answer the signer's question in plain English using only this text. If the text doesn't answer it, say 'The document doesn't say.' Question: ${trimmedQuery}`,
        },
      },
    });

    const generatedAnswer =
      fillRes.data.fields?.answer?.value || "The document doesn't say.";

    const isNegativeAnswer =
      generatedAnswer.toLowerCase().includes("doesn't say") ||
      generatedAnswer.toLowerCase().includes("does not say") ||
      generatedAnswer.toLowerCase().includes("doesn't seem to say") ||
      generatedAnswer.toLowerCase().includes("not mentioned");

    if (isNegativeAnswer) {
      const combinedCredits = (rerankRes.meta?.credits || 0) + (fillRes.meta?.credits || 0);
      return NextResponse.json({
        answer: "The document doesn't say.",
        verdict: "not_stated",
        grounded: 0,
        keptClauseIds: [],
        keptClauses: [],
        meta: {
          credits: combinedCredits,
          cached: Boolean(rerankRes.meta?.cached && fillRes.meta?.cached),
          modelMs: (rerankRes.meta?.modelMs || 0) + (fillRes.meta?.modelMs || 0),
        },
      });
    }

    // 4. Call Grounding to verify generated answer against kept clauses
    const groundingRes = await callClocked("grounding", {
      documents: keptClauses.map((c) => ({ id: c.id, text: c.text })),
      answer: generatedAnswer,
      evidence: "flagged",
    });

    const verdict = groundingRes.data.verdict || "supported";
    const grounded = groundingRes.data.grounded ?? 1.0;

    const totalCredits =
      (rerankRes.meta?.credits || 0) +
      (fillRes.meta?.credits || 0) +
      (groundingRes.meta?.credits || 0);

    const isAllCached = Boolean(
      rerankRes.meta?.cached && fillRes.meta?.cached && groundingRes.meta?.cached
    );

    return NextResponse.json({
      answer: generatedAnswer,
      verdict,
      grounded,
      keptClauseIds: keptClauses.map((c) => c.id),
      keptClauses,
      meta: {
        credits: totalCredits,
        cached: isAllCached,
        modelMs:
          (rerankRes.meta?.modelMs || 0) +
          (fillRes.meta?.modelMs || 0) +
          (groundingRes.meta?.modelMs || 0),
      },
    });
  } catch (err: any) {
    return formatApiError(err).response;
  }
}
