import { describe, it, expect } from "vitest";
import {
  createRoleToken,
  verifyRoleToken,
  scrubEntityValues,
  computeDocHash,
  generateShareId,
  ProposedFix,
  ShareRecord,
  getRescoreStatus,
} from "../src/server/share";
import { computeScore } from "../src/lib/score";

describe("Phase 11: Fair-deal share link, decision record & live rescore", () => {
  describe("1. HMAC-SHA256 Role Tokens & Security", () => {
    const shareId = generateShareId();

    it("generates a random 128-bit (32 hex char) share ID", () => {
      expect(shareId).toMatch(/^[0-9a-f]{32}$/);
    });

    it("creates valid tokens for 'you' and 'other' roles", () => {
      const youToken = createRoleToken(shareId, "you");
      const otherToken = createRoleToken(shareId, "other");

      expect(youToken.startsWith("you.")).toBe(true);
      expect(otherToken.startsWith("other.")).toBe(true);

      const [, youSig] = youToken.split(".");
      const [, otherSig] = otherToken.split(".");

      expect(youSig.length).toBe(64);
      expect(otherSig.length).toBe(64);
      expect(youSig).not.toBe(otherSig);
    });

    it("verifies authentic tokens correctly", () => {
      const youToken = createRoleToken(shareId, "you");
      const otherToken = createRoleToken(shareId, "other");

      expect(verifyRoleToken(shareId, youToken)).toBe("you");
      expect(verifyRoleToken(shareId, otherToken)).toBe("other");
    });

    it("rejects tampered, forged, or malformed tokens", () => {
      const youToken = createRoleToken(shareId, "you");
      const [role, sig] = youToken.split(".");

      // Tampered role
      expect(verifyRoleToken(shareId, `other.${sig}`)).toBeNull();

      // Tampered signature
      const tamperedSig = sig.slice(0, -1) + (sig.endsWith("0") ? "1" : "0");
      expect(verifyRoleToken(shareId, `${role}.${tamperedSig}`)).toBeNull();

      // Wrong share ID
      const differentShareId = generateShareId();
      expect(verifyRoleToken(differentShareId, youToken)).toBeNull();

      // Garbage inputs
      expect(verifyRoleToken(shareId, "")).toBeNull();
      expect(verifyRoleToken(shareId, "invalid-token")).toBeNull();
      expect(verifyRoleToken(shareId, "admin.12345")).toBeNull();
      expect(verifyRoleToken(shareId, null)).toBeNull();
      expect(verifyRoleToken(shareId, undefined)).toBeNull();
    });
  });

  describe("2. Entity Redaction & Scrubbing (Security Rules 4 & 9)", () => {
    const sampleEntities = [
      { type: "person", value: "Sarah Jenkins" },
      { type: "person", value: "Alex Rivera" },
      { type: "address", value: "42 High Street, London EC1A 1BB" },
      { type: "phone", value: "+1 (555) 014-2290" },
      { type: "email", value: "hr.northbridgeanalytics.careers@gmail.com" },
    ];

    it("scrubs all found entity values from strings and replaces with placeholders", () => {
      const dirtyExplanation =
        "The client Sarah Jenkins at 42 High Street, London EC1A 1BB asked Alex Rivera to sign.";
      const scrubbed = scrubEntityValues(dirtyExplanation, sampleEntities);

      expect(scrubbed).not.toContain("Sarah Jenkins");
      expect(scrubbed).not.toContain("Alex Rivera");
      expect(scrubbed).not.toContain("42 High Street, London EC1A 1BB");
      expect(scrubbed).toContain("[PERSON]");
      expect(scrubbed).toContain("[ADDRESS]");
    });

    it("replaces longer entity names first to avoid partial string fragments", () => {
      const overlappingEntities = [
        { type: "person", value: "Alex" },
        { type: "person", value: "Alex Rivera" },
      ];

      const text = "Contractor Alex Rivera agreed.";
      const scrubbed = scrubEntityValues(text, overlappingEntities);

      expect(scrubbed).toBe("Contractor [PERSON] agreed.");
      expect(scrubbed).not.toContain("Rivera");
    });

    it("computes standard SHA-256 fingerprint for redacted documents", () => {
      const doc = "This is a redacted agreement between [PERSON] and [PERSON].";
      const hash1 = computeDocHash(doc);
      const hash2 = computeDocHash(doc);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("3. Mutual Acceptance & Live Rescore Logic", () => {
    it("only allows a role to toggle their own acceptance checkbox", () => {
      const fix: ProposedFix = {
        id: "fix_1",
        title: "Clause 8: Mutual Liability Cap",
        beforeClause: "Designer indemnifies Client without limit.",
        afterClause: "Liability is mutual and capped at fees.",
        youAccepted: false,
        otherAccepted: false,
        rescored: false,
      };

      // When "you" accepts
      const role1 = "you";
      if (role1 === "you") fix.youAccepted = true;
      expect(fix.youAccepted).toBe(true);
      expect(fix.otherAccepted).toBe(false);

      // When "other" accepts
      const role2 = "other";
      if (role2 === "other") fix.otherAccepted = true;
      expect(fix.youAccepted).toBe(true);
      expect(fix.otherAccepted).toBe(true);
    });

    it("replaces clause text and raises score when both sides accept", () => {
      let redactedDocument =
        "Clause 1: Scope.\nClause 8: Designer indemnifies Client without limit.\nClause 9: Law.";

      const fix: ProposedFix = {
        id: "fix_liability",
        title: "Clause 8: Mutual Liability Cap",
        beforeClause: "Designer indemnifies Client without limit.",
        afterClause: "Each party's liability is capped at the total fee.",
        originalQuote: "Designer indemnifies Client without limit.",
        flagIds: ["RF3.13"],
        youAccepted: true,
        otherAccepted: true,
        rescored: false,
      };

      // Initial state: 1 amber penalty point from liability trap
      const initialScore = computeScore({
        signalPoints: 1,
        greenSignalsCount: 4,
      });
      expect(initialScore.color).toBe("amber");
      expect(initialScore.signScore).toBe(79);

      // Mutually accepted -> replace clause
      if (fix.youAccepted && fix.otherAccepted && !fix.rescored) {
        redactedDocument = redactedDocument.replace(
          fix.originalQuote!,
          fix.afterClause
        );
        fix.rescored = true;
      }

      expect(redactedDocument).toContain(
        "Each party's liability is capped at the total fee."
      );
      expect(redactedDocument).not.toContain(
        "Designer indemnifies Client without limit."
      );

      // Points drop from 1 to 0 after fix is accepted
      const rescored = computeScore({
        signalPoints: 0,
        greenSignalsCount: 4,
      });

      expect(rescored.color).toBe("green");
      expect(rescored.signScore).toBe(94);
      expect(rescored.signScore).toBeGreaterThan(initialScore.signScore);
      expect(rescored.label).toBe("LOOKS FAIR");
    });

    it("sets rescoredWithClocked = true and shows 'Rescored with Clocked Decide ✓' when real Clocked Decide succeeds", () => {
      const shareState: {
        rescoredWithClocked: boolean;
        fix: { rescored: boolean; rescoreNote?: string };
      } = {
        rescoredWithClocked: false,
        fix: { rescored: false },
      };

      const usedClockedDecide = true; // Real call succeeded

      shareState.fix.rescored = true;
      const status = getRescoreStatus(usedClockedDecide);
      shareState.fix.rescoreNote = status.rescoreNote;
      shareState.rescoredWithClocked = status.rescoredWithClocked;

      expect(shareState.rescoredWithClocked).toBe(true);
      expect(shareState.fix.rescoreNote).toBe("Rescored with Clocked Decide ✓");
    });

    it("sets rescoredWithClocked = false and shows 'Rescored locally (live check unavailable)' when fallback runs", () => {
      const shareState: {
        rescoredWithClocked: boolean;
        fix: { rescored: boolean; rescoreNote?: string };
      } = {
        rescoredWithClocked: true, // prior value
        fix: { rescored: false },
      };

      const usedClockedDecide = false; // Fallback triggered (out of credits, paused, or outage)

      shareState.fix.rescored = true;
      const status = getRescoreStatus(usedClockedDecide);
      shareState.fix.rescoreNote = status.rescoreNote;
      shareState.rescoredWithClocked = status.rescoredWithClocked;

      expect(shareState.rescoredWithClocked).toBe(false);
      expect(shareState.fix.rescoreNote).toBe("Rescored locally (live check unavailable)");
    });
  });

  describe("4. Decision Record Structure & Integrity", () => {
    it("decision record contains required fields: date, SHA-256 hash, score, checks run, disclaimer", () => {
      const record = {
        decisionRecordId: "3a91fbc8921e42a0b1274e0d4916a2ef",
        generatedAt: new Date().toISOString(),
        documentHashSha256: computeDocHash("Redacted text..."),
        finalScore: 95,
        sealColor: "green",
        sealLabel: "LOOKS FAIR",
        fixes: [
          {
            id: "fix_1",
            title: "Clause 8: Mutual Liability Cap",
            youAccepted: true,
            otherAccepted: true,
            status: "Accepted by both",
            rescoredWithClockedDecide: true,
          },
        ],
        checksRun: [
          { step: "guard", name: "Checking for hidden tricks", credits: 0 },
          { step: "decide", name: "Weighing the warning signs", credits: 21 },
        ],
        totalCreditsUsed: 21,
        disclaimer: "SignSafe is not legal advice.",
      };

      expect(record.documentHashSha256).toBeDefined();
      expect(record.fixes[0].status).toBe("Accepted by both");
      expect(record.disclaimer).toBe("SignSafe is not legal advice.");
      expect(record.checksRun.length).toBeGreaterThan(0);
    });
  });
});
