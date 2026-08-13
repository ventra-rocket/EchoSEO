/**
 * The reads behind the site cards on the Projects page.
 *
 * Written as a handful of set-based queries rather than one per project: the page
 * lists every site in the workspace, so a per-project read would make the page
 * cost grow with the customer's account.
 *
 * Every `inArray` is chunked at 90 bound parameters, following
 * `AuditRetentionRepository.ts:12-16` — D1 rejects a statement with more than 100,
 * and an unchunked list would fail whole once a workspace passed that many sites.
 */
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  auditIssueOccurrences,
  auditSnapshots,
  auditTargets,
} from "@/db/audit.schema";

const MAX_BOUND_PARAMS = 90;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

type SiteCardTarget = {
  id: string;
  projectId: string;
  origin: string;
};

type SiteCardSnapshot = {
  targetId: string;
  auditId: string;
  sealedAt: string;
  pagesCrawled: number;
  /** Null on snapshots sealed before the counters existed — render as "—". */
  pagesRedirected: number | null;
  pagesBroken: number | null;
  pagesBlocked: number | null;
  pagesNoindex: number | null;
  issuesMaterializedAt: string | null;
};

/** Distinct pages per severity, plus the union the health score divides by. */
export type SiteCardIssueCounts = {
  auditId: string;
  critical: number;
  high: number;
  low: number;
  criticalOrHigh: number;
};

async function listTargetsForOrganization(
  organizationId: string,
): Promise<SiteCardTarget[]> {
  return db
    .select({
      id: auditTargets.id,
      projectId: auditTargets.projectId,
      origin: auditTargets.origin,
    })
    .from(auditTargets)
    .where(eq(auditTargets.organizationId, organizationId));
}

/**
 * The newest sealed snapshot per target.
 *
 * Two passes on purpose. Reading every snapshot and picking the newest in JS
 * would drag 90 days of history across the wire for a page that renders one row
 * per site; a window function would do it in one statement but cannot be chunked
 * the way D1's parameter ceiling requires.
 */
async function listLatestSnapshots(
  targetIds: string[],
): Promise<SiteCardSnapshot[]> {
  if (targetIds.length === 0) return [];

  const newest = new Map<string, string>();
  for (const batch of chunk(targetIds, MAX_BOUND_PARAMS)) {
    const rows = await db
      .select({
        targetId: auditSnapshots.targetId,
        sealedAt: sql<string>`max(${auditSnapshots.sealedAt})`,
      })
      .from(auditSnapshots)
      .where(inArray(auditSnapshots.targetId, batch))
      .groupBy(auditSnapshots.targetId);
    for (const row of rows) newest.set(row.targetId, row.sealedAt);
  }
  if (newest.size === 0) return [];

  const snapshots: SiteCardSnapshot[] = [];
  for (const batch of chunk([...newest.keys()], MAX_BOUND_PARAMS)) {
    const rows = await db
      .select({
        targetId: auditSnapshots.targetId,
        auditId: auditSnapshots.auditId,
        sealedAt: auditSnapshots.sealedAt,
        pagesCrawled: auditSnapshots.pagesCrawled,
        pagesRedirected: auditSnapshots.pagesRedirected,
        pagesBroken: auditSnapshots.pagesBroken,
        pagesBlocked: auditSnapshots.pagesBlocked,
        pagesNoindex: auditSnapshots.pagesNoindex,
        issuesMaterializedAt: auditSnapshots.issuesMaterializedAt,
      })
      .from(auditSnapshots)
      .where(inArray(auditSnapshots.targetId, batch))
      // Ties on `sealed_at` are possible: the column defaults to
      // `current_timestamp`, which is second-resolution. Ordering makes the pick
      // deterministic instead of leaving it to row order.
      .orderBy(desc(auditSnapshots.sealedAt));
    for (const row of rows) {
      if (row.sealedAt !== newest.get(row.targetId)) continue;
      if (snapshots.some((kept) => kept.targetId === row.targetId)) continue;
      snapshots.push(row);
    }
  }
  return snapshots;
}

/**
 * Distinct affected pages per severity for each audit.
 *
 * `count(distinct url)` and not a sum of `audit_issue_rollups.url_count`: rollups
 * are per rule, so a page failing three rules would be counted three times and
 * the health score's numerator would go negative on a bad enough site.
 */
async function listIssueCounts(
  auditIds: string[],
): Promise<SiteCardIssueCounts[]> {
  if (auditIds.length === 0) return [];

  const counts = new Map<string, SiteCardIssueCounts>();
  const forAudit = (auditId: string) => {
    const existing = counts.get(auditId);
    if (existing) return existing;
    const fresh = { auditId, critical: 0, high: 0, low: 0, criticalOrHigh: 0 };
    counts.set(auditId, fresh);
    return fresh;
  };

  for (const batch of chunk(auditIds, MAX_BOUND_PARAMS)) {
    const bySeverity = await db
      .select({
        auditId: auditIssueOccurrences.auditId,
        severity: auditIssueOccurrences.severity,
        pages: sql<number>`count(distinct ${auditIssueOccurrences.url})`,
      })
      .from(auditIssueOccurrences)
      .where(inArray(auditIssueOccurrences.auditId, batch))
      .groupBy(auditIssueOccurrences.auditId, auditIssueOccurrences.severity);

    for (const row of bySeverity) {
      const entry = forAudit(row.auditId);
      if (row.severity === "critical") entry.critical = row.pages;
      else if (row.severity === "high") entry.high = row.pages;
      else if (row.severity === "low") entry.low = row.pages;
    }

    // A separate query, because a page failing one critical AND one high rule is
    // one affected page — summing the per-severity counts would double it.
    const union = await db
      .select({
        auditId: auditIssueOccurrences.auditId,
        pages: sql<number>`count(distinct ${auditIssueOccurrences.url})`,
      })
      .from(auditIssueOccurrences)
      .where(
        and(
          inArray(auditIssueOccurrences.auditId, batch),
          inArray(auditIssueOccurrences.severity, ["critical", "high"]),
        ),
      )
      .groupBy(auditIssueOccurrences.auditId);

    for (const row of union) forAudit(row.auditId).criticalOrHigh = row.pages;
  }

  return [...counts.values()];
}

export const SiteCardRepository = {
  listTargetsForOrganization,
  listLatestSnapshots,
  listIssueCounts,
} as const;
