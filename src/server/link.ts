import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import { validateSsrfUrl } from "./inspectors";
import { parsePdf } from "./pdf";
import { DocMetadata, HiddenTextItem, ScriptItem } from "@/lib/types";

export interface LinkParseResult {
  text: string;
  hiddenText: HiddenTextItem[];
  scripts: ScriptItem[];
  title?: string;
  pdfBase64?: string;
  pdfPageCount?: number;
  metadata?: DocMetadata;
}

export async function fetchAndParseLink(initialUrl: string): Promise<LinkParseResult> {
  let currentUrl = initialUrl;
  let redirectsRemaining = 3;
  let response: Response | null = null;

  while (true) {
    // 1. Strict SSRF check on URL
    const ssrfCheck = await validateSsrfUrl(currentUrl);
    if (!ssrfCheck.valid) {
      throw new Error(`This link can't be checked: ${ssrfCheck.error}`);
    }

    // 2. Fetch with 8-second timeout, redirect manual
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      response = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "User-Agent": "SignSafe-Audit/1.0 (Document Reviewer; +https://signsafe.org)",
          Accept: "application/pdf, text/html, text/plain;q=0.9, */*;q=0.1",
        },
      });
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error("This link can't be checked: Connection timed out (8s limit)");
      }
      throw new Error(`This link can't be checked: ${err.message}`);
    } finally {
      clearTimeout(timeout);
    }

    // Handle redirects
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error("This link can't be checked: Redirect with no location header");
      }
      if (redirectsRemaining <= 0) {
        throw new Error("This link can't be checked: Too many redirects (max 3)");
      }
      redirectsRemaining--;
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    break;
  }

  if (!response || !response.ok) {
    throw new Error(`This link can't be checked: HTTP ${response?.status || "error"}`);
  }

  // 3. Read a bounded response, then identify PDFs by their actual file signature.
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  const maxBytes = 2 * 1024 * 1024;
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > maxBytes) {
    throw new Error("This link can't be checked: Content exceeds 2 MB limit");
  }

  const buffer = Buffer.from(arrayBuffer);
  const isPdf = buffer.subarray(0, 5).toString("ascii") === "%PDF-";

  if (isPdf) {
    const parsedPdf = await parsePdf(buffer);
    if (parsedPdf.pageCount > 4) {
      throw new Error(`This PDF has ${parsedPdf.pageCount} pages. SignSafe supports PDFs up to 4 pages. Split it into files of 4 pages or fewer and check each section separately.`);
    }
    if (!parsedPdf.text.trim()) {
      throw new Error("This PDF link has no readable text layer. Download it and use Upload file so SignSafe can run OCR on its pages.");
    }
    return {
      text: parsedPdf.text,
      hiddenText: [],
      scripts: [],
      pdfBase64: parsedPdf.pdfBase64,
      pdfPageCount: parsedPdf.pageCount,
      metadata: parsedPdf.metadata,
    };
  }

  if (contentType.includes("application/pdf") || /\.pdf(?:$|[?#])/i.test(currentUrl)) {
    throw new Error("This link returned a web page instead of the PDF file. Try the direct PDF download link, or download it and use Upload file.");
  }

  if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
    throw new Error(`This link can't be checked: Unsupported content type (${contentType || "unknown"})`);
  }

  const rawText = buffer.toString("utf-8");

  if (contentType.includes("text/plain")) {
    return {
      text: rawText.trim(),
      hiddenText: [],
      scripts: [],
    };
  }

  // 5. Parse HTML with linkedom
  const { document } = parseHTML(rawText);
  const hiddenText: HiddenTextItem[] = [];
  // Website JavaScript belongs to the site, not to the document being reviewed.
  // Do not send page bundles, analytics, or asset manifests to Inspect.

  // Find hidden elements
  const allElements = Array.from(document.querySelectorAll("*"));
  for (const el of allElements) {
    const style = (el.getAttribute("style") || "").toLowerCase();
    const isHiddenAttr = el.hasAttribute("hidden");
    const isDisplayNone = style.includes("display:none") || style.includes("display: none");
    const isVisHidden = style.includes("visibility:hidden") || style.includes("visibility: hidden");
    const isWhite =
      style.includes("color:#fff") ||
      style.includes("color: #fff") ||
      style.includes("color:white") ||
      style.includes("color: white") ||
      style.includes("color:#ffffff") ||
      style.includes("color: #ffffff");
    const isTiny = style.includes("font-size:1px") || style.includes("font-size:0") || style.includes("opacity:0");

    if (isHiddenAttr || isDisplayNone || isVisHidden || isWhite || isTiny) {
      const text = (el.textContent || "").trim();
      if (text && el.tagName !== "SCRIPT" && el.tagName !== "STYLE") {
        const reasons: string[] = [];
        if (isWhite) reasons.push("white text");
        if (isTiny) reasons.push("tiny font/opacity 0");
        if (isDisplayNone || isHiddenAttr) reasons.push("display:none/hidden attribute");
        if (isVisHidden) reasons.push("visibility:hidden");

        const existing = hiddenText.find((h) => h.text === text);
        if (!existing) {
          hiddenText.push({
            text,
            reason: reasons.join(", "),
          });
        }
      }
    }
  }

  // Extract readable text with Readability
  let extractedText = "";
  let pageTitle = "";
  try {
    const reader = new Readability(document);
    const parsed = reader.parse();
    if (parsed && parsed.textContent) {
      extractedText = parsed.textContent.trim();
      pageTitle = parsed.title || "";
    }
  } catch {
    // Fallback to body textContent
  }

  if (!extractedText) {
    // Fallback: strip script and style tags and take body text
    const cleanDoc = parseHTML(rawText).document;
    const toRemove = Array.from(cleanDoc.querySelectorAll("script, style, noscript, svg"));
    toRemove.forEach((n) => n.remove());
    extractedText = (cleanDoc.body?.textContent || "").replace(/\s+/g, " ").trim();
  }

  if (!extractedText.trim()) {
    throw new Error("This page has no readable document text. Try a direct document link or upload the file.");
  }

  return {
    text: extractedText,
    hiddenText,
    scripts: [],
    title: pageTitle,
  };
}
