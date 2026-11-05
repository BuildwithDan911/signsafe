import { NextRequest, NextResponse } from "next/server";
import { checkDangerMemory } from "@/server/dangerMemory";
import { formatApiError } from "@/server/errors";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      flaggedText = "",
      cleanText = "",
      docType = "contract",
      fillItems = [],
      flags = [],
    } = body;

    // Build the query text from flagged clauses or full clean text
    let queryText = flaggedText;
    if (!queryText.trim() && Array.isArray(fillItems) && fillItems.length > 0) {
      queryText = fillItems
        .map((it: any) => it.quote || it.clause || "")
        .filter(Boolean)
        .join("\n\n");
    }
    if (!queryText.trim()) {
      queryText = cleanText || "";
    }

    const result = await checkDangerMemory(queryText, docType);

    return NextResponse.json({
      matched: result.matched,
      seenCount: result.seenCount,
      docType: result.docType,
      matchedPatternTitle: result.matchedPatternTitle,
      documentQuote: result.documentQuote,
      patternQuote: result.patternQuote,
      in4Signal: result.in4Signal,
    });
  } catch (err: any) {
    return formatApiError(err).response;
  }
}
