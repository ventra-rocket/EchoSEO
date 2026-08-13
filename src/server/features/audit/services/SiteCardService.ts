/**
 * The site cards on the Projects page: one per audit target in the workspace.
 *
 * Read-only, and scoped by `organizationId` at the query rather than by a role
 * check — `canReadAudit` grants every workspace member read access, and the
 * project list the caller already sees is the same set.
 *
 * A project with no target, or a target whose crawl has not sealed a snapshot,
 * returns `health: null`. The card renders an action instead of a zero: "0 broken
 * pages" for a site that was never crawled is a false statement, not an empty one.
 */
import {
  SiteCardRepository,
  type SiteCardIssueCounts,
} from "@/server/features/audit/repositories/SiteCardRepository";
import {
  computeSiteHealth,
  type SiteHealth,
} from "@/server/features/audit/site-health";

/** Crawl counters. Null where a snapshot predates the counter columns. */
export type SiteCardCrawl = {
  auditId: string;
  sealedAt: string;
  crawled: number;
  redirected: number | null;
  broken: number | null;
  blocked: number | null;
  noindex: number | null;
};

export type SiteCard = {
  projectId: string;
  targetId: string;
  origin: string;
  crawl: SiteCardCrawl | null;
  health: SiteHealth | null;
};

const NO_ISSUES: SiteCardIssueCounts = {
  auditId: "",
  critical: 0,
  high: 0,
  low: 0,
  criticalOrHigh: 0,
};

async function listForOrganization(
  organizationId: string,
): Promise<SiteCard[]> {
  const targets =
    await SiteCardRepository.listTargetsForOrganization(organizationId);
  if (targets.length === 0) return [];

  const snapshots = await SiteCardRepository.listLatestSnapshots(
    targets.map((target) => target.id),
  );
  const issueCounts = await SiteCardRepository.listIssueCounts(
    // Only materialized snapshots have issues to count. Asking for the others
    // would read zero rows and let the card claim a clean site for a crawl whose
    // materialization failed.
    snapshots
      .filter((snapshot) => snapshot.issuesMaterializedAt !== null)
      .map((snapshot) => snapshot.auditId),
  );

  const snapshotByTarget = new Map(
    snapshots.map((snapshot) => [snapshot.targetId, snapshot]),
  );
  const countsByAudit = new Map(
    issueCounts.map((counts) => [counts.auditId, counts]),
  );

  return targets.map((target): SiteCard => {
    const snapshot = snapshotByTarget.get(target.id);
    if (!snapshot) {
      return {
        projectId: target.projectId,
        targetId: target.id,
        origin: target.origin,
        crawl: null,
        health: null,
      };
    }

    // Unmaterialized issues are NOT "no issues": the materialize step swallows
    // its own failures, so a sealed snapshot can carry zero occurrences for a
    // site nobody examined. Scoring that 100 would congratulate the owner for a
    // crawl that never produced findings.
    const counts =
      snapshot.issuesMaterializedAt === null
        ? null
        : (countsByAudit.get(snapshot.auditId) ?? NO_ISSUES);

    return {
      projectId: target.projectId,
      targetId: target.id,
      origin: target.origin,
      crawl: {
        auditId: snapshot.auditId,
        sealedAt: snapshot.sealedAt,
        crawled: snapshot.pagesCrawled,
        redirected: snapshot.pagesRedirected,
        broken: snapshot.pagesBroken,
        blocked: snapshot.pagesBlocked,
        noindex: snapshot.pagesNoindex,
      },
      health: counts
        ? computeSiteHealth({
            pagesCrawled: snapshot.pagesCrawled,
            pagesWithCriticalOrHigh: counts.criticalOrHigh,
            severity: {
              critical: counts.critical,
              high: counts.high,
              low: counts.low,
            },
          })
        : null,
    };
  });
}

export const SiteCardService = { listForOrganization } as const;
