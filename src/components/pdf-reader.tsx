"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadPdfJs,
  withTimeout,
  type PdfJsDocument,
  type PdfJsLoadingTask,
  type PdfJsRenderTask,
} from "@/lib/pdfjs";

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

type Status = "loading" | "ready" | "error";
type ZoomMode = "fit" | number;

const TOOL_BUTTON =
  "rounded border border-ink/30 px-2.5 py-1 text-sm font-semibold text-ink transition-colors hover:border-ink hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink/30 disabled:hover:bg-transparent disabled:hover:text-ink";

function isCancelledError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: string }).name === "RenderingCancelledException"
  );
}

function isFormTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable)
  );
}

function keyDirection(key: string): -1 | 0 | 1 {
  if (key === "ArrowLeft" || key === "PageUp") return -1;
  if (key === "ArrowRight" || key === "PageDown") return 1;
  return 0;
}

export default function PdfReader({
  url,
  title = "this issue",
}: {
  url: string;
  title?: string;
}) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{
    doc: PdfJsDocument;
    url: string;
    attempt: number;
  } | null>(null);
  const [failed, setFailed] = useState<{ url: string; attempt: number } | null>(
    null,
  );
  const [pageNum, setPageNum] = useState(1);
  const [zoom, setZoom] = useState<ZoomMode>("fit");
  const [containerWidth, setContainerWidth] = useState(0);
  const [jumpEdit, setJumpEdit] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseWidthRef = useRef(0);

  const doc =
    loaded && loaded.url === url && loaded.attempt === attempt
      ? loaded.doc
      : null;
  const numPages = doc?.numPages ?? 0;
  const currentPage = Math.min(Math.max(1, pageNum), Math.max(1, numPages));
  const status: Status =
    failed && failed.url === url && failed.attempt === attempt
      ? "error"
      : doc
        ? "ready"
        : "loading";

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PdfJsLoadingTask | null = null;

    loadPdfJs()
      .then((pdfjs) => {
        loadingTask = pdfjs.getDocument({ url });
        return withTimeout(
          loadingTask.promise,
          45_000,
          "PDF open timed out",
        );
      })
      .then((d) => {
        if (cancelled) return;
        setLoaded({ doc: d, url, attempt });
      })
      .catch(() => {
        if (!cancelled) setFailed({ url, attempt });
      });

    return () => {
      cancelled = true;
      try {
        void loadingTask?.destroy().catch(() => {});
      } catch {}
    };
  }, [url, attempt]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!doc || !canvas || containerWidth <= 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;
    let task: PdfJsRenderTask | null = null;

    doc
      .getPage(currentPage)
      .then((page) => {
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        baseWidthRef.current = base.width;
        const scale = zoom === "fit" ? containerWidth / base.width : zoom;
        const viewport = page.getViewport({ scale });
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        ctx.scale(dpr, dpr);
        task = page.render({ canvas, canvasContext: ctx, viewport });
        task.promise.catch((err: unknown) => {
          if (!cancelled && !isCancelledError(err)) setFailed({ url, attempt });
        });
      })
      .catch((err: unknown) => {
        if (!cancelled && !isCancelledError(err)) setFailed({ url, attempt });
      });

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, currentPage, zoom, containerWidth, url, attempt]);

  const turnPage = useCallback(
    (dir: -1 | 1) => {
      setJumpEdit(null);
      setPageNum((p) => Math.min(Math.max(numPages, 1), Math.max(1, p + dir)));
    },
    [numPages],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isFormTarget(e.target)) return;
      const dir = keyDirection(e.key);
      if (dir === 0) return;
      e.preventDefault();
      turnPage(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turnPage]);

  const applyJump = () => {
    if (jumpEdit === null) return;
    const n = Number.parseInt(jumpEdit, 10);
    if (!Number.isNaN(n) && numPages > 0) {
      setPageNum(Math.min(Math.max(1, n), numPages));
    }
    setJumpEdit(null);
  };

  const currentScale = () => {
    if (typeof zoom === "number") return zoom;
    if (containerWidth > 0 && baseWidthRef.current > 0) {
      return containerWidth / baseWidthRef.current;
    }
    return 1;
  };

  const zoomIn = () =>
    setZoom(
      Math.min(MAX_SCALE, Math.round((currentScale() + SCALE_STEP) * 100) / 100),
    );
  const zoomOut = () =>
    setZoom(
      Math.max(MIN_SCALE, Math.round((currentScale() - SCALE_STEP) * 100) / 100),
    );

  const handleRetry = () => {
    setPageNum(1);
    setJumpEdit(null);
    setAttempt((a) => a + 1);
  };

  return (
    <div
      role="region"
      aria-label="PDF reader — use arrow keys to turn pages"
      tabIndex={0}
      className="overflow-hidden rounded-md border border-ink/25 bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {status === "ready" && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-ink/15 px-3 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={TOOL_BUTTON}
              onClick={() => turnPage(-1)}
              disabled={currentPage <= 1}
              aria-label="Previous page"
            >
              ←
            </button>
            <span className="flex items-center gap-1.5 text-sm text-ink/80">
              Page
              <input
                type="text"
                inputMode="numeric"
                aria-label="Go to page"
                value={jumpEdit ?? String(currentPage)}
                onChange={(e) =>
                  setJumpEdit(e.target.value.replace(/\D/g, ""))
                }
                onBlur={applyJump}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyJump();
                  } else if (e.key === "Escape") {
                    setJumpEdit(null);
                  }
                }}
                className="w-11 rounded border border-ink/30 bg-paper px-1 py-0.5 text-center text-sm text-ink focus:border-accent focus:outline-none"
              />
              of {numPages}
            </span>
            <button
              type="button"
              className={TOOL_BUTTON}
              onClick={() => turnPage(1)}
              disabled={currentPage >= numPages}
              aria-label="Next page"
            >
              →
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={
                zoom === "fit"
                  ? `${TOOL_BUTTON} border-ink bg-ink text-paper`
                  : TOOL_BUTTON
              }
              onClick={() => setZoom("fit")}
              aria-pressed={zoom === "fit"}
            >
              Fit width
            </button>
            <button
              type="button"
              className={TOOL_BUTTON}
              onClick={zoomOut}
              disabled={typeof zoom === "number" && zoom <= MIN_SCALE}
              aria-label="Zoom out"
            >
              −
            </button>
            <span className="min-w-12 text-center text-xs font-semibold text-ink/70">
              {zoom === "fit" ? "Fit" : `${Math.round(zoom * 100)}%`}
            </span>
            <button
              type="button"
              className={TOOL_BUTTON}
              onClick={zoomIn}
              disabled={typeof zoom === "number" && zoom >= MAX_SCALE}
              aria-label="Zoom in"
            >
              +
            </button>
          </div>
        </div>
      )}
      <span aria-live="polite" className="sr-only">
        {status === "ready" ? `Page ${currentPage} of ${numPages}` : ""}
      </span>
      <div
        ref={scrollRef}
        className="max-h-[80vh] overflow-auto bg-ink/[0.05] px-4 py-6 sm:px-6"
      >
        {status === "loading" && (
          <div
            role="status"
            className="flex min-h-72 flex-col items-center justify-center gap-3"
          >
            <span
              aria-hidden="true"
              className="motion-safe:animate-spin h-6 w-6 rounded-full border-2 border-ink/20 border-t-accent"
            />
            <p className="eyebrow text-ink/60">Loading issue…</p>
          </div>
        )}
        {status === "error" && (
          <div
            role="alert"
            className="flex min-h-72 flex-col items-center justify-center gap-4 text-center"
          >
            <p className="font-display text-xl font-bold text-ink">
              This issue couldn’t be loaded.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded border border-accent px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-paper"
            >
              Try again
            </button>
          </div>
        )}
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Page ${currentPage} of ${title}`}
          className={`${
            status === "ready" ? "block" : "hidden"
          } mx-auto border border-ink/20 bg-white shadow-[0_4px_24px_rgba(20,20,20,0.15)]`}
        />
      </div>
    </div>
  );
}
