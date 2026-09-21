import { PAPER_NAME, SCHOOL_NAME } from "@/lib/site";
import { SCHOOL_TIME_ZONE } from "@/lib/utils";

/**
 * Pure-CSS masthead wordmark — no image assets.
 * Blackletter title (UnifrakturMaguntia, NYT-style) with school name +
 * date line set between hairline rules.
 */
export default function Wordmark({ size = "lg" }: { size?: "sm" | "lg" }) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: SCHOOL_TIME_ZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  if (size === "sm") {
    return (
      <span className="font-masthead text-2xl leading-none text-ink">
        {PAPER_NAME}
      </span>
    );
  }

  return (
    <div className="text-center">
      <div className="rule-thin" />
      <div className="rule-double mt-0.5" />
      <h1 className="font-masthead py-4 text-[clamp(2.25rem,10vw,4.5rem)] leading-none tracking-wide text-ink">
        {PAPER_NAME}
      </h1>
      <div className="rule-thin" />
      <div className="flex flex-col items-center justify-between gap-1 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-ink sm:flex-row sm:text-xs">
        <span>{SCHOOL_NAME}</span>
        <span>{today}</span>
      </div>
      <div className="rule-double" />
    </div>
  );
}
