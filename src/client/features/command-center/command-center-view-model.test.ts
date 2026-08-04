import { describe, expect, it } from "vitest";
import type { CommandCenterAction } from "@/shared/command-center";
import {
  buildCommandCenterView,
  type CommandCenterData,
} from "./command-center-view-model";

function makeData(
  overrides: Partial<CommandCenterData> = {},
): CommandCenterData {
  return {
    readiness: {
      dataForSeoConfigured: true,
      gsc: {
        connected: true,
        currentUserHasGrant: true,
        googleOAuthConfigured: true,
        siteUrl: "https://example.com",
      },
    },
    audit: {
      latest: null,
      latestCompleted: null,
      criticalIssueCount: 0,
      highIssueCount: 0,
      issuesMaterializedAt: null,
    },
    rankTracking: [],
    sources: {
      gscError: null,
      auditError: null,
      rankTrackingError: null,
      issueError: null,
    },
    nextActions: [],
    ...overrides,
  };
}

function completedAudit(
  id: string,
  completedAt: string | null = "2026-07-28T08:01:00.000Z",
) {
  return {
    id,
    status: "completed",
    pagesCrawled: 20,
    pagesTotal: 20,
    completedAt,
  };
}

function tracker(
  id: string,
  lastRunCompletedAt: string | null,
  keywordCount = 10,
) {
  return {
    id,
    domain: `${id}.example`,
    keywordCount,
    lastRunStatus: lastRunCompletedAt ? "completed" : null,
    lastRunCompletedAt,
  };
}

const runAuditAction: CommandCenterAction = {
  id: "run-audit",
  title: "Run your first site audit",
  description: "Find issues before choosing what to fix.",
  target: "audit",
  tone: "primary",
};

describe("buildCommandCenterView — next action / false-success prevention", () => {
  it("reports complete only when there are no actions and every source is known", () => {
    const view = buildCommandCenterView(makeData());
    expect(view.nextAction.state).toBe("complete");
  });

  it("surfaces available actions with a primary and the rest as secondary", () => {
    const secondaryAction: CommandCenterAction = {
      ...runAuditAction,
      id: "add-keywords",
      target: "rank-tracking",
    };
    const view = buildCommandCenterView(
      makeData({ nextActions: [runAuditAction, secondaryAction] }),
    );
    expect(view.nextAction).toEqual({
      state: "actions",
      primary: runAuditAction,
      secondary: [secondaryAction],
    });
  });

  it.each([
    ["gscError"],
    ["auditError"],
    ["rankTrackingError"],
    ["issueError"],
  ] as const)(
    "never reports complete when %s is unavailable and actions are empty",
    (key) => {
      const view = buildCommandCenterView(
        makeData({
          sources: {
            gscError: null,
            auditError: null,
            rankTrackingError: null,
            issueError: null,
            [key]: "Unavailable right now",
          },
        }),
      );
      expect(view.nextAction.state).toBe("incomplete");
    },
  );

  it("stays incomplete when every source errors at once", () => {
    const view = buildCommandCenterView(
      makeData({
        sources: {
          gscError: "x",
          auditError: "x",
          rankTrackingError: "x",
          issueError: "x",
        },
      }),
    );
    expect(view.nextAction.state).toBe("incomplete");
    expect(view.sources).toEqual({
      gsc: "unavailable",
      audit: "unavailable",
      rank: "unavailable",
      issue: "unavailable",
    });
  });
});

