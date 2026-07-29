/**
 * Turns a report's `pageSummary` into the rows the panel renders.
 *
 * Split out of the component so it can be tested: the result state sits behind
 * a Turnstile challenge that no automated run can pass, so a component that
 * keeps its logic inside JSX is logic nobody can check. The interesting cases
 * are the absent ones — a page with no title, no meta description, or no H1 —
 * and "absent" must read as absent rather than as an empty measurement.
 *
 * Rows carry a `Measurement`, not a formatted string, so the panel and the
 * signal rows go through one formatter and cannot describe the same number two
 * different ways.
 */
import type { LiteReport } from "@/server/services/seo-check/types";
import type { Measurement } from "@/server/lib/seo-rules/types";
import type { CheckResultCopy } from "./check-result-copy-types";

interface PageReadRow {
  label: string;
  /** Empty string means the page does not have this at all. */
  value: string;
  /** Null when a length would say nothing — an absent value, or a count. */
  measurement: Measurement | null;
}

/** A length, or nothing when the page has no such value to measure. */
function measured(value: string): Measurement | null {
  return value ? { kind: "chars", value: value.length } : null;
}

export function buildPageReadRows(
  pageSummary: LiteReport["pageSummary"],
  copy: CheckResultCopy["pageRead"],
): PageReadRow[] {
  return [
    {
      label: copy.title,
      value: pageSummary.title,
      measurement: measured(pageSummary.title),
    },
    {
      label: copy.metaDescription,
      value: pageSummary.metaDescription,
      measurement: measured(pageSummary.metaDescription),
    },
    {
      label: copy.h1,
      // `h1` is nullable on the schema where the other two are empty strings.
      // Both mean "the page has none"; the panel should not care which.
      value: pageSummary.h1 ?? "",
      measurement: measured(pageSummary.h1 ?? ""),
    },
    {
      label: copy.words,
      value: String(pageSummary.wordCount),
      // A word count is already a measurement; "812 chars" would be nonsense.
      measurement: null,
    },
  ];
}
