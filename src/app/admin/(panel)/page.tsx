import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAllIssuesAdmin } from "@/lib/issues";
import { publicUrl } from "@/lib/files";
import { formatDate } from "@/lib/utils";
import IssueActions from "@/components/admin/issue-actions";

export const metadata: Metadata = {
  title: "Issues — Admin",
};

export default async function AdminIssuesPage() {
  const issues = await getAllIssuesAdmin();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Issues</h1>
          <p className="mt-1 text-sm text-ink/60">
            {issues.length} {issues.length === 1 ? "issue" : "issues"}
          </p>
        </div>
        <Link
          href="/admin/issues/new"
          className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
        >
          New issue
        </Link>
      </div>

      {issues.length === 0 ? (
        <div className="mt-8 rounded border border-dashed border-ink/25 px-6 py-16 text-center">
          <p className="font-display text-xl font-bold text-ink">
            No issues yet
          </p>
          <p className="mt-2 text-sm text-ink/60">
            Upload the first PDF to get the paper rolling.
          </p>
          <Link
            href="/admin/issues/new"
            className="mt-6 inline-block rounded bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
          >
            New issue
          </Link>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded border border-ink/15">
          <table className="min-w-full divide-y divide-ink/10 text-sm">
            <thead>
              <tr className="bg-ink/[0.03] text-left">
                <th scope="col" className="eyebrow px-3 py-2.5 text-ink/60">
                  Cover
                </th>
                <th scope="col" className="eyebrow px-3 py-2.5 text-ink/60">
                  Issue
                </th>
                <th scope="col" className="eyebrow px-3 py-2.5 text-ink/60">
                  Date
                </th>
                <th scope="col" className="eyebrow px-3 py-2.5 text-ink/60">
                  Status
                </th>
                <th
                  scope="col"
                  className="eyebrow px-3 py-2.5 text-right text-ink/60"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {issues.map((issue) => (
                <tr key={issue.id} className="align-middle">
                  <td className="px-3 py-3">
                    {issue.cover_path ? (
                      <span className="block h-16 w-12 overflow-hidden rounded border border-ink/10 bg-ink/5">
                        <Image
                          src={publicUrl(issue.cover_path)}
                          alt=""
                          width={48}
                          height={64}
                          className="h-full w-full object-cover"
                        />
                      </span>
                    ) : (
                      <span className="flex h-16 w-12 items-center justify-center rounded border border-ink/10 bg-ink/5">
                        <span className="text-[0.5rem] font-semibold uppercase tracking-wider text-ink/40">
                          PDF
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-ink">{issue.title}</p>
                    <p className="mt-0.5 font-mono text-xs text-ink/50">
                      /{issue.slug}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-ink/70">
                    {formatDate(issue.published_at)}
                  </td>
                  <td className="px-3 py-3">
                    {issue.is_published ? (
                      <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-white">
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-ink/30 px-2.5 py-0.5 text-xs font-semibold text-ink/60">
                        Draft
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <IssueActions issue={issue} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
