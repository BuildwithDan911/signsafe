import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { SignDoc } from "@/lib/types";
import { fetchAndParseLink } from "@/server/link";
import { findCommandLines, findEmails } from "@/server/inspectors";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const urlStr = (body.url || "").trim();

    if (!urlStr) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    // fetchAndParseLink enforces SSRF checks, redirects, timeout, and 2 MB limit
    const parsed = await fetchAndParseLink(urlStr);

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

    const signDoc: SignDoc = {
      id: crypto.randomUUID(),
      sourceType: "link",
      fileName: parsed.title ? `${parsed.title.slice(0, 50)} (Web Page)` : urlStr,
      text: fullText,
      hiddenText: parsed.hiddenText,
      fileSignals: [],
      scripts,
      metadata: {},
      emails,
    };

    return NextResponse.json({ signDoc });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to fetch link" },
      { status: 400 }
    );
  }
}
