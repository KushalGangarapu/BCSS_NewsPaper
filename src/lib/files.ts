import { getSupabaseUrl } from "./env";

/**
 * files.ts — storage paths, size caps, and magic-byte sniffing.
 *
 * Pure functions over Uint8Array so the SAME code runs in the browser
 * (admin upload pre-check) and in route handlers (server re-validation).
 */

export const STORAGE_BUCKET = "issues";

export const PDF_MAX_BYTES = 50 * 1024 * 1024; // 50 MB
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** Storage keys are client-generated UUIDs under fixed prefixes. */
export const PDF_PATH_RE = new RegExp(`^pdfs/${UUID}\\.pdf$`);
export const COVER_PATH_RE = new RegExp(`^covers/${UUID}\\.(png|jpe?g|webp)$`);

export type SniffedKind = "pdf" | "png" | "jpeg" | "webp";

/**
 * Identify a file by its leading magic bytes.
 *   PDF  → "%PDF-"          (25 50 44 46 2D)
 *   PNG  → 89 50 4E 47 0D 0A 1A 0A
 *   JPEG → FF D8 FF
 *   WebP → "RIFF"...."WEBP" (bytes 0-3 and 8-11)
 */
export function sniffBytes(b: Uint8Array): SniffedKind | null {
  if (
    b.length >= 5 &&
    b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d
  ) {
    return "pdf";
  }
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) {
    return "png";
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return "jpeg";
  }
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // "RIFF"
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 // "WEBP"
  ) {
    return "webp";
  }
  return null;
}

/** Public object URL on the Supabase Storage public endpoint. */
export function publicUrl(path: string): string {
  return `${getSupabaseUrl()}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

/**
 * Download URL that forces a Content-Disposition attachment via Supabase's
 * `?download=` query param (no bytes proxied through Vercel).
 */
export function downloadUrl(path: string, filename: string): string {
  return `${publicUrl(path)}?download=${encodeURIComponent(filename)}`;
}

/** MIME type implied by a cover path's extension (must match COVER_PATH_RE). */
export function coverMimeForPath(
  path: string,
): "image/png" | "image/jpeg" | "image/webp" | null {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    default:
      return null;
  }
}
