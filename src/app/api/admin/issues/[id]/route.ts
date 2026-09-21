import { hasSupabaseEnv } from "@/lib/env";
import {
  COVER_PATH_RE,
  PDF_PATH_RE,
  STORAGE_BUCKET,
} from "@/lib/files";
import { verifyStoredObject } from "@/lib/storage-verify";
import { createClient } from "@/lib/supabase/server";
import { SLUG_RE, schoolTodayISO } from "@/lib/utils";
import type { Issue } from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}([T ].*)?$/;

function bad(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

async function removeQuietly(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: (string | null)[],
) {
  const list = paths.filter((p): p is string => Boolean(p));
  if (list.length) {
    await supabase.storage.from(STORAGE_BUCKET).remove(list).catch(() => {});
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasSupabaseEnv()) {
    return bad("Server is not configured", 503);
  }
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return bad("Invalid issue id", 404);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return bad("Unauthorized", 401);
  }

  const { data: existing } = await supabase
    .from("issues")
    .select("*")
    .eq("id", id)
    .maybeSingle<Issue>();
  if (!existing) {
    return bad("Issue not found", 404);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return bad("Invalid JSON body");
  }
  if (typeof raw !== "object" || raw === null) {
    return bad("Expected a JSON object");
  }
  const body = raw as Record<string, unknown>;

  const patch: Record<string, unknown> = {};
  const staleObjects: (string | null)[] = [];

  if ("title" in body) {
    if (typeof body.title !== "string" || !body.title.trim() || body.title.length > 200) {
      return bad("title must be 1–200 characters");
    }
    patch.title = body.title.trim();
  }
  if ("slug" in body) {
    if (typeof body.slug !== "string" || !SLUG_RE.test(body.slug.trim())) {
      return bad("slug must be lowercase letters, numbers, and hyphens");
    }
    patch.slug = body.slug.trim();
  }
  if ("description" in body) {
    if (body.description != null && typeof body.description !== "string") {
      return bad("description must be a string or null");
    }
    if (typeof body.description === "string" && body.description.length > 5000) {
      return bad("description is too long (max 5000 characters)");
    }
    patch.description = body.description?.trim() || null;
  }
  if ("published_at" in body) {
    if (body.published_at === null || body.published_at === "") {
      patch.published_at = null;
    } else if (
      typeof body.published_at === "string" &&
      DATE_RE.test(body.published_at) &&
      !Number.isNaN(Date.parse(body.published_at))
    ) {
      patch.published_at = body.published_at;
    } else {
      return bad("published_at must be a valid date or null");
    }
  }
  if ("is_published" in body) {
    if (typeof body.is_published !== "boolean") {
      return bad("is_published must be a boolean");
    }
    patch.is_published = body.is_published;
  }

  // New PDF? Re-validate stored bytes before trusting the new path.
  if ("pdf_path" in body && body.pdf_path !== existing.pdf_path) {
    if (typeof body.pdf_path !== "string" || !PDF_PATH_RE.test(body.pdf_path)) {
      return bad("pdf_path is invalid");
    }
    const ok = await verifyStoredObject(body.pdf_path, "pdf");
    if (!ok) {
      await removeQuietly(supabase, [body.pdf_path as string]);
      return bad("Uploaded PDF failed verification (missing, too large, or not a PDF)", 422);
    }
    patch.pdf_path = body.pdf_path;
    staleObjects.push(existing.pdf_path);
  }

  // Cover: replaced (validate), cleared (null), or untouched.
  if ("cover_path" in body && body.cover_path !== existing.cover_path) {
    if (body.cover_path === null || body.cover_path === "") {
      patch.cover_path = null;
      staleObjects.push(existing.cover_path);
    } else {
      if (
        typeof body.cover_path !== "string" ||
        !COVER_PATH_RE.test(body.cover_path)
      ) {
        return bad("cover_path is invalid");
      }
      const ok = await verifyStoredObject(body.cover_path, "image");
      if (!ok) {
        // Drop the rejected cover AND a newly-uploaded PDF (now orphaned) —
        // never the objects still referenced by the existing row.
        await removeQuietly(supabase, [
          typeof patch.pdf_path === "string" ? patch.pdf_path : null,
          body.cover_path as string,
        ]);
        return bad("Uploaded cover failed verification (missing, too large, or not an image)", 422);
      }
      patch.cover_path = body.cover_path;
      staleObjects.push(existing.cover_path);
    }
  }

  // Publishing with no date (and none already set) defaults to now.
  const publishedEffective =
    ("published_at" in body ? patch.published_at : existing.published_at) ??
    (("is_published" in body ? patch.is_published : existing.is_published)
      ? schoolTodayISO()
      : null);
  if ("is_published" in body || "published_at" in body) {
    patch.published_at = publishedEffective;
  }

  if (Object.keys(patch).length === 0) {
    return Response.json(existing);
  }

  const { data, error } = await supabase
    .from("issues")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return bad("An issue with that slug already exists", 409);
    }
    return bad("Could not update the issue", 500);
  }

  // Row updated — safe to drop the replaced storage objects.
  await removeQuietly(supabase, staleObjects);

  return Response.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasSupabaseEnv()) {
    return bad("Server is not configured", 503);
  }
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return bad("Invalid issue id", 404);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return bad("Unauthorized", 401);
  }

  const { data: existing } = await supabase
    .from("issues")
    .select("*")
    .eq("id", id)
    .maybeSingle<Issue>();
  if (!existing) {
    return bad("Issue not found", 404);
  }

  const { error } = await supabase.from("issues").delete().eq("id", id);
  if (error) {
    return bad("Could not delete the issue", 500);
  }

  await removeQuietly(supabase, [existing.pdf_path, existing.cover_path]);

  return new Response(null, { status: 204 });
}
