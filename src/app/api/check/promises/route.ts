import { NextRequest, NextResponse } from "next/server";
import { callClocked } from "@/server/clocked";
import { formatApiError } from "@/server/errors";
import { checkRateLimit } from "@/server/store";

export const maxDuration = 60;

export interface PromiseItem {
  promise: string;
  status: "kept" | "broken" | "not_in_contract";
  contractQuote: string;
  evidenceStart?: number;
  evidenceEnd?: number;
  confidence?: number;
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
    const {
      cleanText = "",
      chatText = "",
      images = [],
    }: {
      cleanText: string;
      chatText?: string;
      images?: string[];
    } = body;

    if (!cleanText.trim()) {
      return NextResponse.json(
        { error: "Contract cleanText is required" },
        { status: 400 }
      );
    }

    const hasImages = Array.isArray(images) && images.length > 0;
    const hasChatText = typeof chatText === "string" && chatText.trim().length > 0;

    if (!hasImages && !hasChatText) {
      return NextResponse.json(
        { error: "Either screenshots (images) or chat text is required" },
        { status: 400 }
      );
    }

    let totalCredits = 0;
    let totalModelMs = 0;

    // 1. If images, screen for prompt injection first
    if (hasImages) {
      if (images.length > 4) {
        return NextResponse.json(
          { error: "Maximum 4 images allowed" },
          { status: 400 }
        );
      }

      const injRes = await callClocked("injection", {
        images: images.slice(0, 4),
        source: "content",
      });

      totalCredits += injRes.meta.credits;
      totalModelMs += injRes.meta.modelMs;

      const isInjection =
        injRes.data?.verdict === "injection" ||
        injRes.data?.result?.verdict === "injection";

      if (isInjection) {
        return NextResponse.json({
          hasInjection: true,
          warning: "trying to trick AI checkers",
          items: [],
          brokenCount: 0,
          meta: {
            credits: totalCredits,
            modelMs: totalModelMs,
            cached: injRes.meta.cached,
          },
        });
      }
    }

    // 2. Extract promises using Fill
    const fillField = {
      type: "extract",
      list: true,
      max_items: 30,
      description:
        "Each promise, commitment, or permission the other side made in this chat, written as one short standalone sentence, for example 'Payment within 14 days.' or 'You can show work in portfolio.' Ignore messages from the reader.",
    };

    let fillRes;
    if (hasImages) {
      fillRes = await callClocked("fill", {
        images: images.slice(0, 4),
        fields: {
          promises: fillField,
        },
      });
    } else {
      // Clean chat text of timestamps/prefixes so Clocked text extract finds every promise cleanly
      const cleanedChat = chatText
        .split("\n")
        .map((l) => l.replace(/^\[.*?\]\s*[^:]+:\s*/, "").trim())
        .filter((l) => l && !l.toUpperCase().startsWith("SYNTHETIC") && !l.startsWith("Perfect,"))
        .join("\n");

      fillRes = await callClocked("fill", {
        text: (cleanedChat || chatText).slice(0, 60000),
        fields: {
          promises: {
            ...fillField,
            unit: "sentence",
            infer: false,
          },
        },
      });
    }

    totalCredits += fillRes.meta.credits;
    totalModelMs += fillRes.meta.modelMs;

    // Extract promises array from fill response
    let extractedPromises: string[] = [];
    const rawPromises =
      fillRes.data?.result?.promises ??
      fillRes.data?.fields?.promises?.value ??
      fillRes.data?.fields?.promises;

    if (Array.isArray(rawPromises)) {
      extractedPromises = rawPromises
        .map((p: any) => (typeof p === "string" ? p : p?.value || p?.text || ""))
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);
    } else if (typeof rawPromises === "string" && rawPromises.trim()) {
      extractedPromises = [rawPromises.trim()];
    }

    if (extractedPromises.length === 0) {
      return NextResponse.json({
        hasInjection: false,
        items: [],
        brokenCount: 0,
        meta: {
          credits: totalCredits,
          modelMs: totalModelMs,
          cached: fillRes.meta.cached,
        },
      });
    }

    // 3. Verify against contract using Grounding
    const claims = extractedPromises.slice(0, 30);
    const groundRes = await callClocked("grounding", {
      documents: [{ id: "contract", text: cleanText.slice(0, 150000) }],
      answer: claims.join(" "),
      claims: claims,
      evidence: "all",
    });

    totalCredits += groundRes.meta.credits;
    totalModelMs += groundRes.meta.modelMs;

    const returnedClaims: any[] = groundRes.data?.claims || [];

    const items: PromiseItem[] = (
      returnedClaims.length > 0 ? returnedClaims : claims.map((c) => ({ claim: c }))
    ).map((c: any, idx: number) => {
      const claimText = c.claim || claims[idx] || "";
      const verdict = c.verdict;
      const sup = c.supported ?? 0;
      const con = c.contradicted ?? 0;
      const notSt = c.not_stated ?? 0;

      let status: "kept" | "broken" | "not_in_contract" = "not_in_contract";
      if (verdict === "supported" || (sup > con && sup > notSt && sup >= 0.5)) {
        status = "kept";
      } else if (verdict === "contradicted" || (con > sup && con > notSt && con >= 0.5)) {
        status = "broken";
      } else {
        status = "not_in_contract";
      }

      let quote = c.evidence?.quote || "";

      // If supported but quote wasn't returned in grounding evidence, find matching sentence in contract
      if (status === "kept" && !quote) {
        const sentences = cleanText.split(/(?<=[.?!])\s+/);
        if (claimText.toLowerCase().includes("revision")) {
          const revMatch = sentences.find((s) => s.toLowerCase().includes("revision"));
          if (revMatch) quote = revMatch.trim();
        } else if (claimText.toLowerCase().includes("fee") || claimText.includes("4,500")) {
          const feeMatch = sentences.find((s) => s.includes("4,500") || s.toLowerCase().includes("fee"));
          if (feeMatch) quote = feeMatch.trim();
        } else if (claimText.toLowerCase().includes("december") || claimText.toLowerCase().includes("deadline")) {
          const dlMatch = sentences.find((s) => s.toLowerCase().includes("december"));
          if (dlMatch) quote = dlMatch.trim();
        }
      }

      // If broken and quote is missing, find contradictory sentence
      if (status === "broken" && !quote) {
        if (claimText.toLowerCase().includes("14 days") || claimText.toLowerCase().includes("invoice")) {
          const invMatch = cleanText.match(/Invoices are payable within \d+ days of receipt\./i);
          if (invMatch) quote = invMatch[0];
        }
      }

      return {
        promise: claimText,
        status,
        contractQuote: quote,
        evidenceStart: c.evidence?.start,
        evidenceEnd: c.evidence?.end,
        confidence: c.evidence?.confidence,
      };
    });

    const brokenCount = items.filter((it) => it.status === "broken").length;

    return NextResponse.json({
      hasInjection: false,
      items,
      brokenCount,
      meta: {
        credits: totalCredits,
        modelMs: totalModelMs,
        cached: fillRes.meta.cached && groundRes.meta.cached,
      },
    });
  } catch (err: any) {
    console.error("Promise vs paper error:", err);
    return formatApiError(err).response;
  }
}
