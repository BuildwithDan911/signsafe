import { describe, it, expect } from "vitest";
import { filterHighConfidenceSignals } from "../src/lib/signals";

describe("Phase 4: Guard & Confidence Thresholding Tests", () => {
  describe("Decide Confidence Thresholding (0.7 Cutoff)", () => {
    it("filters out weak flags below 0.7 while keeping high-confidence flags", () => {
      const mockDecideAnswer = {
        selected: ["RF1.1", "RF1.2", "RF3.2", "RF1.11"],
        probabilities: {
          "RF1.1": 0.995,
          "RF1.2": 0.993,
          "RF3.2": 0.52, // Below 0.7
          "RF1.11": 0.395, // Low confidence
        },
      };

      const result = filterHighConfidenceSignals(mockDecideAnswer, 0.7);

      expect(result.highConfidence).toEqual(["RF1.1", "RF1.2"]);
      expect(result.lowConfidence).toEqual(["RF3.2", "RF1.11"]);
    });

    it("counts flags correctly before (threshold 0.5) and after (threshold 0.7)", () => {
      const sample01Answer = {
        selected: [
          "RF1.1",
          "RF1.2",
          "RF1.4",
          "RF1.5",
          "RF1.9",
          "RF1.10",
          "RF1.12",
          "RF3.2",
          "RF3.6",
          "RF3.14",
        ],
        probabilities: {
          "RF1.1": 0.995,
          "RF1.2": 0.993,
          "RF1.4": 0.996,
          "RF1.5": 0.995,
          "RF1.9": 0.996,
          "RF1.10": 0.995,
          "RF1.12": 0.869,
          "RF3.2": 0.51, // Weak flag
          "RF3.6": 0.932,
          "RF3.14": 0.936,
        },
      };

      // At 0.5 threshold: 10 flags
      const at05 = filterHighConfidenceSignals(sample01Answer, 0.5);
      expect(at05.highConfidence.length).toBe(10);

      // At 0.7 threshold: 9 flags (RF3.2 excluded)
      const at07 = filterHighConfidenceSignals(sample01Answer, 0.7);
      expect(at07.highConfidence.length).toBe(9);
      expect(at07.lowConfidence).toContain("RF3.2");
    });
  });
});
