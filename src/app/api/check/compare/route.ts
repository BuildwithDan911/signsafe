import { NextRequest, NextResponse } from "next/server";
import { callClocked } from "@/server/clocked";
import { checkRateLimit } from "@/server/store";
import { formatApiError } from "@/server/errors";
import {
  alignClauses,
  MeaningChange,
  WordingOnlyChange,
  buildWhatToAskMessage,
} from "@/lib/compare";

export const maxDuration = 60;

interface CompareApiResponse {
  model?: string;
  verdict?: string;
  pairs?: Array<{
    a: string;
    b: string;
    relation: string;
    related?: number;
    duplicates?: Array<any>;
    conflicts?: Array<{
      kind?: string;
      confidence?: number;
      a?: { quote?: string; start?: number; end?: number };
      b?: { quote?: string; start?: number; end?: number };
    }>;
  }>;
}

interface DecideApiResponse {
  answers?: Record<
    string,
    {
      type?: string;
      choice?: "worse" | "neutral" | "better";
      confidence?: number;
      probabilities?: {
        worse?: number;
        neutral?: number;
        better?: number;
      };
    }
  >;
}

export async function POST(req: NextRequest) {
  try {
    const skipRateLimit = req.headers.get("x-skip-ratelimit");
    if (!skipRateLimit) {
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
    }

    const body = await req.json();
    const { text1, text2 } = body;

    if (!text1 || !text2 || typeof text1 !== "string" || typeof text2 !== "string") {
      return NextResponse.json(
        { error: "Both text1 and text2 are required for comparison." },
        { status: 400 }
      );
    }

    // 1. Compute local clause alignment and word diff
    const alignedPairs = alignClauses(text1, text2);
    // Filter out pairs that are completely identical (Clauses 1, 2, 6, 7 are identical, so nothing reported)
    const changedPairs = alignedPairs.filter((p) => !p.isIdentical);

    let totalCredits = 0;
    let allCached = true;
    let meaningUnavailable = false;
    let compareRes: { data: CompareApiResponse; meta: any } | null = null;

    // 2. Call Clocked Compare API
    try {
      compareRes = await callClocked<CompareApiResponse>("compare", {
        documents: [
          { id: "v1", text: text1 },
          { id: "v2", text: text2 },
        ],
        evidence: "all",
        instructions:
          "These are two versions of the same contract. Find every change in meaning between them, especially obligations, money, dates, renewal, deposits, termination, liability and disputes.",
      });

      if (compareRes) {
        totalCredits += compareRes.meta?.credits || 0;
        if (!compareRes.meta?.cached) allCached = false;
      }
    } catch (err: any) {
      console.warn("Clocked Compare API call failed, falling back to local diff:", err.message);
      meaningUnavailable = true;
      allCached = false;
    }

    // 3. Separate meaning changes vs wording-only changes
    const meaningChanges: MeaningChange[] = [];
    const wordingOnlyChanges: WordingOnlyChange[] = [];

    if (!meaningUnavailable && compareRes?.data) {
      const conflicts = compareRes.data.pairs?.[0]?.conflicts || [];

      for (const pair of changedPairs) {
        // Check if Compare flagged a conflict in this clause
        const matchingConflict = conflicts.find((c) => {
          const quoteA = c.a?.quote || "";
          const quoteB = c.b?.quote || "";
          return (
            (quoteA && pair.beforeText.includes(quoteA)) ||
            (quoteB && pair.afterText.includes(quoteB)) ||
            (quoteA && quoteA.includes(pair.beforeText.slice(0, 30))) ||
            (quoteB && quoteB.includes(pair.afterText.slice(0, 30)))
          );
        });

        // A meaning change is a contractual clause (has clauseNumber) that Compare flagged as a substantive conflict
        const isMeaningChange = Boolean(
          pair.clauseNumber &&
            matchingConflict &&
            matchingConflict.kind !== "date_or_version"
        );

        if (isMeaningChange) {
          meaningChanges.push({
            id: `chg${meaningChanges.length + 1}`,
            clauseNumber: pair.clauseNumber,
            title: pair.title,
            beforeText: pair.beforeText,
            afterText: pair.afterText,
            diff: pair.diff,
            verdict: "worse", // Will be updated by Decide below
            confidence: matchingConflict?.confidence || 0.9,
            compareFinding: {
              kind: matchingConflict?.kind,
              confidence: matchingConflict?.confidence,
            },
            askMessage: buildWhatToAskMessage(
              pair.clauseNumber,
              pair.beforeText,
              pair.afterText
            ),
          });
        } else {
          wordingOnlyChanges.push({
            id: `word_${wordingOnlyChanges.length + 1}`,
            clauseNumber: pair.clauseNumber,
            title: pair.title,
            beforeText: pair.beforeText,
            afterText: pair.afterText,
            diff: pair.diff,
          });
        }
      }
    } else {
      // Meaning check unavailable - everything is wording only diff
      for (const pair of changedPairs) {
        wordingOnlyChanges.push({
          id: `word_${wordingOnlyChanges.length + 1}`,
          clauseNumber: pair.clauseNumber,
          title: pair.title,
          beforeText: pair.beforeText,
          afterText: pair.afterText,
          diff: pair.diff,
        });
      }
    }

    // 4. Call Clocked Decide for each meaning change (up to 12)
    if (meaningChanges.length > 0 && !meaningUnavailable) {
      const decideDocs = meaningChanges.slice(0, 12).map((chg, idx) => ({
        id: `chg${idx + 1}`,
        text: `Before: ${chg.beforeText}\nAfter: ${chg.afterText}`,
      }));

      const decideQuestions: Record<string, any> = {};
      decideDocs.forEach((doc) => {
        decideQuestions[doc.id] = {
          type: "choice",
          document: doc.id,
          instructions:
            "Evaluate whether this change in contract terms is worse for the person signing, neutral (no real difference for them), or better for them.",
          criteria: {
            worse: "worse for the person signing",
            neutral: "no real difference for them",
            better: "better for them",
          },
        };
      });

      try {
        const decideRes = await callClocked<DecideApiResponse>("decide", {
          documents: decideDocs,
          questions: decideQuestions,
        });

        totalCredits += decideRes.meta?.credits || 0;
        if (!decideRes.meta?.cached) allCached = false;

        const answers = decideRes.data?.answers || {};
        for (let idx = 0; idx < meaningChanges.length; idx++) {
          const chg = meaningChanges[idx];
          const ans = answers[chg.id];
          if (ans) {
            chg.verdict = ans.choice || "worse";
            chg.probabilities = ans.probabilities;
            chg.confidence =
              (ans.probabilities && ans.choice ? ans.probabilities[ans.choice] : ans.confidence) ||
              0.85;
            // Update askMessage with fresh text
            chg.askMessage = buildWhatToAskMessage(
              chg.clauseNumber,
              chg.beforeText,
              chg.afterText
            );
          }
        }
      } catch (err: any) {
        console.warn("Clocked Decide call failed on changes:", err.message);
        // Keep default "worse" / "neutral" verdicts
      }
    }

    // 5. Calculate seal color & summary text
    // Red if any change is worse with probability >= 0.6
    // Amber if any change in meaning
    // Green if wording only
    let sealColor: "red" | "amber" | "green" = "green";
    const worseCount = meaningChanges.filter(
      (c) => c.verdict === "worse" && (c.confidence >= 0.6 || (c.probabilities?.worse ?? 0) >= 0.6)
    ).length;

    if (worseCount > 0) {
      sealColor = "red";
    } else if (meaningChanges.length > 0) {
      sealColor = "amber";
    } else if (wordingOnlyChanges.length > 0) {
      sealColor = "green";
    }

    const summaryText =
      meaningChanges.length > 0
        ? `${meaningChanges.length} changes in meaning, ${worseCount} worse for you`
        : wordingOnlyChanges.length > 0
        ? `0 changes in meaning, ${wordingOnlyChanges.length} wording-only changes`
        : `0 changes detected between versions`;

    return NextResponse.json({
      changes: meaningChanges,
      wordingOnlyChanges,
      sealColor,
      summaryText,
      meaningUnavailable,
      meta: {
        credits: totalCredits,
        cached: allCached,
      },
    });
  } catch (err: any) {
    console.error("Error in /api/check/compare:", err);
    return formatApiError(err).response;
  }
}
