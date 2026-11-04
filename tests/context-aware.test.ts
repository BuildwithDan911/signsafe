import { describe, expect, it } from "vitest";
import { applyDealContext, DealContext, MergedSignal } from "../src/lib/signals";
import { calculateScore } from "../src/lib/score";

describe("deal context scoring", () => {
  const clause = "Invoices are payable within 60 days of receipt.";

  it("scores the same long payment clause differently for buyer and freelancer being paid", () => {
    const buyerContext: DealContext = { dealType: "freelance_agreement", role: "paying", relationship: "business_to_business" };
    const freelancerContext: DealContext = { dealType: "freelance_agreement", role: "being_paid", relationship: "business_to_business" };
    const buyerSignals = applyDealContext([], buyerContext, clause);
    const freelancerSignals = applyDealContext([], freelancerContext, clause);
    expect(buyerSignals).toHaveLength(0);
    expect(freelancerSignals).toHaveLength(1);
    expect(freelancerSignals[0].contextReason).toContain("60 days is a long wait");
    expect(calculateScore({ mergedSignals: buyerSignals }).color).toBe("green");
    expect(calculateScore({ mergedSignals: freelancerSignals }).color).toBe("amber");
  });

  it("uses the best-guess path unchanged when the user skips context", () => {
    const signal = {
      id: "upfront_fee", groupKey: "upfront_fee", title: "Upfront fee", meaning: "A fee is requested.", severity: "red",
      weight: 3, confidence: 0.9, constituentIds: ["RF1.2"], evidenceTitles: [], verifyYourself: "Check the fee.",
    } as MergedSignal;
    expect(applyDealContext([signal], { dealType: "job_offer", skipped: true }, "Fee required.")).toEqual([signal]);
  });

  it("adds a separate flag for explicit uncapped liability on the user's side", () => {
    const text = "The Designer’s total liability under this agreement is unlimited.";
    const signals = applyDealContext([], { dealType: "freelance_agreement", role: "freelancer" }, text);
    expect(signals.map((signal) => signal.id)).toContain("RF3.15");
    expect(signals.find((signal) => signal.id === "RF3.15")?.evidenceTitles[0]).toContain("liability under this agreement is unlimited");
  });

  it("does not flag explicit uncapped liability that applies to the other party", () => {
    const text = "The Designer’s total liability under this agreement is unlimited.";
    expect(applyDealContext([], { dealType: "freelance_agreement", role: "paying" }, text)).toEqual([]);
  });

  it("downgrades a refundable tenancy deposit and balanced B2B liability from warning signals", () => {
    const deposit = { id: "upfront_fee", constituentIds: ["RF1.2"] } as MergedSignal;
    const liability = { id: "liability", constituentIds: ["RF3.13"] } as MergedSignal;
    expect(applyDealContext([deposit], { dealType: "tenancy_lease", role: "tenant" }, "Tenant pays a refundable security deposit."))
      .toEqual([]);
    expect(applyDealContext([liability], { dealType: "service_contract", role: "service_provider", relationship: "business_to_business" }, "Each party is liable for its own negligence."))
      .toEqual([]);
  });
});
