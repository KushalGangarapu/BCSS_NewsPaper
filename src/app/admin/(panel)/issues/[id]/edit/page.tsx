import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Issue } from "@/lib/types";
import IssueForm from "@/components/admin/issue-form";

export const metadata: Metadata = {
  title: "Edit issue — Admin",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditIssuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!hasSupabaseEnv() || !UUID_RE.test(id)) {
    notFound();
  }

  const supabase = await createClient();
  const { data: issue } = await supabase
    .from("issues")
    .select("*")
    .eq("id", id)
    .maybeSingle<Issue>();

  if (!issue) {
    notFound();
  }

  return <IssueForm mode="edit" issue={issue} />;
}
