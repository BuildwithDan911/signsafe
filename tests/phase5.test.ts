import { describe, it, expect } from "vitest";
import {
  filterDecideByThreshold,
  mergeSignals,
  MERGE_GROUPS,
  SIGNALS_MAP,
} from "../src/lib/signals";
import { calculateScore, ScoreResult } from "../src/lib/score";

describe("Phase 5: Scoring Rules & Signal Merging Tests", () => {
  describe("Pure Scoring Rules (BUILD_BRIEF.md Section 2)", () => {
    it("an editable Word file alone is amber (1 point, score inside 50-79)", () => {
      // FM1 editable word file -> file_format merged signal (amber, weight 1)
      const merged = mergeSignals(["FM1"]);
      expect(merged.length).toBe(1);
      expect(merged[0].severity).toBe("amber");

      const score = calculateScore({ mergedSignals: merged });
      expect(score.color).toBe("amber");
      expect(score.label).toBe("ASK FIRST");
      expect(score.totalPoints).toBe(1);
      expect(score.signScore).toBeGreaterThanOrEqual(50);
      expect(score.signScore).toBeLessThanOrEqual(79);
    });

    it("one red-weight signal alone is amber (3 points, score inside 50-79)", () => {
      // RF1.2 upfront fee -> red weight 3, alone gives 3 points (amber band 1-3)
      const merged = mergeSignals(["RF1.2"]);
      expect(merged.length).toBe(1);
      expect(merged[0].severity).toBe("red");
      expect(merged[0].weight).toBe(3);

      const score = calculateScore({ mergedSignals: merged });
      expect(score.color).toBe("amber");
      expect(score.label).toBe("ASK FIRST");
      expect(score.totalPoints).toBe(3);
      expect(score.signScore).toBeGreaterThanOrEqual(50);
      expect(score.signScore).toBeLessThanOrEqual(79);
    });

    it("a Word file plus free-webmail plus upfront fee is red (7 points, score below 50)", () => {
      // FM1 (1 pt) + SI1 (3 pts) + RF1.2 (3 pts) = 7 pts
      const merged = mergeSignals(["FM1", "SI1", "RF1.2"]);
      expect(merged.length).toBe(3);

      const score = calculateScore({ mergedSignals: merged });
      expect(score.color).toBe("red");
      expect(score.label).toBe("DON'T SIGN YET");
      expect(score.totalPoints).toBe(7);
      expect(score.signScore).toBeLessThan(50);
      expect(score.signScore).toBeGreaterThanOrEqual(26);
    });

    it("a Yes answer turns an amber result red (3 + 2 = 5 points)", () => {
      const merged = mergeSignals(["RF1.2"]); // Upfront fee, 3 pts (amber alone)
      
      const beforeScore = calculateScore({ mergedSignals: merged });
      expect(beforeScore.color).toBe("amber");
      expect(beforeScore.totalPoints).toBe(3);

      // User confirms fee with 'Yes' (+2 pts -> 5 pts total -> Red)
      const afterScore = calculateScore({
        mergedSignals: merged,
        confirmedSignalIds: [merged[0].id],
      });
      expect(afterScore.color).toBe("red");
      expect(afterScore.totalPoints).toBe(5);
      expect(afterScore.signScore).toBeLessThan(50);
    });

    it("green signals never change the colour band", () => {
      // 1. Green band: 0 points remains green regardless of green signals
      const zeroPointWithGreens = calculateScore({
        mergedSignals: [],
        greenSignalsCount: 5,
      });
      expect(zeroPointWithGreens.color).toBe("green");
      expect(zeroPointWithGreens.signScore).toBe(94);

      // 2. Amber band: warning signals stay amber even with green indicators
      const amberWithGreens = calculateScore({
        mergedSignals: mergeSignals(["FM1"]), // 1 pt
        greenSignalsCount: 10,
      });
      expect(amberWithGreens.color).toBe("amber");
      expect(amberWithGreens.signScore).toBeLessThanOrEqual(79);
      expect(amberWithGreens.signScore).toBeGreaterThanOrEqual(50);

      // 3. The blended score for one file-format tell plus one payment tell is amber;
      // green indicators must not erase that concern or move it into green.
      const redWithGreens = calculateScore({
        mergedSignals: mergeSignals(["FM1", "RF1.2"]), // 1 + 3 = 4 pts
        greenSignalsCount: 10,
      });
      expect(redWithGreens.color).toBe("amber");
      expect(redWithGreens.signScore).toBeLessThanOrEqual(79);
      expect(redWithGreens.signScore).toBeGreaterThanOrEqual(50);
    });

    it("Guard injection or Inspect malicious verdict adds 4 points", () => {
      const guardOnly = calculateScore({
        mergedSignals: [],
        guardInjection: true,
      });
      expect(guardOnly.totalPoints).toBe(4);
      expect(guardOnly.signScore).toBeGreaterThanOrEqual(26);
      expect(guardOnly.signScore).toBeLessThanOrEqual(94);

      const inspectOnly = calculateScore({
        mergedSignals: [],
        inspectMalicious: true,
      });
      expect(inspectOnly.totalPoints).toBe(4);
      expect(inspectOnly.signScore).toBeGreaterThanOrEqual(26);
      expect(inspectOnly.signScore).toBeLessThanOrEqual(94);
    });
  });

  describe("Signal Noise Reduction & Semantic Merging", () => {
    it("merges multiple upfront fee signals into one high-level card", () => {
      // RF1.2, MA2, MA3, MA4 are all upfront fee tells
      const merged = mergeSignals(["RF1.2", "MA2", "MA3", "MA4"]);
      expect(merged.length).toBe(1);
      expect(merged[0].id).toBe("upfront_fee");
      expect(merged[0].constituentIds).toEqual(["RF1.2", "MA2", "MA3", "MA4"]);
      expect(merged[0].evidenceTitles.length).toBe(4);
      expect(merged[0].weight).toBe(3);
    });

    it("merges multiple urgency signals into one urgency card", () => {
      const merged = mergeSignals(["RF1.1", "PR3", "RF1.7"]);
      expect(merged.length).toBe(1);
      expect(merged[0].id).toBe("urgency");
      expect(merged[0].constituentIds).toEqual(["RF1.1", "PR3", "RF1.7"]);
    });

    it("ranks merged signals by weight (red=3 first), then confidence", () => {
      const merged = mergeSignals(
        ["FM1", "RF1.2", "WD1"],
        { FM1: 0.99, "RF1.2": 0.95, WD1: 0.88 }
      );
      // RF1.2 is red (weight 3), FM1 and WD1 are amber (weight 1)
      expect(merged[0].severity).toBe("red");
      expect(merged[0].id).toBe("upfront_fee");
      expect(merged[1].weight).toBe(1);
      expect(merged[2].weight).toBe(1);
    });
  });

  describe("Sample 01 & Sample 02 Verification", () => {
    // Realistic Clocked Decide output for Sample 01 (Remote job offer)
    const sample01DecideOutput = {
      contract_terms: {
        selected: [
          "RF1.1", "RF1.2", "RF1.4", "RF1.5", "RF1.7", "RF1.9", "RF1.10", "RF1.12", "RF3.14"
        ],
        probabilities: {
          "RF1.1": 0.995,
          "RF1.2": 0.993,
          "RF1.4": 0.996,
          "RF1.5": 0.995,
          "RF1.7": 0.92,
          "RF1.9": 0.996,
          "RF1.10": 0.995,
          "RF1.12": 0.869,
          "RF3.14": 0.936,
        },
      },
      authenticity_tells: {
        selected: [
          "SI1", "SI5", "SI6", "SI9", "PR1", "PR2", "PR3", "PR5",
          "PB1", "PB2", "PB5", "PB6", "MA1", "MA2", "MA3", "MA4", "MA5", "MA6",
          "WD1", "WD2", "WD3", "WD4", "WD5", "WD6", "IN1"
        ],
        probabilities: {
          SI1: 0.99, SI5: 0.98, SI6: 0.95, SI9: 0.91,
          PR1: 0.99, PR2: 0.95, PR3: 0.97, PR5: 0.92,
          PB1: 0.99, PB2: 0.98, PB5: 0.96, PB6: 0.94,
          MA1: 0.99, MA2: 0.99, MA3: 0.98, MA4: 0.97, MA5: 0.95, MA6: 0.93,
          WD1: 0.92, WD2: 0.94, WD3: 0.93, WD4: 0.91, WD5: 0.90, WD6: 0.89,
          IN1: 0.93,
        },
      },
      green_signals: {
        selected: [],
        probabilities: {},
      },
    };

    it("Sample 01: before raised thresholds vs after merging count, and scores RED", () => {
      // 1. Raw signals count
      const rawCount =
        sample01DecideOutput.contract_terms.selected.length +
        sample01DecideOutput.authenticity_tells.selected.length;
      expect(rawCount).toBe(34); // 9 RED_FLAGS + 25 GIVEAWAYS

      // 2. Filter by threshold (0.70 for RED_FLAGS, 0.85 for GIVEAWAYS)
      const filtered = filterDecideByThreshold(sample01DecideOutput);
      expect(filtered.highConfidenceIds.length).toBe(34);

      // 3. Merged signals count
      const merged = mergeSignals(filtered.highConfidenceIds, filtered.probabilities);
      // Collapses 34 raw signals into 10 high-level thematic cards
      expect(merged.length).toBe(10);

      // Top 3 reason cards:
      const top3 = merged.slice(0, 3);
      expect(top3.length).toBe(3);
      expect(top3.every((c) => c.severity === "red")).toBe(true);

      // 4. Calculate score
      const score = calculateScore({
        mergedSignals: merged,
        guardInjection: true, // Sample 01 has white-text injection
      });

      expect(score.color).toBe("red");
      expect(score.label).toBe("DON'T SIGN YET");
      expect(score.signScore).toBeLessThan(50);
    });

    // Realistic Clocked Decide output for Sample 02 (Freelance contract)
    const sample02DecideOutput = {
      contract_terms: {
        selected: ["RF3.13"], // Unlimited liability clause 8
        probabilities: {
          "RF3.13": 0.94,
        },
      },
      authenticity_tells: {
        selected: [],
        probabilities: {},
      },
      green_signals: {
        selected: ["G1", "G2", "G3", "G4"],
        probabilities: {
          G1: 0.95,
          G2: 0.88,
          G3: 0.92,
          G4: 0.90,
        },
      },
    };

    it("Sample 02: before vs after merging count, and scores AMBER with green signals", () => {
      // 1. Raw count
      const rawCount =
        sample02DecideOutput.contract_terms.selected.length +
        sample02DecideOutput.authenticity_tells.selected.length;
      expect(rawCount).toBe(1);

      // 2. Filter by threshold
      const filtered = filterDecideByThreshold(sample02DecideOutput);
      expect(filtered.highConfidenceIds).toEqual(["RF3.13"]);
      expect(filtered.greenIds).toEqual(["G1", "G2", "G3", "G4"]);

      // 3. Merged signals count
      const merged = mergeSignals(filtered.highConfidenceIds, filtered.probabilities);
      expect(merged.length).toBe(1);
      expect(merged[0].id).toBe("one_sided_terms");

      // 4. Calculate score
      const score = calculateScore({
        mergedSignals: merged,
        guardInjection: false,
        greenSignalsCount: filtered.greenIds.length,
      });

      expect(score.color).toBe("amber");
      expect(score.label).toBe("ASK FIRST");
      expect(score.signScore).toBeGreaterThanOrEqual(50);
      expect(score.signScore).toBeLessThanOrEqual(79);
    });
  });
});
