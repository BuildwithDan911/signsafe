import { NextRequest, NextResponse } from "next/server";
import { callClocked } from "@/server/clocked";
import { formatApiError } from "@/server/errors";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let text = body.cleanText || body.text || "";

    if (text.length > 60000) {
      text = text.slice(0, 60000);
    }

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

    const res = await callClocked("pii", {
      text,
      anonymize: "replace",
      entities: entitiesMap,
      threshold: 0.5,
    });

    const d = res.data;
    const rawEntities = d.entities || [];
    const formattedEntities = rawEntities.map((e: any) => ({
      type: e.type,
      value: e.value,
      start: e.start,
      end: e.end,
      confidence: e.confidence,
    }));

    const totalCount = Object.values(d.counts || {}).reduce(
      (acc: number, curr: any) => acc + (typeof curr === "number" ? curr : 0),
      0
    );

    return NextResponse.json({
      counts: d.counts || {},
      totalCount: (totalCount as number) || formattedEntities.length,
      entities: formattedEntities,
      anonymized_text: d.anonymized_text || text,
      meta: res.meta,
    });
  } catch (err: any) {
    return formatApiError(err).response;
  }
}
