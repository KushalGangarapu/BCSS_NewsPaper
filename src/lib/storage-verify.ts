import {
  IMAGE_MAX_BYTES,
  PDF_MAX_BYTES,
  publicUrl,
  sniffBytes,
} from "./files";

/**
 * storage-verify.ts — server-side re-validation of objects the browser
 * uploaded directly to Supabase Storage.
 *
 * Vercel caps request bodies at 4.5 MB, so PDFs never pass through a route
 * handler. Instead the client uploads straight to Storage and sends us the
 * path; we then independently verify the stored bytes before trusting them:
 *
 *   1. HEAD  → object exists + content-length within cap
 *   2. GET Range: bytes=0-15 → magic-byte sniff of the real content
 *
 * Only the first chunk of the body is ever read, so a Range-ignoring response
 * can't pull a 50 MB object into the function.
 */

export type StoredKind = "pdf" | "image";

async function readFirstBytes(res: Response, n = 16): Promise<Uint8Array | null> {
  if (!res.body) return null;
  const reader = res.body.getReader();
  try {
    const out = new Uint8Array(n);
    let filled = 0;
    while (filled < n) {
      const { value, done } = await reader.read();
      if (done || !value) break;
      out.set(value.subarray(0, n - filled), filled);
      filled += Math.min(value.length, n - filled);
    }
    return filled > 0 ? out.subarray(0, filled) : null;
  } finally {
    // Fire-and-forget: awaiting cancel() can block for minutes while it waits
    // on the keep-alive socket teardown — the stream is discarded either way.
    void reader.cancel().catch(() => {});
  }
}

export async function verifyStoredObject(
  path: string,
  kind: StoredKind,
): Promise<boolean> {
  const url = publicUrl(path);
  const cap = kind === "pdf" ? PDF_MAX_BYTES : IMAGE_MAX_BYTES;

  try {
    const head = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!head.ok) return false;
    const length = Number(head.headers.get("content-length") ?? "0");
    if (!Number.isFinite(length) || length <= 0 || length > cap) return false;

    const res = await fetch(url, {
      headers: { Range: "bytes=0-15" },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return false;
    const bytes = await readFirstBytes(res);
    if (!bytes) return false;

    const kind2 = sniffBytes(bytes);
    return kind === "pdf"
      ? kind2 === "pdf"
      : kind2 === "png" || kind2 === "jpeg" || kind2 === "webp";
  } catch {
    return false;
  }
}
