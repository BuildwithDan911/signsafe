import { NextRequest, NextResponse } from "next/server";
import { callClocked } from "@/server/clocked";
import { formatApiError } from "@/server/errors";
import { checkRateLimit } from "@/server/store";
import { splitForClocked, sumChunkCredits } from "@/lib/chunking";
import { validateBody, TextBodySchema } from "@/lib/validation";

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
    const rl = await checkRateLimit(ip, 60, 3600, "ratelimit:step:");
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
    const validation = validateBody(TextBodySchema, body);
    if ("error" in validation) return validation.error;
    const text: string = validation.data.cleanText || validation.data.text || "";
    const chunks = splitForClocked(text);

    const fieldsSchema: Record<string, unknown> = {
      issuer_name: "the organisation the document claims to come from",
      issuer_registration_number: "company registration or business number",
      issuer_address: "official or registered address of the issuer",
      signatory_name: "name of the person signing or issuing the document",
      signatory_role: "title or role of the signatory",
      recipient_greeting: "the exact greeting line, such as Dear Candidate",
      contact_emails: {
        description: "email addresses for contact",
        list: true,
        format: "email",
      },
      contact_phones: {
        description: "phone numbers for contact",
        list: true,
        format: "phone",
      },
      document_type: "the name or type of agreement, document, or transaction described",
      party_names: {
        description: "names of the parties to this agreement",
        list: true,
        max_items: 6,
      },
      chat_apps_or_handles: {
        description: "any Telegram, WhatsApp, Signal or social handle mentioned",
        list: true,
      },
      links: {
        description: "links and websites mentioned",
        list: true,
        format: "url",
      },
      payments_you_make: {
        description:
          "every fee, deposit or amount the reader must pay, with what it is for",
        list: true,
      },
      pay_you_receive: "the pay, fee or amount the reader receives, and how often",
      payment_methods: {
        description: "payment methods requested, such as wire, crypto, card, cash",
        list: true,
      },
      bank_account_name: "account holder name for payments",
      bank_details: "bank name, sort code, account number or routing info",
      deadline_to_sign_or_pay: "deadline date or time window to sign or make payment",
      start_date: "start date of employment, tenancy or engagement",
      term_or_end_date: "duration, end date or term of the contract",
      notice_or_termination: "notice period or conditions for termination",
      governing_law: "governing law or jurisdiction",
      verification_route: "how the document tells the reader to confirm it is genuine",
      personal_data_requested: {
        description:
          "personal or financial details the document asks the reader to send",
        list: true,
      },
      commands_to_run: {
        description: "command lines or software instructions to execute",
        list: true,
        format: "code",
      },
    };

    const responses = await Promise.all(chunks.map((chunk) =>
      callClocked("extract", { text: chunk.text, fields: fieldsSchema })
    ));
    const formattedFields: Record<string, unknown> = {};

    for (const key of Object.keys(fieldsSchema)) {
      const matches = responses.flatMap((response, index) => {
        const field = response.data.fields?.[key];
        if (!field) return [];
        return [{ field, offset: chunks[index].start }];
      });
      const isList = typeof fieldsSchema[key] === "object" && fieldsSchema[key] !== null && (fieldsSchema[key] as { list?: boolean }).list;
      if (isList) {
        const values: unknown[] = [];
        const items: unknown[] = [];
        for (const { field, offset } of matches) {
          const sourceValues = Array.isArray(field.value) ? field.value : field.value == null ? [] : [field.value];
          for (const value of sourceValues) {
            const normalized = typeof value === "string" ? value.trim() : value;
            if (normalized != null && !values.includes(normalized)) values.push(normalized);
          }
          for (const item of field.items || []) {
            items.push({
              ...item,
              start: typeof item.start === "number" ? item.start + offset : item.start,
              end: typeof item.end === "number" ? item.end + offset : item.end,
            });
          }
        }
        formattedFields[key] = { value: values.length ? values : null, start: (items[0] as { start?: number })?.start, end: (items[0] as { end?: number })?.end, items };
      } else {
        const { field, offset } = matches.find(({ field }) => field.value != null) || matches[0] || { field: {} as { start?: number; end?: number; confidence?: number }, offset: 0 };
        formattedFields[key] = {
          value: field.value ?? null,
          start: typeof field.start === "number" ? field.start + offset : field.start,
          end: typeof field.end === "number" ? field.end + offset : field.end,
          confidence: field.confidence,
          items: field.items,
        };
      }
    }

    return NextResponse.json({
      fields: formattedFields,
      sectionsChecked: chunks.length,
      meta: chunks.length > 1 ? sumChunkCredits(responses) : responses[0].meta,
    });
  } catch (err) {
    return formatApiError(err).response;
  }
}
