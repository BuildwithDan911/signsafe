import { NextRequest, NextResponse } from "next/server";
import { callClocked } from "@/server/clocked";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let text = body.cleanText || body.text || "";

    if (text.length > 200000) {
      text = text.slice(0, 200000);
    }

    const fieldsSchema: Record<string, any> = {
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

    const res = await callClocked("extract", {
      text,
      fields: fieldsSchema,
    });

    const d = res.data;
    const rawFields = d.fields || {};
    const formattedFields: Record<string, any> = {};

    for (const [key, fieldData] of Object.entries<any>(rawFields)) {
      formattedFields[key] = {
        value: fieldData.value ?? null,
        start: fieldData.start,
        end: fieldData.end,
        confidence: fieldData.confidence,
        items: fieldData.items,
      };
    }

    return NextResponse.json({
      fields: formattedFields,
      meta: res.meta,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Extract check failed" },
      { status: 500 }
    );
  }
}
