import crypto from "crypto";

export type ShareRole = "you" | "other";

export interface ProposedFix {
  id: string;
  title: string;
  beforeClause: string;
  afterClause: string;
  originalQuote?: string;
  flagIds?: string[];
  youAccepted: boolean;
  otherAccepted: boolean;
  rescored: boolean;
  rescoreNote?: string;
}

export interface ShareRecord {
  id: string;
  createdAt: string;
  expiresAt: string;
  docHash: string;
  docType: string;
  fileName: string;
  redactedText: string;
  fixes: ProposedFix[];
  scoreResult: {
    signScore: number;
    color: "green" | "amber" | "red";
    label: string;
    headline: string;
    totalPoints: number;
    breakdown: Array<{ reason: string; points: number }>;
  };
  checksRun: Array<{
    step: string;
    name: string;
    credits: number;
    cached?: boolean;
  }>;
  totalCredits: number;
  initialPoints: number;
  remainingPoints: number;
  rescoredWithClocked: boolean;
}
/** Describes whether the most recent rescore used a successful live Clocked Decide call. */
export function getRescoreStatus(usedClockedDecide: boolean): {
  rescoredWithClocked: boolean;
  rescoreNote: string;
} {
  return {
    rescoredWithClocked: usedClockedDecide,
    rescoreNote: usedClockedDecide
      ? "Rescored with Clocked Decide ✓"
      : "Rescored locally (live check unavailable)",
  };
}

/**
 * Gets or falls back to the share secret.
 */
function getSecret(): string {
  return process.env.SHARE_SECRET || "signsafe-default-share-secret-key-32chars";
}

/**
 * Creates a signed HMAC-SHA256 role token for a share ID.
 */
export function createRoleToken(shareId: string, role: ShareRole): string {
  const secret = getSecret();
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(`${shareId}:${role}`)
    .digest("hex");
  return `${role}.${hmac}`;
}

/**
 * Verifies an HMAC-SHA256 role token against a share ID.
 * Returns the verified role ("you" | "other") or null if invalid or tampered with.
 */
export function verifyRoleToken(
  shareId: string,
  token: string | null | undefined
): ShareRole | null {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [role, sig] = parts;
  if (role !== "you" && role !== "other") return null;
  if (!sig || sig.length !== 64) return null;

  const secret = getSecret();
  const expectedHmac = crypto
    .createHmac("sha256", secret)
    .update(`${shareId}:${role}`)
    .digest("hex");

  try {
    const sigBuf = Buffer.from(sig, "hex");
    const expBuf = Buffer.from(expectedHmac, "hex");
    if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
      return role as ShareRole;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Computes a SHA-256 hex hash of any text string.
 */
export function computeDocHash(text: string): string {
  return crypto.createHash("sha256").update(text || "").digest("hex");
}

/**
 * Generates a random 128-bit hex ID (32 hex characters).
 */
export function generateShareId(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Scrubs any entity values found by Protect from text, replacing them with generic placeholders.
 */
export function scrubEntityValues(
  text: string,
  entityValues: Array<{ type?: string; value?: string } | string>
): string {
  if (!text) return "";

  const valuesToScrub: Array<{ val: string; type: string }> = [];

  for (const item of entityValues) {
    if (typeof item === "string") {
      const trimmed = item.trim();
      if (trimmed.length >= 2) {
        valuesToScrub.push({ val: trimmed, type: "REDACTED" });
      }
    } else if (item && typeof item.value === "string") {
      const trimmed = item.value.trim();
      if (trimmed.length >= 2) {
        valuesToScrub.push({
          val: trimmed,
          type: item.type ? item.type.toUpperCase() : "REDACTED",
        });
      }
    }
  }

  // Sort longest first so "Johnathan Doe" is replaced before "John"
  valuesToScrub.sort((a, b) => b.val.length - a.val.length);

  let result = text;
  for (const { val, type } of valuesToScrub) {
    try {
      const escaped = val.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(escaped, "gi");
      result = result.replace(re, `[${type}]`);
    } catch {
      // Ignore invalid regex patterns
    }
  }

  return result;
}
