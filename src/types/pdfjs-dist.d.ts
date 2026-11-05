declare module "pdfjs-dist" {
  interface PdfViewport {
    width: number;
    height: number;
  }

  interface PdfPage {
    getViewport(options: { scale: number }): PdfViewport;
    render(options: {
      canvasContext: CanvasRenderingContext2D;
      viewport: PdfViewport;
    }): { promise: Promise<void> };
    cleanup(): void;
  }

  interface PdfDocument {
    numPages: number;
    getPage(pageNumber: number): Promise<PdfPage>;
    destroy(): Promise<void>;
  }

  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(options: { data: Uint8Array }): {
    promise: Promise<PdfDocument>;
  };
}