describe("buildCommandCenterView — audit provenance and materialization", () => {
  it("attributes crawl progress to the latest audit and counts to the last completed one", () => {
    const view = buildCommandCenterView(
      makeData({
        audit: {
          latest: {
            id: "audit-2",
            status: "running",
            pagesCrawled: 5,
            pagesTotal: 40,
            completedAt: null,
          },
          latestCompleted: completedAudit("audit-1"),
          criticalIssueCount: 3,
          highIssueCount: 2,
          issuesMaterializedAt: "2026-07-28T08:05:00.000Z",
        },
      }),
    );
    expect(view.auditProgress).toEqual({
      state: "running",
      pagesCrawled: 5,
      pagesTotal: 40,
    });
    expect(view.issues).toMatchObject({
      state: "ready",
      criticalCount: 3,
      highCount: 2,
      priorityCount: 5,
      completedAtIso: "2026-07-28T08:01:00.000Z",
      fromDifferentAudit: true,
    });
  });

  it("does not flag a different audit when the latest completed is the latest", () => {
    const view = buildCommandCenterView(
      makeData({
        audit: {
          latest: completedAudit("audit-1"),
          latestCompleted: completedAudit("audit-1"),
          criticalIssueCount: 0,
          highIssueCount: 0,
          issuesMaterializedAt: "2026-07-28T08:05:00.000Z",
        },
      }),
    );
    expect(view.issues).toMatchObject({
      state: "ready",
      fromDifferentAudit: false,
    });
    expect(view.auditProgress.state).toBe("completed");
  });

  it("reports materializing while a completed audit has no issue stamp yet", () => {
    const view = buildCommandCenterView(
      makeData({
        audit: {
          latest: completedAudit("audit-1"),
          latestCompleted: completedAudit("audit-1"),
          criticalIssueCount: 0,
          highIssueCount: 0,
          issuesMaterializedAt: null,
        },
      }),
    );
    expect(view.issues.state).toBe("materializing");
  });

  it("reports no-audit when nothing has completed", () => {
    expect(buildCommandCenterView(makeData()).issues.state).toBe("no-audit");
  });

  it("reports a failed latest audit as failed, never as running", () => {
    const view = buildCommandCenterView(
      makeData({
        audit: {
          latest: {
            id: "audit-3",
            status: "failed",
            pagesCrawled: 5,
            pagesTotal: 40,
            completedAt: null,
          },
          latestCompleted: null,
          criticalIssueCount: 0,
          highIssueCount: 0,
          issuesMaterializedAt: null,
        },
      }),
    );
    expect(view.auditProgress).toEqual({
      state: "failed",
      pagesCrawled: 5,
      pagesTotal: 40,
    });
  });

  it("reports a queued latest audit as queued, never as running", () => {
    const view = buildCommandCenterView(
      makeData({
        audit: {
          latest: {
            id: "audit-4",
            status: "queued",
            pagesCrawled: 0,
            pagesTotal: 0,
            completedAt: null,
          },
          latestCompleted: null,
          criticalIssueCount: 0,
          highIssueCount: 0,
          issuesMaterializedAt: null,
        },
      }),
    );
    expect(view.auditProgress.state).toBe("queued");
  });

  it("marks issues unavailable when the issue read failed, without a zero count", () => {
    const view = buildCommandCenterView(
      makeData({
        audit: {
          latest: completedAudit("audit-1"),
          latestCompleted: completedAudit("audit-1"),
          criticalIssueCount: 0,
          highIssueCount: 0,
          issuesMaterializedAt: "2026-07-28T08:05:00.000Z",
        },
        sources: {
          gscError: null,
          auditError: null,
          rankTrackingError: null,
          issueError: "Unavailable right now",
        },
      }),
    );
    expect(view.issues.state).toBe("unavailable");
  });
});

describe("buildCommandCenterView — rank freshness across trackers", () => {
  it("reports not-configured with no trackers", () => {
    expect(buildCommandCenterView(makeData()).rank.state).toBe(
      "not-configured",
    );
  });

  it("reports never-run when no tracker has completed", () => {
    const view = buildCommandCenterView(
      makeData({ rankTracking: [tracker("a", null), tracker("b", null)] }),
    );
    expect(view.rank).toEqual({
      state: "never-run",
      keywordCount: 20,
      trackerCount: 2,
    });
  });

  it("reports a single timestamp when all completed runs share an instant", () => {
    const view = buildCommandCenterView(
      makeData({
        rankTracking: [
          tracker("a", "2026-07-20T00:00:00.000Z"),
          tracker("b", "2026-07-20T00:00:00.000Z"),
        ],
      }),
    );
    expect(view.rank).toMatchObject({
      state: "single",
      atIso: "2026-07-20T00:00:00.000Z",
    });
  });

  it("reports a range spanning oldest to newest, never only the newest", () => {
    const view = buildCommandCenterView(
      makeData({
        rankTracking: [
          tracker("a", "2026-07-25T00:00:00.000Z"),
          tracker("b", "2026-07-20T00:00:00.000Z"),
          tracker("c", "2026-07-22T00:00:00.000Z"),
        ],
      }),
    );
    expect(view.rank).toMatchObject({
      state: "range",
      oldestIso: "2026-07-20T00:00:00.000Z",
      newestIso: "2026-07-25T00:00:00.000Z",
    });
  });

  it("reports mixed when some trackers have never completed", () => {
    const view = buildCommandCenterView(
      makeData({
        rankTracking: [
          tracker("a", "2026-07-25T00:00:00.000Z"),
          tracker("b", null),
        ],
      }),
    );
    expect(view.rank).toMatchObject({
      state: "mixed",
      oldestIso: "2026-07-25T00:00:00.000Z",
      newestIso: "2026-07-25T00:00:00.000Z",
    });
  });

  it("marks rank unavailable on a source error rather than not-configured", () => {
    const view = buildCommandCenterView(
      makeData({
        rankTracking: [],
        sources: {
          gscError: null,
          auditError: null,
          rankTrackingError: "Unavailable right now",
          issueError: null,
        },
      }),
    );
    expect(view.rank.state).toBe("unavailable");
  });
});

describe("buildCommandCenterView — gsc", () => {
  it("reports connected / not-connected / unavailable honestly", () => {
    expect(buildCommandCenterView(makeData()).gsc.state).toBe("connected");
    expect(
      buildCommandCenterView(
        makeData({
          readiness: { dataForSeoConfigured: true, gsc: null },
        }),
      ).gsc.state,
    ).toBe("not-connected");
    expect(
      buildCommandCenterView(
        makeData({
          sources: {
            gscError: "x",
            auditError: null,
            rankTrackingError: null,
            issueError: null,
          },
        }),
      ).gsc.state,
    ).toBe("unavailable");
  });
});
