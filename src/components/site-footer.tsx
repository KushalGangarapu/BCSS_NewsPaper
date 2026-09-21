import Link from "next/link";
import {
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
  PAPER_NAME,
  SCHOOL_ADDRESS,
  SCHOOL_NAME,
} from "@/lib/site";
import { SCHOOL_TIME_ZONE } from "@/lib/utils";

export default function SiteFooter() {
  const year = new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHOOL_TIME_ZONE,
    year: "numeric",
  }).format(new Date());
  return (
    <footer className="mt-16 border-t border-ink/15 bg-paper">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="rule-double mb-8" />
        <div className="flex flex-col justify-between gap-8 sm:flex-row">
          <div>
            <p className="font-masthead text-3xl text-ink">{PAPER_NAME}</p>
          </div>
          <div className="text-sm leading-relaxed text-ink/80">
            <p className="eyebrow mb-2 text-ink">{SCHOOL_NAME}</p>
            <p>{SCHOOL_ADDRESS}</p>
            <p className="mt-1">
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-accent/50 underline-offset-2 hover:text-accent"
              >
                Instagram {INSTAGRAM_HANDLE}
              </a>
            </p>
          </div>
          <nav aria-label="Footer">
            <ul className="flex gap-4 text-sm text-ink/70 sm:flex-col sm:gap-1 sm:text-right">
              <li>
                <Link href="/issues" className="hover:text-accent">
                  Archive
                </Link>
              </li>

              <li>
                <Link href="/submit" className="hover:text-accent">
                  Submit
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-accent">
                  Staff login
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <p className="mt-10 border-t border-ink/10 pt-4 text-xs text-ink/50">
          © {year} {PAPER_NAME}, {SCHOOL_NAME}. Published by
          students, for students.
        </p>
      </div>
    </footer>
  );
}
