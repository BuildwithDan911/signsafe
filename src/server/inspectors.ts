import dns from "dns/promises";
import { EmailItem, HiddenTextItem, ScriptItem } from "@/lib/types";

export const FREE_WEBMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.fr",
  "outlook.com",
  "hotmail.com",
  "hotmail.co.uk",
  "live.com",
  "aol.com",
  "icloud.com",
  "zohomail.com",
  "zoho.com",
  "proton.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "gmx.net",
  "yandex.com",
  "yandex.ru",
  "mail.com",
]);

/**
 * Checks whether an IP address is private, loopback, link-local, multicast, or cloud metadata.
 */
export function isPrivateOrBlockedIp(ip: string): boolean {
  const cleanIp = ip.trim().toLowerCase();

  // IPv6 checks
  if (cleanIp === "::1" || cleanIp === "::" || cleanIp === "0:0:0:0:0:0:0:1") {
    return true; // IPv6 loopback
  }
  if (cleanIp.startsWith("fc") || cleanIp.startsWith("fd")) {
    return true; // fc00::/7 unique local
  }
  if (cleanIp.startsWith("fe8") || cleanIp.startsWith("fe9") || cleanIp.startsWith("fea") || cleanIp.startsWith("feb")) {
    return true; // fe80::/10 link-local
  }
  if (cleanIp.startsWith("ff")) {
    return true; // multicast
  }

  // IPv4 checks
  const ipv4Match = cleanIp.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4Match) {
    return false;
  }

  const [_, aStr, bStr, cStr, dStr] = ipv4Match;
  const a = parseInt(aStr, 10);
  const b = parseInt(bStr, 10);
  const c = parseInt(cStr, 10);
  const d = parseInt(dStr, 10);

  if (a > 255 || b > 255 || c > 255 || d > 255) return true;

  // 0.0.0.0/8
  if (a === 0) return true;

  // 10.0.0.0/8
  if (a === 10) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 169.254.0.0/16 (Link-local & AWS/GCP/Azure Cloud Metadata)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 (172.16.x.x - 172.31.x.x)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;

  // 224.0.0.0/4 (Multicast 224-239)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved / Broadcast)
  if (a >= 240) return true;

  return false;
}

/**
 * Validates a URL against strict SSRF rules before fetching.
 */
export async function validateSsrfUrl(urlStr: string): Promise<{ valid: boolean; error?: string; resolvedIp?: string }> {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { valid: false, error: "Only http and https protocols are allowed" };
    }

    const hostname = url.hostname;

    // Check direct IP address in hostname
    if (isPrivateOrBlockedIp(hostname)) {
      return { valid: false, error: "Access to private, loopback, or metadata addresses is blocked" };
    }

    // Resolve domain to IP addresses
    try {
      const records = await dns.lookup(hostname, { all: true });
      for (const rec of records) {
        if (isPrivateOrBlockedIp(rec.address)) {
          return {
            valid: false,
            error: `Hostname ${hostname} resolves to blocked address ${rec.address}`,
            resolvedIp: rec.address,
          };
        }
      }
      return { valid: true, resolvedIp: records[0]?.address };
    } catch (dnsErr: any) {
      return { valid: false, error: `DNS resolution failed: ${dnsErr.message}` };
    }
  } catch (err: any) {
    return { valid: false, error: `Invalid URL: ${err.message}` };
  }
}

/**
 * Finds command lines that ask someone to run commands.
 */
export function findCommandLines(text: string): ScriptItem[] {
  const scripts: ScriptItem[] = [];
  const lines = text.split(/\r?\n/);
  const triggerKeywords = [
    "npm install",
    "npm i ",
    "npx ",
    "pip install",
    "curl ",
    "wget ",
    "git clone",
    "powershell",
    "bash -c",
    "run this command",
  ];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    const matched = triggerKeywords.some((kw) => lower.includes(kw));

    if (matched) {
      // Clean leading markdown quotes, bullets, ticks
      const cleanCode = line.replace(/^[>`*\-+\s]+/, "").replace(/^`|`$/g, "").trim();
      if (cleanCode && !scripts.some((s) => s.code === cleanCode)) {
        scripts.push({
          origin: "command",
          code: cleanCode,
        });
      }
    }
  }

  return scripts;
}

/**
 * Extracts all email addresses and flags free webmail addresses.
 */
export function findEmails(text: string): EmailItem[] {
  const emails: EmailItem[] = [];
  const seen = new Set<string>();

  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  let match: RegExpExecArray | null;

  while ((match = emailRegex.exec(text)) !== null) {
    const rawEmail = match[1].toLowerCase();
    if (seen.has(rawEmail)) continue;
    seen.add(rawEmail);

    const parts = rawEmail.split("@");
    const domain = parts[1] || "";
    const isFree = FREE_WEBMAIL_DOMAINS.has(domain) || Array.from(FREE_WEBMAIL_DOMAINS).some((d) => domain.endsWith("." + d));

    emails.push({
      email: rawEmail,
      domain,
      isFreeWebmail: isFree,
    });
  }

  return emails;
}

/**
 * Extracts hidden text in markdown, HTML, and text snippets.
 */
export function findHiddenInText(text: string): HiddenTextItem[] {
  const hidden: HiddenTextItem[] = [];

  // 1. HTML comments: <!-- ... -->
  const commentRegex = /<!--([\s\S]*?)-->/g;
  let commentMatch: RegExpExecArray | null;
  while ((commentMatch = commentRegex.exec(text)) !== null) {
    const commentBody = commentMatch[1].trim();
    if (commentBody) {
      hidden.push({
        text: commentBody,
        reason: "HTML comment hidden from normal readers",
      });
    }
  }

  // 2. Inline styled white text or tiny font
  // e.g. <span style="color:#ffffff;font-size:1px">...</span>
  const spanRegex = /<([a-z0-9]+)[^>]*style="([^"]*)"[^>]*>([\s\S]*?)<\/\1>/gi;
  let spanMatch: RegExpExecArray | null;
  while ((spanMatch = spanRegex.exec(text)) !== null) {
    const style = spanMatch[2].toLowerCase();
    const content = spanMatch[3].replace(/<[^>]+>/g, "").trim();
    if (!content) continue;

    const isWhite =
      style.includes("#ffffff") ||
      style.includes("#fff") ||
      style.includes("white") ||
      style.includes("rgba(255, 255, 255") ||
      style.includes("#fffffe");

    const isTiny =
      style.includes("font-size:1px") ||
      style.includes("font-size: 1px") ||
      style.includes("font-size:2px") ||
      style.includes("font-size: 2px") ||
      style.includes("font-size:0") ||
      style.includes("font-size:1pt");

    const isHiddenDisplay =
      style.includes("display:none") ||
      style.includes("display: none") ||
      style.includes("visibility:hidden") ||
      style.includes("visibility: hidden") ||
      style.includes("opacity:0");

    if (isWhite || isTiny || isHiddenDisplay) {
      const reasons: string[] = [];
      if (isWhite) reasons.push("white or near-white text");
      if (isTiny) reasons.push("1-2px tiny text");
      if (isHiddenDisplay) reasons.push("display:none/hidden style");

      hidden.push({
        text: content,
        reason: reasons.join(", "),
      });
    }
  }

  return hidden;
}
