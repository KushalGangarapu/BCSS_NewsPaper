"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Issue } from "@/lib/types";

const BTN =
  "rounded border border-ink/20 px-2.5 py-1 text-xs font-semibold text-ink transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40";

export default function IssueActions({ issue }: { issue: Issue }) {
  const router = useRouter();
  const [pending, setPending] = useState<"publish" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function readError(res: Response, fallback: string) {
    const data = await res.json().catch(() => null);
    setError(
      data && typeof data.error === "string" ? data.error : fallback,
    );
  }

  async function togglePublish() {
    setPending("publish");
    setError(null);
    const res = await fetch(`/api/admin/issues/${issue.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !issue.is_published }),
      signal: AbortSignal.timeout(30_000),
    }).catch(() => null);
    if (!res || !res.ok) {
      if (res) {
        await readError(res, "Could not update the issue.");
      } else {
        setError("Network error — try again.");
      }
      setPending(null);
      return;
    }
    router.refresh();
    setPending(null);
  }

  async function onDelete() {
    if (
      !window.confirm(
        `Delete "${issue.title}"? This cannot be undone.`,
      )
    ) {
      return;
    }
    setPending("delete");
    setError(null);
    const res = await fetch(`/api/admin/issues/${issue.id}`, {
      method: "DELETE",
      signal: AbortSignal.timeout(30_000),
    }).catch(() => null);
    if (!res || !res.ok) {
      if (res) {
        await readError(res, "Could not delete the issue.");
      } else {
        setError("Network error — try again.");
      }
      setPending(null);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {issue.is_published && (
          <a
            href={`/issues/${issue.slug}`}
            target="_blank"
            rel="noreferrer"
            className={BTN}
          >
            Read
          </a>
        )}
        <Link href={`/admin/issues/${issue.id}/edit`} className={BTN}>
          Edit
        </Link>
        <button
          type="button"
          onClick={togglePublish}
          disabled={pending !== null}
          className={
            issue.is_published
              ? BTN
              : "rounded border border-accent bg-accent px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
          }
        >
          {pending === "publish"
            ? "Saving…"
            : issue.is_published
              ? "Unpublish"
              : "Publish"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending !== null}
          className="rounded border border-accent/40 px-2.5 py-1 text-xs font-semibold text-accent transition-colors hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending === "delete" ? "Deleting…" : "Delete"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs font-semibold text-accent">
          {error}
        </p>
      )}
    </div>
  );
}
