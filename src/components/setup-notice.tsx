/**
 * Friendly fallback rendered when Supabase env vars are absent — lets a fresh
 * deploy preview succeed before env is configured instead of crashing.
 */
export default function SetupNotice() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="eyebrow text-accent">Setup required</p>
      <h1 className="font-display mt-3 text-3xl font-bold text-ink">
        This site isn&apos;t connected to Supabase yet
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-ink/70">
        The environment variables{" "}
        <code className="rounded bg-ink/5 px-1">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
        and{" "}
        <code className="rounded bg-ink/5 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
        are not set. Follow the setup steps in <code>README.md</code>, then
        redeploy.
      </p>
    </div>
  );
}
