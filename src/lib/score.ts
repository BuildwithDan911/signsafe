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

export interface ScoreDimension {
  key: "terms" | "practices" | "identity" | "integrity";
  label: string;
  score: number;
  weight: number;
  source: string;
  note?: string;
}

export interface ScoreResult {
  signScore: number;
  color: "green" | "amber" | "red";
  label: string;
  headline: string;
  totalPoints: number;
  breakdown: Array<{ reason: string; points: number }>;
  dimensions?: ScoreDimension[];
}

const clampDimension = (value: number) => Math.max(26, Math.min(94, value));

function scoreColor(signScore: number): "green" | "amber" | "red" {
  if (signScore >= 80) return "green";
  if (signScore >= 50) return "amber";
  return "red";
}

const PRACTICE_GROUPS = new Set([
  "upfront_fee", "overpayment_vendor", "credential_harvesting", "urgency", "software_commands",
]);
const IDENTITY_GROUPS = new Set(["company_identity", "chat_interview", "secrecy_verification"]);
const IDENTITY_SIGNAL_IDS = new Set(["RF1.6", "SI1", "SI2", "SI3", "SI5", "SI6", "SI7", "SI9", "IN1", "IN2", "PR5"]);

function dimensionForSignal(signal: MergedSignal): "terms" | "practices" | "identity" {
  if (PRACTICE_GROUPS.has(signal.groupKey) || PRACTICE_GROUPS.has(signal.id)) return "practices";
  if (IDENTITY_GROUPS.has(signal.groupKey) || IDENTITY_GROUPS.has(signal.id)
    || signal.constituentIds.some((id) => IDENTITY_SIGNAL_IDS.has(id))) return "identity";
  return "terms";
}

function scoreSignalDimension(signals: MergedSignal[], confirmed: string[], baseline = 94) {
  let deduction = 0;
  let signalIndex = 0;
  for (const signal of signals) {
    if (signal.severity === "green") continue;
    const confidence = Number.isFinite(signal.confidence)
      ? Math.max(0, Math.min(1, signal.confidence))
      : 0.5;
    const confidenceFactor = 0.65 + confidence * 0.35;
    const severityImpact = signal.severity === "red" ? 64 : 55;
    const overlapFactor = Math.pow(0.86, signalIndex);
    const isConfirmed = confirmed.includes(signal.id);
    deduction += severityImpact * confidenceFactor * overlapFactor + (isConfirmed ? 8 : 0);
    signalIndex += 1;
  }
  return clampDimension(baseline - deduction);
}

/**
 * Builds four auditable subscores from independent evidence categories, then
 * combines them with fixed weights. Identity checks assess only clues present
 * in the submitted document; lack of registry access is not itself a penalty.
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
  for (const signal of mergedSignals) {
    if (signal.severity === "green") continue;
    const isConfirmed = confirmedSignalIds.includes(signal.id);
    const weight = signal.severity === "red" ? 3 : 1;
    totalPoints += isConfirmed ? 5 : weight;
    breakdown.push({
      reason: isConfirmed ? `${signal.title} (Confirmed by you)` : signal.title,
      points: isConfirmed ? 5 : weight,
    });
  }

  if (guardInjection) {
    totalPoints += 4;
    breakdown.push({ reason: "Hidden instruction aimed at AI checkers", points: 4 });
  }
  if (inspectMalicious) {
    totalPoints += 4;
    breakdown.push({ reason: "Malicious code or terminal command", points: 4 });
  }
  if (brokenPromisesCount > 0) {
    totalPoints += brokenPromisesCount;
    breakdown.push({ reason: "A promise in chat isn't in the contract", points: brokenPromisesCount });
  }
  const failedUniqueSteps = [...new Set(failedSafetySteps)];
  if (failedUniqueSteps.length > 0) {
    totalPoints = Math.max(1, totalPoints);
    breakdown.push({ reason: `Incomplete checks: ${failedUniqueSteps.join(", ")}`, points: 0 });
  }

  const termsSignals = mergedSignals.filter((signal) => dimensionForSignal(signal) === "terms");
  const practiceSignals = mergedSignals.filter((signal) => dimensionForSignal(signal) === "practices");
  const identitySignals = mergedSignals.filter((signal) => dimensionForSignal(signal) === "identity");
  const safetyDeductions = (guardInjection ? 65 : 0) + (inspectMalicious ? 65 : 0) + failedUniqueSteps.length * 20;
  const termBonus = Math.min(5, Math.max(0, greenSignalsCount) * 1.25);

  const dimensions: ScoreDimension[] = [
    {
      key: "terms", label: "Contract terms & balance",
      score: clampDimension(scoreSignalDimension(termsSignals, confirmedSignalIds) + termBonus - brokenPromisesCount * 5),
      weight: 0.30, source: "Decide and promise checks",
    },
    {
      key: "practices", label: "Job & payment practices",
      score: scoreSignalDimension(practiceSignals, confirmedSignalIds),
      weight: 0.30, source: "Deal signals and your confirmations",
    },
    {
      key: "identity", label: "Identity evidence",
      score: scoreSignalDimension(identitySignals, confirmedSignalIds),
      weight: 0.20, source: "Extract and authenticity signals",
      note: "Assesses consistency and contact clues in this document; it does not use external registries.",
    },
    {
      key: "integrity", label: "Document integrity & safety",
      score: clampDimension(94 - safetyDeductions),
      weight: 0.20, source: "Guard, Inspect, and check completion",
    },
  ];

  const weightedScore = dimensions.reduce((sum, dimension) => sum + dimension.score * dimension.weight, 0);
  const hasActionableWarning = mergedSignals.some((signal) => signal.severity !== "green");
  const confirmedRedSignal = mergedSignals.some(
    (signal) => signal.severity === "red" && confirmedSignalIds.includes(signal.id)
  );
  const scoreCeiling = totalPoints >= 7
    ? 49
    : failedUniqueSteps.length > 0 || hasActionableWarning
      ? 79
      : 94;
  const bandAwareScore = Math.min(scoreCeiling, weightedScore);
  const signScore = clampSignScore(confirmedRedSignal ? Math.min(49, bandAwareScore) : bandAwareScore);
  const color = scoreColor(signScore);
  const label = color === "green" ? "LOOKS FAIR" : color === "amber" ? "ASK FIRST" : "DON'T SIGN YET";
  const headline = color === "green"
    ? "Looks fair. No major warning signs detected in this document."
    : color === "amber"
      ? failedUniqueSteps.length > 0
        ? "We couldn't finish every check, so we can't call this safe."
        : "Ask first. A few items should be clarified before signing."
      : confirmedSignalIds.length > 0
        ? "Don't sign yet. Several warning signs add up, and you confirmed a concern."
        : "Don't sign yet. Several significant warning signs add up. Verify first.";

  return {
    signScore,
    color, label, headline, totalPoints, breakdown, dimensions,
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
    const estimated = points === 0
      ? 94
      : points <= 4
        ? 79 - (points - 1) * 7 + Math.min(2, greens * 0.5)
        : 49 - (points - 5) * 5;
    const signScore = clampSignScore(points > 0 ? Math.min(79, estimated) : estimated);
    const color = scoreColor(signScore);
    const label = color === "green" ? "LOOKS FAIR" : color === "amber" ? "ASK FIRST" : "DON'T SIGN YET";
    const headline = color === "green"
      ? "Looks fair. No major warning signs detected."
      : color === "amber"
        ? "Ask first. A few items should be clarified before signing."
        : "Don't sign yet. Several significant warning signs add up. Verify first.";
    return {
      signScore,
      color, label, headline, totalPoints: points, breakdown: [],
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
