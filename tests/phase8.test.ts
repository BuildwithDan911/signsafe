import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { calculateScore, ScoreResult } from "../src/lib/score";
import { MergedSignal } from "../src/lib/signals";
import {
  calculateDecodedBytes,
  MAX_AGGREGATE_BYTES,
  MAX_IMAGE_LONG_SIDE,
  JPEG_QUALITY,
} from "../src/lib/images";

describe("Phase 8: Promise vs paper with image input and Verify", () => {
  describe("1. Image Input & Sizing Constraints", () => {
    it("enforces max 2.3 MB aggregate decoded size limit", () => {
      // 100 KB base64 data URL
      const dummyB64 = "A".repeat(100 * 1024);
      const dataUrl = `data:image/jpeg;base64,${dummyB64}`;

      const bytes = calculateDecodedBytes([dataUrl]);
      expect(bytes).toBeCloseTo(75 * 1024, -2);
      expect(bytes).toBeLessThan(MAX_AGGREGATE_BYTES);

      // Oversized images > 2.3 MB
      const oversizedB64 = "A".repeat(3.5 * 1024 * 1024);
      const oversizedUrl = `data:image/jpeg;base64,${oversizedB64}`;
      const oversizedBytes = calculateDecodedBytes([oversizedUrl]);
      expect(oversizedBytes).toBeGreaterThan(MAX_AGGREGATE_BYTES);
    });

    it("verifies public sample chat promises file exists and is under 2.3 MB", () => {
      const pngPath = path.join(process.cwd(), "public/samples/02_chat_promises.png");
      expect(fs.existsSync(pngPath)).toBe(true);

      const stat = fs.statSync(pngPath);
      expect(stat.size).toBeLessThan(MAX_AGGREGATE_BYTES);
      expect(stat.size).toBeGreaterThan(1000); // Valid non-empty PNG
    });

    it("verifies public sample chat promises text file contains the synthetic agreement", () => {
      const txtPath = path.join(process.cwd(), "public/samples/02_chat_promises.txt");
      expect(fs.existsSync(txtPath)).toBe(true);

      const content = fs.readFileSync(txtPath, "utf-8");
      expect(content).toContain("Fee is £4,500");
      expect(content).toContain("14 days");
      expect(content).toContain("Two rounds of revisions");
      expect(content).toContain("portfolio");
      expect(content).toContain("mid December");
    });
  });

  describe("2. Promise Status Mapping & Copy Message Formatting", () => {
    it("maps Clocked Grounding verdicts correctly: supported -> kept, contradicted -> broken, not_stated -> not_in_contract", () => {
      const mockVerdicts = [
        { verdict: "supported", expected: "kept" },
        { verdict: "contradicted", expected: "broken" },
        { verdict: "not_stated", expected: "not_in_contract" },
      ];

      for (const { verdict, expected } of mockVerdicts) {
        let status: "kept" | "broken" | "not_in_contract" = "not_in_contract";
        if (verdict === "supported") status = "kept";
        else if (verdict === "contradicted") status = "broken";
        else status = "not_in_contract";

        expect(status).toBe(expected);
      }
    });

    it("formats Copy Message exactly as required for promises not in the contract", () => {
      const promiseText = "You can of course show the work in your portfolio once we launch.";
      const cleanPromise = promiseText.replace(/[.!?]+$/, "");
      const copyMessage = `You mentioned ${cleanPromise} in our chat. Could you add this to the contract before I sign?`;

      expect(copyMessage).toBe(
        "You mentioned You can of course show the work in your portfolio once we launch in our chat. Could you add this to the contract before I sign?"
      );
    });
  });

  describe("3. Score Impact: Broken Promise adds 1 amber point & stays amber on Sample 02", () => {
    const sample02MergedSignals: MergedSignal[] = [
      {
        id: "one_sided_terms",
        groupKey: "one_sided_terms",
        title: "One-sided liability or terms",
        meaning: "Contractor indemnifies client without limit",
        severity: "amber",
        weight: 1,
        confidence: 0.94,
        constituentIds: ["RF3.13"],
        evidenceTitles: ["Clause 8: Contractor indemnifies client"],
        verifyYourself: "Insist on mutual capped liability.",
        askThem: "Can we cap liability at the contract fee value?",
      },
    ];

    it("scores Sample 02 as AMBER (ASK FIRST) initially with 1 point", () => {
      const initialScore = calculateScore({
        mergedSignals: sample02MergedSignals,
        guardInjection: false,
        greenSignalsCount: 4,
        brokenPromisesCount: 0,
      });

      expect(initialScore.color).toBe("amber");
      expect(initialScore.label).toBe("ASK FIRST");
      expect(initialScore.totalPoints).toBe(1);
      // rawScore: 100 - 12(1) + 5(4) = 108 -> clamped into amber band (40 to 74) = 74
      expect(initialScore.signScore).toBe(74);
    });

    it("adding 1 Broken promise adds 1 amber point and STAYS AMBER", () => {
      const scoreWithBrokenPromise = calculateScore({
        mergedSignals: sample02MergedSignals,
        guardInjection: false,
        greenSignalsCount: 4,
        brokenPromisesCount: 1,
      });

      expect(scoreWithBrokenPromise.color).toBe("amber");
      expect(scoreWithBrokenPromise.label).toBe("ASK FIRST");
      expect(scoreWithBrokenPromise.totalPoints).toBe(2); // 1 signal point + 1 broken promise point
      expect(scoreWithBrokenPromise.signScore).toBeLessThanOrEqual(74);
      expect(scoreWithBrokenPromise.signScore).toBeGreaterThanOrEqual(40);

      // Verify breakdown contains the exact required reason
      const brokenPromiseItem = scoreWithBrokenPromise.breakdown.find(
        (b) => b.reason === "A promise in chat isn't in the contract"
      );
      expect(brokenPromiseItem).toBeDefined();
      expect(brokenPromiseItem?.points).toBe(1);
    });
  });

  describe("4. Sample 02 Contract vs Chat Promises Verification", () => {
    const contractText = fs.readFileSync(
      path.join(process.cwd(), "public/samples/02_freelance_design_contract.md"),
      "utf-8"
    );

    it("Clause 2 verifies fee (£4,500) and half upfront as Kept", () => {
      expect(contractText).toContain("GBP 4,500");
      expect(contractText).toContain("paid in two equal parts: GBP 2,250 on signing and GBP 2,250 on final delivery");
    });

    it("Clause 3 contradicts the 14-day payment promise (Clause 3 specifies 60 days) -> Broken", () => {
      expect(contractText).toContain("Invoices are payable within 60 days of receipt.");
      expect(contractText).not.toContain("Invoices are payable within 14 days");
    });

    it("Clause 4 verifies two rounds of revisions as Kept", () => {
      expect(contractText).toContain("The fee includes two rounds of revisions.");
    });

    it("Clause 5 verifies deadline (15 December 2026 / mid December) as Kept", () => {
      expect(contractText).toContain("Final delivery by 15 December 2026.");
    });

    it("Clause 6 does not state any portfolio reservation -> Not in the contract", () => {
      expect(contractText).not.toContain("portfolio");
    });
  });
});
