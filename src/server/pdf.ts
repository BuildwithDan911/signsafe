import { DocMetadata } from "@/lib/types";

export interface PdfParseResult {
  text: string;
  metadata: DocMetadata;
  pdfBase64: string;
}

export async function parsePdf(buffer: Buffer): Promise<PdfParseResult> {
  const pdfBase64 = buffer.toString("base64");
  const uint8Data = new Uint8Array(buffer);

  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse(uint8Data);
    const textRes = await parser.getText();
    const infoRes = await parser.getInfo();

    const info = infoRes.info || {};
    const metadata: DocMetadata = {
      author: info.Author || undefined,
      creator: info.Creator || undefined,
      producer: info.Producer || undefined,
      created: info.CreationDate || undefined,
      modified: info.ModDate || undefined,
    };

    return {
      text: (textRes.text || "").trim(),
      metadata,
      pdfBase64,
    };
  } catch (err: any) {
    // Basic fallback if PDF parsing fails
    return {
      text: "",
      metadata: {},
      pdfBase64,
    };
  }
}
