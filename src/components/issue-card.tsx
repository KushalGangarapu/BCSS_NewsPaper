import Image from "next/image";
import Link from "next/link";
import { publicUrl } from "@/lib/files";
import type { Issue } from "@/lib/types";
import { formatDate } from "@/lib/utils";

/**
 * Cover + summary card linking to an issue's reader page.
 * Rendered only when Supabase env exists (publicUrl would throw otherwise).
 */
export default function IssueCard({ issue }: { issue: Issue }) {
  return (
    <Link
      href={`/issues/${issue.slug}`}
      className="group block rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      <article>
        {issue.cover_path ? (
          <div className="relative aspect-[3/4] overflow-hidden rounded border border-ink/15 bg-ink/5 transition-colors group-hover:border-accent">
            <Image
              src={publicUrl(issue.cover_path)}
              alt={`Cover of ${issue.title}`}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex aspect-[3/4] flex-col items-center rounded border border-ink/15 bg-paper p-6 text-center transition-colors group-hover:border-accent">
            <div className="rule-double w-full" />
            <p className="font-display my-auto py-6 text-2xl font-bold leading-snug text-ink">
              {issue.title}
            </p>
            <div className="rule-double w-full" />
          </div>
        )}
        <div className="mt-3">
          <p className="eyebrow text-accent">{formatDate(issue.published_at)}</p>
          <h3 className="font-display mt-1 text-xl font-bold leading-snug text-ink decoration-accent underline-offset-4 group-hover:underline">
            {issue.title}
          </h3>
          {issue.description && (
            <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-ink/70">
              {issue.description}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}
