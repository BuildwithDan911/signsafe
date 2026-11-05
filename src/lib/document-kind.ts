const DOCUMENT_TITLE_PATTERNS = [
  /\b(?:agreement|contract|lease|terms and conditions|invoice|purchase order|offer letter|statement of work|non[- ]disclosure agreement|nda|contrato|acuerdo|arrendamiento|factura|convenio|contrat|accord|bail|mietvertrag|vertrag|contratto|locazione|mkataba|makubaliano)\b/i,
];

// Independent legal-context groups help avoid rejecting contracts that use
// different names or omit a formal title. Short excerpts always pass through.
const LEGAL_CONTEXT_GROUPS = [
  /\b(?:shall|hereby|pursuant|obligation|undertake|covenant|agrees? to)\b/i,
  /\b(?:salary|wages?|rent|payments?|fees?|deposit|compensation|consideration|purchase|loan|interest|invoice)\b/i,
  /\b(?:employer|employee|tenant|landlord|buyer|seller|client|consultant|contractor|borrower|lender|licensor|licensee|sponsor|creator|parties)\b/i,
  /\b(?:termination|renewal|governing law|confidentiality|indemnif\w*|warrant\w*|liability|dispute resolution|notice period)\b/i,
  /\b(?:signature|signed|effective date|scope of work|deliverables?|services|term of this)\b/i,
];

/**
 * Reject only substantial text with no recognizable agreement context.
 * This is intentionally conservative: titles, legal clause language, and short
 * excerpts are allowed through so legitimate or unusual contracts are not
 * blocked by a heuristic classifier.
 */
export function isClearlyUnrelatedText(text: string): boolean {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length < 280) return false;
  // Don't make English-only assumptions about scripts and legal vocabulary.
  if (/[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/u.test(normalized)) return false;
  if (/[ñáéíóúüãõçàèêîôûäöß]/i.test(normalized)) return false;
  if (DOCUMENT_TITLE_PATTERNS.some((pattern) => pattern.test(normalized))) return false;
  const contextGroups = LEGAL_CONTEXT_GROUPS.filter((pattern) => pattern.test(normalized)).length;
  return contextGroups < 2;
}

export const NON_CONTRACT_MESSAGE =
  "No contract or agreement terms were found in this text, so SignSafe stopped before scoring. Upload or paste the actual agreement, offer, lease, invoice, or terms. If this is a short excerpt or a real agreement in another language, you can still check it by pasting that section directly.";
