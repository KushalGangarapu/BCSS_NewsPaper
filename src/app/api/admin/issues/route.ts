import { hasSupabaseEnv } from "@/lib/env";
import {
  COVER_PATH_RE,
  PDF_PATH_RE,
  STORAGE_BUCKET,
} from "@/lib/files";
import { verifyStoredObject } from "@/lib/storage-verify";
import { createClient } from "@/lib/supabase/server";
import { SLUG_RE, schoolTodayISO, slugify } from "@/lib/utils";
import type { IssueInput } from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}([T ].*)?$/;

function bad(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function validateBody(raw: unknown):
  | { ok: true; value: Required<Omit<IssueInput, "slug">> & { slug: string } }
  | { ok: false; message: string } {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, message: "Expected a JSON object" };
  }
  const body = raw as Record<string, unknown>;

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 200) {
    return { ok: false, message: "title is required (1–200 characters)" };
  }

  const slug =
    typeof body.slug === "string" && body.slug.trim()
      ? body.slug.trim()
      : slugify(title);
  if (!SLUG_RE.test(slug)) {
    return { ok: false, message: "slug must be lowercase letters, numbers, and hyphens" };
  }

  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  if (description.length > 5000) {
    return { ok: false, message: "description is too long (max 5000 characters)" };
  }

  let publishedAt: string | null = null;
  if (body.published_at != null && body.published_at !== "") {
    if (
      typeof body.published_at !== "string" ||
      !DATE_RE.test(body.published_at) ||
      Number.isNaN(Date.parse(body.published_at))
    ) {
      return { ok: false, message: "published_at must be a valid date" };
    }
    publishedAt = body.published_at;
  }

  if (typeof body.pdf_path !== "string" || !PDF_PATH_RE.test(body.pdf_path)) {
    return { ok: false, message: "pdf_path is invalid" };
  }

  let coverPath: string | null = null;
  if (body.cover_path != null && body.cover_path !== "") {
    if (
      typeof body.cover_path !== "string" ||
      !COVER_PATH_RE.test(body.cover_path)
    ) {
      return { ok: false, message: "cover_path is invalid" };
    }
    coverPath = body.cover_path;
  }

  const isPublished = body.is_published === true;
  // Publishing without a date defaults to today (school timezone).
  if (isPublished && !publishedAt) {
    publishedAt = schoolTodayISO();
  }

  return {
    ok: true,
    value: {
      title,
      slug,
      description: description || null,
      published_at: publishedAt,
      pdf_path: body.pdf_path,
      cover_path: coverPath,
      is_published: isPublished,
    },
  };
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return bad("Server is not configured", 503);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return bad("Unauthorized", 401);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const parsed = validateBody(raw);
  if (!parsed.ok) {
    return bad(parsed.message);
  }
  const value = parsed.value;

  // Re-validate the actual stored bytes — the upload happened browser →
  // Supabase directly, so the server must check before trusting the paths.
  const pdfOk = await verifyStoredObject(value.pdf_path, "pdf");
  if (!pdfOk) {
    await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([value.pdf_path, value.cover_path].filter((p): p is string => Boolean(p)))
      .catch(() => {});
    return bad("Uploaded PDF failed verification (missing, too large, or not a PDF)", 422);
  }
  if (value.cover_path) {
    const coverOk = await verifyStoredObject(value.cover_path, "image");
    if (!coverOk) {
      await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([value.pdf_path, value.cover_path])
        .catch(() => {});
      return bad("Uploaded cover failed verification (missing, too large, or not an image)", 422);
    }
  }

  const { data, error } = await supabase
    .from("issues")
    .insert(value)
    .select()
    .single();

  if (error) {
    // Best-effort cleanup of orphaned storage objects.
    const paths = [value.pdf_path, value.cover_path].filter(
      (p): p is string => Boolean(p),
    );
    await supabase.storage.from(STORAGE_BUCKET).remove(paths).catch(() => {});
    if (error.code === "23505") {
      return bad("An issue with that slug already exists", 409);
    }
    return bad("Could not create the issue", 500);
  }

  return Response.json(data, { status: 201 });
}
