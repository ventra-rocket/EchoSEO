/**
 * Builds the technical half of the weekly report: what this crawl found that
 * the previous one did not, and what the owner actually fixed.
 *
 * This is a read-only view over sealed snapshots — it never writes, never
 * schedules and never sends, so the Durable Object alarm that drives the report
 * can call it without owning any audit state. The only I/O is two or three
 * occurrence reads, issued in parallel.
 *
 * Every "nothing to say" outcome is a distinct state rather than an empty list.
 * A weekly email that silently renders zero new issues because the snapshot was
 * never materialized is worse than no email: it tells the owner their site is
 * clean when the truth is that the comparison could not be made.
 */
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import { AuditIssueRepository } from "@/server/features/audit/repositories/AuditIssueRepository";
import {
  diffOccurrences,
  type OccurrenceKey,
} from "@/server/features/audit/history/issue-delta";
import { getIssueFixText } from "@/server/features/audit/issues/issue-fix-text";
import type { Locale } from "@/server/lib/seo-rules/types";
import type {
  FixedRuleSummary,
  ReportIssue,
  ReportSnapshotRef,
  WeeklyIssueReport,
} from "./report-types";

/**
 * How many issues one list in the email may carry.
 *
 * A 5,000-page crawl can produce tens of thousands of occurrences; rendering
 * them would produce an email no client will display and no human will read.
 * The counts (`criticalCount`, `fixedCount`) are deliberately NOT capped — they
 * are computed over the full sets, so `newIssues.length` is a page of evidence,
 * never the total.
 */
export const REPORT_ISSUE_LIST_LIMIT = 100;

/** How many fixed rules the "what you fixed" section names. */
const FIXED_RULE_LIMIT = 10;

/**
 * The snapshot fields the report reasons over — a structural subset of a
 * `listSealedSnapshotsForTarget` row, so the repository stays free to widen its
 * projection and the tests stay free to hand over four fields instead of eight.
 */
interface ReportSnapshot {
  auditId: string;
  sealedAt: string;
  /** Null until the materializer stored this crawl's issues; see the gate below. */
  issuesMaterializedAt: string | null;
  pagesCrawled: number;
}

/**
 * Audit severities are exactly critical | high | low (seo-rules/types.ts). An
 * unknown value can only come from a rule catalog that grew a fourth level, so
 * it sorts last rather than being dropped — an unrenderable issue is still an
 * issue.
 */
const SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  low: 2,
};

/** Sorts after every known severity. */
const UNKNOWN_SEVERITY_RANK = 3;

/** Byte order, not locale order: the sort must not vary with the runtime. */
function compareText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Worst first, then a stable tiebreak so two runs over the same crawl produce
 * the same page of issues — the cap below would otherwise show a different
 * hundred each week.
 */
function compareOccurrences(a: OccurrenceKey, b: OccurrenceKey): number {
  return (
    (SEVERITY_RANK[a.severity] ?? UNKNOWN_SEVERITY_RANK) -
      (SEVERITY_RANK[b.severity] ?? UNKNOWN_SEVERITY_RANK) ||
    compareText(a.ruleId, b.ruleId) ||
    compareText(a.url, b.url)
  );
}

function toRef(snapshot: ReportSnapshot): ReportSnapshotRef {
  return {
    auditId: snapshot.auditId,
    sealedAt: snapshot.sealedAt,
    pagesCrawled: snapshot.pagesCrawled,
  };
}

/**
 * Remediation copy with the "this rule is in no catalog" fallbacks already
 * applied, so every section of the report renders an unknown rule identically.
 */
interface IssueFixDisplay {
  label: string;
  problem: string;
  fixSteps: string[];
  googleSourceUrl: string;
  guideQuote: string;
  lastReviewedDate: string;
  localized: boolean;
}

/** One catalog lookup per rule id for the lifetime of one report. */
type FixTextCache = Map<string, IssueFixDisplay>;

