/** Row shape of the `issues` table (see schema.sql). */
export interface Issue {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  /** ISO 8601 timestamp; the issue's publication date. Nullable = undated. */
  published_at: string | null;
  /** Storage object path inside the `issues` bucket, e.g. `pdfs/<uuid>.pdf`. */
  pdf_path: string;
  /** Storage object path, e.g. `covers/<uuid>.png`. Null = no cover image. */
  cover_path: string | null;
  is_published: boolean;
  created_at: string;
}

/** JSON payload accepted by POST /api/admin/issues. */
export interface IssueInput {
  title: string;
  /** Optional — auto-slugified from title when omitted/blank. */
  slug?: string;
  description?: string | null;
  /** `YYYY-MM-DD` or full ISO timestamp; null/omitted = undated. */
  published_at?: string | null;
  pdf_path: string;
  cover_path?: string | null;
  is_published?: boolean;
}

/** JSON payload accepted by PATCH /api/admin/issues/[id]. All fields optional. */
export type IssuePatch = Partial<IssueInput>;
