import Link from "next/link";
import type { Metadata } from "next";
import IssueCard from "@/components/issue-card";
import SetupNotice from "@/components/setup-notice";
import { hasSupabaseEnv } from "@/lib/env";
import { getPublishedIssues } from "@/lib/issues";
import { PAPER_NAME } from "@/lib/site";
import type { Issue } from "@/lib/types";
import { schoolYear } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Issue Archive",
};

export default async function IssuesPage() {
  if (!hasSupabaseEnv()) {
    return <SetupNotice />;
  }

  const issues = await getPublishedIssues();

  // Issues arrive newest-first, so school-year groups are contiguous and the
  // "Undated" group lands last (null published_at sorts last in the query).
  const groups = new Map<string, Issue[]>();
  for (const issue of issues) {
    const label = schoolYear(issue.published_at) ?? "Undated";
    const group = groups.get(label);
    if (group) {
      group.push(issue);
    } else {
      groups.set(label, [issue]);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header>
        <p className="eyebrow text-accent">{PAPER_NAME}</p>
        <h1 className="font-display mt-2 text-4xl font-black text-ink sm:text-5xl">
          Issue Archive
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink/70">
          Every published edition, grouped by school year.
        </p>
        <div className="rule-double mt-6" />
      </header>

      {issues.length === 0 ? (
        <div className="py-20 text-center sm:py-28">
          <div className="mx-auto max-w-md">
            <div className="rule-double" />
            <div className="rule-thin mt-0.5" />
            <h2 className="font-display mt-10 text-3xl font-bold text-ink">
              No issues published yet.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink/70">
              Our first edition is in the works — check back soon, or{" "}
              <Link
                href="/submit"
                className="font-semibold text-accent underline underline-offset-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                contribute your work
              </Link>
              .
            </p>
            <div className="rule-thin mt-10" />
            <div className="rule-double mt-0.5" />
          </div>
        </div>
      ) : (
        Array.from(groups.entries()).map(([label, groupIssues]) => (
          <section key={label} className="mt-12">
            <h2 className="font-display text-2xl font-bold text-ink">
              {label === "Undated" ? label : `${label} school year`}
            </h2>
            <div className="rule-double mt-2" />
            <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {groupIssues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
