import type { Metadata } from "next";
import { hasSupabaseEnv } from "@/lib/env";
import SetupNotice from "@/components/setup-notice";
import LoginForm from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Staff login",
};

export default function AdminLoginPage() {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 sm:py-24">
      <div className="w-full rounded border border-ink/15 bg-paper p-6 sm:p-8">
        <p className="eyebrow text-accent">Staff only</p>
        <h1 className="font-display mt-2 text-2xl font-bold text-ink">
          Sign in to the newsroom
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          Use your staff account to manage issues.
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
