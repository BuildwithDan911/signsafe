import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { SignDoc, FileSignalItem, SourceType } from "@/lib/types";
import { parseDocx } from "@/server/docx";
import { parsePdf } from "@/server/pdf";
import { findCommandLines, findEmails, findHiddenInText } from "@/server/inspectors";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let text = "";
    let fileName = "pasted-document.txt";
    let sourceType: SourceType = "paste";
    let fileSignals: FileSignalItem[] = [];
    let scripts: any[] = [];
    let metadata: any = {};
    let hiddenText: any[] = [];
    let pdfBase64: string | undefined = undefined;

    // Check for JSON payload (pasted text or direct OCR text)
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const rawText = body.text || "";
      sourceType = body.sourceType || "paste";
      fileName = body.fileName || (sourceType === "photo" ? "scanned-contract.jpg" : "pasted-document.txt");

      if (rawText.length > 200000) {
        return NextResponse.json(
          { error: "Text exceeds 200,000 character limit" },
          { status: 413 }
        );
      }

      text = rawText;
      hiddenText = findHiddenInText(text);

      if (body.photoBase64) {
        // Optional photo base64
      }
    } else {
      // Multipart form upload
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      if (file.size > 3 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File exceeds 3 MB limit (max upload size is 3 MB)" },
          { status: 413 }
        );
      }

      fileName = file.name;
      const lowerName = fileName.toLowerCase();
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Program / archive extension blocker
      const dangerousExts = [".exe", ".scr", ".js", ".vbs", ".lnk", ".bat", ".ps1", ".iso", ".zip"];
      const isDangerous = dangerousExts.some((ext) => lowerName.endsWith(ext));

      if (isDangerous) {
        const signDoc: SignDoc = {
          id: crypto.randomUUID(),
          sourceType: "text",
          fileName,
          text: `[File blocked: ${fileName}]`,
          hiddenText: [],
          fileSignals: [
            {
              id: "FM3",
              note: `Dangerous file type (${fileName}). A real contract is never sent as an executable, script, or archive.`,
            },
          ],
          scripts: [],
          metadata: {},
          emails: [],
        };
        return NextResponse.json({
          signDoc,
          warning: "A real contract is never sent as a program or archive.",
        });
      }

      if (lowerName.endsWith(".docx") || lowerName.endsWith(".docm") || lowerName.endsWith(".doc")) {
        sourceType = "docx";
        const docxRes = await parseDocx(buffer, fileName);
        text = docxRes.text;
        hiddenText = docxRes.hiddenText;
        fileSignals = docxRes.fileSignals;
        scripts = docxRes.scripts;
        metadata = docxRes.metadata;
      } else if (lowerName.endsWith(".pdf")) {
        sourceType = "pdf";
        const pdfRes = await parsePdf(buffer);
        text = pdfRes.text;
        metadata = pdfRes.metadata;
        pdfBase64 = pdfRes.pdfBase64;
      } else {
        // Plain text / Markdown / other text
        sourceType = "text";
        text = buffer.toString("utf-8");
        hiddenText = findHiddenInText(text);
      }
    }

    // In every text: find command lines
    const foundCommands = findCommandLines(text);
    for (const cmd of foundCommands) {
      if (!scripts.some((s) => s.code === cmd.code)) {
        scripts.push(cmd);
      }
    }

    // In every text: find emails and flag free webmail
    const emails = findEmails(text);

    // If metadata author exists and is an email, add to emails as well
    if (metadata.author && metadata.author.includes("@")) {
      const authorEmails = findEmails(metadata.author);
      for (const ae of authorEmails) {
        if (!emails.some((e) => e.email === ae.email)) {
          emails.push(ae);
        }
      }
    }

    // Where hidden text exists, append it to the end of text under a line
    // "[Hidden text found in this file]" so later steps can see it
    let fullText = text;
    if (hiddenText.length > 0) {
      const hiddenBlock = hiddenText.map((h) => h.text).join("\n");
      fullText = `${text}\n\n[Hidden text found in this file]\n${hiddenBlock}`;
    }

    const signDoc: SignDoc = {
      id: crypto.randomUUID(),
      sourceType,
      fileName,
      text: fullText,
      hiddenText,
      fileSignals,
      scripts,
      metadata,
      emails,
      pdfBase64,
    };

    return NextResponse.json({ signDoc });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to parse document" },
      { status: 500 }
    );
  }
}
