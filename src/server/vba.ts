import CFB from "cfb";

/**
 * MS-OVBA 2.4.1.3.1 Compression / Decompression Algorithm
 */
export function decompressVba(compressed: Uint8Array): string {
  if (compressed.length === 0) return "";
  if (compressed[0] !== 0x01) {
    throw new Error("Invalid VBA compressed container signature (expected 0x01)");
  }

  const decompressed: number[] = [];
  let compressedPos = 1;

  while (compressedPos < compressed.length) {
    if (compressedPos + 2 > compressed.length) break;

    const chunkHeader = compressed[compressedPos] | (compressed[compressedPos + 1] << 8);
    compressedPos += 2;

    const chunkSize = (chunkHeader & 0x0fff) + 3;
    const chunkSignature = (chunkHeader >> 12) & 0x07;
    const isCompressed = ((chunkHeader >> 15) & 0x01) === 1;

    if (chunkSignature !== 0b011) {
      break;
    }

    const chunkEnd = Math.min(compressed.length, compressedPos + chunkSize - 2);
    const chunkStartDecompressed = decompressed.length;

    if (!isCompressed) {
      // Uncompressed chunk (4096 bytes raw)
      for (let i = compressedPos; i < chunkEnd; i++) {
        decompressed.push(compressed[i]);
      }
      compressedPos = chunkEnd;
    } else {
      // Compressed chunk
      while (compressedPos < chunkEnd) {
        if (compressedPos >= chunkEnd) break;
        const flagByte = compressed[compressedPos++];

        for (let bit = 0; bit < 8; bit++) {
          if (compressedPos >= chunkEnd) break;

          const isCopyToken = ((flagByte >> bit) & 0x01) === 1;

          if (!isCopyToken) {
            // Literal token: 1 byte
            decompressed.push(compressed[compressedPos++]);
          } else {
            // Copy token: 2 bytes
            if (compressedPos + 1 >= chunkEnd) {
              compressedPos = chunkEnd;
              break;
            }
            const copyToken = compressed[compressedPos] | (compressed[compressedPos + 1] << 8);
            compressedPos += 2;

            const decompressedCurrent = decompressed.length - chunkStartDecompressed;
            let bitCount = 4;
            while ((1 << bitCount) < decompressedCurrent && bitCount < 12) {
              bitCount++;
            }

            const lengthMask = (1 << (16 - bitCount)) - 1;
            const offset = (copyToken >> (16 - bitCount)) + 1;
            const length = (copyToken & lengthMask) + 3;

            const copySource = decompressed.length - offset;
            for (let i = 0; i < length; i++) {
              decompressed.push(decompressed[copySource + i]);
            }
          }
        }
      }
    }
  }

  return Buffer.from(decompressed).toString("utf-8");
}

export function extractPrintableStrings(buffer: Buffer, minLen = 5): string {
  const text = buffer.toString("binary");
  const matches = text.match(/[\x20-\x7E\r\n\t]{5,}/g);
  return matches ? matches.join("\n") : "";
}

/**
 * Extracts VBA scripts or strings from a word/vbaProject.bin buffer.
 */
export function extractVbaFromBinary(vbaBuffer: Buffer): { origin: "macro" | "macro-strings"; code: string } {
  try {
    const cfb = CFB.read(vbaBuffer, { type: "buffer" });
    const moduleCodes: string[] = [];

    for (const entryName of cfb.FullPaths) {
      // Look for VBA modules in the OLE storage
      if (entryName.includes("VBA/") && !entryName.endsWith("dir") && !entryName.endsWith("_VBA_PROJECT")) {
        const file = CFB.find(cfb, entryName);
        if (file && file.content) {
          const contentBuf = Buffer.from(file.content);
          // Locate 0x01 signature or search for code
          let code = "";
          for (let i = 0; i < contentBuf.length - 1; i++) {
            if (contentBuf[i] === 0x01 && (contentBuf[i + 1] & 0x70) === 0x30) {
              try {
                const decomp = decompressVba(new Uint8Array(contentBuf.subarray(i)));
                if (decomp && (decomp.includes("Sub ") || decomp.includes("Function ") || decomp.includes("Dim ") || decomp.includes("Attribute "))) {
                  code = decomp;
                  break;
                }
              } catch {
                // Continue scanning
              }
            }
          }
          if (code) {
            moduleCodes.push(code.trim());
          }
        }
      }
    }

    if (moduleCodes.length > 0) {
      return { origin: "macro", code: moduleCodes.join("\n\n") };
    }
  } catch {
    // Fall back to printable strings
  }

  // Fallback: extract ASCII strings
  const strings = extractPrintableStrings(vbaBuffer, 6);
  return {
    origin: "macro-strings",
    code: strings.slice(0, 10000) || "[Unable to extract printable VBA strings]",
  };
}
