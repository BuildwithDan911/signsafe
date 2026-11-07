import zlib from "zlib";
import { DocMetadata } from "@/lib/types";

export interface PdfParseResult {
  text: string;
  metadata: DocMetadata;
  pdfBase64: string;
  pageCount: number;
}

function extractRawPdfText(buffer: Buffer): { text: string; pageCount: number } {
  const str = buffer.toString("latin1");
  const extracted: string[] = [];

  // Match text in Tj operations
  const tjRe = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/g;
  let m: RegExpExecArray | null;
  while ((m = tjRe.exec(str)) !== null) {
    extracted.push(m[1].replace(/\\([()\\])/g, "$1"));
  }

  // Decompress flate streams and extract text
  const streamRe = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let sm: RegExpExecArray | null;
  while ((sm = streamRe.exec(str)) !== null) {
    try {
      const decomp = zlib.inflateSync(Buffer.from(sm[1], "latin1")).toString("latin1");
      const subRe = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/g;
      while ((m = subRe.exec(decomp)) !== null) {
        extracted.push(m[1].replace(/\\([()\\])/g, "$1"));
      }
    } catch {
      // not a flate stream, ignore
    }
  }

  // Count pages
  const pageMatches = str.match(/\/Type\s*\/Page\b/g);
  const pageCount = pageMatches ? pageMatches.length : 1;

  return {
    text: extracted.join("\n").trim(),
    pageCount,
  };
}

export async function parsePdf(buffer: Buffer): Promise<PdfParseResult> {
  const pdfBase64 = buffer.toString("base64");
  const uint8Data = new Uint8Array(buffer);

  let text = "";
  let metadata: DocMetadata = {};
  let pageCount = 0;

  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse(uint8Data);
    const textRes = await parser.getText();
    const infoRes = await parser.getInfo();

    const info = infoRes.info || {};
    metadata = {
      author: info.Author || undefined,
      creator: info.Creator || undefined,
      producer: info.Producer || undefined,
      created: info.CreationDate || undefined,
      modified: info.ModDate || undefined,
    };

    text = (textRes.text || "").trim();
    pageCount = infoRes.pages?.length || 0;
  } catch (err: any) {
    console.warn("PDFParse failed, using stream fallback:", err?.message || err);
  }

  // If text is still empty or pageCount is 0, use raw stream extractor
  if (!text || pageCount === 0) {
    const fallback = extractRawPdfText(buffer);
    if (!text) text = fallback.text;
    if (pageCount === 0) pageCount = fallback.pageCount;
  }

  return {
    text,
    metadata,
    pdfBase64,
    pageCount,
  };
}
