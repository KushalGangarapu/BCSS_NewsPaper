/** The paper's timezone — Burnaby, BC. "Today's date" on the site is always
 *  the school's date, regardless of where the server or reader happens to be. */
export const SCHOOL_TIME_ZONE = "America/Vancouver";

/** "2026-09-20" — today's date in the school's timezone. Used when an issue is
 *  published without an explicit date, so the stored date matches the
 *  masthead's idea of "today" (not the server's UTC date). */
export function schoolTodayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHOOL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** URL-safe slug: lowercase, accents stripped, non-alphanumerics → hyphens. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Valid slug shape (also enforced server-side). */
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "September 20, 2026" — or "Undated" for null/invalid input. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Undated";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Undated";
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/**
 * School-year label with a September→August boundary.
 * Sep 2025 – Aug 2026 → "2025–2026". Returns null for undated issues.
 */
export function schoolYear(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getUTCFullYear();
  const start = d.getUTCMonth() >= 8 ? year : year - 1; // month is 0-indexed; 8 = Sept
  return `${start}–${start + 1}`;
}
