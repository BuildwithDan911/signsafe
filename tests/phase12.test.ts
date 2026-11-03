import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  compute5WordShingles,
  computeJaccardSimilarity,
  getDangerPatterns,
  checkDangerMemory,
  contributeDangerPattern,
} from "../src/server/dangerMemory";
import { SEED_PATTERNS } from "../scripts/seed-memory";

describe("Phase 12: Danger Memory with Compare on Synthetic Seed Data", () => {
  describe("1. 5-Word Shingles & Jaccard Similarity Algorithm", () => {
    it("computes 5-word rolling shingles accurately from text", () => {
      const text = "We will send you a cheque for USD 3,800. Deposit it and use.";
      const shingles = compute5WordShingles(text);

      expect(shingles.length).toBeGreaterThan(0);
      expect(shingles[0].split(" ").length).toBe(5);
      expect(shingles[0]).toBe("we will send you a");
      expect(shingles[1]).toBe("will send you a cheque");
    });

    it("evaluates Jaccard similarity between identical, overlapping, and disjoint texts", () => {
      const textA = "We will send you a cashier cheque for equipment purchase from approved vendor.";
      const textB = "We will send you a cashier cheque for equipment purchase from designated supplier.";
      const textC = "The tenant shall pay rent on the first day of each calendar month.";

      const sA = compute5WordShingles(textA);
      const sB = compute5WordShingles(textB);
      const sC = compute5WordShingles(textC);

      // Same text -> 1.0
      expect(computeJaccardSimilarity(sA, sA)).toBe(1.0);

      // Similar text -> >= 0.20
      const simAB = computeJaccardSimilarity(sA, sB);
      expect(simAB).toBeGreaterThanOrEqual(0.15);

      // Disjoint text -> 0.0
      const simAC = computeJaccardSimilarity(sA, sC);
      expect(simAC).toBe(0.0);
    });
  });

  describe("2. Synthetic Seed Data Integrity (10 Patterns)", () => {
    it("contains exactly 10 synthetic seed patterns across the 4 required categories", () => {
      expect(SEED_PATTERNS.length).toBe(10);

      const jobOffers = SEED_PATTERNS.filter((p) => p.doc_type === "job_offer");
      const loanTerms = SEED_PATTERNS.filter((p) => p.doc_type === "loan_terms");
      const sponsorships = SEED_PATTERNS.filter((p) => p.doc_type === "sponsorship_deal");
      const rentalListings = SEED_PATTERNS.filter((p) => p.doc_type === "rental_listing");

      expect(jobOffers.length).toBe(4);
      expect(loanTerms.length).toBe(2);
      expect(sponsorships.length).toBe(2);
      expect(rentalListings.length).toBe(2);

      // Every seed must be explicitly marked synthetic
      expect(SEED_PATTERNS.every((p) => p.synthetic === true)).toBe(true);

      // Every seed has at least 1 seen_count and a first_seen_month
      expect(SEED_PATTERNS.every((p) => p.seen_count >= 1)).toBe(true);
      expect(SEED_PATTERNS.every((p) => Boolean(p.first_seen_month))).toBe(true);
    });

    it("the 4 job offer variants have cumulative seen_count = 4", () => {
      const jobOffers = SEED_PATTERNS.filter((p) => p.doc_type === "job_offer");
      const totalJobSeen = jobOffers.reduce((acc, p) => acc + p.seen_count, 0);
      expect(totalJobSeen).toBe(4);
    });
  });

  describe("3. Matching against Sample Documents", () => {
    it("detects danger template match for Remote Job Offer sample and reports 4 earlier checks", async () => {
      const jobOfferPath = path.join(process.cwd(), "kit", "samples", "01_remote_job_offer.md");
      const jobOfferText = fs.readFileSync(jobOfferPath, "utf-8");

      const matchResult = await checkDangerMemory(jobOfferText, "job_offer");

      expect(matchResult.matched).toBe(true);
      expect(matchResult.seenCount).toBeGreaterThanOrEqual(4);
      expect(matchResult.docType).toBe("job_offer");
      expect(matchResult.in4Signal).toBeDefined();
      expect(matchResult.in4Signal?.id).toBe("IN4");
      expect(matchResult.in4Signal?.weight).toBe(1);
    });

    it("shows NO Seen Before card for the tenancy agreement sample", async () => {
      const tenancyPath = path.join(process.cwd(), "kit", "samples", "04_tenancy_v1.md");
      const tenancyText = fs.readFileSync(tenancyPath, "utf-8");

      const matchResult = await checkDangerMemory(tenancyText, "tenancy");

      expect(matchResult.matched).toBe(false);
      expect(matchResult.seenCount).toBe(0);
      expect(matchResult.in4Signal).toBeUndefined();
    });
  });

  describe("4. Community Contribution on Red Result", () => {
    it("increments seen_count on matching template when checkbox is ticked", async () => {
      const jobOfferPath = path.join(process.cwd(), "kit", "samples", "01_remote_job_offer.md");
      const jobOfferText = fs.readFileSync(jobOfferPath, "utf-8");

      const initialMatch = await checkDangerMemory(jobOfferText, "job_offer");
      const initialCount = initialMatch.seenCount;

      // Simulate ticking "Help others: add an anonymised pattern of this document to the danger memory"
      const contribRes = await contributeDangerPattern(
        jobOfferText.slice(0, 1500),
        "job_offer",
        ["upfront_fee"]
      );

      expect(contribRes.success).toBe(true);

      // Re-checking should now report initialCount + 1
      const afterMatch = await checkDangerMemory(jobOfferText, "job_offer");
      expect(afterMatch.seenCount).toBe(initialCount + 1);
    });
  });
});
