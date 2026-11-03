import JSZip from "jszip";
import mammoth from "mammoth";
import { DocMetadata, FileSignalItem, HiddenTextItem, ScriptItem } from "@/lib/types";
import { extractVbaFromBinary } from "./vba";

export interface DocxParseResult {
  text: string;
  hiddenText: HiddenTextItem[];
  fileSignals: FileSignalItem[];
  scripts: ScriptItem[];
  metadata: DocMetadata;
}

export async function parseDocx(buffer: Buffer, fileName: string): Promise<DocxParseResult> {
  // 1. Extract visible text using mammoth
  let visibleText = "";
  try {
    const mammothRes = await mammoth.extractRawText({ buffer });
    visibleText = mammothRes.value.trim();
  } catch (err: any) {
    visibleText = "";
  }

  // 2. Open ZIP structure with JSZip
  const zip = await JSZip.loadAsync(buffer);

  const hiddenText: HiddenTextItem[] = [];
  const fileSignals: FileSignalItem[] = [
    {
      id: "FM1",
      note: "Editable .docx Word file",
    },
  ];
  const scripts: ScriptItem[] = [];
  const metadata: DocMetadata = {};

  // 3. Inspect word/document.xml for hidden/tiny/white runs
  const docXmlFile = zip.file("word/document.xml");
  if (docXmlFile) {
    const docXml = await docXmlFile.async("text");
    const runRegex = /<w:r\b[\s\S]*?<\/w:r>/g;
    let match: RegExpExecArray | null;

    while ((match = runRegex.exec(docXml)) !== null) {
      const runXml = match[0];
      const isVanish = /<w:vanish\b/i.test(runXml);
      const isWhite = /<w:color[^>]+w:val=["'](?:ffffff|fffffe|white)["']/i.test(runXml);
      const szMatch = runXml.match(/<w:sz[^>]+w:val=["'](\d+)["']/i);
      const halfPoints = szMatch ? parseInt(szMatch[1], 10) : 24;
      const isTiny = halfPoints <= 4; // 2pt or less (sz is in half-points)

      if (isVanish || isWhite || isTiny) {
        // Extract text inside this run: <w:t ...>text</w:t>
        const textMatches = runXml.match(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g);
        if (textMatches) {
          const runText = textMatches
            .map((t) => t.replace(/<[^>]+>/g, ""))
            .join("")
            .trim();

          if (runText) {
            const reasons: string[] = [];
            if (isVanish) reasons.push("Word hidden text (w:vanish)");
            if (isWhite) reasons.push("white or near-white text (colour FFFFFF)");
            if (isTiny) reasons.push(`tiny font size (${halfPoints / 2}pt)`);

            // Deduplicate or combine
            const existing = hiddenText.find((h) => h.text === runText);
            if (!existing) {
              hiddenText.push({
                text: runText,
                reason: reasons.join(", "),
              });
            }
          }
        }
      }
    }
  }

  // 4. Inspect docProps/core.xml for author, dates, lastModifiedBy
  const coreFile = zip.file("docProps/core.xml");
  if (coreFile) {
    const coreXml = await coreFile.async("text");
    const creatorMatch = coreXml.match(/<dc:creator\b[^>]*>([\s\S]*?)<\/dc:creator>/i);
    if (creatorMatch) metadata.author = creatorMatch[1].trim();

    const lastModMatch = coreXml.match(/<cp:lastModifiedBy\b[^>]*>([\s\S]*?)<\/cp:lastModifiedBy>/i);
    if (lastModMatch) metadata.lastModifiedBy = lastModMatch[1].trim();

    const createdMatch = coreXml.match(/<dcterms:created\b[^>]*>([\s\S]*?)<\/dcterms:created>/i);
    if (createdMatch) metadata.created = createdMatch[1].trim();

    const modifiedMatch = coreXml.match(/<dcterms:modified\b[^>]*>([\s\S]*?)<\/dcterms:modified>/i);
    if (modifiedMatch) metadata.modified = modifiedMatch[1].trim();
  }

  // 5. Inspect docProps/app.xml for company
  const appFile = zip.file("docProps/app.xml");
  if (appFile) {
    const appXml = await appFile.async("text");
    const companyMatch = appXml.match(/<Company\b[^>]*>([\s\S]*?)<\/Company>/i);
    if (companyMatch && companyMatch[1].trim()) metadata.company = companyMatch[1].trim();
    const appMatch = appXml.match(/<Application\b[^>]*>([\s\S]*?)<\/Application>/i);
    if (appMatch && appMatch[1].trim()) metadata.producer = appMatch[1].trim();
  }

  // 6. Check for word/vbaProject.bin (VBA macros)
  const vbaFile = zip.file("word/vbaProject.bin");
  if (vbaFile) {
    fileSignals.push({
      id: "FM2",
      note: "Macro-enabled Word document contains word/vbaProject.bin",
    });

    const vbaBuffer = await vbaFile.async("nodebuffer");
    const vbaResult = extractVbaFromBinary(vbaBuffer);
    scripts.push(vbaResult);
  }

  return {
    text: visibleText,
    hiddenText,
    fileSignals,
    scripts,
    metadata,
  };
}
