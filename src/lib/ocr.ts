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
