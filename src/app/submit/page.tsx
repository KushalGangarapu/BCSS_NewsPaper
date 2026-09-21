import type { Metadata } from "next";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, SUBMIT_BLURB } from "@/lib/site";

export const metadata: Metadata = {
  title: "Submit",
};

const ACCEPTED = [
  {
    title: "Articles",
    detail:
      "News, features, sports, and arts coverage — pitched or fully written.",
  },
  {
    title: "Opinion pieces",
    detail:
      "Editorials and columns on school life and the issues students care about.",
  },
  {
    title: "Photography",
    detail:
      "Photo essays, event coverage, and standalone shots from around the school.",
  },
  {
    title: "Artwork",
    detail:
      "Illustrations, cartoons, and cover art to accompany stories or stand alone.",
  },
];

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <header>
        <p className="eyebrow text-accent">For contributors</p>
        <h1 className="font-display mt-2 text-4xl font-black text-ink sm:text-5xl">
          Submit your work
        </h1>
        <div className="rule-double mt-6" />
      </header>

      <p className="mt-8 max-w-prose leading-relaxed text-ink/80">
        {SUBMIT_BLURB}
      </p>

      <section aria-labelledby="accept-heading" className="mt-12">
        <h2
          id="accept-heading"
          className="font-display text-2xl font-bold text-ink"
        >
          What we accept
        </h2>
        <div className="rule-accent mt-2" />
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {ACCEPTED.map((item) => (
            <li
              key={item.title}
              className="rounded border border-ink/15 p-5 transition-colors hover:border-accent"
            >
              <p className="font-display font-bold text-ink">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink/70">
                {item.detail}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-14 rounded border border-ink/15 bg-ink/5 px-6 py-10 text-center">
        <p className="eyebrow text-ink/60">Ready to contribute?</p>
        <p className="font-display mx-auto mt-3 max-w-md text-2xl font-bold leading-snug text-ink">
          DM your submission or pitch to the editorial board on Instagram
        </p>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block rounded bg-accent px-6 py-3 text-sm font-semibold text-paper transition-colors hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {INSTAGRAM_HANDLE}
        </a>
      </div>
    </div>
  );
}
