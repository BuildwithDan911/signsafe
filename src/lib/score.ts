import { MergedSignal } from "./signals";

export interface ScoreInput {
  mergedSignals: MergedSignal[];
  guardInjection?: boolean;
  inspectMalicious?: boolean;
  confirmedSignalIds?: string[]; // IDs where user answered Yes
  greenSignalsCount?: number;
}

export interface ScoreResult {
  signScore: number;
  color: "green" | "amber" | "red";
  label: string;
  headline: string;
  totalPoints: number;
  breakdown: Array<{ reason: string; points: number }>;
}

/**
 * Pure scoring function following BUILD_BRIEF.md Section 2:
 * - Red-weight signals count 3 points
 * - Amber-weight count 1 point
 * - Guard injection or Inspect malicious verdict counts 4 points
 * - Follow-up Yes adds 2 points (and confirms the flag as red)
 * - Green signals never change colour; each adds 5 to the score inside its band
 *
 * Bands:
 * - 0 points: green "LOOKS FAIR" (score 75 to 100)
 * - 1 to 3 points: amber "ASK FIRST" (score 40 to 74)
 * - 4 or more points: red "DON'T SIGN YET" (score 0 to 39)
 */
export function calculateScore(input: ScoreInput): ScoreResult {
  const {
    mergedSignals,
    guardInjection = false,
    inspectMalicious = false,
    confirmedSignalIds = [],
    greenSignalsCount = 0,
  } = input;

  let totalPoints = 0;
  const breakdown: Array<{ reason: string; points: number }> = [];

  // Guard injection: 4 points
  if (guardInjection) {
    totalPoints += 4;
    breakdown.push({ reason: "Prompt injection instruction in document", points: 4 });
  }

  // Inspect malicious: 4 points
  if (inspectMalicious) {
    totalPoints += 4;
    breakdown.push({ reason: "Malicious macro or executable command", points: 4 });
  }

  // Merged signals
  for (const s of mergedSignals) {
    const isConfirmed = confirmedSignalIds.includes(s.id);

    if (isConfirmed) {
      // 3 points (red weight) + 2 points for Yes confirmation
      totalPoints += 5;
      breakdown.push({ reason: `${s.title} (Confirmed by you)`, points: 5 });
    } else if (s.severity === "red") {
      totalPoints += 3;
      breakdown.push({ reason: s.title, points: 3 });
    } else if (s.severity === "amber") {
      totalPoints += 1;
      breakdown.push({ reason: s.title, points: 1 });
    }
  }

  // Determine colour band
  let color: "green" | "amber" | "red";
  let label: string;
  let headline: string;

  if (totalPoints === 0) {
    color = "green";
    label = "LOOKS FAIR";
    headline = "Looks fair. No major warning signs detected in this document.";
  } else if (totalPoints <= 3) {
    color = "amber";
    label = "ASK FIRST";
    headline = "Ask first. A few items should be clarified before signing.";
  } else {
    color = "red";
    label = "DON'T SIGN YET";
    headline =
      confirmedSignalIds.length > 0
        ? "Don't sign yet. Several warning signs add up, and you confirmed the fee or tell."
        : "Don't sign yet. Several significant warning signs add up. Verify first.";
  }

  // Calculate Sign Score: 100 - (12 * points) + (5 * greens)
  const rawScore = 100 - 12 * totalPoints + 5 * greenSignalsCount;

  let signScore: number;
  if (color === "green") {
    signScore = Math.max(75, Math.min(100, rawScore));
  } else if (color === "amber") {
    signScore = Math.max(40, Math.min(74, rawScore));
  } else {
    signScore = Math.max(0, Math.min(39, rawScore));
  }

  return {
    signScore,
    color,
    label,
    headline,
    totalPoints,
    breakdown,
  };
}
