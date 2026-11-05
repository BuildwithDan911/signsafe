import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { SignDoc } from "@/lib/types";
import { fetchAndParseLink } from "@/server/link";
import { findCommandLines, findEmails } from "@/server/inspectors";
import { isClearlyUnrelatedText, NON_CONTRACT_MESSAGE } from "@/lib/document-kind";
import { validateBody, ReadLinkSchema } from "@/lib/validation";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = validateBody(ReadLinkSchema, body);
    if ("error" in validation) return validation.error;
    const { url } = validation.data;

    // fetchAndParseLink enforces SSRF checks, redirects, timeout, and 2 MB limit
    const parsed = await fetchAndParseLink(url);

    if (isClearlyUnrelatedText(parsed.text)) {
      return NextResponse.json(
        { error: NON_CONTRACT_MESSAGE, code: "NO_CONTRACT_TEXT" },
        { status: 422 }
      );
    }

    let fullText = parsed.text;
    if (parsed.hiddenText.length > 0) {
      const hiddenBlock = parsed.hiddenText.map((h) => h.text).join("\n");
      fullText = `${parsed.text}\n\n[Hidden text found in this file]\n${hiddenBlock}`;
    }

    const scripts = [...parsed.scripts];
    const foundCommands = findCommandLines(parsed.text);
    for (const cmd of foundCommands) {
      if (!scripts.some((s) => s.code === cmd.code)) {
        scripts.push(cmd);
      }
    }

    const emails = findEmails(parsed.text);
    const linkedName = parsed.pdfBase64
      ? new URL(url).pathname.split("/").filter(Boolean).pop() || "linked-document.pdf"
      : undefined;
    const pdfFileName = linkedName && /\.pdf$/i.test(linkedName)
      ? linkedName
      : linkedName ? `${linkedName}.pdf` : undefined;

    const signDoc: SignDoc = {
      id: crypto.randomUUID(),
      sourceType: parsed.pdfBase64 ? "pdf" : "link",
      fileName: parsed.pdfBase64
        ? pdfFileName || "linked-document.pdf"
        : parsed.title ? `${parsed.title.slice(0, 50)} (Web Page)` : url,
      text: fullText,
      hiddenText: parsed.hiddenText,
      fileSignals: [],
      scripts,
      metadata: parsed.metadata || {},
      emails,
      pdfBase64: parsed.pdfBase64,
      pdfPageCount: parsed.pdfPageCount,
    };

    return NextResponse.json({ signDoc });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch link" },
      { status: 400 }
    );
  }
}
