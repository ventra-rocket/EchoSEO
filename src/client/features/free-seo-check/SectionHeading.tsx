import type { ReactNode } from "react";

/**
 * The report's heading tier. Section titles used to be `text-sm font-medium` —
 * smaller than the numbers they labeled — so the page had data hierarchy but no
 * reading hierarchy. This reuses the idiom the checker already owns: the mono
 * uppercase eyebrow (as on "WEBSITE URL" and the screenshot caption) over a
 * full-contrast title.
 */
export function SectionHeading({
  eyebrow,
  title,
  aside,
}: {
  eyebrow?: string;
  title: string;
  /** Right-aligned annotation on the title line (counts, source notes). */
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="font-mono text-[11px] uppercase tracking-widest text-base-content/60">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      {aside ? (
        <div className="pb-0.5 text-xs text-base-content/60">{aside}</div>
      ) : null}
    </div>
  );
}
