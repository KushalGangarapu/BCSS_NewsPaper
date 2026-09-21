import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import IssueCard from "@/components/issue-card";
import SetupNotice from "@/components/setup-notice";
import Wordmark from "@/components/wordmark";
import { hasSupabaseEnv } from "@/lib/env";
import { downloadUrl, publicUrl } from "@/lib/files";
import { getPublishedIssues } from "@/lib/issues";
import { PAPER_NAME, SCHOOL_NAME } from "@/lib/site";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  description: `The official student newspaper of ${SCHOOL_NAME}. Read the latest issue online or browse the archive.`,
};

export default async function HomePage() {
  if (!hasSupabaseEnv()) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="py-6 sm:py-8">
          <Wordmark size="lg" />
        </div>
        <SetupNotice />
      </div>
    );
  }

  const issues = await getPublishedIssues();
  const latest = issues.length > 0 ? issues[0] : null;
  const recent = issues.slice(1, 7);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="py-6 sm:py-8">
        <Wordmark size="lg" />
      </div>

      {latest === null ? (
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-md text-center">
            <div className="rule-double" />
            <div className="rule-thin mt-0.5" />
            <h2 className="font-display mt-10 text-3xl font-bold text-ink sm:text-4xl">
              Our first issue is coming soon.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/70">
              {PAPER_NAME} is preparing its debut edition. In the meantime,{" "}
              <Link
                href="/submit"
                className="font-semibold text-accent underline underline-offset-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                send us your work
              </Link>
              .
            </p>
            <div className="rule-thin mt-10" />
            <div className="rule-double mt-0.5" />
          </div>
        </section>
      ) : (
        <>
          <section aria-labelledby="latest-issue-heading" className="py-8">
            <p className="eyebrow text-accent">Latest issue</p>
            <div className="mt-6 grid items-center gap-8 md:grid-cols-5">
              <div className="md:col-span-2">
                {latest.cover_path ? (
                  <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded border border-ink/15 bg-ink/5 md:max-w-none">
                    <Image
                      src={publicUrl(latest.cover_path)}
                      alt={`Cover of ${latest.title}`}
                      fill
                      priority
                      sizes="(min-width: 768px) 40vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="mx-auto flex aspect-[3/4] w-full max-w-sm flex-col items-center rounded border border-ink/15 bg-paper p-8 text-center md:max-w-none">
                    <div className="rule-double w-full" />
                    <p className="font-display my-auto py-8 text-3xl font-bold leading-tight text-ink">
                      {latest.title}
                    </p>
                    <div className="rule-double w-full" />
                  </div>
                )}
              </div>
              <div className="md:col-span-3">
                <h2
                  id="latest-issue-heading"
                  className="font-display text-4xl font-black leading-tight text-ink sm:text-5xl"
                >
                  {latest.title}
                </h2>
                <p className="eyebrow mt-3 text-ink/60">
                  {formatDate(latest.published_at)}
                </p>
                {latest.description && (
                  <p className="mt-4 max-w-prose leading-relaxed text-ink/80">
                    {latest.description}
                  </p>
                )}
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href={`/issues/${latest.slug}`}
                    className="rounded bg-accent px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    Read online
                  </Link>
                  <a
                    href={downloadUrl(latest.pdf_path, `${latest.slug}.pdf`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-ink px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    Download PDF
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby="recent-issues-heading" className="py-10">
            <div className="flex items-baseline justify-between gap-4">
              <h2
                id="recent-issues-heading"
                className="font-display text-2xl font-bold text-ink"
              >
                Recent issues
              </h2>
              <Link
                href="/issues"
                className="shrink-0 rounded-sm text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                View all →
              </Link>
            </div>
            <div className="rule-double mt-3" />
            {recent.length > 0 ? (
              <div className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {recent.map((issue) => (
                  <IssueCard key={issue.id} issue={issue} />
                ))}
              </div>
            ) : (
              <p className="mt-8 text-sm leading-relaxed text-ink/60">
                This is our first edition — more issues are on the way.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
