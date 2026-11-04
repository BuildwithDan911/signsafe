export interface TextChunk {
  text: string;
  start: number;
  end: number;
  index: number;
}

/** Split complete source text at paragraph/heading boundaries, with intentional overlap. */
export function splitForClocked(
  text: string,
  maxChars = 15_000,
  overlapChars = 800
): TextChunk[] {
  if (!text) return [];
  if (!Number.isInteger(maxChars) || maxChars < 1 || overlapChars < 0 || overlapChars >= maxChars) {
    throw new Error("Invalid Clocked chunk size");
  }

  const chunks: TextChunk[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(text.length, start + maxChars);
    if (end < text.length) {
      const floor = start + Math.floor(maxChars * 0.65);
      const window = text.slice(floor, end);
      const boundaries = [window.lastIndexOf("\n\n"), window.lastIndexOf("\n")]
        .map((i) => i < 0 ? -1 : floor + i + 1)
        .filter((i) => i > start);
      if (boundaries.length) end = Math.max(...boundaries);
    }
    if (end <= start) end = Math.min(text.length, start + maxChars);
    chunks.push({ text: text.slice(start, end), start, end, index: chunks.length + 1 });
    if (end === text.length) break;
    start = Math.max(start + 1, end - overlapChars);
  }
  return chunks;
}

export function sumChunkCredits(results: Array<{ meta?: { credits?: number; modelMs?: number; cached?: boolean } }>) {
  return {
    credits: results.reduce((sum, item) => sum + (item.meta?.credits || 0), 0),
    modelMs: results.reduce((sum, item) => sum + (item.meta?.modelMs || 0), 0),
    cached: results.every((item) => item.meta?.cached),
  };
}
