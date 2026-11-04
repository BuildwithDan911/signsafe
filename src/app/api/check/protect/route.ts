import { NextRequest, NextResponse } from "next/server";
import { callClocked } from "@/server/clocked";
import { formatApiError } from "@/server/errors";
import { splitForClocked, sumChunkCredits } from "@/lib/chunking";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text: string = body.cleanText || body.text || "";
    const chunks = splitForClocked(text);

    const entitiesMap: Record<string, string> = {
      person: "Full names of people",
      email: "Email addresses",
      phone: "Phone numbers",
      address: "Physical addresses or locations",
      date_of_birth: "Dates of birth",
      ssn: "Social security numbers",
      credit_card: "Credit card numbers",
      bank_account: "Bank account or routing numbers",
      passport: "Passport numbers",
      drivers_license: "Driver license numbers",
      national_id:
        "A national identity or tax number such as a BVN, NIN, national insurance number, SIN or Aadhaar",
    };

    const responses = await Promise.all(chunks.map((chunk) =>
      callClocked("pii", {
        text: chunk.text,
        anonymize: "replace",
        entities: entitiesMap,
        threshold: 0.5,
      })
    ));
    const rawEntities = responses.flatMap((response, index) =>
      (response.data.entities || []).map((entity: any) => ({
        ...entity,
        start: typeof entity.start === "number" ? entity.start + chunks[index].start : undefined,
        end: typeof entity.end === "number" ? entity.end + chunks[index].start : undefined,
      }))
    );
    const uniqueEntities = Array.from(new Map(rawEntities.map((entity: any) =>
      [`${entity.type}:${entity.start}:${entity.end}:${entity.value || ""}`, entity]
    )).values());
    const formattedEntities = uniqueEntities.map((e: any) => ({
      type: e.type,
      value: e.value,
      start: e.start,
      end: e.end,
      confidence: e.confidence,
    }));

    const totalCount = uniqueEntities.length;
    const counts = uniqueEntities.reduce((result: Record<string, number>, entity: any) => {
      result[entity.type] = (result[entity.type] || 0) + 1;
      return result;
    }, {});
    let anonymizedText = text;
    for (const entity of [...uniqueEntities].sort((a: any, b: any) => (b.start ?? 0) - (a.start ?? 0)) as any[]) {
      if (typeof entity.start === "number" && typeof entity.end === "number" && entity.start >= 0 && entity.end <= anonymizedText.length) {
        anonymizedText = anonymizedText.slice(0, entity.start) + `[${String(entity.type).toUpperCase()}]` + anonymizedText.slice(entity.end);
      } else if (entity.value) {
        anonymizedText = anonymizedText.split(String(entity.value)).join(`[${String(entity.type).toUpperCase()}]`);
      }
    }

    return NextResponse.json({
      counts,
      totalCount,
      entities: formattedEntities,
      anonymized_text: anonymizedText,
      sectionsChecked: chunks.length,
      meta: chunks.length > 1 ? sumChunkCredits(responses) : responses[0].meta,
    });
  } catch (err: any) {
    return formatApiError(err).response;
  }
}
