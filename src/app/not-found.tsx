import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="font-display text-7xl font-black text-ink">404</p>
      <p className="eyebrow mt-2 text-accent">Page not found</p>
      <p className="mt-4 text-sm leading-relaxed text-ink/70">
        The page you&apos;re looking for doesn&apos;t exist — it may have been
        moved, or the issue may not be published yet.
      </p>
      <div className="mt-8 flex justify-center gap-4">
        <Link
          href="/"
          className="rounded border border-ink px-4 py-2 text-sm font-semibold text-ink hover:bg-ink hover:text-paper"
        >
          Front page
        </Link>
        <Link
          href="/issues"
          className="rounded px-4 py-2 text-sm font-semibold text-accent hover:underline"
        >
          Browse issues
        </Link>
      </div>
    </div>
  );
}
