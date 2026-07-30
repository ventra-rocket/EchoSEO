/**
 * Orders and counts a report's signals for the result view.
 *
 * The report used to render signals in rule-definition order, which is an
 * accident of how the catalogs are spread together — a failure could sit ninth
 * under eight passing rows, all of identical visual weight, with nothing
 * telling the reader where to look. Severity order is the fix, and the counts
 * are what let a reader see the shape of the result before reading any of it.
 */
import type { Signal } from "@/server/services/seo-check/types";

/** Worst first. Ties keep the catalog's own order, which groups by category. */
const STATUS_RANK = { fail: 0, warn: 1, pass: 2 } as const;

interface TriagedSignals {
  /** Everything that needs attention, worst first. */
  actionable: Signal[];
  /** Passing checks, kept out of the way but never hidden. */
  passed: Signal[];
  counts: { fail: number; warn: number; pass: number };
}

export function triageSignals(signals: readonly Signal[]): TriagedSignals {
  const counts = { fail: 0, warn: 0, pass: 0 };
  for (const signal of signals) counts[signal.status] += 1;

  // `toSorted`, not `sort`: React hands the same array on every render, and
  // sorting in place would reorder the report under the component.
  const actionable = signals
    .filter((signal) => signal.status !== "pass")
    .toSorted((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);

  return {
    actionable,
    passed: signals.filter((signal) => signal.status === "pass"),
    counts,
  };
}
