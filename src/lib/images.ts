/**
 * Image processing helpers for Clocked image requests (Phase 8).
 * Shrinks screenshots to at most 1600px on the long side as JPEG quality 0.8.
 * Decoded bytes capped at 2.3 MB aggregate.
 */

export const MAX_IMAGE_LONG_SIDE = 1600;
export const JPEG_QUALITY = 0.8;
export const MAX_AGGREGATE_BYTES = 2.3 * 1024 * 1024; // 2.3 MB

export function calculateDecodedBytes(dataUrls: string[]): number {
  return dataUrls.reduce((total, url) => {
    const commaIdx = url.indexOf(",");
    const b64 = commaIdx >= 0 ? url.slice(commaIdx + 1) : url;
    return total + Math.round((b64.length * 3) / 4);
  }, 0);
}

export async function processScreenshotFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > MAX_IMAGE_LONG_SIDE || height > MAX_IMAGE_LONG_SIDE) {
          if (width > height) {
            height = Math.round((height * MAX_IMAGE_LONG_SIDE) / width);
            width = MAX_IMAGE_LONG_SIDE;
          } else {
            width = Math.round((width * MAX_IMAGE_LONG_SIDE) / height);
            height = MAX_IMAGE_LONG_SIDE;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(src); // fallback
          return;
        }

        // Fill background white in case of transparency in PNG
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const jpegDataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        resolve(jpegDataUrl);
      };
      img.onerror = () => reject(new Error("Could not decode image file"));
      img.src = src;
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
