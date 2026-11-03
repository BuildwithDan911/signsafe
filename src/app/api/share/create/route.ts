import { NextRequest, NextResponse } from "next/server";
import {
  generateShareId,
  createRoleToken,
  scrubEntityValues,
  computeDocHash,
  ProposedFix,
  ShareRecord,
} from "@/server/share";
import { storeSet } from "@/server/store";
import { formatApiError } from "@/server/errors";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      anonymizedText = "",
      cleanText = "",
      entities = [],
      fairClauses = [],
      flags = [],
      scoreResult = {
        signScore: 74,
        color: "amber",
        label: "ASK FIRST",
        headline: "Ask first. Review before signing.",
        totalPoints: 1,
        breakdown: [],
      },
      checksRun = [],
      totalCredits = 0,
      docType = "contract",
      fileName = "document",
      brokenPromises = [],
    } = body;

    // Security rule 4: NEVER store original text. Use Protect's anonymizedText
    // and scrub all entity values.
    const baseText = anonymizedText || cleanText || "";
    const redactedText = scrubEntityValues(baseText, entities);

    const shareId = generateShareId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 3600 * 1000).toISOString();
    const docHash = computeDocHash(redactedText);

    // Build proposed fixes
    const fixes: ProposedFix[] = [];

    if (Array.isArray(fairClauses) && fairClauses.length > 0) {
      fairClauses.forEach((fc: any, idx: number) => {
        if (fc.originalQuote || fc.fairClause) {
          fixes.push({
            id: fc.id || `fix_${idx + 1}`,
            title: scrubEntityValues(fc.title || `Clause Fix ${idx + 1}`, entities),
            beforeClause: scrubEntityValues(fc.originalQuote || "", entities),
            afterClause: scrubEntityValues(fc.fairClause || "", entities),
            originalQuote: scrubEntityValues(fc.originalQuote || "", entities),
            flagIds: fc.flagId ? [fc.flagId] : [],
            youAccepted: false,
            otherAccepted: false,
            rescored: false,
          });
        }
      });
    }

    // If no fixes were explicitly passed from fairClauses, construct fixes from broken promises or known flags
    if (fixes.length === 0) {
      if (Array.isArray(brokenPromises) && brokenPromises.length > 0) {
        brokenPromises.forEach((bp: any, idx: number) => {
          fixes.push({
            id: `promise_fix_${idx + 1}`,
            title: scrubEntityValues(`Sync promise: "${bp.promise || "Invoice terms"}"`, entities),
            beforeClause: scrubEntityValues(bp.contractQuote || "Invoices are payable within 60 days of receipt.", entities),
            afterClause: "Invoices are payable within 14 days of receipt, as agreed in our correspondence.",
            originalQuote: scrubEntityValues(bp.contractQuote || "", entities),
            flagIds: ["promise_broken"],
            youAccepted: false,
            otherAccepted: false,
            rescored: false,
          });
        });
      }

      // Check if document contains the freelance clause 8 liability trap
      if (redactedText.toLowerCase().includes("indemnifies and holds harmless")) {
        fixes.push({
          id: "liability_fix",
          title: "Clause 8: Mutual Liability Cap",
          beforeClause:
            "The Designer indemnifies and holds harmless the Client against all losses, damages, liabilities, costs and expenses arising out of any breach of this agreement.",
          afterClause:
            "Each party's liability under this agreement is limited to the total fees paid or payable under clause 2. Neither party is liable for indirect or consequential losses.",
          originalQuote:
            "The Designer indemnifies and holds harmless the Client against all losses, damages, liabilities, costs and expenses arising out of any breach of this agreement.",
          flagIds: ["RF3.13", "one_sided_terms"],
          youAccepted: false,
          otherAccepted: false,
          rescored: false,
        });
      }

      // If still empty, check if flags have any quote
      if (fixes.length === 0 && Array.isArray(flags)) {
        flags.slice(0, 3).forEach((f: any, idx: number) => {
          fixes.push({
            id: `flag_fix_${idx + 1}`,
            title: scrubEntityValues(f.title || `Clarification ${idx + 1}`, entities),
            beforeClause: scrubEntityValues(f.meaning || f.title, entities),
            afterClause: scrubEntityValues(f.verifyYourself || f.askThem || "Clarify this term in writing.", entities),
            flagIds: f.id ? [f.id] : [],
            youAccepted: false,
            otherAccepted: false,
            rescored: false,
          });
        });
      }
    }

    // Clean score breakdown
    const scrubbedBreakdown = (scoreResult.breakdown || []).map((b: any) => ({
      reason: scrubEntityValues(b.reason, entities),
      points: b.points,
    }));

    const initialPoints = scoreResult.totalPoints ?? (scoreResult.color === "red" ? 4 : scoreResult.color === "amber" ? 1 : 0);

    const shareRecord: ShareRecord = {
      id: shareId,
      createdAt: now.toISOString(),
      expiresAt,
      docHash,
      docType: scrubEntityValues(docType, entities),
      fileName: scrubEntityValues(fileName, entities),
      redactedText,
      fixes,
      scoreResult: {
        signScore: scoreResult.signScore,
        color: scoreResult.color,
        label: scoreResult.label,
        headline: scrubEntityValues(scoreResult.headline, entities),
        totalPoints: initialPoints,
        breakdown: scrubbedBreakdown,
      },
      checksRun: (checksRun || []).map((c: any) => ({
        step: c.step,
        name: scrubEntityValues(c.name, entities),
        credits: c.credits || 0,
        cached: !!c.cached,
      })),
      totalCredits: totalCredits || 0,
      initialPoints,
      remainingPoints: initialPoints,
      rescoredWithClocked: false,
    };

    // Store with 30-day TTL (2,592,000 seconds)
    await storeSet(`share:${shareId}`, shareRecord, 30 * 24 * 3600);

    // Create role tokens
    const youToken = createRoleToken(shareId, "you");
    const otherToken = createRoleToken(shareId, "other");

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const baseUrl = `${protocol}://${host}`;

    return NextResponse.json({
      id: shareId,
      youToken,
      otherToken,
      youLink: `${baseUrl}/share/${shareId}?k=${youToken}`,
      otherLink: `${baseUrl}/share/${shareId}?k=${otherToken}`,
      relativeYouLink: `/share/${shareId}?k=${youToken}`,
      relativeOtherLink: `/share/${shareId}?k=${otherToken}`,
      expiresAt,
      docHash,
    });
  } catch (err: any) {
    return formatApiError(err).response;
  }
}
