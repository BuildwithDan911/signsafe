import signalsData from "../data/signals.json";

export interface SignalDef {
  id: string;
  library: "RED_FLAGS" | "GIVEAWAYS" | "GREEN";
  title: string;
  meaning: string;
  severity: "red" | "amber" | "green";
  example?: string;
  askThem?: string;
  detectFrom?: string;
  checkedBy?: string;
  askUser?: string;
  ifYes?: string;
  verifyYourself?: string;
}

export interface MergedSignal {
  id: string;
  groupKey: string;
  title: string;
  meaning: string;
  severity: "red" | "amber" | "green";
  weight: number; // 3 for red, 1 for amber, 0 for green
  confidence: number;
  constituentIds: string[];
  evidenceTitles: string[];
  verifyYourself: string;
  askThem?: string;
  askUser?: string;
  ifYes?: string;
  isConfirmed?: boolean;
  contextReason?: string;
}

export interface DealContext {
  party?: string;
  role?: string;
  dealType?: string;
  transaction?: string;
  roughValue?: string;
  relationship?: string;
  other?: string;
  skipped?: boolean;
}

/** Apply a small set of explicit context rules after Clocked's evidence selection. */
export function applyDealContext(
  signals: MergedSignal[],
  context: DealContext | undefined,
  documentText: string
): MergedSignal[] {
  const activeContext = context && !context.skipped ? context : undefined;
  const lower = documentText.toLowerCase();
  const isTenant = activeContext?.role === "tenant" || activeContext?.role === "renting";
  const isB2B = activeContext?.relationship === "business_to_business";
  const hasRefundableTenancyDeposit = /\b(refundable|returnable)\b[\s\S]{0,60}\b(security\s+)?deposit\b|\bdeposit\b[\s\S]{0,60}\b(refundable|returnable)\b/i.test(documentText);
  const mutualLiability = /\b(each party|both parties|neither party)\b[\s\S]{0,180}\b(liab\w*|indemnif\w*)\b/i.test(documentText);

  let result = signals.filter((signal) => {
    if (!activeContext) return true;
    if (signal.id === "upfront_fee" && activeContext.dealType === "tenancy_lease" && isTenant && hasRefundableTenancyDeposit) return false;
    if ((signal.id === "liability" || signal.constituentIds?.includes("RF3.13")) && isB2B && mutualLiability) return false;
    return true;
  });

  const receivesPayment = ["service_provider", "freelancer", "seller", "being_paid"].includes(activeContext?.role || "");
  if ((activeContext?.dealType === "freelance_agreement" || activeContext?.dealType === "service_contract") && receivesPayment) {
    const longPayment = documentText.match(/\b(?:invoices?\s+(?:are\s+)?payable|paid|payment\s+(?:is\s+)?due)\s+(?:within|after)\s+(\d{2,3})\s+days\b/i);
    const days = longPayment ? Number(longPayment[1]) : 0;
    if (days > 30 && !result.some((signal) => signal.id === "payment_delay")) {
      result = [...result, {
        id: "payment_delay",
        groupKey: "payment_delay",
        title: "Long payment wait",
        meaning: `Payment is scheduled ${days} days after the invoice or work.`,
        severity: "amber",
        weight: 1,
        confidence: 1,
        constituentIds: [],
        evidenceTitles: [longPayment![0]],
        verifyYourself: "Ask whether the payment due date can be shortened and confirmed in writing.",
        askThem: "Could we shorten the payment period and state the due date in the agreement?",
        contextReason: `For a freelancer being paid, ${days} days is a long wait; ask whether 14–30 days is possible.`,
      }];
    }
  }
  const uncappedLiability = /\b(your|the signer|the\s+[A-Z][A-Za-z0-9&.-]*(?:\s+[A-Z][A-Za-z0-9&.-]*){0,2})['’]s?\s+(?:total\s+)?liability\b[\s\S]{0,80}\b(?:unlimited|uncapped|without\s+(?:any\s+)?(?:limit|cap)|no\s+(?:monetary\s+)?(?:limit|cap)|not\s+(?:be\s+)?limited)\b/i.exec(documentText);
  const subject = uncappedLiability?.[1].replace(/^the\s+/i, "").replace(/['’]s?$/i, "");
  const subjectIsServiceSide = /designer|contractor|consultant|service provider|freelancer|employee|worker|seller|tenant|borrower/i.test(subject || "");
  const subjectIsClientSide = /client|customer|buyer|company|employer|landlord|lender/i.test(subject || "");
  const role = activeContext?.role || "";
  const userIsServiceSide = /service_provider|freelancer|being_paid|being_hired|contractor|designer|seller|tenant|renting|borrower|borrowing/.test(role);
  const userIsClientSide = /client|hiring|paying|buyer|customer|employer|landlord|lender/.test(role);
  const explicitlyOtherSide = (userIsServiceSide && subjectIsClientSide) || (userIsClientSide && subjectIsServiceSide);
  if (uncappedLiability && !explicitlyOtherSide && !result.some((signal) => signal.id === "RF3.15")) {
    const definition = SIGNALS_MAP["RF3.15"];
    const subjectLabel = subject?.toLowerCase() === "your" ? "your" : subject ? `${subject}’s` : "the named party’s";
    result = [...result, {
      id: "RF3.15",
      groupKey: "RF3.15",
      title: definition?.title || "Uncapped liability",
      meaning: definition?.meaning || "A named party has unlimited liability with no monetary cap.",
      severity: definition?.severity || "red",
      weight: 3,
      confidence: 1,
      constituentIds: ["RF3.15"],
      evidenceTitles: [uncappedLiability[0].trim()],
      verifyYourself: definition?.verifyYourself || "Check whose liability is unlimited and ask for a clear cap.",
      askThem: definition?.askThem,
      askUser: `The agreement says ${subjectLabel} liability is unlimited. Are you the party named there?`,
      contextReason: activeContext
        ? `This clause expressly says ${subjectLabel} liability is unlimited, with no monetary cap.`
        : `The text expressly says ${subjectLabel} liability is unlimited. Check whether that named party is your side of the agreement.`,
    }];
  }

  if (!activeContext) return result;

  const side = ({
    being_hired: "person being hired", hiring: "person hiring", paying: "person paying",
    being_paid: "person being paid", service_provider: "service provider", freelancer: "freelancer",
    seller: "seller", tenant: "tenant", renting: "person renting", borrowing: "borrower",
  } as Record<string, string>)[activeContext.role || ""] || activeContext.role || "signing party";
  const deal = ({
    job_offer: "job offer", employment_contract: "employment contract", freelance_agreement: "freelance agreement",
    tenancy_lease: "tenancy", purchase_payment: "purchase or payment agreement", loan_credit: "loan",
    sponsorship_deal: "sponsorship agreement", terms_conditions: "terms and conditions", nda: "NDA",
  } as Record<string, string>)[activeContext.dealType || ""] || "agreement";
  return result.map((signal) => ({
    ...signal,
    contextReason: signal.contextReason || (() => {
      const meaning = String(signal.meaning || signal.title || "this term");
      return `For you as the ${side} in this ${deal}, this is important because ${meaning.charAt(0).toLowerCase()}${meaning.slice(1)}`;
    })(),
  }));
}

interface GroupDef {
  key: string;
  matchIds: string[];
  title: string;
  meaning: string;
  severity: "red" | "amber";
  verifyYourself: string;
  askUser?: string;
  ifYes?: string;
}

export const MERGE_GROUPS: GroupDef[] = [
  {
    key: "upfront_fee",
    matchIds: ["RF1.2", "MA2", "MA3", "MA4", "RF1.4"],
    title: "Upfront payment or advance fee required",
    meaning: "Asking for a deposit, training fee, or non-refundable payment before you start or receive money.",
    severity: "red",
    verifyYourself: "Ask them to deduct any fees from your earnings instead of paying upfront, and get it in writing.",
    askUser: "We found a fee you'd pay before starting or receiving money. Did they ask you to pay it upfront?",
    ifYes: "Real case: advance fees before starting work or receiving payout are the hallmark of advance-fee fraud.",
  },
  {
    key: "urgency",
    matchIds: ["RF1.1", "PR3", "RF1.7"],
    title: "High-pressure deadline to sign or pay",
    meaning: "Artificial urgency measured in hours so you cannot review terms, consult a lawyer, or verify details.",
    severity: "red",
    verifyYourself: "Request at least 48 to 72 hours in writing to review the agreement with an advisor.",
    askUser: "Have they told you this offer disappears if you don't sign or pay today?",
    ifYes: "Real case: artificial urgency is designed to stop victims from checking with family, banks, or lawyers.",
  },
  {
    key: "overpayment_vendor",
    matchIds: ["RF1.9", "MA1"],
    title: "Cheque overpayment or vendor supply trap",
    meaning: "They offer to send a cheque to purchase supplies or equipment from their designated vendor.",
    severity: "red",
    verifyYourself: "Insist that the employer provide equipment directly or use an official corporate procurement portal.",
    askUser: "Did they offer to send you a cheque to purchase equipment from their approved vendor?",
    ifYes: "Real case: counterfeit cashier cheques bounce after days, leaving you liable for what you forwarded to the vendor.",
  },
  {
    key: "secrecy_verification",
    matchIds: ["RF1.5", "SI9", "PR5"],
    title: "Demands for secrecy or circular self-verification",
    meaning: "Telling you to keep the deal private or giving you their own phone/portal to verify themselves.",
    severity: "red",
    verifyYourself: "Verify the organization through independent corporate registries (Companies House / SEC / CAC) rather than numbers in the document.",
    askUser: "Did they instruct you not to discuss this agreement with anyone or verify only through their contacts?",
    ifYes: "Real case: scammers isolate victims so external advisors cannot flag the warning signs.",
  },
  {
    key: "credential_harvesting",
    matchIds: ["RF1.10", "MA6", "MA5", "RF1.12"],
    title: "Premature collection of sensitive ID or banking data",
    meaning: "Demanding government ID, bank account details, or device access inside the agreement before formal hiring.",
    severity: "red",
    verifyYourself: "Do not share national identity numbers, passwords, or banking credentials until employment is independently confirmed.",
    askUser: "Does this document ask for your national ID, bank password, or device access before your first day?",
    ifYes: "Real case: identity theft rings use fake job offers to harvest government IDs and bank accounts.",
  },
  {
    key: "chat_interview",
    matchIds: ["PR1", "PB1", "PB2", "PR2"],
    title: "Chat-only interview with no formal screening",
    meaning: "Hiring after only a text-based chat on Telegram, WhatsApp, or Signal with no video or in-person interview.",
    severity: "red",
    verifyYourself: "Request a live video interview on official company software before signing or sharing documents.",
    askUser: "Was your interview conducted entirely via text chat on Telegram, WhatsApp, or Signal?",
    ifYes: "Real case: impersonators avoid video and voice calls because they cannot match the real executive's identity.",
  },
  {
    key: "company_identity",
    matchIds: ["SI1", "SI2", "SI3", "SI5", "SI6", "IN1", "IN2", "SI7"],
    title: "Inconsistent entity identity or free webmail contact",
    meaning: "Company name mismatches across sections, unverified registration numbers, or communication via free webmail.",
    severity: "red",
    verifyYourself: "Contact the company through their publicly listed switchboard on their verified domain.",
    askUser: "Did this offer come from a free webmail account (e.g. Gmail/Yahoo) claiming to represent a company?",
    ifYes: "Real case: legitimate organizations send contracts from their registered corporate domain, not free webmail.",
  },
  {
    key: "software_commands",
    matchIds: ["PB5", "PB6", "FM2", "FM3"],
    title: "Mandatory software download or terminal commands",
    meaning: "Requiring you to run terminal scripts, install unknown applications, or enable Word macros to view terms.",
    severity: "red",
    verifyYourself: "Never execute terminal commands or run executable attachments sent by external parties.",
    askUser: "Does this document instruct you to run command-line code or install custom software?",
    ifYes: "Real case: remote code execution droppers are frequently concealed in fake onboarding assignments.",
  },
  {
    key: "unrealistic_terms",
    matchIds: ["WD1", "WD2", "WD3", "WD4", "WD5", "WD6", "PR4", "IN5", "RF1.11"],
    title: "Unrealistic compensation & missing standard terms",
    meaning: "Excessive pay for trivial tasks, vague job duties, or standard protections omitted.",
    severity: "amber",
    verifyYourself: "Ask for a complete job description with defined working hours and reporting lines in writing.",
  },
  {
    key: "file_format",
    matchIds: ["FM1", "FM4", "FM5", "FM6", "FM7"],
    title: "Editable Word document template",
    meaning: "Contract delivered as an editable Word document rather than a secure PDF or verified e-signature envelope.",
    severity: "amber",
    verifyYourself: "Request the final executed agreement as a locked PDF or through a verified e-signature platform.",
  },
  {
    key: "one_sided_terms",
    matchIds: ["RF3.6", "RF3.13", "RF3.4", "RF3.3", "RF3.14", "RF3.1"],
    title: "Unlimited liability or one-sided terms",
    meaning: "One-sided liability, unilateral contract amendment rights, or perpetual rights without mutual protection.",
    severity: "red",
    verifyYourself: "Insist that liability is mutual and capped at the total fee value of the contract.",
    askUser: "Does the contract make you liable for all losses without limit or allow them to alter terms unilaterally?",
    ifYes: "Real case: one-sided liability clauses can expose contractors to catastrophic uncapped damages.",
  },
];

export const SIGNALS_MAP: Record<string, SignalDef> = {};
for (const s of signalsData as SignalDef[]) {
  SIGNALS_MAP[s.id] = s;
}

export function filterHighConfidenceSignals(
  answer: { selected?: string[]; probabilities?: Record<string, number> },
  threshold: number = 0.7
): { highConfidence: string[]; lowConfidence: string[] } {
  const highConfidence: string[] = [];
  const lowConfidence: string[] = [];
  const selected = answer.selected || [];
  const probs = answer.probabilities || {};

  for (const id of selected) {
    const p = probs[id] ?? 1.0;
    if (p >= threshold) {
      highConfidence.push(id);
    } else {
      lowConfidence.push(id);
    }
  }

  return { highConfidence, lowConfidence };
}

/**
 * Filters raw Decide answers using strict confidence thresholds:
 * - RED_FLAGS: 0.70
 * - GIVEAWAYS: 0.85
 * - GREEN: 0.50
 */
export function filterDecideByThreshold(
  rawAnswers: {
    contract_terms?: { selected?: string[]; probabilities?: Record<string, number> };
    authenticity_tells?: { selected?: string[]; probabilities?: Record<string, number> };
    green_signals?: { selected?: string[]; probabilities?: Record<string, number> };
  }
): {
  highConfidenceIds: string[];
  lowConfidenceIds: string[];
  probabilities: Record<string, number>;
  greenIds: string[];
} {
  const highConfidenceIds: string[] = [];
  const lowConfidenceIds: string[] = [];
  const probabilities: Record<string, number> = {};

  // 1. Process RED_FLAGS (threshold 0.70)
  const rfSelected = rawAnswers.contract_terms?.selected || [];
  const rfProbs = rawAnswers.contract_terms?.probabilities || {};
  for (const id of rfSelected) {
    const prob = rfProbs[id] ?? 1.0;
    probabilities[id] = prob;
    if (prob >= 0.70) {
      highConfidenceIds.push(id);
    } else {
      lowConfidenceIds.push(id);
    }
  }

  // 2. Process GIVEAWAYS (threshold 0.85)
  const gwSelected = rawAnswers.authenticity_tells?.selected || [];
  const gwProbs = rawAnswers.authenticity_tells?.probabilities || {};
  for (const id of gwSelected) {
    const prob = gwProbs[id] ?? 1.0;
    probabilities[id] = prob;
    if (prob >= 0.85) {
      highConfidenceIds.push(id);
    } else {
      lowConfidenceIds.push(id);
    }
  }

  // 3. Process GREEN signals (threshold 0.50)
  const grSelected = rawAnswers.green_signals?.selected || [];
  const grProbs = rawAnswers.green_signals?.probabilities || {};
  const greenIds: string[] = [];
  for (const id of grSelected) {
    const prob = grProbs[id] ?? 1.0;
    probabilities[id] = prob;
    if (prob >= 0.50) {
      greenIds.push(id);
    }
  }

  return {
    highConfidenceIds,
    lowConfidenceIds,
    probabilities,
    greenIds,
  };
}

/**
 * Merges high-confidence signals into thematic reason cards to eliminate noise.
 */
export function mergeSignals(
  signalIds: string[],
  probabilities: Record<string, number> = {}
): MergedSignal[] {
  const groupedSignals: Map<string, MergedSignal> = new Map();
  const matchedSignalIds = new Set<string>();

  // 1. Match against predefined thematic groups
  for (const group of MERGE_GROUPS) {
    const constituentIds = signalIds.filter((id) => group.matchIds.includes(id));
    if (constituentIds.length > 0) {
      constituentIds.forEach((id) => matchedSignalIds.add(id));

      const evidenceTitles = constituentIds
        .map((id) => SIGNALS_MAP[id]?.title || id)
        .filter(Boolean);

      const maxConfidence = Math.max(
        ...constituentIds.map((id) => probabilities[id] ?? 0.95)
      );

      // Check if any constituent has an askUser question
      const sampleWithQuestion = constituentIds
        .map((id) => SIGNALS_MAP[id])
        .find((s) => s?.askUser);

      groupedSignals.set(group.key, {
        id: group.key,
        groupKey: group.key,
        title: group.title,
        meaning: group.meaning,
        severity: group.severity,
        weight: group.severity === "red" ? 3 : 1,
        confidence: maxConfidence,
        constituentIds,
        evidenceTitles,
        verifyYourself: group.verifyYourself,
        askThem: sampleWithQuestion?.askThem,
        askUser: group.askUser || sampleWithQuestion?.askUser,
        ifYes: group.ifYes || sampleWithQuestion?.ifYes,
      });
    }
  }

  // 2. Add any unmatched signals as standalone merged signals
  for (const id of signalIds) {
    if (!matchedSignalIds.has(id)) {
      const def = SIGNALS_MAP[id];
      const severity = def?.severity || (id.startsWith("RF") ? "red" : "amber");
      groupedSignals.set(id, {
        id,
        groupKey: id,
        title: def?.title || id,
        meaning: def?.meaning || "Document warning signal detected",
        severity,
        weight: severity === "red" ? 3 : 1,
        confidence: probabilities[id] ?? 0.9,
        constituentIds: [id],
        evidenceTitles: [def?.title || id],
        verifyYourself:
          def?.verifyYourself || "Ask them to clarify this term in writing before signing.",
        askThem: def?.askThem,
        askUser: def?.askUser,
        ifYes: def?.ifYes,
      });
    }
  }

  // 3. Rank: primary sort by weight (red=3 first), secondary by confidence
  const sorted = Array.from(groupedSignals.values()).sort((a, b) => {
    if (b.weight !== a.weight) {
      return b.weight - a.weight;
    }
    return b.confidence - a.confidence;
  });

  return sorted;
}
