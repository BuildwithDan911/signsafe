import { MergedSignal } from "./signals";

export function clampSignScore(score: number): number {
  return Math.max(26, Math.min(94, Math.round(score)));
}

export interface ScoreInput {
  mergedSignals: MergedSignal[];
  guardInjection?: boolean;
  inspectMalicious?: boolean;
  confirmedSignalIds?: string[];
  greenSignalsCount?: number;
  brokenPromisesCount?: number;
  failedSafetySteps?: string[];
}

export interface ScoreResult {
  signScore: number;
  color: "green" | "amber" | "red";
  label: string;
  headline: string;
  totalPoints: number;
  breakdown: Array<{ reason: string; points: number }>;
}

const roundImpact = (value: number) => Math.round(value * 10) / 10;

function scoreColor(totalPoints: number): "green" | "amber" | "red" {
  if (totalPoints === 0) return "green";
  if (totalPoints <= 3) return "amber";
  return "red";
}

/**
 * Maps evidence to a gradual 26–94 Sign Score.
 *
 * The outcome band still follows the transparent signal point rules: red flags
 * are 3 points, amber flags are 1, safety detections are 4, and a confirmed
 * finding is 5. The numeric score separately weighs severity, model confidence,
 * confirmation and overlapping findings, so one issue doesn't collapse every
 * concerning contract to the minimum score.
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
  let riskImpact = 0;
  const breakdown: Array<{ reason: string; points: number }> = [];
  const addRisk = (reason: string, impact: number, outcomePoints: number) => {
    const roundedImpact = roundImpact(impact);
    riskImpact += roundedImpact;
    totalPoints += outcomePoints;
    breakdown.push({ reason, points: roundedImpact });
  };

  if (guardInjection) addRisk("Prompt injection instruction in document", 26, 4);
  if (inspectMalicious) addRisk("Malicious macro or executable command", 26, 4);

  let signalIndex = 0;
  for (const signal of mergedSignals) {
    const isConfirmed = confirmedSignalIds.includes(signal.id);
    const confidence = Number.isFinite(signal.confidence)
      ? Math.max(0, Math.min(1, signal.confidence))
      : 0.5;
    const confidenceFactor = 0.65 + confidence * 0.35;
    // Additional independent findings still count, with a modest reduction
    // to avoid making repeated or closely related flags dominate the scale.
    const overlapFactor = Math.pow(0.82, signalIndex);
    const severityImpact = signal.severity === "red" ? 18 : signal.severity === "amber" ? 8 : 0;

    if (isConfirmed) {
      addRisk(`${signal.title} (Confirmed by you)`, severityImpact * confidenceFactor * overlapFactor * 1.35, 5);
    } else if (severityImpact > 0) {
      addRisk(signal.title, severityImpact * confidenceFactor * overlapFactor, signal.severity === "red" ? 3 : 1);
    }
    if (severityImpact > 0) signalIndex += 1;
  }

  if (brokenPromisesCount > 0) {
    let promiseImpact = 0;
    for (let i = 0; i < brokenPromisesCount; i += 1) promiseImpact += 5 * Math.pow(0.82, i);
    addRisk("A promise in chat isn't in the contract", promiseImpact, brokenPromisesCount);
  }

  if (failedSafetySteps.length > 0) {
    // An incomplete safety check prevents a green result and modestly reduces
    // confidence in the overall score. Don't count the same failed step twice.
    const failedUniqueSteps = [...new Set(failedSafetySteps)];
    addRisk("We couldn't finish every check, so we can't call this safe.", failedUniqueSteps.length * 7, 0);
    if (totalPoints === 0) totalPoints = 1;
  }

  const color = scoreColor(totalPoints);
  const label = color === "green" ? "LOOKS FAIR" : color === "amber" ? "ASK FIRST" : "DON'T SIGN YET";
  const headline = color === "green"
    ? "Looks fair. No major warning signs detected in this document."
    : color === "amber"
      ? failedSafetySteps.length > 0
        ? "We couldn't finish every check, so we can't call this safe."
        : "Ask first. A few items should be clarified before signing."
      : confirmedSignalIds.length > 0
        ? "Don't sign yet. Several warning signs add up, and you confirmed a concern."
        : "Don't sign yet. Several significant warning signs add up. Verify first.";

  const greenBonus = Math.min(6, Math.max(0, greenSignalsCount) * 1.5);
  if (greenBonus > 0) {
    breakdown.push({ reason: "Protective terms found", points: -roundImpact(greenBonus) });
  }

  return {
    signScore: clampSignScore(94 - riskImpact + greenBonus),
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
    const points = Math.max(0, input.signalPoints);
    const greens = Math.max(0, input.greenSignalsCount || 0);
    const color = scoreColor(points);
    const label = color === "green" ? "LOOKS FAIR" : color === "amber" ? "ASK FIRST" : "DON'T SIGN YET";
    const headline = color === "green"
      ? "Looks fair. No major warning signs detected."
      : color === "amber"
        ? "Ask first. A few items should be clarified before signing."
        : "Don't sign yet. Several significant warning signs add up. Verify first.";
    return {
      signScore: clampSignScore(94 - 8 * points + Math.min(6, greens * 1.5)),
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
