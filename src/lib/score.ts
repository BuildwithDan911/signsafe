import { MergedSignal } from "./signals";

export function clampSignScore(score: number): number {
  return Math.max(26, Math.min(94, Math.round(score)));
}

export interface ScoreInput {
  mergedSignals: MergedSignal[];
  guardInjection?: boolean;
  inspectMalicious?: boolean;
  confirmedSignalIds?: string[]; // IDs where user answered Yes
  greenSignalsCount?: number;
  brokenPromisesCount?: number; // Phase 8: Broken promise adds 1 amber point
  failedSafetySteps?: string[]; // Phase 10: Failed safety steps (guard, inspect, protect)
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
    brokenPromisesCount = 0,
    failedSafetySteps = [],
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

  // Broken promises (Phase 8): each broken promise adds 1 amber point
  if (brokenPromisesCount > 0) {
    totalPoints += brokenPromisesCount * 1;
    breakdown.push({
      reason: "A promise in chat isn't in the contract",
      points: brokenPromisesCount * 1,
    });
  }

  // Determine colour band
  let color: "green" | "amber" | "red";
  let label: string;
  let headline: string;

  // Phase 10: Failed safety steps (Guard, Inspect or Protect) prevent green result
  const hasSafetyFailure = failedSafetySteps.length > 0;

  if (totalPoints === 0) {
    if (hasSafetyFailure) {
      color = "amber";
      label = "ASK FIRST";
      headline = "We couldn't finish every check, so we can't call this safe.";
      breakdown.push({
        reason: "We couldn't finish every check, so we can't call this safe.",
        points: 1,
      });
      totalPoints = 1;
    } else {
      color = "green";
      label = "LOOKS FAIR";
      headline = "Looks fair. No major warning signs detected in this document.";
    }
  } else if (totalPoints <= 3) {
    color = "amber";
    label = "ASK FIRST";
    headline = hasSafetyFailure
      ? "We couldn't finish every check, so we can't call this safe."
      : "Ask first. A few items should be clarified before signing.";
    if (hasSafetyFailure) {
      breakdown.push({
        reason: "We couldn't finish every check, so we can't call this safe.",
        points: 0,
      });
    }
  } else {
    color = "red";
    label = "DON'T SIGN YET";
    headline =
      confirmedSignalIds.length > 0
        ? "Don't sign yet. Several warning signs add up, and you confirmed the fee or tell."
        : "Don't sign yet. Several significant warning signs add up. Verify first.";
    if (hasSafetyFailure) {
      breakdown.push({
        reason: "We couldn't finish every check, so we can't call this safe.",
        points: 0,
      });
    }
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
    signScore: clampSignScore(signScore),
    color,
    label,
    headline,
    totalPoints,
    breakdown,
  };
}

export function computeScore(input: {
  signalPoints?: number;
  mergedSignals?: MergedSignal[];
  greenSignalsCount?: number;
  guardInjection?: boolean;
  inspectMalicious?: boolean;
  confirmedSignalIds?: string[];
  brokenPromisesCount?: number;
  failedSafetySteps?: string[];
}): ScoreResult {
  if (input.signalPoints !== undefined) {
    const points = input.signalPoints;
    const greens = input.greenSignalsCount || 0;
    let color: "green" | "amber" | "red" = "green";
    let label = "LOOKS FAIR";
    let headline = "Looks fair. No major warning signs detected.";
    if (points === 0) {
      color = "green";
      label = "LOOKS FAIR";
    } else if (points <= 3) {
      color = "amber";
      label = "ASK FIRST";
      headline = "Ask first. A few items should be clarified before signing.";
    } else {
      color = "red";
      label = "DON'T SIGN YET";
      headline = "Don't sign yet. Several significant warning signs add up. Verify first.";
    }
    const rawScore = 100 - 12 * points + 5 * greens;
    let signScore: number;
    if (color === "green") {
      signScore = Math.max(75, Math.min(100, rawScore));
    } else if (color === "amber") {
      signScore = Math.max(40, Math.min(74, rawScore));
    } else {
      signScore = Math.max(0, Math.min(39, rawScore));
    }
    return {
      signScore: clampSignScore(signScore),
      color,
      label,
      headline,
      totalPoints: points,
      breakdown: [],
    };
  }
  return calculateScore({
    mergedSignals: input.mergedSignals || [],
    guardInjection: input.guardInjection,
    inspectMalicious: input.inspectMalicious,
    confirmedSignalIds: input.confirmedSignalIds,
    greenSignalsCount: input.greenSignalsCount,
    brokenPromisesCount: input.brokenPromisesCount,
    failedSafetySteps: input.failedSafetySteps,
  });
}
