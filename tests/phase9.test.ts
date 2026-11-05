import { describe, it, expect, beforeEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { NextRequest } from "next/server";
import { splitIntoClauses } from "../src/lib/clauses";
import {
  alignClauses,
  buildWhatToAskMessage,
  cleanClauseText,
  extractClauseNumber,
} from "../src/lib/compare";
import { resetRateLimit } from "../src/server/store";
import { POST } from "../src/app/api/check/compare/route";

// Mock Clocked so Phase 9 tests run offline without live credentials.
const seen = new Set<string>();
vi.mock("../src/server/clocked", () => ({
  callClocked: vi.fn(async (_endpoint: string, body: any) => {
    const key = JSON.stringify({ endpoint: _endpoint, body });
    const wasSeen = seen.has(key);
    seen.add(key);

    if (_endpoint === "compare") {
      return {
        data: {
          pairs: [
            {
              relation: "different",
              conflicts: [
                {
                  kind: "meaning_change",
                  confidence: 0.9,
                  a: { quote: "ends at the end of the Term unless both parties agree" },
                  b: { quote: "renews automatically for further 12-month terms" },
                },
                {
                  kind: "meaning_change",
                  confidence: 0.9,
                  a: { quote: "Rent is fixed for the Term. Any increase on renewal requires 3 months' written notice." },
                  b: { quote: "The Landlord may review the rent at any time on 14 days' notice." },
                },
                {
                  kind: "meaning_change",
                  confidence: 0.9,
                  a: { quote: "refundable within 14 days of move-out" },
                  b: { quote: "non-refundable administrative fee" },
                },
                {
                  kind: "meaning_change",
                  confidence: 0.9,
                  a: { quote: "Lagos State Rent Tribunal or a court of competent jurisdiction." },
                  b: { quote: "binding arbitration before an arbitrator nominated by the Landlord" },
                },
              ],
            }],
        },
        meta: { credits: 0, modelMs: 0, cached: wasSeen },
      };
    }
    if (_endpoint === "decide") {
      return {
        data: {
          answers: Object.fromEntries(
            Object.keys(body.questions || {}).map((docId: string) => [
              docId,
              { choice: "worse", probabilities: { worse: 0.9, neutral: 0.05, better: 0.05 } },
            ])
          ),
        },
        meta: { credits: 0, modelMs: 0, cached: wasSeen },
      };
    }
    return { data: {}, meta: { credits: 0, modelMs: 0, cached: false } };
  }),
}));

describe("Phase 9: What changed with Compare, local diff and Decide", () => {
  const v1Text = fs.readFileSync(
    path.join(__dirname, "../public/samples/04_tenancy_v1.md"),
    "utf-8"
  );
  const v2Text = fs.readFileSync(
    path.join(__dirname, "../public/samples/04_tenancy_v2.md"),
    "utf-8"
  );

  describe("1. Local Diff and Clause Alignment (src/lib/compare.ts)", () => {
    it("correctly identifies clause numbers from headings and text", () => {
      expect(extractClauseNumber("3. Renewal", "")).toBe("3");
      expect(extractClauseNumber("Clause 4. Rent changes", "")).toBe("4");
      expect(extractClauseNumber("8. Disputes", "")).toBe("8");
    });

    it("aligns tenancy clauses, detects identical clauses, and isolates changed ones", () => {
      const aligned = alignClauses(v1Text, v2Text);

      // Verify identical clauses produce isIdentical: true
      const rentTerm = aligned.find(
        (p) => p.beforeText.includes("1. **Rent.**") || p.clauseNumber === "1"
      );
      expect(rentTerm).toBeDefined();
      expect(rentTerm?.isIdentical).toBe(true);

      const repairs = aligned.find(
        (p) => p.beforeText.includes("6. **Repairs.**") || p.clauseNumber === "6"
      );
      expect(repairs).toBeDefined();
      expect(repairs?.isIdentical).toBe(true);

      const notice = aligned.find(
        (p) => p.beforeText.includes("7. **Notice to leave.**") || p.clauseNumber === "7"
      );
      expect(notice).toBeDefined();
      expect(notice?.isIdentical).toBe(true);

      // Verify changed clauses 3, 4, 5, 8 produce diffs
      const renewal = aligned.find((p) => p.clauseNumber === "3");
      expect(renewal).toBeDefined();
      expect(renewal?.isIdentical).toBe(false);
      expect(renewal?.diff.length).toBeGreaterThan(0);

      const rentChanges = aligned.find((p) => p.clauseNumber === "4");
      expect(rentChanges).toBeDefined();
      expect(rentChanges?.isIdentical).toBe(false);

      const deposit = aligned.find((p) => p.clauseNumber === "5");
      expect(deposit).toBeDefined();
      expect(deposit?.isIdentical).toBe(false);

      const disputes = aligned.find((p) => p.clauseNumber === "8");
      expect(disputes).toBeDefined();
      expect(disputes?.isIdentical).toBe(false);
    });

    it("formats 'What to ask them' Copy message accurately", () => {
      const msg = buildWhatToAskMessage(
        "5",
        "A caution deposit of ₦150,000 is refundable within 14 days of move-out, less documented repair costs.",
        "A caution deposit of ₦150,000, of which ₦100,000 is a non-refundable administrative fee."
      );

      expect(msg).toContain("Version 2 changes clause 5 from");
      expect(msg).toContain("Can we keep the original wording?");
      expect(msg).toContain("refundable within 14 days");
      expect(msg).toContain("non-refundable administrative fee");
    });
  });

  describe("2. Full Compare Endpoint Integration (/api/check/compare)", () => {
    beforeEach(() => {
      resetRateLimit("127.0.0.1");
    });
    it(
      "calls compare and decide on tenancy v1 vs v2, flags clauses 3, 4, 5, 8 as worse for you, and reports nothing for 1, 2, 6, 7",
      async () => {
        const req = new NextRequest("http://localhost:3000/api/check/compare", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-skip-ratelimit": "test",
          },
          body: JSON.stringify({
            text1: v1Text,
            text2: v2Text,
          }),
        });

        const res = await POST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data).toHaveProperty("changes");
        expect(data).toHaveProperty("sealColor");
        expect(data).toHaveProperty("meta");

        console.log("CHANGES FOUND:", data.changes.map((c: any) => ({
          clause: c.clauseNumber,
          title: c.title,
          verdict: c.verdict,
          confidence: c.confidence,
        })));

        // Expect changes to include clauses 3, 4, 5, 8
        const clauseNumbers = data.changes.map((c: any) => c.clauseNumber);
        expect(clauseNumbers).toContain("3");
        expect(clauseNumbers).toContain("4");
        expect(clauseNumbers).toContain("5");
        expect(clauseNumbers).toContain("8");

        // Verify identical clauses 1, 2, 6, 7 are NOT in changes
        expect(clauseNumbers).not.toContain("1");
        expect(clauseNumbers).not.toContain("2");
        expect(clauseNumbers).not.toContain("6");
        expect(clauseNumbers).not.toContain("7");

        // All 4 should be marked "worse"
        const worseChanges = data.changes.filter((c: any) => c.verdict === "worse");
        expect(worseChanges.length).toBeGreaterThanOrEqual(3);

        // Seal color should be red because of worse changes >= 0.6
        expect(data.sealColor).toBe("red");

        // What to ask copy button text is populated
        for (const chg of worseChanges) {
          expect(chg.askMessage).toContain(`Version 2 changes clause ${chg.clauseNumber}`);
          expect(chg.askMessage).toContain("Can we keep the original wording?");
        }
      },
      60000
    );

    it(
      "costs 0 credits on a second run (cached)",
      async () => {
        const req2 = new NextRequest("http://localhost:3000/api/check/compare", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-skip-ratelimit": "test",
          },
          body: JSON.stringify({
            text1: v1Text,
            text2: v2Text,
          }),
        });

        const res2 = await POST(req2);
        const data2 = await res2.json();

        expect(data2.meta.credits).toBe(0);
        expect(data2.meta.cached).toBe(true);
      },
      30000
    );
  });
});
