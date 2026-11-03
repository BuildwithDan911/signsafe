import { NextRequest, NextResponse } from "next/server";
import { contributeDangerPattern } from "@/server/dangerMemory";
import { scrubEntityValues } from "@/server/share";
import { formatApiError } from "@/server/errors";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      redactedSnippet = "",
      cleanText = "",
      docType = "contract",
      flagIds = [],
      entities = [],
    } = body;

    // Security rule 4: NEVER store original text.
    // Scrub any remaining entity values before saving to danger memory
    const rawSnippet = (redactedSnippet || cleanText || "").slice(0, 1500);
    const scrubbedSnippet = scrubEntityValues(rawSnippet, entities);

    const result = await contributeDangerPattern(
      scrubbedSnippet,
      docType,
      flagIds
    );

    return NextResponse.json({
      success: true,
      newCount: result.newCount,
    });
  } catch (err: any) {
    return formatApiError(err).response;
  }
}
