import { describe, expect, it } from "vitest";
import { splitForClocked } from "../src/lib/chunking";

describe("Clocked long-document chunking", () => {
  it("covers a 120,000-character document in overlapping chunks below the endpoint limit", () => {
    const base = Array.from({ length: 120 }, (_, i) => `Section ${i + 1}\n${String(i % 10).repeat(300)}`).join("\n\n");
    const sections = `${base}\n\nSection 121\n${"x".repeat(120_000 - base.length - 14)}`;
    expect(sections).toHaveLength(120_000);
    const chunks = splitForClocked(sections);
    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.every((chunk) => chunk.text.length <= 50_000)).toBe(true);
    expect(chunks[0].start).toBe(0);
    expect(chunks.at(-1)?.end).toBe(sections.length);
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].start).toBeLessThan(chunks[i - 1].end);
    }
    for (const section of sections.matchAll(/Section \d+/g)) {
      expect(chunks.some((chunk) => chunk.text.includes(section[0]))).toBe(true);
    }
  });
});
