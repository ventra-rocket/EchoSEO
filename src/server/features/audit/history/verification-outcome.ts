/**
 * Judges, for a re-crawl launched to verify fixes, what happened to each issue
 * the baseline crawl had found.
 *
 * Pure: no database, no clock, no network — the same inputs always produce the
 * same outcome, so the whole judgement is unit-testable from crafted inputs.
 *
 * The honesty rule this exists to enforce: a baseline issue that is simply absent
 * from the re-crawl is NOT automatically "resolved". It only counts as resolved
 * if the re-crawl actually RE-EVALUATED that URL for that kind of issue —
 * otherwise the outcome is `inconclusive`. Re-evaluation has two sources, because
 * the audit judges issues from two data sources:
 *
 * - Most rules (content, indexability, links, sitemaps, structured-data) are read
 *   off the fetched page, so the URL counts as re-evaluated when the re-crawl
 *   actually observed it — a fetch that failed stores a status-0 row that
 *   materializes no issue, so it must NOT count (`observedUrls` excludes it).
 * - Performance rules (Core Web Vitals) are read off a Lighthouse run, so the URL
 *   counts as re-evaluated only when the re-crawl produced a complete mobile
 *   measurement (`measuredUrls`). A page that was fetched but never re-measured
 *   (sampling skipped it, or its PSI call failed) is inconclusive, never resolved.
 */

/** The issue group whose rules are re-evaluated from Lighthouse, not the crawl.
 * Mirrors `audit-issue-groups.ts` (the CWV rules map to "performance"). */
const LIGHTHOUSE_ISSUE_GROUP = "performance";

export interface BaselineOccurrence {
  ruleId: string;
  url: string;
  issueGroup: string;
  severity: string;
}

export interface VerificationIssueRef {
  ruleId: string;
  url: string;
  issueGroup: string;
  severity: string;
}

export interface VerificationOutcome {
  counts: {
    /** Baseline issue gone, and its URL was re-evaluated for that issue. */
    resolved: number;
    /** Baseline issue still found in the re-crawl. */
    stillPresent: number;
    /** Baseline issue gone, but its URL was not re-evaluated — can't confirm. */
    inconclusive: number;
    /** Issue in the re-crawl that the baseline did not have. */
    regressions: number;
  };
  /** Capped, actionable sample; the counts above always total every case. */
  inconclusive: VerificationIssueRef[];
  /** True when the capped list omitted rows. */
  truncated: boolean;
}

/** Never ship an unbounded per-URL list to the client; counts still total all. */
const MAX_LIST = 200;

/** Same `(ruleId, url)` delimiter as the issue-delta/materialize dedupe. */
function occurrenceKey(occurrence: { ruleId: string; url: string }): string {
  return `${occurrence.ruleId}\n${occurrence.url}`;
}

function toRef(occurrence: BaselineOccurrence): VerificationIssueRef {
  return {
    ruleId: occurrence.ruleId,
    url: occurrence.url,
    issueGroup: occurrence.issueGroup,
    severity: occurrence.severity,
  };
}

export function computeVerificationOutcome(input: {
  baselineOccurrences: BaselineOccurrence[];
  /** `${ruleId}\n${url}` for every issue found in the re-crawl. */
  currentKeys: Set<string>;
  /** URLs the re-crawl actually observed (fetched, status != 0). */
  observedUrls: Set<string>;
  /** URLs the re-crawl produced a complete mobile Lighthouse measurement for. */
  measuredUrls: Set<string>;
}): VerificationOutcome {
  const baselineKeys = new Set(input.baselineOccurrences.map(occurrenceKey));

  let resolved = 0;
  let stillPresentCount = 0;
  let inconclusiveCount = 0;
  const inconclusive: VerificationIssueRef[] = [];

  for (const occurrence of input.baselineOccurrences) {
    if (input.currentKeys.has(occurrenceKey(occurrence))) {
      stillPresentCount += 1;
      continue;
    }

    // The gate: an issue whose URL was not re-evaluated (for its own data source)
    // cannot be judged resolved. Removing this turns every un-re-evaluated URL
    // into a false "resolved" — the failure this whole module prevents.
    const reEvaluated =
      occurrence.issueGroup === LIGHTHOUSE_ISSUE_GROUP
        ? input.measuredUrls
        : input.observedUrls;

    if (!reEvaluated.has(occurrence.url)) {
      inconclusiveCount += 1;
      if (inconclusive.length < MAX_LIST) inconclusive.push(toRef(occurrence));
      continue;
    }

    resolved += 1;
  }

  let regressions = 0;
  for (const key of input.currentKeys) {
    if (!baselineKeys.has(key)) regressions += 1;
  }

  return {
    counts: {
      resolved,
      stillPresent: stillPresentCount,
      inconclusive: inconclusiveCount,
      regressions,
    },
    inconclusive,
    truncated: inconclusiveCount > inconclusive.length,
  };
}
