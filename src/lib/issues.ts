import { hasSupabaseEnv } from "./env";
import { createClient } from "./supabase/server";
import type { Issue } from "./types";

/**
 * Server-side data helpers for the `issues` table.
 *
 * Public helpers always filter `is_published = true` explicitly — even though
 * RLS already hides drafts from anon users, this keeps drafts out of public
 * pages even when an admin session's cookies are present (defense in depth).
 *
 * When env vars are missing (pre-setup deploy), helpers return empty results
 * instead of throwing, so pages can render a "setup required" notice.
 */

export async function getPublishedIssues(): Promise<Issue[]> {
  if (!hasSupabaseEnv()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("issues")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false, nullsFirst: false });
  return data ?? [];
}

export async function getLatestIssue(): Promise<Issue | null> {
  if (!hasSupabaseEnv()) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("issues")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getIssueBySlug(slug: string): Promise<Issue | null> {
  if (!hasSupabaseEnv()) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("issues")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  return data;
}

/** Admin-only: every row regardless of publish state (RLS gates this to the
 *  authenticated admin). Newest first; undated issues sort last. */
export async function getAllIssuesAdmin(): Promise<Issue[]> {
  if (!hasSupabaseEnv()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("issues")
    .select("*")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  return data ?? [];
}
