/**
 * Turns a report's `pageSummary` into the rows the panel renders.
 *
 * Split out of the component so it can be tested: the result state sits behind
 * a Turnstile challenge that no automated run can pass, so a component that
 * keeps its logic inside JSX is logic nobody can check. The interesting cases
 * are the absent ones — a page with no title, no meta description, or no H1 —
 * and "absent" must read as absent rather than as an empty measurement.
 */
import type { LiteReport } from "@/server/services/seo-check/types";
import type { CheckResultCopy } from "./check-result-copy-types";

interface PageReadRow {
  label: string;
  /** Empty string means the page does not have this at all. */
  value: string;
  /** Null when a length would say nothing — an absent value, or a count. */
  measure: string | null;
}

export function buildPageReadRows(
  pageSummary: LiteReport["pageSummary"],
  copy: CheckResultCopy["pageRead"],
): PageReadRow[] {
  const measured = (value: string) => (value ? copy.chars(value.length) : null);

  return [
    {
      label: copy.title,
      value: pageSummary.title,
      measure: measured(pageSummary.title),
    },
    {
      label: copy.metaDescription,
      value: pageSummary.metaDescription,
      measure: measured(pageSummary.metaDescription),
    },
    {
      label: copy.h1,
      // `h1` is nullable on the schema where the other two are empty strings.
      // Both mean "the page has none"; the panel should not care which.
      value: pageSummary.h1 ?? "",
      measure: measured(pageSummary.h1 ?? ""),
    },
    {
      label: copy.words,
      value: String(pageSummary.wordCount),
      // A word count is already a measurement; "812 chars" would be nonsense.
      measure: null,
    },
  ];
}
