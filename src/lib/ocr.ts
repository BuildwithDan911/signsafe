/**
 * Client-side image resize and OCR via Tesseract.js
 */

export function shrinkImage(
  file: File,
  maxDimension = 1600,
  quality = 0.8
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Unable to create canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve({ dataUrl, width, height });
      };
      img.onerror = () => reject(new Error("Failed to load image file"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

export async function runClientOcr(
  imageDataUrl: string,
  onProgress?: (percent: number, status: string) => void
): Promise<string> {
  const { createWorker } = await import("tesseract.js");

  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (onProgress && m.status) {
        const progress = Math.round((m.progress || 0) * 100);
        onProgress(progress, m.status);
      }
    },
  });

  try {
    const ret = await worker.recognize(imageDataUrl);
    await worker.terminate();
    return ret.data.text || "";
  } catch (err: any) {
    try {
      await worker.terminate();
    } catch {}
    throw new Error(`OCR failed: ${err.message}`);
  }
}

/** Render every PDF page and OCR it when the PDF text layer is too sparse. */
export async function runPdfOcr(
  file: File,
  onProgress?: (percent: number, status: string) => void
): Promise<{ text: string; pageCount: number }> {
  const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).toString();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  if (pdf.numPages > 4) {
    const pageCount = pdf.numPages;
    await pdf.destroy();
    throw new Error(`This PDF has ${pageCount} pages. SignSafe supports PDFs up to 4 pages. Split it into files of 4 pages or fewer and check each section separately.`);
  }
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (message) => {
      if (onProgress && message.status) {
        onProgress(Math.round((message.progress || 0) * 100), message.status);
      }
    },
  });
  const pageCount = pdf.numPages;
  const pageTexts: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      onProgress?.(Math.round(((pageNumber - 1) / pageCount) * 100), `page ${pageNumber} of ${pageCount}`);
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.6 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Unable to render a PDF page for OCR");

      await page.render({ canvasContext: context, viewport }).promise;
      const result = await worker.recognize(canvas.toDataURL("image/jpeg", 0.85));
      pageTexts.push(result.data.text || "");
      page.cleanup();
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    await worker.terminate();
    await pdf.destroy();
  }

  return { text: pageTexts.join("\n\n"), pageCount };
}
