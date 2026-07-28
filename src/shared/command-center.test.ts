import { describe, expect, it } from "vitest";
import { buildCommandCenterActions } from "./command-center";

describe("buildCommandCenterActions", () => {
  it("prioritizes missing setup steps without implying data is available", () => {
    expect(
      buildCommandCenterActions({
        domain: null,
        gscConnected: false,
        gscKnown: true,
        latestAudit: null,
        auditKnown: true,
        criticalIssueCount: 0,
        highIssueCount: 0,
        rankTrackers: [],
        rankTrackingKnown: true,
      }).map((action) => action.id),
    ).toEqual(["add-domain", "connect-gsc", "run-audit"]);
  });

  it("puts existing high-severity audit work ahead of rank setup", () => {
    expect(
      buildCommandCenterActions({
        domain: "example.com",
        gscConnected: true,
        gscKnown: true,
        latestAudit: {
          id: "audit-1",
          startUrl: "https://example.com",
          status: "completed",
          pagesCrawled: 10,
          pagesTotal: 10,
          startedAt: "2026-07-28T08:00:00.000Z",
          completedAt: "2026-07-28T08:01:00.000Z",
        },
        auditKnown: true,
        criticalIssueCount: 2,
        highIssueCount: 1,
        rankTrackers: [],
        rankTrackingKnown: true,
      }).map((action) => action.id),
    ).toEqual(["fix-issues", "add-keywords"]);
  });
});
