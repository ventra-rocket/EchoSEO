import type { CommandCenterAction } from "@/shared/command-center";

// Pure presentation-state mapping for the Project Command Center. It turns the
// partial-source-safe `getProjectCommandCenter` response into typed display
// states without formatting, locale, or React, so every honesty rule — source
// outage never reads as success, freshness is attributed to the correct audit,
// rank freshness is a range/mixed state rather than a single newest stamp, and
// nothing is inferred from absent data — is deterministically unit-testable.

type AuditSnapshot = {
  id: string;
  status: string;
  pagesCrawled: number;
  pagesTotal: number;
  completedAt: string | null;
};

/**
 * The subset of the `getProjectCommandCenter` response this view-model reads.
 * Structural, so the full server response (which also carries `project`) is
 * assignable without importing the server type.
 */
export type CommandCenterData = {
  readiness: {
    dataForSeoConfigured: boolean;
    gsc: {
      connected: boolean;
      currentUserHasGrant: boolean;
      googleOAuthConfigured: boolean;
      siteUrl: string | null;
    } | null;
  };
  audit: {
    latest: AuditSnapshot | null;
    latestCompleted: AuditSnapshot | null;
    criticalIssueCount: number;
    highIssueCount: number;
    issuesMaterializedAt: string | null;
  };
  rankTracking: Array<{
    id: string;
    domain: string;
    keywordCount: number;
    lastRunStatus: string | null;
    lastRunCompletedAt: string | null;
  }>;
  sources: {
    gscError: string | null;
    auditError: string | null;
    rankTrackingError: string | null;
    issueError: string | null;
  };
  nextActions: CommandCenterAction[];
};

export type SourceStatus = "ok" | "unavailable";

export type GscView =
  | { state: "unavailable" }
  | { state: "connected" }
  | { state: "not-connected" };

// Current audit state — always attributed to the LATEST audit, never to the
// last completed one. A failed or queued run is reported honestly as such: it is
// never collapsed into "running" (which would imply progress that is not
// happening) or into a clean "completed".
export type AuditProgressView =
  | { state: "unavailable" }
  | { state: "none" }
  | { state: "queued" }
  | { state: "running"; pagesCrawled: number; pagesTotal: number }
  | { state: "failed"; pagesCrawled: number; pagesTotal: number }
  | {
      state: "completed";
      pagesCrawled: number;
      pagesTotal: number;
      completedAtIso: string | null;
    };

// Issue counts — always attributed to the last COMPLETED audit and its
// materialization stamp; `fromDifferentAudit` is true when a newer audit is
// running so the UI can label the counts as "last completed audit".
export type IssuesView =
  | { state: "unavailable" }
  | { state: "no-audit" }
  | { state: "materializing" }
  | {
      state: "ready";
      criticalCount: number;
      highCount: number;
      priorityCount: number;
      completedAtIso: string | null;
      materializedAtIso: string | null;
      fromDifferentAudit: boolean;
    };

// Rank freshness across per-tracker run times. The aggregate is never stamped
// with only the newest run: multiple differing times become a range, a partial
// set becomes `mixed`, and no completed run becomes `never-run`.
export type RankView =
  | { state: "unavailable" }
  | { state: "not-configured" }
  | { state: "never-run"; keywordCount: number; trackerCount: number }
  | {
      state: "single";
      keywordCount: number;
      trackerCount: number;
      atIso: string;
    }
  | {
      state: "range";
      keywordCount: number;
      trackerCount: number;
      oldestIso: string;
      newestIso: string;
    }
  | {
      state: "mixed";
      keywordCount: number;
      trackerCount: number;
      oldestIso: string | null;
      newestIso: string | null;
    };

export type NextActionView =
  | {
      state: "actions";
      primary: CommandCenterAction;
      secondary: CommandCenterAction[];
    }
  | { state: "incomplete" }
  | { state: "complete" };

export type CommandCenterView = {
  gsc: GscView;
  auditProgress: AuditProgressView;
  issues: IssuesView;
  rank: RankView;
  nextAction: NextActionView;
  sources: {
    gsc: SourceStatus;
    audit: SourceStatus;
    rank: SourceStatus;
    issue: SourceStatus;
  };
  dataForSeoConfigured: boolean;
};

function toStatus(error: string | null): SourceStatus {
  return error ? "unavailable" : "ok";
}

