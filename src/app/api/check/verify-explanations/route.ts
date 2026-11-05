import { NextRequest, NextResponse } from "next/server";
import { callClocked } from "@/server/clocked";
import { formatApiError } from "@/server/errors";
import { checkRateLimit } from "@/server/store";
import { splitForClocked, sumChunkCredits } from "@/lib/chunking";
import { validateBody, VerifyExplanationsSchema } from "@/lib/validation";

export const maxDuration = 60;

interface ExplanationItem {
  flagId: string;
  why: string;
  quote?: string;
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
    const validation = validateBody(VerifyExplanationsSchema, body);
    if ("error" in validation) return validation.error;
    const { cleanText = "", items = [] } = validation.data;

    if (!cleanText || items.length === 0) {
      return NextResponse.json({
        verifiedItems: [],
        claims: [],
        meta: { credits: 0, cached: true, modelMs: 0 },
      });
    }

    const chunks = splitForClocked(cleanText);

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

    const responses = [];
    for (let base = 0; base < chunks.length; base += 3) {
      const batch = chunks.slice(base, base + 3);
      responses.push(await callClocked("grounding", {
        documents: batch.map((chunk) => ({ id: `section_${chunk.index}`, text: chunk.text })),
        answer: answerText,
        claims: claimsList,
        evidence: "flagged",
      }));
    }

    const returnedClaims: Array<{
      claim: string;
      verdict: "supported" | "contradicted" | "not_stated" | "not_a_claim" | string;
      supported?: number;
      contradicted?: number;
      not_stated?: number;
    }> = [];
    const claimByText = new Map<string, (typeof returnedClaims)[number]>();
    for (const response of responses) {
      for (const claim of response.data.claims || []) {
        const prior = claimByText.get(claim.claim);
        if (!prior || (prior.verdict !== "supported" && claim.verdict === "supported")) claimByText.set(claim.claim, claim);
      }
    }
    returnedClaims.push(...claimByText.values());

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
      grounded: responses.some((response) => response.data.grounded),
      sectionsChecked: chunks.length,
      meta: chunks.length > 1 ? sumChunkCredits(responses) : responses[0].meta,
    });
  } catch (err: any) {
    return formatApiError(err).response;
  }
}
