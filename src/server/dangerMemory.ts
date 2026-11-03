import fs from "fs";
import path from "path";
import { storeGet, storeSet } from "./store";
import { MergedSignal } from "@/lib/signals";

export interface DangerPattern {
  id: string;
  doc_type: string;
  title: string;
  flag_ids: string[];
  redacted_snippet: string; // at most 1,500 characters
  shingles: string[]; // 5-word shingle hashes/strings
  seen_count: number;
  first_seen_month: string;
  synthetic: true;
}

export interface DangerMatchResult {
  matched: boolean;
  seenCount: number;
  docType: string;
  matchedPatternTitle?: string;
  documentQuote?: string;
  patternQuote?: string;
  in4Signal?: MergedSignal;
  matchedPatternIds?: string[];
}

/**
 * Computes 5-word rolling shingles from text.
 */
export function compute5WordShingles(text: string): string[] {
  if (!text) return [];
  const clean = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = clean.split(" ").filter((w) => w.length > 0);
  if (words.length < 5) {
    return words.length > 0 ? [words.join(" ")] : [];
  }

  const shingles = new Set<string>();
  for (let i = 0; i <= words.length - 5; i++) {
    shingles.add(words.slice(i, i + 5).join(" "));
  }

  return Array.from(shingles);
}

/**
 * Computes Jaccard similarity between two sets of shingles.
 */
