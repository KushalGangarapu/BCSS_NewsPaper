import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PdfReader from "@/components/pdf-reader";
import SetupNotice from "@/components/setup-notice";
import { hasSupabaseEnv } from "@/lib/env";
import { downloadUrl, publicUrl } from "@/lib/files";
import { getIssueBySlug } from "@/lib/issues";
import { formatDate } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const issue = await getIssueBySlug(slug);
  if (!issue) return {};
  return {
    title: issue.title,
    description: issue.description ?? undefined,
  };
}

export default async function IssuePage({ params }: Props) {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }
  const { slug } = await params;
  const issue = await getIssueBySlug(slug);
  if (!issue) notFound();

  return (
    <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href="/issues"
        className="eyebrow text-ink/60 transition-colors hover:text-accent"
      >
        ← All issues
      </Link>
      <header className="mt-6">
        <p className="eyebrow text-accent">
          {formatDate(issue.published_at)}
        </p>
        <h1 className="font-display mt-3 text-4xl font-black leading-tight text-ink sm:text-5xl">
          {issue.title}
        </h1>
        {issue.description && (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink/70">
            {issue.description}
          </p>
        )}
        <div className="rule-double mt-8" />
      </header>
      <div className="mt-8">
        <PdfReader url={publicUrl(issue.pdf_path)} title={issue.title} />
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <a
          href={downloadUrl(issue.pdf_path, `${issue.slug}.pdf`)}
          className="rounded border border-accent px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-paper"
        >
          Download PDF
        </a>
        <p className="text-xs text-ink/50">
          Tip: use the ← and → keys to turn pages.
        </p>
      </div>
    </article>
  );
}
