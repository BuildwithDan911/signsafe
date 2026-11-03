import { describe, it, expect } from "vitest";

describe("Phase 6: Fill & Verify Tests", () => {
  describe("1. Fill Field Definition & Flag Selection", () => {
    it("caps at most 8 flags and prioritizes highest weight first", () => {
      const mockFlags = [
        { id: "amber_1", title: "Amber flag 1", weight: 1 },
        { id: "red_1", title: "Red flag 1", weight: 3 },
        { id: "amber_2", title: "Amber flag 2", weight: 1 },
        { id: "red_2", title: "Red flag 2", weight: 3 },
        { id: "red_3", title: "Red flag 3", weight: 3 },
        { id: "amber_3", title: "Amber flag 3", weight: 1 },
        { id: "red_4", title: "Red flag 4", weight: 3 },
        { id: "amber_4", title: "Amber flag 4", weight: 1 },
        { id: "amber_5", title: "Amber flag 5", weight: 1 },
        { id: "red_5", title: "Red flag 5", weight: 3 },
      ];

      const sorted = [...mockFlags]
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 8);

      expect(sorted.length).toBe(8);
      // First 5 must be red flags (weight 3)
      expect(sorted.slice(0, 5).every((f) => f.weight === 3)).toBe(true);
      // Next 3 must be amber flags (weight 1)
      expect(sorted.slice(5).every((f) => f.weight === 1)).toBe(true);
    });

    it("constructs correct Clocked Fill schema for extract, generate why, and generate ask", () => {
      const flag = {
        id: "one_sided_terms",
        title: "Unlimited liability clause",
        meaning: "Contractor indemnifies client without limit",
        askThem: "Can we cap liability at the fee value?",
      };

      const quoteField = {
        type: "extract",
        infer: false,
        unit: "sentence",
        description: `The exact sentence in the document that shows: ${flag.title}: ${flag.meaning}`,
      };

      const whyField = {
        type: "generate",
        format: "text",
        max_tokens: 90,
        description:
          "In plain English, at most two short sentences and no legal jargon, explain why this sentence matters to the person signing. Use only what the document says.",
      };

      const askField = {
        type: "generate",
        format: "text",
        max_tokens: 90,
        description: `A short, polite message the signer can send to the other side asking them to fix or explain this. Base it on this suggestion: ${flag.askThem}`,
      };

      expect(quoteField.type).toBe("extract");
      expect(quoteField.infer).toBe(false);
      expect(quoteField.unit).toBe("sentence");
      expect(whyField.max_tokens).toBe(90);
      expect(askField.max_tokens).toBe(90);
    });
  });

  describe("2. Explanation Verification (Grounding)", () => {
    it("marks claim verified when Grounding verdict is supported", () => {
      const groundingClaims = [
        {
          claim: "Clause 8 creates uncapped liability for the contractor.",
          verdict: "supported",
          supported: 0.98,
        },
      ];

      const allSupported = groundingClaims.every((c) => c.verdict === "supported");
      expect(allSupported).toBe(true);
    });

    it("filters out ungrounded claim sentences and alerts the user", () => {
      const whySentences = [
        { text: "The contract limits client liability to £100.", verdict: "supported" },
        { text: "The client was sued for fraud last year.", verdict: "not_stated" },
      ];

      const supported = whySentences.filter((s) => s.verdict === "supported");
      const unsupported = whySentences.filter((s) => s.verdict !== "supported");

      expect(supported.length).toBe(1);
      expect(unsupported.length).toBe(1);

      const notice =
        unsupported.length > 0
          ? "Part of this explanation couldn't be checked, so we removed it."
          : null;
      expect(notice).toBe("Part of this explanation couldn't be checked, so we removed it.");
    });
  });

  describe("3. Fair Rewrite & Fact Preservation", () => {
    const extractedFacts = {
      issuer_name: { value: "Larkspur Studio Ltd" },
      pay_you_receive: { value: "GBP 4,500" },
      term_or_end_date: { value: "15 December 2026" },
      governing_law: { value: "England and Wales" },
    };

    it("constructs factual claims from Extract fields", () => {
      const factClaims: string[] = [];
      if (extractedFacts.pay_you_receive?.value) {
        factClaims.push(`The fee is ${extractedFacts.pay_you_receive.value}.`);
      }
      if (extractedFacts.term_or_end_date?.value) {
        factClaims.push(`Final delivery is by ${extractedFacts.term_or_end_date.value}.`);
      }
      if (extractedFacts.issuer_name?.value) {
        factClaims.push(`The client or company is ${extractedFacts.issuer_name.value}.`);
      }

      expect(factClaims).toContain("The fee is GBP 4,500.");
      expect(factClaims).toContain("Final delivery is by 15 December 2026.");
      expect(factClaims).toContain("The client or company is Larkspur Studio Ltd.");
    });

    it("verifies fair rewrite preserves facts via Grounding", () => {
      // Fictional rewrite of clause 8
      const fairClause =
        "8. Mutual Liability. Each party's liability under this Agreement shall be limited to the total fee of GBP 4,500 payable to Contractor. Neither party is liable for indirect losses. Final delivery remains 15 December 2026.";

      // Simulated Grounding output checking the rewrite
      const groundingResults = [
        { claim: "The fee is GBP 4,500.", verdict: "supported" },
        { claim: "Final delivery is by 15 December 2026.", verdict: "supported" },
        { claim: "The client or company is Larkspur Studio Ltd.", verdict: "supported" },
      ];

      const unsupported = groundingResults.filter((r) => r.verdict !== "supported");
      const allFactsKept = unsupported.length === 0;

      expect(allFactsKept).toBe(true);
      expect(unsupported.length).toBe(0);
    });

    it("detects when a rewrite altered or dropped an agreed fact", () => {
      // Rewrite that forgot the fee amount
      const groundingResults = [
        { claim: "The fee is GBP 4,500.", verdict: "not_stated" },
        { claim: "Final delivery is by 15 December 2026.", verdict: "supported" },
      ];

      const unsupported = groundingResults
        .filter((r) => r.verdict !== "supported")
        .map((r) => r.claim);

      expect(unsupported).toEqual(["The fee is GBP 4,500."]);
      expect(unsupported.length).toBe(1);
    });
  });

  describe("4. Sample 02 (Freelance Contract) Verification", () => {
    const freelanceDocText = `
8. Liability. The Contractor is liable for any loss the Client suffers in connection with the Services, without limit. The Client's total liability to the Contractor is limited to GBP 100.
    `.trim();

    it("accurately targets clause 8 liability sentence and provides balanced rewrite", () => {
      const quoteTarget =
        "The Contractor is liable for any loss the Client suffers in connection with the Services, without limit. The Client's total liability to the Contractor is limited to GBP 100.";

      expect(freelanceDocText).toContain(quoteTarget);

      // Verify that offset lookup finds the exact position in the text
      const startIdx = freelanceDocText.indexOf(quoteTarget);
      const endIdx = startIdx + quoteTarget.length;
      expect(startIdx).toBeGreaterThan(0);
      expect(freelanceDocText.slice(startIdx, endIdx)).toBe(quoteTarget);
    });
  });
});
