export interface Clause {
  id: string; // c1, c2, ...
  title: string; // heading or first 8 words
  text: string; // text up to 4,000 chars
  startOffset: number; // start offset in cleanText
  endOffset: number; // end offset in cleanText
}

/**
 * Splits text into clauses on numbered headings and blank lines,
 * merges pieces shorter than 80 chars into their neighbour,
 * caps clauses at 4,000 chars, and keeps at most 256 clauses.
 */
export function splitIntoClauses(cleanText: string): Clause[] {
  if (!cleanText || cleanText.trim().length === 0) {
    return [];
  }

  // Regex identifying headings: "1.", "2.1", "Clause 4", "Section 5", "ARTICLE 1"
  const headingRegex =
    /^(?:(?:\d+\.|\d+\.\d+)|(?:Clause|Section|ARTICLE)\s+[IVX\d]+(?:\.|\b))(?:\s+|$)/i;

  const lines = cleanText.split("\n");
  interface RawPiece {
    text: string;
    start: number;
    end: number;
  }

  const rawPieces: RawPiece[] = [];
  let currentText = "";
  let currentStart = 0;
  let charCursor = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineTrimmed = line.trim();
    const lineStart = charCursor;
    const isHeading = headingRegex.test(lineTrimmed);
    const isBlank = lineTrimmed.length === 0;

    if ((isHeading || isBlank) && currentText.trim().length > 0) {
      // End current piece
      rawPieces.push({
        text: currentText,
        start: currentStart,
        end: charCursor,
      });
      currentText = "";
      currentStart = charCursor;
    }

    if (currentText.length === 0) {
      currentStart = lineStart;
    }

    currentText += (currentText.length > 0 ? "\n" : "") + line;
    charCursor += line.length + 1; // +1 for the newline
  }

  if (currentText.trim().length > 0) {
    rawPieces.push({
      text: currentText,
      start: currentStart,
      end: Math.min(cleanText.length, charCursor),
    });
  }

  // Filter out completely empty pieces
  const validPieces = rawPieces.filter((p) => p.text.trim().length > 0);

  // Merge pieces shorter than 80 characters into their neighbour
  const mergedPieces: RawPiece[] = [];
  let currentBuffer: RawPiece | null = null;

  for (let i = 0; i < validPieces.length; i++) {
    const p = validPieces[i];

    if (!currentBuffer) {
      currentBuffer = { ...p, text: p.text.trim() };
      continue;
    }

    if (currentBuffer.text.length < 80) {
      // Buffer is too short (< 80 chars), merge this piece into it
      currentBuffer.text = currentBuffer.text + "\n\n" + p.text.trim();
      currentBuffer.end = p.end;
    } else {
      // Buffer is already >= 80 chars. Push it and start new buffer
      mergedPieces.push(currentBuffer);
      currentBuffer = { ...p, text: p.text.trim() };
    }
  }

  if (currentBuffer) {
    if (mergedPieces.length > 0 && currentBuffer.text.length < 80) {
      // If trailing piece is still < 80 chars, merge into the previous piece
      const last = mergedPieces[mergedPieces.length - 1];
      last.text = last.text + "\n\n" + currentBuffer.text;
      last.end = currentBuffer.end;
    } else {
      mergedPieces.push(currentBuffer);
    }
  }

  // Cap each at 4,000 characters and format as Clause objects
  const finalClauses: Clause[] = [];
  const maxClauses = Math.min(mergedPieces.length, 256);

  for (let i = 0; i < maxClauses; i++) {
    const piece = mergedPieces[i];
    const cappedText = piece.text.slice(0, 4000);

    // Extract title: first heading line or first 8 words
    let title = "";
    const firstLine = cappedText.split("\n")[0].trim();
    const cleanFirstLine = firstLine.replace(/[*#_]/g, "").trim();

    if (headingRegex.test(cleanFirstLine)) {
      // Extract heading number plus title up to next period or colon (e.g. "1. Services" or "Clause 4. Intellectual Property")
      const m = cleanFirstLine.match(
        /^(?:(?:\d+\.|\d+\.\d+|Clause\s+\d+|Section\s+\d+|ARTICLE\s+[IVX\d]+)(?:\s+[^.:\n]+)?)/i
      );
      title = m ? m[0].trim() : cleanFirstLine.slice(0, 50);
    } else {
      const words = cleanFirstLine.trim().split(/\s+/);
      title = words.slice(0, 8).join(" ");
    }

    if (!title) {
      title = `Clause ${i + 1}`;
    }

    finalClauses.push({
      id: `c${i + 1}`,
      title,
      text: cappedText,
      startOffset: piece.start,
      endOffset: Math.min(cleanText.length, piece.start + cappedText.length),
    });
  }

  return finalClauses;
}