function buildGscView(data: CommandCenterData): GscView {
  if (data.sources.gscError) return { state: "unavailable" };
  return data.readiness.gsc?.connected
    ? { state: "connected" }
    : { state: "not-connected" };
}

function buildAuditProgressView(data: CommandCenterData): AuditProgressView {
  if (data.sources.auditError) return { state: "unavailable" };
  const latest = data.audit.latest;
  if (!latest) return { state: "none" };
  if (latest.status === "completed") {
    return {
      state: "completed",
      pagesCrawled: latest.pagesCrawled,
      pagesTotal: latest.pagesTotal,
      completedAtIso: latest.completedAt,
    };
  }
  if (latest.status === "failed") {
    return {
      state: "failed",
      pagesCrawled: latest.pagesCrawled,
      pagesTotal: latest.pagesTotal,
    };
  }
  if (latest.status === "queued") {
    return { state: "queued" };
  }
  return {
    state: "running",
    pagesCrawled: latest.pagesCrawled,
    pagesTotal: latest.pagesTotal,
  };
}

function buildIssuesView(data: CommandCenterData): IssuesView {
  // An audit outage or a failed issue read both mean the counts are unknown;
  // neither may collapse to a clean zero.
  if (data.sources.auditError || data.sources.issueError) {
    return { state: "unavailable" };
  }
  const completed = data.audit.latestCompleted;
  if (!completed) return { state: "no-audit" };
  if (!data.audit.issuesMaterializedAt) return { state: "materializing" };
  const fromDifferentAudit =
    !!data.audit.latest && data.audit.latest.id !== completed.id;
  return {
    state: "ready",
    criticalCount: data.audit.criticalIssueCount,
    highCount: data.audit.highIssueCount,
    priorityCount: data.audit.criticalIssueCount + data.audit.highIssueCount,
    completedAtIso: completed.completedAt,
    materializedAtIso: data.audit.issuesMaterializedAt,
    fromDifferentAudit,
  };
}

function buildRankView(data: CommandCenterData): RankView {
  if (data.sources.rankTrackingError) return { state: "unavailable" };
  const trackers = data.rankTracking;
  if (trackers.length === 0) return { state: "not-configured" };

  const keywordCount = trackers.reduce(
    (total, tracker) => total + tracker.keywordCount,
    0,
  );
  const trackerCount = trackers.length;
  const timestamps = trackers.map((tracker) => tracker.lastRunCompletedAt);
  const present = timestamps.filter((value): value is string => value !== null);

  if (present.length === 0) {
    return { state: "never-run", keywordCount, trackerCount };
  }

  const sorted = present.toSorted((a, b) => Date.parse(a) - Date.parse(b));
  const oldestIso = sorted[0];
  const newestIso = sorted[sorted.length - 1];
  const anyMissing = present.length < timestamps.length;

  if (anyMissing) {
    return { state: "mixed", keywordCount, trackerCount, oldestIso, newestIso };
  }
  if (Date.parse(oldestIso) === Date.parse(newestIso)) {
    return { state: "single", keywordCount, trackerCount, atIso: oldestIso };
  }
  return { state: "range", keywordCount, trackerCount, oldestIso, newestIso };
}

function buildNextActionView(data: CommandCenterData): NextActionView {
  const [primary, ...secondary] = data.nextActions;
  if (primary) return { state: "actions", primary, secondary };

  // Empty actions only mean "done" when every recommendation source is known.
  // If any is erroring, the absence of a recommendation is ignorance, not
  // completeness, so never render a success state.
  const allKnown =
    !data.sources.gscError &&
    !data.sources.auditError &&
    !data.sources.rankTrackingError &&
    !data.sources.issueError;
  return allKnown ? { state: "complete" } : { state: "incomplete" };
}

export function buildCommandCenterView(
  data: CommandCenterData,
): CommandCenterView {
  return {
    gsc: buildGscView(data),
    auditProgress: buildAuditProgressView(data),
    issues: buildIssuesView(data),
    rank: buildRankView(data),
    nextAction: buildNextActionView(data),
    sources: {
      gsc: toStatus(data.sources.gscError),
      audit: toStatus(data.sources.auditError),
      rank: toStatus(data.sources.rankTrackingError),
      issue: toStatus(data.sources.issueError),
    },
    dataForSeoConfigured: data.readiness.dataForSeoConfigured,
  };
}
