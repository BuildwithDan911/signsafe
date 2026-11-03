import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { calculateScore } from "../src/lib/score";
import { checkRateLimit, resetRateLimit } from "../src/server/store";

describe("Phase 10: Judge Mode, credit counter, and graceful failures", () => {
  describe("1. Safety Step Failure Invariance Rule (score.ts)", () => {
    it("ensures a clean document with 0 signals is capped at amber if Guard fails", () => {
      const result = calculateScore({
        mergedSignals: [],
        guardInjection: false,
        inspectMalicious: false,
        greenSignalsCount: 2,
        failedSafetySteps: ["guard"],
      });

      expect(result.color).toBe("amber");
      expect(result.label).toBe("ASK FIRST");
      expect(result.signScore).toBeLessThanOrEqual(74);
      expect(result.signScore).toBeGreaterThanOrEqual(40);
      expect(result.headline).toBe(
        "We couldn't finish every check, so we can't call this safe."
      );
    });

    it("ensures a clean document is capped at amber if Inspect fails", () => {
      const result = calculateScore({
        mergedSignals: [],
        failedSafetySteps: ["inspect"],
      });

      expect(result.color).toBe("amber");
      expect(result.label).toBe("ASK FIRST");
      expect(result.signScore).toBeLessThanOrEqual(74);
      expect(result.headline).toBe(
        "We couldn't finish every check, so we can't call this safe."
      );
    });

    it("ensures a clean document is capped at amber if Protect fails", () => {
      const result = calculateScore({
        mergedSignals: [],
        failedSafetySteps: ["protect"],
      });

      expect(result.color).toBe("amber");
      expect(result.label).toBe("ASK FIRST");
      expect(result.signScore).toBeLessThanOrEqual(74);
      expect(result.headline).toBe(
        "We couldn't finish every check, so we can't call this safe."
      );
    });

    it("allows clean document to be green when all safety steps succeed", () => {
      const result = calculateScore({
        mergedSignals: [],
        guardInjection: false,
        inspectMalicious: false,
        greenSignalsCount: 1,
        failedSafetySteps: [],
      });

      expect(result.color).toBe("green");
      expect(result.label).toBe("LOOKS FAIR");
      expect(result.signScore).toBeGreaterThanOrEqual(75);
    });

    it("keeps red result red even if safety steps failed (danger signals take priority)", () => {
      const result = calculateScore({
        mergedSignals: [
          {
            id: "RF1.1",
            groupKey: "upfront_fee",
            title: "Upfront fee before work begins",
            meaning: "Asking for money before starting",
            severity: "red",
            weight: 3,
            confidence: 0.95,
            constituentIds: ["RF1.1"],
            evidenceTitles: ["Upfront fee"],
            verifyYourself: "Never pay upfront to get a job.",
          },
        ],
        guardInjection: true, // +4 points
        failedSafetySteps: ["inspect"],
      });

      expect(result.color).toBe("red");
      expect(result.label).toBe("DON'T SIGN YET");
      expect(result.signScore).toBeLessThanOrEqual(39);
    });
  });

  describe("2. Rate Limiter (5 live checks per hour per IP)", () => {
    const testIp = "198.51.100.99";

    beforeEach(async () => {
      await resetRateLimit(testIp);
    });

    it("allows up to 5 checks within the hour window", async () => {
      for (let i = 1; i <= 5; i++) {
        const res = await checkRateLimit(testIp, 5, 3600);
        expect(res.allowed).toBe(true);
        expect(res.count).toBe(i);
        expect(res.remaining).toBe(5 - i);
      }
    });

    it("rejects the 6th check from the same IP with allowed: false", async () => {
      // Consume 5 checks
      for (let i = 1; i <= 5; i++) {
        await checkRateLimit(testIp, 5, 3600);
      }

      // 6th check should be denied
      const res6 = await checkRateLimit(testIp, 5, 3600);
      expect(res6.allowed).toBe(false);
      expect(res6.count).toBe(6);
      expect(res6.remaining).toBe(0);
      expect(res6.resetSeconds).toBeGreaterThan(0);
    });

    it("resets rate limit properly with resetRateLimit", async () => {
      // Consume 5 checks and verify blocked
      for (let i = 1; i <= 5; i++) {
        await checkRateLimit(testIp, 5, 3600);
      }
      const blocked = await checkRateLimit(testIp, 5, 3600);
      expect(blocked.allowed).toBe(false);

      // Reset
      await resetRateLimit(testIp);

      // Should be allowed again
      const afterReset = await checkRateLimit(testIp, 5, 3600);
      expect(afterReset.allowed).toBe(true);
      expect(afterReset.count).toBe(1);
      expect(afterReset.remaining).toBe(4);
    });

    it("evaluates different IPs independently", async () => {
      const otherIp = "203.0.113.88";
      await resetRateLimit(otherIp);

      // Exhaust testIp
      for (let i = 1; i <= 6; i++) {
        await checkRateLimit(testIp, 5, 3600);
      }

      // otherIp should still be fully allowed
      const res = await checkRateLimit(otherIp, 5, 3600);
      expect(res.allowed).toBe(true);
      expect(res.count).toBe(1);

      await resetRateLimit(otherIp);
    });
  });

  describe("3. Judge Mode Recorded Fixtures Integrity", () => {
    const fixturesDir = path.join(process.cwd(), "fixtures", "judge");

    it("has all 3 required fixture files saved", () => {
      expect(fs.existsSync(path.join(fixturesDir, "job_offer.json"))).toBe(true);
      expect(fs.existsSync(path.join(fixturesDir, "freelance_contract.json"))).toBe(true);
      expect(fs.existsSync(path.join(fixturesDir, "tenancy_compare.json"))).toBe(true);
    });

    it("fixtures contain valid recordedAt timestamps and totalCredits", () => {
      const job = JSON.parse(
        fs.readFileSync(path.join(fixturesDir, "job_offer.json"), "utf-8")
      );
      expect(job.recordedAt).toBeDefined();
      expect(new Date(job.recordedAt).getTime()).not.toBeNaN();
      expect(typeof job.totalCredits).toBe("number");

      const freelance = JSON.parse(
        fs.readFileSync(path.join(fixturesDir, "freelance_contract.json"), "utf-8")
      );
      expect(freelance.recordedAt).toBeDefined();
      expect(typeof freelance.totalCredits).toBe("number");

      const tenancy = JSON.parse(
        fs.readFileSync(path.join(fixturesDir, "tenancy_compare.json"), "utf-8")
      );
      expect(tenancy.recordedAt).toBeDefined();
      expect(typeof tenancy.totalCredits).toBe("number");
    });

    it("job_offer.json matches Phase 10 spec (red seal, confirmed fee)", () => {
      const job = JSON.parse(
        fs.readFileSync(path.join(fixturesDir, "job_offer.json"), "utf-8")
      );
      expect(job.scoreResult.color).toBe("red");
      expect(job.scoreResult.label).toBe("DON'T SIGN YET");
      expect(job.confirmedIds).toContain("UPFRONT_PAYMENT");
      expect(job.guard.injection).toBeTruthy();
    });

    it("freelance_contract.json matches Phase 10 spec (amber seal, ask anything, promises)", () => {
      const freelance = JSON.parse(
        fs.readFileSync(path.join(fixturesDir, "freelance_contract.json"), "utf-8")
      );
      expect(freelance.scoreResult.color).toBe("amber");
      expect(freelance.ask.question).toBe("When do I get paid?");
      expect(freelance.ask.response.answer).toBeDefined();
      expect(freelance.promises.items.length).toBeGreaterThanOrEqual(3);
    });

    it("tenancy_compare.json matches Phase 10 spec (red seal, worse changes)", () => {
      const tenancy = JSON.parse(
        fs.readFileSync(path.join(fixturesDir, "tenancy_compare.json"), "utf-8")
      );
      expect(tenancy.compare.sealColor).toBe("red");
      expect(tenancy.compare.changes.length).toBeGreaterThanOrEqual(3);
    });
  });
});