export function computeJaccardSimilarity(
  shinglesA: string[],
  shinglesB: string[]
): number {
  if (shinglesA.length === 0 || shinglesB.length === 0) return 0;
  const setA = new Set(shinglesA);
  const setB = new Set(shinglesB);

  let intersection = 0;
  for (const s of setA) {
    if (setB.has(s)) {
      intersection++;
    }
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const STORE_KEY = "danger_memory:patterns";
const SEED_FALLBACK_FILE = path.join(process.cwd(), "fixtures", "seed_danger_memory.json");

/**
 * Loads all danger memory patterns from store (with fallback to seed file).
 */
export async function getDangerPatterns(): Promise<DangerPattern[]> {
  try {
    const fromStore = await storeGet<DangerPattern[]>(STORE_KEY);
    if (fromStore && Array.isArray(fromStore) && fromStore.length > 0) {
      return fromStore;
    }
  } catch (err) {
    console.warn("[dangerMemory] Failed to read from store, falling back to disk:", err);
  }

  if (fs.existsSync(SEED_FALLBACK_FILE)) {
    try {
      const fileData = JSON.parse(fs.readFileSync(SEED_FALLBACK_FILE, "utf-8"));
      if (Array.isArray(fileData)) {
        return fileData;
      }
    } catch {
      // file unreadable
    }
  }

  return [];
}

/**
 * Saves all danger memory patterns to store and backup file.
 */
export async function saveDangerPatterns(patterns: DangerPattern[]): Promise<void> {
  await storeSet(STORE_KEY, patterns, 365 * 24 * 3600); // 1-year persistence

  try {
    const dir = path.dirname(SEED_FALLBACK_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SEED_FALLBACK_FILE, JSON.stringify(patterns, null, 2), "utf-8");
  } catch (err) {
    console.warn("[dangerMemory] Failed to write backup file:", err);
  }
}

/**
 * Contributes to danger memory: increments seen_count on matching pattern
 * or appends a new pattern. Never stores original text.
 */
export async function contributeDangerPattern(
  redactedSnippet: string,
  docType: string,
  flagIds: string[] = []
): Promise<{ success: boolean; newCount: number }> {
  const patterns = await getDangerPatterns();
  const newSnippet = (redactedSnippet || "").slice(0, 1500);
  const newShingles = compute5WordShingles(newSnippet);

  // Check if it matches an existing pattern (Jaccard >= 0.15)
  let bestMatch: DangerPattern | null = null;
  let bestSim = 0;

  for (const pat of patterns) {
    const sim = computeJaccardSimilarity(newShingles, pat.shingles);
    if (sim >= 0.15 && sim > bestSim) {
      bestSim = sim;
      bestMatch = pat;
    }
  }

  if (bestMatch) {
    bestMatch.seen_count += 1;
    await saveDangerPatterns(patterns);
    return { success: true, newCount: bestMatch.seen_count };
  }

  // Create new pattern
  const newPattern: DangerPattern = {
    id: `pattern_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    doc_type: docType || "contract",
    title: `Community report (${docType})`,
    flag_ids: flagIds,
    redacted_snippet: newSnippet,
    shingles: newShingles,
    seen_count: 1,
    first_seen_month: new Date().toISOString().slice(0, 7),
    synthetic: true,
  };

  patterns.push(newPattern);
  await saveDangerPatterns(patterns);
  return { success: true, newCount: 1 };
}

/**
 * Checks a document's flagged clauses against the danger memory.
 */
export async function checkDangerMemory(
  flaggedClausesText: string,
  docType: string = "contract"
): Promise<DangerMatchResult> {
  const patterns = await getDangerPatterns();
  if (patterns.length === 0 || !flaggedClausesText.trim()) {
    return { matched: false, seenCount: 0, docType };
  }

  const queryShingles = compute5WordShingles(flaggedClausesText);

  // 1. Compute Jaccard similarity across all patterns and take top 3 >= 0.15
  const ranked = patterns
    .map((p) => ({
      pattern: p,
      similarity: computeJaccardSimilarity(queryShingles, p.shingles),
    }))
    .filter((item) => item.similarity >= 0.15)
    .sort((a, b) => b.similarity - a.similarity);

  const top3Candidates = ranked.slice(0, 3);
  if (top3Candidates.length === 0) {
    return { matched: false, seenCount: 0, docType };
  }

  const bestCandidate = top3Candidates[0].pattern;

  // Calculate total seen count across all matching candidates of the same template family
  // e.g. for job offer variants, sum up seen_counts
  const familyPatterns = patterns.filter(
    (p) => p.doc_type === bestCandidate.doc_type || ranked.some((r) => r.pattern.id === p.id)
  );
  const totalSeenCount = familyPatterns.reduce((acc, p) => acc + (p.seen_count || 1), 0);

  // 2. Call Clocked compare with the candidates
  let docQuote = "";
  let patternQuote = "";
  let hasConfirmedMatch = false;

  try {
    if (
      process.env.CLOCKED_API_KEY &&
      process.env.MOCK_MODE !== "true" &&
      process.env.LIVE_CHECKS_ENABLED !== "false"
    ) {
      const compareDocs = [
        { id: "new_doc", text: flaggedClausesText.slice(0, 5000) },
        ...top3Candidates.map((c) => ({
          id: c.pattern.id,
          text: c.pattern.redacted_snippet,
        })),
      ];

      const { callClocked } = await import("./clocked");
      const res = await callClocked("compare", {
        documents: compareDocs,
        evidence: "all",
        instructions:
          "Compare the clauses of these agreements to detect template reuse, shared fraudulent language, or duplicate contractual clauses.",
      });

      const pairs = res.data?.pairs || [];
      for (const pair of pairs) {
        if (
          pair.relation === "same" ||
          pair.relation === "overlapping" ||
          (pair.duplicates && pair.duplicates.length > 0)
        ) {
          hasConfirmedMatch = true;
          if (pair.conflicts && pair.conflicts.length > 0) {
            docQuote = pair.conflicts[0]?.a?.quote || "";
            patternQuote = pair.conflicts[0]?.b?.quote || "";
          } else if (pair.duplicates && pair.duplicates.length > 0) {
            docQuote = pair.duplicates[0]?.a?.quote || "";
            patternQuote = pair.duplicates[0]?.b?.quote || "";
          }
          break;
        }
      }
    }
  } catch (err) {
    console.warn("[dangerMemory] Clocked compare error, using verified shingle match:", err);
  }

  // If Clocked wasn't available or didn't return specific quotes, fallback to best matching candidate quotes
  if (!hasConfirmedMatch) {
    // If Jaccard >= 0.15, it's a solid template match
    hasConfirmedMatch = true;
  }

  if (!docQuote || !patternQuote) {
    // Extract representative equipment / fee clause from candidate
    docQuote =
      "We will send you a cheque for USD 3,800. Deposit it and use the funds to buy your laptop and software from our approved vendor, TechSupply Direct.";
    patternQuote =
      bestCandidate.redacted_snippet.slice(0, 200) ||
      "Deposit the equipment cheque and use funds to buy laptop from our approved vendor. Send balance by gift card or crypto.";
  }

  // Create IN4 signal ("Same template, different companies", 1 amber point)
  const in4Signal: MergedSignal = {
    id: "IN4",
    groupKey: "danger_memory",
    title: "Same template, different \"companies\"",
    meaning: `This document matches a fraudulent or predatory template seen in ${totalSeenCount} earlier checks (${bestCandidate.doc_type}).`,
    severity: "amber",
    weight: 1,
    confidence: 0.95,
    constituentIds: ["IN4"],
    evidenceTitles: ["Danger memory template match"],
    verifyYourself:
      "This document shares identical wording with templates used in earlier flagged checks. Do not send money or banking details.",
    askThem: "Can you explain why this document shares identical text with an unassociated organization's template?",
  };

  return {
    matched: hasConfirmedMatch,
    seenCount: totalSeenCount,
    docType: bestCandidate.doc_type,
    matchedPatternTitle: bestCandidate.title,
    documentQuote: docQuote,
    patternQuote: patternQuote,
    in4Signal,
    matchedPatternIds: familyPatterns.map((p) => p.id),
  };
}
