import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import SetupNotice from "@/components/setup-notice";
import SignOutButton from "@/components/admin/sign-out-button";

export default async function AdminPanelLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div>
      <div className="border-b border-ink/15 bg-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="eyebrow text-accent">Admin</span>
            <nav
              aria-label="Admin"
              className="flex items-center gap-1 text-xs font-semibold"
            >
              <Link
                href="/admin"
                className="rounded px-2 py-1 text-ink/70 transition-colors hover:text-accent"
              >
                Issues
              </Link>
              <Link
                href="/admin/issues/new"
                className="rounded px-2 py-1 text-ink/70 transition-colors hover:text-accent"
              >
                New issue
              </Link>
              <Link
                href="/"
                className="rounded px-2 py-1 text-ink/70 transition-colors hover:text-accent"
              >
                View site
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="max-w-48 truncate text-xs text-ink/50">
              {user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
