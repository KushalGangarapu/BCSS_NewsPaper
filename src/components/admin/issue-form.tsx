"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  IMAGE_MAX_BYTES,
  PDF_MAX_BYTES,
  STORAGE_BUCKET,
  coverMimeForPath,
  publicUrl,
  sniffBytes,
} from "@/lib/files";
import { loadPdfJs, withTimeout } from "@/lib/pdfjs";
import { SLUG_RE, slugify } from "@/lib/utils";
import type { Issue, IssueInput, IssuePatch } from "@/lib/types";

type IssueFormProps = { mode: "create" } | { mode: "edit"; issue: Issue };

type UploadState = "idle" | "working" | "done" | "error";
type CoverChoice = "keep" | "auto" | "custom" | "none";

const INPUT =
  "w-full rounded border border-ink/20 bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none";
const LABEL = "eyebrow mb-1.5 block text-ink";
const HINT = "mt-1 text-xs text-ink/50";
const ERROR = "mt-1 text-xs font-semibold text-accent";

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
}

function fileName(path: string): string {
  return path.split("/").pop() ?? path;
}

export default function IssueForm(props: IssueFormProps) {
  const isEdit = props.mode === "edit";
  const issue = isEdit ? props.issue : undefined;

  const router = useRouter();

  const [title, setTitle] = useState(issue?.title ?? "");
  const [slug, setSlug] = useState(issue?.slug ?? "");
  const slugTouched = useRef(isEdit);
  const [description, setDescription] = useState(issue?.description ?? "");
  const [publishedAt, setPublishedAt] = useState(
    issue?.published_at ? issue.published_at.slice(0, 10) : "",
  );
  const [isPublished, setIsPublished] = useState(issue?.is_published ?? false);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPath, setPdfPath] = useState<string | null>(
    issue?.pdf_path ?? null,
  );
  const [pdfStatus, setPdfStatus] = useState<UploadState>(
    isEdit ? "done" : "idle",
  );
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfLabel, setPdfLabel] = useState<string | null>(
    issue ? fileName(issue.pdf_path) : null,
  );

  const [coverChoice, setCoverChoice] = useState<CoverChoice>(
    isEdit ? "keep" : "auto",
  );
  const [coverPath, setCoverPath] = useState<string | null>(null);
  const [coverStatus, setCoverStatus] = useState<UploadState>("idle");
  const [coverError, setCoverError] = useState<string | null>(null);
  const [coverLabel, setCoverLabel] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const coverTicket = useRef(0);
  const previewRef = useRef<string | null>(null);

  const [titleError, setTitleError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pdfReady = Boolean(pdfFile) || Boolean(pdfPath);
  const uploadPending = pdfStatus === "working" || coverStatus === "working";

  function replacePreview(next: string | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next;
    setCoverPreview(next);
  }

  function onTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched.current) {
      setSlug(slugify(value));
    }
  }

  async function uploadPdf(file: File) {
    setPdfStatus("working");
    setPdfError(null);
    try {
      const path = `pdfs/${crypto.randomUUID()}.pdf`;
      const { error } = await createClient()
        .storage.from(STORAGE_BUCKET)
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (error) throw new Error(error.message);
      setPdfPath(path);
      setPdfStatus("done");
    } catch (err) {
      setPdfStatus("error");
      setPdfError(
        `PDF upload failed: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    }
  }

  async function generateAutoCover(source: File | string) {
    const ticket = ++coverTicket.current;
    setCoverStatus("working");
    setCoverError(null);
    let objectUrl: string | null = null;
    try {
      const pdfjs = await loadPdfJs();
      const url =
        typeof source === "string"
          ? source
          : (objectUrl = URL.createObjectURL(source));
      const loadingTask = pdfjs.getDocument({ url });
      const doc = await withTimeout(
        loadingTask.promise,
        45_000,
        "PDF open timed out",
      );
      try {
        const page = await doc.getPage(1);
        const viewport = page.getViewport({
          scale: 1200 / page.getViewport({ scale: 1 }).width,
        });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas 2D is unavailable");
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png"),
        );
        if (!blob) throw new Error("Could not rasterize page 1");
        if (ticket !== coverTicket.current) return;
        const path = `covers/${crypto.randomUUID()}.png`;
        const { error } = await createClient()
          .storage.from(STORAGE_BUCKET)
          .upload(path, blob, { contentType: "image/png", upsert: false });
        if (error) throw new Error(error.message);
        setCoverPath(path);
        setCoverLabel("Generated from page 1");
        replacePreview(URL.createObjectURL(blob));
        setCoverStatus("done");
      } finally {
        await loadingTask.destroy().catch(() => {});
      }
    } catch {
      if (ticket !== coverTicket.current) return;
      setCoverPath(null);
      setCoverStatus("error");
      setCoverError(
        "Could not generate a cover automatically — upload a custom image or choose none.",
      );
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  }

  async function onPdfPicked(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPdfError(null);
    if (file.size > PDF_MAX_BYTES) {
      setPdfError(
        `PDF is too large — the maximum size is ${formatSize(PDF_MAX_BYTES)}.`,
      );
      event.target.value = "";
      return;
    }
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (sniffBytes(head) !== "pdf") {
      setPdfError("That file is not a PDF.");
      event.target.value = "";
      return;
    }
    setPdfFile(file);
    setPdfLabel(file.name);
    void uploadPdf(file);
    if (coverChoice === "auto") {
      void generateAutoCover(file);
    }
  }

  async function onCoverPicked(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    coverTicket.current += 1;
    setCoverError(null);
    if (file.size > IMAGE_MAX_BYTES) {
      setCoverError(
        `Image is too large — the maximum size is ${formatSize(IMAGE_MAX_BYTES)}.`,
      );
      event.target.value = "";
      return;
    }
    const kind = sniffBytes(
      new Uint8Array(await file.slice(0, 16).arrayBuffer()),
    );
    if (kind !== "png" && kind !== "jpeg" && kind !== "webp") {
      setCoverError("Cover must be a PNG, JPEG, or WebP image.");
      event.target.value = "";
      return;
    }
    const path = `covers/${crypto.randomUUID()}.${kind === "jpeg" ? "jpg" : kind}`;
    const contentType = coverMimeForPath(path) ?? file.type;
    setCoverStatus("working");
    try {
      const { error } = await createClient()
        .storage.from(STORAGE_BUCKET)
        .upload(path, file, { contentType, upsert: false });
      if (error) throw new Error(error.message);
      setCoverPath(path);
      setCoverLabel(file.name);
      replacePreview(URL.createObjectURL(file));
      setCoverStatus("done");
    } catch (err) {
      setCoverStatus("error");
      setCoverError(
        `Cover upload failed: ${err instanceof Error ? err.message : "unknown error"}`,
      );
    }
  }

  function chooseCover(next: CoverChoice) {
    coverTicket.current += 1;
    setCoverChoice(next);
    setCoverPath(null);
    setCoverLabel(null);
    setCoverStatus("idle");
    setCoverError(null);
    replacePreview(null);
    if (next === "auto") {
      if (pdfFile) {
        void generateAutoCover(pdfFile);
      } else if (pdfPath) {
        void generateAutoCover(publicUrl(pdfPath));
      }
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setTitleError(null);
    setSlugError(null);
    setCoverError(null);

    let invalid = false;
    if (!title.trim()) {
      setTitleError("Title is required.");
      invalid = true;
    }
    if (!SLUG_RE.test(slug.trim())) {
      setSlugError(
        "Use lowercase letters, numbers, and hyphens only (e.g. october-2026).",
      );
      invalid = true;
    }
    if (!pdfPath) {
      setPdfError("A PDF is required — choose a file and let it upload.");
      invalid = true;
    }
    if (coverChoice === "custom" && !coverPath) {
      setCoverError("Choose a cover image, or pick a different cover option.");
      invalid = true;
    }
    if (invalid) return;

    setSubmitting(true);

    let res: Response | null;
    if (isEdit && issue) {
      const patch: IssuePatch = {};
      const trimmedTitle = title.trim();
      const trimmedSlug = slug.trim();
      const nextDescription = description || null;
      const nextDate = publishedAt || null;
      const currentDate = issue.published_at
        ? issue.published_at.slice(0, 10)
        : null;
      if (trimmedTitle !== issue.title) patch.title = trimmedTitle;
      if (trimmedSlug !== issue.slug) patch.slug = trimmedSlug;
      if (nextDescription !== issue.description)
        patch.description = nextDescription;
      if (nextDate !== currentDate) patch.published_at = nextDate;
      if (isPublished !== issue.is_published)
        patch.is_published = isPublished;
      if (pdfPath && pdfPath !== issue.pdf_path) patch.pdf_path = pdfPath;
      if (coverChoice === "none" && issue.cover_path !== null) {
        patch.cover_path = null;
      } else if (
        (coverChoice === "auto" || coverChoice === "custom") &&
        coverPath &&
        coverPath !== issue.cover_path
      ) {
        patch.cover_path = coverPath;
      }

      if (Object.keys(patch).length === 0) {
        router.push("/admin");
        router.refresh();
        return;
      }

      res = await fetch(`/api/admin/issues/${issue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
        signal: AbortSignal.timeout(60_000),
      }).catch(() => null);
    } else {
      const body: IssueInput = {
        title: title.trim(),
        slug: slug.trim(),
        description: description || null,
        published_at: publishedAt || null,
        pdf_path: pdfPath ?? "",
        cover_path:
          coverChoice === "auto" || coverChoice === "custom"
            ? coverPath
            : null,
        is_published: isPublished,
      };
      res = await fetch("/api/admin/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      }).catch(() => null);
    }

    if (!res) {
      setFormError("Network error — check your connection and try again.");
      setSubmitting(false);
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setFormError(
        data && typeof data.error === "string"
          ? data.error
          : `Save failed (${res.status}).`,
      );
      setSubmitting(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  const coverOptions: { value: CoverChoice; label: string }[] =
    isEdit
      ? [
          {
            value: "keep",
            label: issue?.cover_path
              ? "Keep current cover"
              : "Keep as is (no cover)",
          },
          { value: "auto", label: "Generate from page 1" },
          { value: "custom", label: "Upload image" },
          { value: "none", label: "No cover" },
        ]
      : [
          { value: "auto", label: "Generate from page 1" },
          { value: "custom", label: "Upload image" },
          { value: "none", label: "No cover" },
        ];

  return (
    <form onSubmit={onSubmit} className="max-w-3xl">
      <div>
        <p className="eyebrow text-accent">
          {isEdit ? "Edit issue" : "New issue"}
        </p>
        <h1 className="font-display mt-2 text-3xl font-bold text-ink">
          {isEdit ? issue?.title : "Publish a new issue"}
        </h1>
      </div>

      <div className="mt-8 flex flex-col gap-5">
        <div>
          <label htmlFor="issue-title" className={LABEL}>
            Title <span className="text-accent">*</span>
          </label>
          <input
            id="issue-title"
            type="text"
            required
            maxLength={200}
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            aria-describedby={titleError ? "issue-title-error" : undefined}
            aria-invalid={titleError ? true : undefined}
            className={INPUT}
          />
          {titleError && (
            <p id="issue-title-error" role="alert" className={ERROR}>
              {titleError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="issue-slug" className={LABEL}>
            Slug <span className="text-accent">*</span>
          </label>
          <input
            id="issue-slug"
            type="text"
            required
            value={slug}
            onChange={(e) => {
              slugTouched.current = true;
              setSlug(e.target.value);
            }}
            aria-describedby={
              slugError ? "issue-slug-hint issue-slug-error" : "issue-slug-hint"
            }
            aria-invalid={slugError ? true : undefined}
            className={`${INPUT} font-mono`}
          />
          <p id="issue-slug-hint" className={HINT}>
            Lowercase letters, numbers, and hyphens — used in the URL:
            /issues/{slug || "your-slug"}
          </p>
          {slugError && (
            <p id="issue-slug-error" role="alert" className={ERROR}>
              {slugError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="issue-description" className={LABEL}>
            Description
          </label>
          <textarea
            id="issue-description"
            rows={4}
            maxLength={5000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={INPUT}
          />
        </div>

        <div className="flex flex-wrap items-end gap-5">
          <div>
            <label htmlFor="issue-date" className={LABEL}>
              Publication date
            </label>
            <input
              id="issue-date"
              type="date"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              aria-describedby="issue-date-hint"
              className={INPUT}
            />
            <p id="issue-date-hint" className={HINT}>
              Optional — publishing without a date uses today.
            </p>
          </div>
          <label
            htmlFor="issue-published"
            className="flex items-center gap-2 pb-2 text-sm font-semibold text-ink"
          >
            <input
              id="issue-published"
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            {isEdit ? "Published" : "Publish immediately"}
          </label>
        </div>
      </div>

      <fieldset className="mt-8 rounded border border-ink/15 p-4 sm:p-5">
        <legend className="eyebrow px-1 text-ink">Issue PDF</legend>
        <label htmlFor="issue-pdf" className="sr-only">
          {isEdit ? "Replace PDF" : "PDF file"}
        </label>
        <input
          id="issue-pdf"
          type="file"
          accept="application/pdf"
          onChange={onPdfPicked}
          aria-describedby="issue-pdf-status"
          className="block w-full text-sm text-ink file:mr-3 file:rounded file:border file:border-ink/20 file:bg-paper file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink hover:file:border-ink"
        />
        <div id="issue-pdf-status" className="mt-2 text-xs text-ink/60">
          {pdfStatus === "working" && (
            <p className="font-semibold text-ink">Uploading PDF…</p>
          )}
          {pdfStatus === "done" && pdfLabel && (
            <p>
              <span className="font-semibold text-ink">{pdfLabel}</span>
              {pdfFile ? ` · ${formatSize(pdfFile.size)}` : ""}
              {isEdit && !pdfFile ? " · current file" : " · uploaded"}
            </p>
          )}
          {pdfStatus === "error" && (
            <div className="flex flex-wrap items-center gap-2">
              <p role="alert" className="font-semibold text-accent">
                {pdfError}
              </p>
              {pdfFile && (
                <button
                  type="button"
                  onClick={() => void uploadPdf(pdfFile)}
                  className="rounded border border-ink/20 px-2 py-0.5 font-semibold text-ink hover:border-ink"
                >
                  Retry upload
                </button>
              )}
            </div>
          )}
          {pdfStatus !== "error" && pdfError && (
            <p role="alert" className="font-semibold text-accent">
              {pdfError}
            </p>
          )}
          {isEdit && (
            <p className="mt-1 text-ink/50">
              Choosing a new file replaces the PDF after the upload finishes.
            </p>
          )}
        </div>
      </fieldset>

      <fieldset className="mt-6 rounded border border-ink/15 p-4 sm:p-5">
        <legend className="eyebrow px-1 text-ink">Cover image</legend>
        {!pdfReady && (
          <p className="mb-3 text-xs text-ink/50">
            Choose a PDF first — the cover options unlock once one is
            available.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {coverOptions.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 text-sm font-semibold text-ink"
            >
              <input
                type="radio"
                name="cover-choice"
                value={option.value}
                checked={coverChoice === option.value}
                disabled={!pdfReady}
                onChange={() => chooseCover(option.value)}
                className="h-4 w-4 accent-accent disabled:opacity-40"
              />
              <span className={!pdfReady ? "text-ink/40" : undefined}>
                {option.label}
              </span>
            </label>
          ))}
        </div>

        {coverChoice === "keep" && issue?.cover_path && (
          <div className="mt-4">
            <Image
              src={publicUrl(issue.cover_path)}
              alt="Current cover"
              width={120}
              height={160}
              className="h-40 w-30 rounded border border-ink/10 object-cover"
            />
          </div>
        )}

        {coverChoice === "custom" && (
          <div className="mt-4">
            <label htmlFor="issue-cover" className="sr-only">
              Cover image
            </label>
            <input
              id="issue-cover"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onCoverPicked}
              className="block w-full text-sm text-ink file:mr-3 file:rounded file:border file:border-ink/20 file:bg-paper file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink hover:file:border-ink"
            />
            <p className="mt-1 text-xs text-ink/50">
              PNG, JPEG, or WebP — up to {formatSize(IMAGE_MAX_BYTES)}.
            </p>
          </div>
        )}

        {(coverChoice === "auto" || coverChoice === "custom") && (
          <div className="mt-3 text-xs text-ink/60" aria-live="polite">
            {coverStatus === "working" && (
              <p className="font-semibold text-ink">
                {coverChoice === "auto"
                  ? "Generating cover…"
                  : "Uploading cover…"}
              </p>
            )}
            {coverStatus === "done" && (
              <div className="flex items-end gap-3">
                {coverPreview && (
                  // eslint-disable-next-line @next/next/no-img-element -- blob/object-URL preview, not a stored image
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="h-40 w-30 rounded border border-ink/10 object-cover"
                  />
                )}
                <p>
                  <span className="font-semibold text-ink">{coverLabel}</span>
                  {" · ready"}
                </p>
              </div>
            )}
            {coverStatus === "error" && coverError && (
              <p role="alert" className="font-semibold text-accent">
                {coverError}
              </p>
            )}
            {coverStatus === "idle" &&
              coverChoice === "custom" &&
              !coverError && (
                <p>Choose an image file to use as the cover.</p>
              )}
          </div>
        )}
        {coverChoice === "custom" && coverStatus !== "error" && coverError && (
          <p role="alert" className="mt-3 text-xs font-semibold text-accent">
            {coverError}
          </p>
        )}
      </fieldset>

      {formError && (
        <p role="alert" className="mt-6 text-sm font-semibold text-accent">
          {formError}
        </p>
      )}

      <div className="sticky bottom-0 mt-8 flex items-center justify-between gap-4 border-t border-ink/15 bg-paper/95 py-4 backdrop-blur">
        <Link
          href="/admin"
          className="text-sm font-semibold text-ink/60 hover:text-accent"
        >
          Cancel
        </Link>
        <div className="flex items-center gap-3">
          {uploadPending && (
            <p className="text-xs font-semibold text-ink/60" aria-live="polite">
              Waiting for uploads to finish…
            </p>
          )}
          <button
            type="submit"
            disabled={submitting || uploadPending}
            className="rounded bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : "Create issue"}
          </button>
        </div>
      </div>
    </form>
  );
}
