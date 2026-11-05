import jobOfferFixture from "../../fixtures/judge/job_offer.json";
import freelanceFixture from "../../fixtures/judge/freelance_contract.json";
import tenancyCompareFixture from "../../fixtures/judge/tenancy_compare.json";

export interface JudgeSampleOption {
  id: "job_offer" | "freelance_contract" | "tenancy_compare";
  title: string;
  badge: string;
  sealColor: "red" | "amber" | "green";
  description: string;
  highlights: string[];
  destination: "/scan" | "/changes";
  fixture: unknown;
}

export const JUDGE_SAMPLES: JudgeSampleOption[] = [
  {
    id: "job_offer",
    title: "Remote Job Offer",
    badge: "Word DOCX • Prompt Injection • Fee Trap",
    sealColor: "red",
    description:
      "Word document with hidden white-text prompt injection, upfront equipment fee, and check-and-refund trap. Shows confirmed red flags and automatic AI prompt quarantining.",
    highlights: [
      "Quarantines AI prompt injection span",
      "Highlights USD 150 upfront fee",
      "Follow-up question confirmed 'Yes'",
      "Ends on Red Seal (Don't sign yet)",
    ],
    destination: "/scan",
    fixture: jobOfferFixture,
  },
  {
    id: "freelance_contract",
    title: "Freelance Contract + Chat Promises",
    badge: "Markdown + Chat Screenshot • Rerank • Verify",
    sealColor: "amber",
    description:
      "Design contract with unlimited liability in clause 8. Features WhatsApp chat screenshot promises verified against contract terms and 'When do I get paid?' grounded clause search.",
    highlights: [
      "Highlights clause 8 one-sided liability",
      "Ask anything: 'When do I get paid?' (clause 3)",
      "Chat promise: invoices in 14 vs 60 days (Broken ❌)",
      "Ends on Amber Seal (Ask first)",
    ],
    destination: "/scan",
    fixture: freelanceFixture,
  },
  {
    id: "tenancy_compare",
    title: "Tenancy: What Changed?",
    badge: "Compare Two Versions • Local Diff • Decide",
    sealColor: "red",
    description:
      "Direct comparison between Version 1 and Version 2 of a tenancy lease. Detects 4 changes in meaning, all evaluated as worse for the tenant, while ignoring unchanged clauses.",
    highlights: [
      "4 changes in meaning, all worse for you",
      "Clauses 3 (renewal), 4 (rent), 5 (fee), 8 (arbitration)",
      "Before & after marker diffs with Copy message",
      "Ends on Red Seal (Worse terms)",
    ],
    destination: "/changes",
    fixture: tenancyCompareFixture,
  },
];

export function getJudgeSampleById(id: string): JudgeSampleOption | undefined {
  return JUDGE_SAMPLES.find((s) => s.id === id);
}
