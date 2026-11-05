import { NextRequest, NextResponse } from "next/server";
import { contributeDangerPattern } from "@/server/dangerMemory";
import { scrubEntityValues } from "@/server/share";
import { formatApiError } from "@/server/errors";
import { checkRateLimit } from "@/server/store";
import { validateBody, DangerMemoryContributeSchema } from "@/lib/validation";

export const maxDuration = 60;
export const runtime = "nodejs";

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
    const validation = validateBody(DangerMemoryContributeSchema, body);
    if ("error" in validation) return validation.error;
    const {
      redactedSnippet = "",
      cleanText = "",
      docType = "contract",
      flagIds = [],
      entities = [],
    } = validation.data;

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