/**
 * `getIssueFixText` is pure but not free — it walks two rule catalogs — and a
 * report covers thousands of occurrences spread over roughly twenty rule ids,
 * so each id is resolved once and reused.
 *
 * A rule neither catalog knows still gets an entry, labelled with its own id.
 * Dropping the row would hide a real finding just because the copy deck is
 * incomplete; `localized: false` already tells the email the text is untranslated.
 */
function resolveFixText(
  ruleId: string,
  locale: Locale,
  cache: FixTextCache,
): IssueFixDisplay {
  const cached = cache.get(ruleId);
  if (cached) return cached;

  const fix = getIssueFixText(ruleId, locale);
  const display: IssueFixDisplay = fix ?? {
    label: ruleId,
    problem: "",
    fixSteps: [],
    googleSourceUrl: "",
    guideQuote: "",
    lastReviewedDate: "",
    localized: false,
  };
  cache.set(ruleId, display);
  return display;
}

/** Sort, cap, then render — so the fix-text lookup only pays for what ships. */
function toIssueList(
  occurrences: OccurrenceKey[],
  locale: Locale,
  cache: FixTextCache,
): ReportIssue[] {
  return occurrences
    .toSorted(compareOccurrences)
    .slice(0, REPORT_ISSUE_LIST_LIMIT)
    .map((occurrence) => ({
      ruleId: occurrence.ruleId,
      url: occurrence.url,
      issueGroup: occurrence.issueGroup,
      severity: occurrence.severity,
      ...resolveFixText(occurrence.ruleId, locale, cache),
    }));
}

function countCritical(occurrences: OccurrenceKey[]): number {
  let total = 0;
  for (const occurrence of occurrences) {
    if (occurrence.severity === "critical") total += 1;
  }
  return total;
}

/**
 * Groups resolved occurrences by rule so the email can say "12 pages no longer
 * miss a title" instead of listing twelve URLs nobody needs to visit.
 */
