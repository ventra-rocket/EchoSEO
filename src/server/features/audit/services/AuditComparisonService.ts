/**
 * Compares two completed audit snapshots of the same target and reports what
 * changed, labelled `crawl`.
 *
 * The one rule that must never bend: a comparison against a snapshot whose
 * issues were never materialized would read every baseline issue as "resolved"
 * (the baseline has zero occurrences). So the materialization gate refuses that
 * comparison outright — see `resolveComparison` — rather than emit a delta that
 * looks like a site cleaned itself up.
 */
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import { AuditIssueRepository } from "@/server/features/audit/repositories/AuditIssueRepository";
import { getIssueFixText } from "@/server/features/audit/issues/issue-fix-text";
import {
  computeIssueDelta,
  type IssueDelta,
} from "@/server/features/audit/history/issue-delta";
import type { Locale } from "@/server/lib/seo-rules";
import { AppError } from "@/server/lib/errors";

/** A snapshot the comparison can name, on either side of the diff. */
interface SnapshotRef {
  auditId: string;
  sealedAt: string;
  completedAt: string | null;
}

type ResolvedOnlyRuleView = IssueDelta["resolvedOnlyRules"][number] & {
  fix: ReturnType<typeof getIssueFixText>;
};

export type IssueComparison =
  | { state: "single_snapshot" }
  | {
      state: "not_comparable";
      reason: "current_not_materialized" | "baseline_not_materialized";
      baseline: SnapshotRef | null;
    }
  | {
      state: "comparable";
      source: "crawl";
      baseline: SnapshotRef;
      window: { from: string; to: string };
      totals: IssueDelta["totals"];
      byRule: IssueDelta["byRule"];
      resolvedOnlyRules: ResolvedOnlyRuleView[];
    };

export interface ComparableSnapshot {
  auditId: string;
  sealedAt: string;
  completedAt: string | null;
  pagesCrawled: number;
  /** False when this snapshot's issues were never materialized. */
  materialized: boolean;
  /** True for the snapshot the comparison is anchored on. */
  isCurrent: boolean;
}

type TargetSnapshot = Awaited<
  ReturnType<typeof AuditRepository.listSealedSnapshotsForTarget>
>[number];

/**
 * Authorize the audit against the project and return its sealed snapshot plus
 * every sibling snapshot of the same target. A null `current` means the audit is
 * still running or failed — there is nothing sealed to compare.
 *
 * `current` is taken from the joined target list (not the bare snapshot read) so
 * both sides of the diff carry the same shape, including the crawl date.
 */
async function loadTargetSnapshots(auditId: string, projectId: string) {
  const audit = await AuditRepository.getAuditForProject(auditId, projectId);
  if (!audit) throw new AppError("NOT_FOUND");

  const snapshotRow = await AuditRepository.getSnapshotForAudit(auditId);
  if (!snapshotRow) return { current: null, snapshots: [] as TargetSnapshot[] };

  const snapshots = await AuditRepository.listSealedSnapshotsForTarget(
    snapshotRow.targetId,
  );
  const current = snapshots.find((s) => s.auditId === auditId) ?? null;
  return { current, snapshots };
}

/**
 * The snapshots a comparison could use as a baseline, newest first, so the UI
 * can offer a selector. Unmaterialized snapshots are still listed (marked), so a
 * viewer understands why one cannot be compared rather than seeing it vanish.
 */
async function listComparableSnapshots(input: {
  auditId: string;
  projectId: string;
}): Promise<ComparableSnapshot[]> {
  const { snapshots } = await loadTargetSnapshots(
    input.auditId,
    input.projectId,
  );

  return snapshots.map((snapshot) => ({
    auditId: snapshot.auditId,
    sealedAt: snapshot.sealedAt,
    completedAt: snapshot.completedAt,
    pagesCrawled: snapshot.pagesCrawled,
    materialized: snapshot.issuesMaterializedAt !== null,
    isCurrent: snapshot.auditId === input.auditId,
  }));
}

