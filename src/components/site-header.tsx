import Link from "next/link";
import Wordmark from "./wordmark";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/issues", label: "Issues" },
  { href: "/submit", label: "Submit" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/15 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 px-4 sm:flex-nowrap sm:px-6">
        <Link
          href="/"
          aria-label="Home"
          className="mx-auto shrink-0 py-2.5 sm:mx-0 sm:py-3"
        >
          <Wordmark size="sm" />
        </Link>
        <nav aria-label="Main navigation" className="w-full sm:w-auto">
          <ul className="flex items-center justify-between gap-1 border-t border-ink/10 py-1 sm:justify-end sm:gap-2 sm:border-t-0 sm:py-0">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="eyebrow block rounded px-3 py-2 text-ink transition-colors hover:text-accent sm:py-1.5"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