function summarizeFixedRules(
  resolved: OccurrenceKey[],
  locale: Locale,
  cache: FixTextCache,
): FixedRuleSummary[] {
  const counts = new Map<string, number>();
  for (const occurrence of resolved) {
    counts.set(occurrence.ruleId, (counts.get(occurrence.ruleId) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([ruleId, resolvedCount]) => ({
      ruleId,
      label: resolveFixText(ruleId, locale, cache).label,
      resolvedCount,
    }))
    .toSorted(
      (a, b) =>
        // Biggest win first; the rule id only breaks ties, so the list is stable
        // rather than dependent on Map insertion order.
        b.resolvedCount - a.resolvedCount || compareText(a.ruleId, b.ruleId),
    )
    .slice(0, FIXED_RULE_LIMIT);
}

/**
 * The three crawls the report reasons over, newest first.
 *
 * `baseline` and `prior` are always strictly older than `current` by `sealedAt`
 * — the delta means "what changed since", so a newer or same-instant snapshot
 * would invert or duplicate it. Same rule as `AuditComparisonService.pickBaseline`.
 */
function pickSnapshots(snapshots: ReportSnapshot[], auditId?: string) {
  const current = auditId
    ? (snapshots.find((snapshot) => snapshot.auditId === auditId) ?? null)
    : (snapshots[0] ?? null);
  if (!current) return null;

  // listSealedSnapshotsForTarget already orders by sealedAt DESC, so the first
  // two survivors of this filter are the two crawls immediately before.
  const priors = snapshots.filter(
    (snapshot) =>
      snapshot.auditId !== current.auditId &&
      snapshot.sealedAt < current.sealedAt,
  );

  return {
    current,
    baseline: priors[0] ?? null,
    prior: priors[1] ?? null,
  };
}

export async function buildWeeklyIssueReport(input: {
  targetId: string;
  locale: Locale;
  /** Report on this crawl; defaults to the newest sealed snapshot for the target. */
  auditId?: string;
}): Promise<WeeklyIssueReport> {
  const snapshots = await AuditRepository.listSealedSnapshotsForTarget(
    input.targetId,
  );
  const picked = pickSnapshots(snapshots, input.auditId);
  // No sealed crawl at all, or the caller named an audit this target never
  // sealed. Both mean there is nothing to report on, not an empty report.
  if (!picked) return { state: "no_audit" };

  const { current, baseline, prior } = picked;
  const fixTextCache: FixTextCache = new Map();

  // The materialization gate. The workflow's materialize step swallows its own
  // errors (siteAuditWorkflowPhases.ts), so a crawl can complete and seal with
  // zero stored occurrences. Reading that as "no issues" would congratulate the
  // owner for a site that was never actually examined.
  if (current.issuesMaterializedAt === null) {
    return { state: "not_comparable", reason: "current_not_materialized" };
  }

  if (!baseline) {
    const currentKeys = await AuditIssueRepository.getOccurrenceKeysForAudit(
      current.auditId,
    );
    // First sealed crawl: there is no "changed since", so every finding is new
    // by definition and criticalCount covers the whole crawl.
    return {
      state: "no_baseline",
      current: toRef(current),
      newIssues: toIssueList(currentKeys, input.locale, fixTextCache),
      criticalCount: countCritical(currentKeys),
    };
  }

  // Same gate on the other side: an unmaterialized baseline is an empty key set,
  // which the diff would read as a wholesale resolution.
  if (baseline.issuesMaterializedAt === null) {
    return { state: "not_comparable", reason: "baseline_not_materialized" };
  }

  // The crawl before the baseline is optional context, not a requirement: it
  // only decides whether a new issue is labelled "new" or "regressed". An
  // unmaterialized one is treated as absent rather than as "nothing was wrong
  // back then", which would misfile every regression as brand new.
  const usablePrior =
    prior && prior.issuesMaterializedAt !== null ? prior : null;

  const [currentKeys, baselineKeys, priorKeys] = await Promise.all([
    AuditIssueRepository.getOccurrenceKeysForAudit(current.auditId),
    AuditIssueRepository.getOccurrenceKeysForAudit(baseline.auditId),
    usablePrior
      ? AuditIssueRepository.getOccurrenceKeysForAudit(usablePrior.auditId)
      : Promise.resolve<OccurrenceKey[]>([]),
  ]);

  const { added, resolved } = diffOccurrences(currentKeys, baselineKeys);

  // Splitting "appeared since the baseline" against the crawl before it, using
  // the same key identity: an occurrence the prior crawl also had is a fix that
  // came undone (regressed), anything else was never seen before (new). Running
  // it through diffOccurrences instead of an ad-hoc key set keeps the two halves
  // of the report on one definition of issue identity.
  const againstPrior = usablePrior
    ? diffOccurrences(added, priorKeys)
    : { added, persisting: [] as OccurrenceKey[], resolved: [] };

  return {
    state: "ok",
    current: toRef(current),
    baseline: toRef(baseline),
    newIssues: toIssueList(againstPrior.added, input.locale, fixTextCache),
    regressedIssues: toIssueList(
      againstPrior.persisting,
      input.locale,
      fixTextCache,
    ),
    fixedCount: resolved.length,
    fixedRules: summarizeFixedRules(resolved, input.locale, fixTextCache),
    // Counted over the whole `added` set, before either list is capped, so the
    // headline number stays true when the email only shows a hundred rows.
    criticalCount: countCritical(added),
  };
}

/**
 * Critical issues that appeared in this crawl and were absent in the previous
 * one — the set that justifies breaking the weekly cadence with an alert.
 *
 * Only a comparison can say something *appeared*, so a target's first sealed
 * crawl (`no_baseline`) alerts on nothing: it labels its whole finding set as
 * new by definition, and the alert copy would claim a previous crawl that does
 * not exist. Those criticals still reach the owner in the weekly report, which
 * says outright that it is a first crawl.
 *
 * Reads the capped lists on purpose: an alert naming a hundred criticals has
 * already made its point, and `criticalCount` carries the true total.
 */
export function newCriticalIssues(report: WeeklyIssueReport): ReportIssue[] {
  if (report.state !== "ok") return [];

  return [...report.newIssues, ...report.regressedIssues].filter(
    (issue) => issue.severity === "critical",
  );
}
