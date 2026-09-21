import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";
import { getPublishedIssues } from "@/lib/issues";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();

  const staticRoutes: MetadataRoute.Sitemap = ["", "/issues", "/submit"].map(
    (path) => ({
      url: `${base}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    }),
  );

  const issues = await getPublishedIssues();
  const issueRoutes: MetadataRoute.Sitemap = issues.map((issue) => ({
    url: `${base}/issues/${issue.slug}`,
    lastModified: issue.published_at ?? issue.created_at,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...issueRoutes];
}
