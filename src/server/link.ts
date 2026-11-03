import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import { validateSsrfUrl } from "./inspectors";
import { HiddenTextItem, ScriptItem } from "@/lib/types";

export interface LinkParseResult {
  text: string;
  hiddenText: HiddenTextItem[];
  scripts: ScriptItem[];
  title?: string;
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
          Accept: "text/html, text/plain",
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

  // 3. Content-Type check: accept only text/html or text/plain
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
    throw new Error(`This link can't be checked: Unsupported content type (${contentType || "unknown"})`);
  }

  // 4. Read body with 2 MB cap
  const maxBytes = 2 * 1024 * 1024;
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > maxBytes) {
    throw new Error("This link can't be checked: Content exceeds 2 MB limit");
  }

  const rawText = Buffer.from(arrayBuffer).toString("utf-8");

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
  const scripts: ScriptItem[] = [];

  // Extract inline script contents
  const scriptTags = Array.from(document.querySelectorAll("script"));
  for (const scriptEl of scriptTags) {
    const code = (scriptEl.textContent || "").trim();
    if (code) {
      scripts.push({
        origin: "page-script",
        code: code.slice(0, 10000), // Cap long scripts
      });
    }
  }

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

  return {
    text: extractedText,
    hiddenText,
    scripts,
    title: pageTitle,
  };
}
