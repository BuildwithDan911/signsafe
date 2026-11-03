import { describe, it, expect } from "vitest";
import { splitIntoClauses, Clause } from "../src/lib/clauses";

describe("Phase 7: Clause Splitting & Ask Anything Tests", () => {
  describe("1. Clause Splitting Logic (src/lib/clauses.ts)", () => {
    it("splits on numbered headings (1., 2., 3.1, Clause 4, Section 5)", () => {
      const text = `
# Master Services Agreement

1. Services. Contractor will provide comprehensive web development and digital design consulting services for the client.
2. Payment terms. Invoices are payable within 30 days of verified receipt by the corporate accounting department.
3.1 Milestone A. Completion of the initial interactive wireframe deliverables and architecture specification.
Clause 4. Intellectual Property. Contractor retains moral rights and ownership of all unused background concepts.
Section 5. Governing Law. The laws of England and Wales apply to the construction of this entire Agreement.
      `.trim();

      const clauses = splitIntoClauses(text);
      expect(clauses.length).toBeGreaterThanOrEqual(4);
      expect(clauses.some((c) => c.title.includes("1. Services") || c.title.includes("Services"))).toBe(true);
      expect(clauses.some((c) => c.title.includes("2. Payment terms") || c.title.includes("Payment terms"))).toBe(true);
      expect(clauses.some((c) => c.title.includes("Clause 4") || c.title.includes("Intellectual Property"))).toBe(true);
    });

    it("merges pieces shorter than 80 characters into their neighbour", () => {
      const shortPieceText = `
1. Overview.
Short line.
This is a very short text here.

2. Full Clause With Enough Characters. This clause is definitely longer than eighty characters so that it does not need to be merged into any other piece.
      `.trim();

      const clauses = splitIntoClauses(shortPieceText);
      // Every clause should be >= 80 characters unless it's the only one
      expect(clauses.every((c) => c.text.length >= 80)).toBe(true);
    });

    it("caps clauses at 4,000 characters and keeps at most 256 clauses", () => {
      // Extremely long text test
      const longClause = "A".repeat(5000);
      const text = `1. Long Clause. ${longClause}`;

      const clauses = splitIntoClauses(text);
      expect(clauses[0].text.length).toBeLessThanOrEqual(4000);
      expect(clauses.length).toBeLessThanOrEqual(256);
    });

    it("assigns IDs (c1, c2, ...) and accurate start and end offsets", () => {
      const text = `
1. First Clause. Contractor will deliver designs by Friday.
2. Second Clause. Invoices are paid on thirty day terms.
      `.trim();

      const clauses = splitIntoClauses(text);
      expect(clauses[0].id).toBe("c1");
      expect(clauses[0].startOffset).toBeDefined();
      expect(clauses[0].endOffset).toBeGreaterThan(clauses[0].startOffset);
      expect(text.slice(clauses[0].startOffset, clauses[0].endOffset)).toContain("First Clause");
    });
  });

  describe("2. Sample 02 (Freelance Contract) Clause Splitting", () => {
    const freelanceDoc = `
> SYNTHETIC DEMO DOCUMENT. Fictional parties. Not legal advice.

# Freelance Design Services Agreement
Client: Larkspur Studio Ltd, Company No. 09876543, 14 Canal Street, Manchester M1 3HE (fictional)
Contractor: Amara Bello, freelance brand designer (fictional)
Reference: Your proposal LS-2026-118 dated 28 October 2026

1. Services. Contractor will design a brand identity: logo, colour palette, typography and a 12-page brand guideline document.
2. Fee. GBP 4,500, paid in two equal parts: GBP 2,250 on signing and GBP 2,250 on final delivery.
3. Payment terms. Invoices are payable within 60 days of receipt.
4. Revisions. The fee includes two rounds of revisions. Further rounds are charged at the Contractor's day rate of GBP 400.
5. Timeline. Final delivery by 15 December 2026. Either party may agree a new date in writing.
6. Ownership. Ownership of the final approved logo and brand guidelines passes to the Client once the Client has paid all invoices in full. The Contractor keeps all unused concepts and sketches.
7. Termination. Either party may end this Agreement with 14 days' written notice. The Client pays for all work completed up to the end date.
8. Liability. The Contractor is liable for any loss the Client suffers in connection with the Services, without limit. The Client's total liability to the Contractor is limited to GBP 100.
9. Data. The Client will never ask you for passwords, ID documents or payment to start work. Questions go to the project lead you already work with, Daniel Price, at daniel@larkspurstudio.example.
10. Governing law. England and Wales.

Signed for the Client: Daniel Price, Creative Director
    `.trim();

    it("correctly identifies payment clause (Clause 3: 60 days) and liability clause (Clause 8)", () => {
      const clauses = splitIntoClauses(freelanceDoc);

      const paymentClause = clauses.find(
        (c) => c.text.includes("Payment terms") || c.text.includes("60 days")
      );
      expect(paymentClause).toBeDefined();
      expect(paymentClause?.text).toContain("60 days of receipt");

      const liabilityClause = clauses.find(
        (c) => c.text.includes("Liability") || c.text.includes("without limit")
      );
      expect(liabilityClause).toBeDefined();
      expect(liabilityClause?.text).toContain("without limit");
    });

    it("evaluates user questions: 'When do I get paid?' vs nonsense 'Do they provide lunch?'", () => {
      const clauses = splitIntoClauses(freelanceDoc);

      // Question 1: "When do I get paid?"
      const matchingClause = clauses.find((c) =>
        c.text.toLowerCase().includes("payable") || c.text.toLowerCase().includes("fee")
      );
      expect(matchingClause).toBeDefined();
      expect(matchingClause?.text).toContain("GBP 4,500");

      // Question 2: "Do they provide lunch?"
      const lunchClause = clauses.find((c) =>
        c.text.toLowerCase().includes("lunch") || c.text.toLowerCase().includes("meals")
      );
      expect(lunchClause).toBeUndefined(); // Document doesn't say!
    });
  });

  describe("3. Sample 01 (Remote Job Offer) Clause Splitting", () => {
    const jobOfferDoc = `
1. Appointment and Term. Apex Digital Solutions Inc. offers you the position of Remote Systems Coordinator.
2. Compensation. Your starting salary will be $4,200 USD per month.
3. Onboarding & Administrative Fee. A one-time mandatory fee of $150 USD is required prior to your start date.
4. Workstation Equipment. We will issue an advance company cashier's check to cover purchase from our hardware vendor.
    `.trim();

    it("identifies onboarding fee clause and advance check clause", () => {
      const clauses = splitIntoClauses(jobOfferDoc);
      const feeClause = clauses.find((c) => c.text.includes("$150 USD"));
      expect(feeClause).toBeDefined();

      const checkClause = clauses.find((c) => c.text.includes("cashier's check"));
      expect(checkClause).toBeDefined();
    });
  });
});
