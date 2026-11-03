import { diffWords, Change } from "diff";
import { splitIntoClauses, Clause } from "./clauses";

export interface AlignedClausePair {
  clauseNumber: string;
  title: string;
  v1Clause?: Clause;
  v2Clause?: Clause;
  isIdentical: boolean;
  diff: Change[];
  beforeText: string;
  afterText: string;
}

export interface MeaningChange {
  id: string; // chg1, chg2, ...
  clauseNumber: string;
  title: string;
  beforeText: string;
  afterText: string;
  diff: Change[];
  verdict: "worse" | "neutral" | "better";
  confidence: number;
  probabilities?: {
    worse?: number;
    neutral?: number;
    better?: number;
  };
  askMessage: string;
  compareFinding?: {
    kind?: string;
    confidence?: number;
  };
}

export interface WordingOnlyChange {
  id: string;
  clauseNumber: string;
  title: string;
  beforeText: string;
  afterText: string;
  diff: Change[];
}

export interface CompareResult {
  changes: MeaningChange[];
  wordingOnlyChanges: WordingOnlyChange[];
  sealColor: "red" | "amber" | "green";
  summaryText: string;
  meaningUnavailable?: boolean;
}

/**
 * Extract clause number (e.g., "1", "2.1", "3", "4") from a title or text.
 * Must appear at the start of the title or text (e.g. "1. Rent" or "Clause 4"),
 * not embedded numbers like dates or version tags.
 */
export function extractClauseNumber(title: string, text: string): string {
  const cleanTitle = title.replace(/[*#_>]/g, "").trim();
  const mTitle = cleanTitle.match(
    /^(?:(?:Clause|Section|ARTICLE)\s+)?(\d+(?:\.\d+)?)(?:\.|\b)/i
  );
  if (mTitle) return mTitle[1];

  const cleanText = text.replace(/[*#_>]/g, "").trim();
  const mText = cleanText.match(
    /^(?:(?:Clause|Section|ARTICLE)\s+)?(\d+(?:\.\d+)?)(?:\.|\b)/i
  );
  if (mText) return mText[1];

  return "";
}

/**
 * Clean clause title for human readability
 */
export function cleanClauseTitle(title: string, clauseNumber: string): string {
  let clean = title.replace(/[*#_>]/g, "").trim();
  if (clauseNumber && !clean.toLowerCase().includes("clause") && !clean.startsWith(clauseNumber)) {
    return `Clause ${clauseNumber}: ${clean}`;
  }
  return clean || (clauseNumber ? `Clause ${clauseNumber}` : "Clause");
}

/**
 * Extract concise meaningful clause text (removing markdown bold markers, etc.)
 */
export function cleanClauseText(text: string): string {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/^\d+\.\s*\*\*[^*]+\*\*\s*/i, "") // Remove "3. **Renewal.** " prefix if we want just the clause content
    .trim();
}

/**
 * Align clauses between two documents by clause number and title
 */
export function alignClauses(v1Text: string, v2Text: string): AlignedClausePair[] {
  const v1Clauses = splitIntoClauses(v1Text);
  const v2Clauses = splitIntoClauses(v2Text);

  const pairs: AlignedClausePair[] = [];
  const matchedV2Indices = new Set<number>();

  for (let i = 0; i < v1Clauses.length; i++) {
    const c1 = v1Clauses[i];
    const num1 = extractClauseNumber(c1.title, c1.text);

    // Look for matching clause in v2
    let matchIdx = -1;
    if (num1) {
      matchIdx = v2Clauses.findIndex(
        (c2, idx) => !matchedV2Indices.has(idx) && extractClauseNumber(c2.title, c2.text) === num1
      );
    }

    if (matchIdx === -1) {
      // Fallback: match by title similarity or exact title
      const cleanTitle1 = c1.title.replace(/[*#_>\d.]/g, "").trim().toLowerCase();
      if (cleanTitle1.length > 5) {
        matchIdx = v2Clauses.findIndex((c2, idx) => {
          if (matchedV2Indices.has(idx)) return false;
          const cleanTitle2 = c2.title.replace(/[*#_>\d.]/g, "").trim().toLowerCase();
          return cleanTitle1 === cleanTitle2;
        });
      }
    }

    if (matchIdx === -1 && i < v2Clauses.length && !matchedV2Indices.has(i)) {
      // Positional match if numbers match or both have no numbers
      const num2 = extractClauseNumber(v2Clauses[i].title, v2Clauses[i].text);
      if (!num1 && !num2) {
        matchIdx = i;
      }
    }

    if (matchIdx !== -1) {
      matchedV2Indices.add(matchIdx);
      const c2 = v2Clauses[matchIdx];
      const isIdentical = c1.text.trim() === c2.text.trim();
      const diff = isIdentical ? [] : diffWords(c1.text, c2.text);
      const clauseNum = num1 || extractClauseNumber(c2.title, c2.text) || "";

      pairs.push({
        clauseNumber: clauseNum,
        title: cleanClauseTitle(c1.title, clauseNum),
        v1Clause: c1,
        v2Clause: c2,
        isIdentical,
        diff,
        beforeText: c1.text.trim(),
        afterText: c2.text.trim(),
      });
    } else {
      // Removed in v2
      const clauseNum = num1 || "";
      pairs.push({
        clauseNumber: clauseNum,
        title: cleanClauseTitle(c1.title, clauseNum),
        v1Clause: c1,
        isIdentical: false,
        diff: diffWords(c1.text, ""),
        beforeText: c1.text.trim(),
        afterText: "",
      });
    }
  }

  // Any unmatched clauses in v2 (newly added clauses)
  for (let j = 0; j < v2Clauses.length; j++) {
    if (!matchedV2Indices.has(j)) {
      const c2 = v2Clauses[j];
      const num2 = extractClauseNumber(c2.title, c2.text) || "";
      pairs.push({
        clauseNumber: num2,
        title: cleanClauseTitle(c2.title, num2),
        v2Clause: c2,
        isIdentical: false,
        diff: diffWords("", c2.text),
        beforeText: "",
        afterText: c2.text.trim(),
      });
    }
  }

  return pairs;
}

/**
 * Builds "What to ask them" copy text:
 * "Version 2 changes clause [n] from '[before]' to '[after]'. Can we keep the original wording?"
 */
export function buildWhatToAskMessage(
  clauseNumber: string,
  beforeText: string,
  afterText: string
): string {
  // Extract the substantive clause sentence (without headers/numbers) for cleaner quote
  const cleanBefore = cleanClauseText(beforeText) || beforeText;
  const cleanAfter = cleanClauseText(afterText) || afterText;

  const n = clauseNumber || "this";
  return `Version 2 changes clause ${n} from '${cleanBefore}' to '${cleanAfter}'. Can we keep the original wording?`;
}
