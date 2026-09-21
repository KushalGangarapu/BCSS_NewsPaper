"use client";

/**
 * pdfjs.ts — lazy CDN loader for pdf.js, shared by the reader and the
 * admin cover generator.
 *
 * pdfjs-dist is loaded from jsdelivr (pinned version) instead of the npm
 * bundle to keep the client payload small. The worker is bootstrapped via a
 * blob-URL module worker because cross-origin workers are blocked; this needs
 * `worker-src blob:` + `script-src https://cdn.jsdelivr.net` in the CSP
 * (already configured in next.config.ts).
 */

export const PDFJS_VERSION = "6.2.108";
const PDFJS_BASE = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build`;
const PDFJS_MODULE_URL = `${PDFJS_BASE}/pdf.min.mjs`;
const PDFJS_WORKER_URL = `${PDFJS_BASE}/pdf.worker.min.mjs`;

export interface PdfJsViewport {
  width: number;
  height: number;
}

export interface PdfJsRenderTask {
  promise: Promise<void>;
  cancel(): void;
}

export interface PdfJsPage {
  getViewport(options: { scale: number }): PdfJsViewport;
  render(options: {
    canvas?: HTMLCanvasElement;
    canvasContext?: CanvasRenderingContext2D;
    viewport: PdfJsViewport;
  }): PdfJsRenderTask;
}

export interface PdfJsDocument {
  numPages: number;
  getPage(n: number): Promise<PdfJsPage>;
}

/** pdf.js 6.x: destruction lives on the loading task, not the document —
 *  `PDFDocumentProxy.destroy()` was removed. */
export interface PdfJsLoadingTask {
  promise: Promise<PdfJsDocument>;
  destroy(): Promise<void>;
}

export interface PdfJs {
  getDocument(src: { url: string }): PdfJsLoadingTask;
  GlobalWorkerOptions: { workerSrc: string; workerPort: Worker | null };
}

declare global {
  interface Window {
    __pdfjsLib?: PdfJs;
  }
}

let loadPromise: Promise<PdfJs> | null = null;

/** Rejects `p` if it doesn't settle within `ms` — keeps UI from hanging on
 *  a network stall (the underlying promise may still resolve, harmlessly). */
export function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms),
    ),
  ]);
}

export function loadPdfJs(): Promise<PdfJs> {
  if (loadPromise) return loadPromise;
  if (typeof window === "undefined") {
    return Promise.reject(new Error("pdf.js can only load in the browser"));
  }

  loadPromise = new Promise<PdfJs>((resolve, reject) => {
    // A stalled CDN fetch would otherwise leave this promise pending forever —
    // and since it's cached, every consumer would wait on it permanently.
    const timer = setTimeout(() => {
      loadPromise = null;
      reject(new Error("pdf.js load timed out"));
    }, 30_000);

    const onReady = () => {
      clearTimeout(timer);
      if (window.__pdfjsLib) {
        resolve(window.__pdfjsLib);
      } else {
        reject(new Error("pdf.js loaded but did not register"));
      }
    };
    const onError = (event: Event) => {
      clearTimeout(timer);
      reject(
        new Error(
          `Failed to load pdf.js: ${(event as CustomEvent).detail ?? "unknown"}`,
        ),
      );
    };

    window.addEventListener("pdfjs:ready", onReady, { once: true });
    window.addEventListener("pdfjs:error", onError, { once: true });

    const script = document.createElement("script");
    script.type = "module";
    // Dynamic import inside a module script so failures are catchable and we
    // can hand pdf.js an already-constructed module Worker via workerPort.
    script.textContent = `
      import(${JSON.stringify(PDFJS_MODULE_URL)}).then((pdfjsLib) => {
        try {
          const blob = new Blob(
            ['import ' + ${JSON.stringify(JSON.stringify(PDFJS_WORKER_URL))} + ';'],
            { type: "text/javascript" },
          );
          pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(
            URL.createObjectURL(blob),
            { type: "module" },
          );
          window.__pdfjsLib = pdfjsLib;
          window.dispatchEvent(new Event("pdfjs:ready"));
        } catch (err) {
          window.dispatchEvent(new CustomEvent("pdfjs:error", { detail: String(err) }));
        }
      }).catch((err) => {
        window.dispatchEvent(new CustomEvent("pdfjs:error", { detail: String(err) }));
      });
    `;
    document.head.appendChild(script);
  });

  return loadPromise;
}
