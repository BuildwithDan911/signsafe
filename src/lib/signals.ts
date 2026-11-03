export interface DecideAnswer {
  selected?: string[];
  probabilities?: Record<string, number>;
}

/**
 * Filters Decide results so only signals with confidence >= threshold
 * are counted in the score, preventing weak flags from cluttering results.
 * Default threshold: 0.7
 */
export function filterHighConfidenceSignals(
  answer?: DecideAnswer,
  threshold = 0.7
): {
  highConfidence: string[];
  lowConfidence: string[];
} {
  if (!answer) {
    return { highConfidence: [], lowConfidence: [] };
  }

  const selected = answer.selected || [];
  const probs = answer.probabilities || {};

  const highConfidence: string[] = [];
  const lowConfidence: string[] = [];

  for (const id of selected) {
    const prob = probs[id] !== undefined ? probs[id] : 1.0;
    if (prob >= threshold) {
      highConfidence.push(id);
    } else {
      lowConfidence.push(id);
    }
  }

  return { highConfidence, lowConfidence };
}
