/**
 * Compares two audits' issue-occurrence key sets and reports what changed.
 *
 * Pure: no database, no clock, no network — the same two inputs always produce
 * the same delta, so the whole comparison is unit-testable from crafted inputs.
 *
 * The comparison key is `(ruleId, url)` on the STORED url string, byte-for-byte
 * the `audit_issue_occurrences` unique index. `materialize.ts` already collapses
 * http/https and www/apex duplicate *landings* to one occurrence per (rule, url)
 * within an audit, and both audits target the same canonical origin — so the
 * stored URLs are directly comparable. No normalization is layered on top:
 * inventing one could mask a genuine URL change and would drift from the index
 * this key mirrors.
 */

/** The only occurrence fields the delta needs; no evidence, no timestamps. */
export interface OccurrenceKey {
  ruleId: string;
  url: string;
  issueGroup: string;
  severity: string;
}

export interface RuleDelta {
  /** In current, not in baseline. */
  added: number;
  /** In baseline, not in current. */
  resolved: number;
  /** In both. */
  persisting: number;
}

/** A rule that had occurrences in the baseline but none in the current crawl. */
export interface ResolvedOnlyRule {
  ruleId: string;
  issueGroup: string;
  severity: string;
  resolvedCount: number;
}

export interface IssueDelta {
  totals: RuleDelta;
  /**
   * Per-rule change counts, keyed by ruleId. Includes rules that only appear in
   * the baseline (fully resolved: added 0, persisting 0, resolved N), so a
   * caller merging this into the current summary can still find them.
   */
  byRule: Record<string, RuleDelta>;
  /**
   * Rules that dropped to zero occurrences. The current summary no longer lists
   * them, so surfacing them here is the only way "what got fixed" is not
   * silently lost.
   */
  resolvedOnlyRules: ResolvedOnlyRule[];
}

/** Same delimiter as the materialize dedupe, so the key semantics never drift. */
function occurrenceKey(occurrence: OccurrenceKey): string {
  return `${occurrence.ruleId}\n${occurrence.url}`;
}

function emptyDelta(): RuleDelta {
  return { added: 0, resolved: 0, persisting: 0 };
}

export function computeIssueDelta(
  current: OccurrenceKey[],
  baseline: OccurrenceKey[],
): IssueDelta {
  const currentKeys = new Set(current.map(occurrenceKey));
  const baselineKeys = new Set(baseline.map(occurrenceKey));

  const byRule = new Map<string, RuleDelta>();
  const ruleDelta = (ruleId: string): RuleDelta => {
    let delta = byRule.get(ruleId);
    if (!delta) {
      delta = emptyDelta();
      byRule.set(ruleId, delta);
    }
    return delta;
  };

  // A single audit's occurrences are unique on (rule, url) by the DB index, so
  // each occurrence contributes to exactly one bucket and nothing double-counts.
  for (const occurrence of current) {
    const delta = ruleDelta(occurrence.ruleId);
    if (baselineKeys.has(occurrenceKey(occurrence))) {
      delta.persisting += 1;
    } else {
      delta.added += 1;
    }
  }

  const currentRuleIds = new Set(
    current.map((occurrence) => occurrence.ruleId),
  );
  const resolvedOnly = new Map<string, ResolvedOnlyRule>();

  for (const occurrence of baseline) {
    // Persisting was already counted from the current side; only resolutions
    // are new information here.
    if (currentKeys.has(occurrenceKey(occurrence))) continue;
    ruleDelta(occurrence.ruleId).resolved += 1;

    if (!currentRuleIds.has(occurrence.ruleId)) {
      const existing = resolvedOnly.get(occurrence.ruleId);
      if (existing) {
        existing.resolvedCount += 1;
      } else {
        resolvedOnly.set(occurrence.ruleId, {
          ruleId: occurrence.ruleId,
          issueGroup: occurrence.issueGroup,
          severity: occurrence.severity,
          resolvedCount: 1,
        });
      }
    }
  }

  return {
    totals: {
      added: countMissing(currentKeys, baselineKeys),
      resolved: countMissing(baselineKeys, currentKeys),
      persisting: countShared(currentKeys, baselineKeys),
    },
    byRule: Object.fromEntries(byRule),
    resolvedOnlyRules: [...resolvedOnly.values()],
  };
}

/** How many members of `a` are absent from `b`. */
function countMissing(a: Set<string>, b: Set<string>): number {
  let total = 0;
  for (const key of a) if (!b.has(key)) total += 1;
  return total;
}

/** How many members `a` and `b` share. */
function countShared(a: Set<string>, b: Set<string>): number {
  let total = 0;
  for (const key of a) if (b.has(key)) total += 1;
  return total;
}