function toRef(snapshot: TargetSnapshot): SnapshotRef {
  return {
    auditId: snapshot.auditId,
    sealedAt: snapshot.sealedAt,
    completedAt: snapshot.completedAt,
  };
}

/**
 * Pick the baseline snapshot for a comparison.
 *
 * A baseline is always an EARLIER crawl than the one being viewed: the delta is
 * "what changed from the baseline to this crawl", so added/resolved only mean
 * what the labels say when the baseline is older. A newer selection would invert
 * those meanings, so it is refused rather than silently reversed.
 *
 * Explicit selection wins and is validated against the target's own snapshot
 * list, so a baseline from another project or target can never be smuggled in.
 * With no explicit choice, auto-mode prefers the most recent *materialized*
 * prior crawl (the last one that can actually be diffed) and falls back to the
 * most recent prior crawl otherwise, letting the gate explain why that one
 * cannot be compared. `null` means there is no prior crawl at all.
 */
function pickBaseline(input: {
  current: TargetSnapshot;
  snapshots: TargetSnapshot[];
  baselineAuditId?: string;
}): TargetSnapshot | null {
  const { current, snapshots, baselineAuditId } = input;

  const priors = snapshots.filter(
    (s) => s.auditId !== current.auditId && s.sealedAt < current.sealedAt,
  );

  if (baselineAuditId && baselineAuditId !== current.auditId) {
    const chosen = priors.find((s) => s.auditId === baselineAuditId);
    // Not in `priors` means either not this target's snapshot (isolation) or
    // not older than the viewed crawl (would invert the delta). Both are
    // rejected the same way — the client only ever offers valid earlier crawls.
    if (!chosen) {
      throw new AppError(
        "NOT_FOUND",
        "Baseline must be an earlier crawl of this audit's target.",
      );
    }
    return chosen;
  }

  if (priors.length === 0) return null;

  const materializedPrior = priors.find((s) => s.issuesMaterializedAt !== null);
  return materializedPrior ?? priors[0];
}

async function resolveComparison(input: {
  auditId: string;
  projectId: string;
  baselineAuditId?: string;
  locale?: Locale;
}): Promise<IssueComparison> {
  const { current, snapshots } = await loadTargetSnapshots(
    input.auditId,
    input.projectId,
  );
  // No sealed crawl for this audit yet — nothing to compare. The tab only
  // reaches here once issues have materialized, so this is a defensive floor.
  if (!current) return { state: "single_snapshot" };

  const baseline = pickBaseline({
    current,
    snapshots,
    baselineAuditId: input.baselineAuditId,
  });
  if (!baseline) return { state: "single_snapshot" };

  // The gate. Order matters only for the reason string; either unmaterialized
  // side makes the diff a lie, so neither is read for occurrences.
  if (current.issuesMaterializedAt === null) {
    return {
      state: "not_comparable",
      reason: "current_not_materialized",
      baseline: toRef(baseline),
    };
  }
  if (baseline.issuesMaterializedAt === null) {
    return {
      state: "not_comparable",
      reason: "baseline_not_materialized",
      baseline: toRef(baseline),
    };
  }

  const [currentKeys, baselineKeys] = await Promise.all([
    AuditIssueRepository.getOccurrenceKeysForAudit(current.auditId),
    AuditIssueRepository.getOccurrenceKeysForAudit(baseline.auditId),
  ]);

  const delta = computeIssueDelta(currentKeys, baselineKeys);
  const locale = input.locale ?? "en";

  return {
    state: "comparable",
    source: "crawl",
    baseline: toRef(baseline),
    window: { from: baseline.sealedAt, to: current.sealedAt },
    totals: delta.totals,
    byRule: delta.byRule,
    resolvedOnlyRules: delta.resolvedOnlyRules.map((rule) => ({
      ...rule,
      fix: getIssueFixText(rule.ruleId, locale),
    })),
  };
}

export const AuditComparisonService = {
  listComparableSnapshots,
  resolveComparison,
} as const;
