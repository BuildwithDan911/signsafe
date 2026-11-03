import { NextRequest, NextResponse } from "next/server";
import { callClocked } from "@/server/clocked";

export const maxDuration = 60;

interface ExplanationItem {
  flagId: string;
  why: string;
  quote?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cleanText = "", items = [] }: { cleanText: string; items: ExplanationItem[] } = body;

    if (!cleanText || items.length === 0) {
      return NextResponse.json({
        verifiedItems: [],
        claims: [],
        meta: { credits: 0, cached: true, modelMs: 0 },
      });
    }

    // Prepare document text (cap at 150,000 chars as specified in brief)
    let docText = cleanText;
    if (cleanText.length > 150000) {
      docText = cleanText.slice(0, 150000);
    }

    // Extract individual sentences from why texts for claims
    const sentenceToFlagId: Array<{ sentence: string; flagId: string; itemIndex: number }> = [];

    items.forEach((item, itemIndex) => {
      if (!item.why) return;
      // Split by sentence terminators
      const rawSentences = item.why
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 5);

      for (const sent of rawSentences) {
        if (sentenceToFlagId.length < 30) {
          sentenceToFlagId.push({
            sentence: sent,
            flagId: item.flagId,
            itemIndex,
          });
        }
      }
    });

    const claimsList = sentenceToFlagId.map((s) => s.sentence);
    const answerText = items
      .map((it) => it.why)
      .filter(Boolean)
      .join(" ")
      .slice(0, 20000);

    if (claimsList.length === 0) {
      return NextResponse.json({
        verifiedItems: items.map((it) => ({
          ...it,
          verified: true,
          verifiedWhy: it.why,
          unverifiedSentences: [],
        })),
        claims: [],
        meta: { credits: 0, cached: true, modelMs: 0 },
      });
    }

    const clockedRes = await callClocked("grounding", {
      documents: [{ id: "document", text: docText }],
      answer: answerText,
      claims: claimsList,
      evidence: "flagged",
    });

    const returnedClaims: Array<{
      claim: string;
      verdict: "supported" | "contradicted" | "not_stated" | "not_a_claim" | string;
      supported?: number;
      contradicted?: number;
      not_stated?: number;
    }> = clockedRes.data.claims || [];

    // Map claim results back to each explanation item
    const verifiedItems = items.map((item, itemIndex) => {
      const itemClaims = sentenceToFlagId
        .filter((s) => s.itemIndex === itemIndex)
        .map((s) => {
          const match = returnedClaims.find((rc) => rc.claim === s.sentence) || {
            claim: s.sentence,
            verdict: "supported",
          };
          return match;
        });

      if (itemClaims.length === 0) {
        return {
          ...item,
          verified: true,
          verifiedWhy: item.why,
          unverifiedSentences: [],
          notice: null,
        };
      }

      const supportedClaims = itemClaims.filter((c) => c.verdict === "supported");
      const unsupportedClaims = itemClaims.filter(
        (c) => c.verdict === "contradicted" || c.verdict === "not_stated"
      );

      const allSupported = unsupportedClaims.length === 0;

      let verifiedWhy = item.why;
      let notice: string | null = null;

      if (!allSupported) {
        if (supportedClaims.length > 0) {
          verifiedWhy = supportedClaims.map((c) => c.claim).join(" ");
          notice = "Part of this explanation couldn't be checked, so we removed it.";
        } else {
          verifiedWhy = "";
          notice = "Part of this explanation couldn't be checked, so we removed it.";
        }
      }

      return {
        flagId: item.flagId,
        why: item.why,
        verifiedWhy: verifiedWhy || item.why,
        verified: allSupported,
        notice,
        unverifiedSentences: unsupportedClaims.map((c) => c.claim),
      };
    });

    return NextResponse.json({
      verifiedItems,
      claims: returnedClaims,
      grounded: clockedRes.data.grounded,
      meta: clockedRes.meta,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Verification check failed" },
      { status: 500 }
    );
  }
}
