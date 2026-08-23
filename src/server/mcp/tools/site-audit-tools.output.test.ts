import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  mocks,
  resetAuditToolMocks,
  text,
  toolExtra,
} from "./site-audit-tools.test-harness";

// What the Site Audit MCP tools tell the agent, once the work is allowed. Who
// is allowed to reach audit data at all is site-audit-tools.access.test.ts.
//
// Every case here pins something an agent acts on and that a plausible refactor
// would silently break: Lighthouse is opt-in and its absence is admitted, the
// status tool absorbs the wait instead of asking the agent to poll, findings
// that were never materialized are not reported as a clean site, and the text
// block carries the same row data as the structured payload.

describe("site audit MCP tool output", () => {
  beforeEach(resetAuditToolMocks);

  describe("Lighthouse opt-in", () => {
    beforeEach(() => {
      mocks.startAudit.mockImplementation(
        (input: { maxPages?: number; lighthouseStrategy?: string }) =>
          Promise.resolve({
            auditId: "audit_1",
            maxPages: input.maxPages ?? 5000,
            lighthouseStrategy: input.lighthouseStrategy ?? "auto",
          }),
      );
    });

    it("is off when the agent does not ask for it", async () => {
      const { runSiteAuditTool } = await import("./site-audit-tools");

      const result = await runSiteAuditTool.handler(
        { projectId: "project_1", url: "https://example.com" },
        toolExtra,
      );

      expect(mocks.startAudit).toHaveBeenCalledWith(
        expect.objectContaining({ lighthouseStrategy: "none" }),
      );
      expect(result.structuredContent).toMatchObject({ ranLighthouse: false });
      expect(text(result)).toContain("Lighthouse off");
    });

    it("is on only when the agent asks for it", async () => {
      const { runSiteAuditTool } = await import("./site-audit-tools");

      const result = await runSiteAuditTool.handler(
        {
          projectId: "project_1",
          url: "https://example.com",
          runLighthouse: true,
        },
        toolExtra,
      );

      expect(mocks.startAudit).toHaveBeenCalledWith(
        expect.objectContaining({ lighthouseStrategy: "auto" }),
      );
      expect(result.structuredContent).toMatchObject({ ranLighthouse: true });
    });

    it("admits it when a requested Lighthouse run was forced off", async () => {
      // startAudit drops Lighthouse when the org has no DataForSEO key. The
      // tool must report the crawl that is running, not the one requested.
      mocks.startAudit.mockResolvedValue({
        auditId: "audit_1",
        maxPages: 5000,
        lighthouseStrategy: "none",
      });
      const { runSiteAuditTool } = await import("./site-audit-tools");

      const result = await runSiteAuditTool.handler(
        {
          projectId: "project_1",
          url: "https://example.com",
          runLighthouse: true,
        },
        toolExtra,
      );

      expect(result.structuredContent).toMatchObject({ ranLighthouse: false });
      expect(text(result)).toContain("no DataForSEO key");
    });
  });

  describe("get_audit_status waiting", () => {
    const runningStatus = {
      id: "audit_1",
      startUrl: "https://example.com",
      status: "running",
      pagesCrawled: 10,
      pagesTotal: 5000,
      lighthouseTotal: 0,
      lighthouseCompleted: 0,
      lighthouseFailed: 0,
      currentPhase: "crawl",
      startedAt: "2026-08-24 10:00:00",
      completedAt: null,
      errorMessage: null,
    };

    it("returns an immediate snapshot for waitSeconds 0", async () => {
      mocks.getStatus.mockResolvedValue(runningStatus);
      mocks.getCrawlProgress.mockResolvedValue({ phase: null, entries: [] });
      const { getAuditStatusTool } = await import("./site-audit-tools");

      const result = await getAuditStatusTool.handler(
        { projectId: "project_1", waitSeconds: 0 },
        toolExtra,
      );

      expect(mocks.getStatus).toHaveBeenCalledTimes(1);
      expect(result.structuredContent).toMatchObject({ waitedSeconds: 0 });
    });

    it("waits server-side and answers as soon as the crawl finishes", async () => {
      vi.useFakeTimers();
      try {
        mocks.getStatus
          .mockResolvedValueOnce(runningStatus)
          .mockResolvedValueOnce({ ...runningStatus, pagesCrawled: 40 })
          .mockResolvedValue({
            ...runningStatus,
            status: "completed",
            pagesCrawled: 80,
            completedAt: "2026-08-24 10:05:00",
          });
        const { getAuditStatusTool } = await import("./site-audit-tools");

        const pending = getAuditStatusTool.handler(
          { projectId: "project_1", waitSeconds: 30 },
          toolExtra,
        );
        // Two 3s poll intervals is enough for the third read to settle it.
        await vi.advanceTimersByTimeAsync(6_000);
        const result = await pending;

        // One tool call covered the whole wait — the agent never looped.
        expect(mocks.getStatus).toHaveBeenCalledTimes(3);
        // A nested plain object is a recursive subset match, so the reported
        // status is still only required to carry the terminal state among its
        // other fields — without routing an `any` matcher through the payload.
        expect(result.structuredContent).toMatchObject({
          status: { status: "completed" },
        });
        expect(text(result)).toContain("get_audit_issues");
        // It stopped at the terminal state instead of burning the whole budget.
        expect(result.structuredContent).toMatchObject({ waitedSeconds: 6 });
      } finally {
        vi.useRealTimers();
      }
    });

    it("stops waiting when the client hangs up", async () => {
      vi.useFakeTimers();
      try {
        const aborted = new AbortController();
        mocks.getStatus.mockResolvedValue(runningStatus);
        mocks.getCrawlProgress.mockResolvedValue({ phase: null, entries: [] });
        const { getAuditStatusTool } = await import("./site-audit-tools");

        const pending = getAuditStatusTool.handler(
          { projectId: "project_1", waitSeconds: 60 },
          { ...toolExtra, signal: aborted.signal },
        );
        await vi.advanceTimersByTimeAsync(3_000);
        aborted.abort();
        await vi.advanceTimersByTimeAsync(3_000);
        await pending;

        // Two reads, not the twenty a full 60s budget would have made.
        expect(mocks.getStatus).toHaveBeenCalledTimes(2);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("get_audit_issues honesty", () => {
    it("refuses to read un-materialized findings as a clean site", async () => {
      mocks.getIssueSummary.mockResolvedValue({
        materializedAt: null,
        rollups: [],
      });
      mocks.listIssueOccurrences.mockResolvedValue({
        occurrences: [],
        total: 0,
        limit: 50,
        offset: 0,
      });
      const { getAuditIssuesTool } = await import("./site-audit-tools");

      const result = await getAuditIssuesTool.handler(
        { projectId: "project_1" },
        toolExtra,
      );

      expect(result.structuredContent).toMatchObject({ materializedAt: null });
      expect(text(result)).toContain("NOT a clean bill of health");
    });

    it("orders findings worst-first so a truncated read keeps the criticals", async () => {
      mocks.getIssueSummary.mockResolvedValue({
        materializedAt: "2026-08-24T10:00:00.000Z",
        rollups: [
          {
            ruleId: "structure-word-count",
            issueGroup: "content",
            severity: "low",
            urlCount: 90,
            fix: null,
          },
          {
            ruleId: "server-status",
            issueGroup: "indexability",
            severity: "critical",
            urlCount: 3,
            fix: null,
          },
          {
            ruleId: "meta-title",
            issueGroup: "content",
            severity: "high",
            urlCount: 12,
            fix: null,
          },
        ],
      });
      mocks.listIssueOccurrences.mockResolvedValue({
        occurrences: [],
        total: 0,
        limit: 50,
        offset: 0,
      });
      const { getAuditIssuesTool } = await import("./site-audit-tools");

      const result = await getAuditIssuesTool.handler(
        { projectId: "project_1" },
        toolExtra,
      );

      const findings = result.structuredContent?.findings;
      expect(Array.isArray(findings) ? findings : []).toMatchObject([
        { severity: "critical" },
        { severity: "high" },
        { severity: "low" },
      ]);
    });
  });

  // The contract tool-text-output.test.ts pins for service-backed tools: a
  // client that only surfaces the text block must still see the row data, so a
  // column wired to the wrong field (a table of "—") has to fail here.
  describe("get_audit_pages text rendering", () => {
    it("renders every page row's real values into the text block", async () => {
      mocks.listAuditPages.mockResolvedValue({
        audit: {
          id: "audit_1",
          startUrl: "https://example.com",
          status: "completed",
        },
        pages: [
          {
            url: "https://example.com/pricing",
            statusCode: 200,
            redirectUrl: null,
            title: "Pricing",
            metaDescription: "Our plans",
            canonicalUrl: "https://example.com/pricing",
            robotsMeta: null,
            h1Count: 1,
            wordCount: 812,
            imagesTotal: 4,
            imagesMissingAlt: 0,
            internalLinkCount: 23,
            externalLinkCount: 2,
            hasStructuredData: true,
            isIndexable: true,
            hasMixedContent: false,
            isHtml: true,
            inSitemap: true,
            responseTimeMs: 143,
          },
          {
            url: "https://example.com/old",
            statusCode: 404,
            redirectUrl: null,
            title: null,
            metaDescription: null,
            canonicalUrl: null,
            robotsMeta: null,
            h1Count: 0,
            wordCount: 0,
            imagesTotal: 0,
            imagesMissingAlt: 0,
            internalLinkCount: 0,
            externalLinkCount: 0,
            hasStructuredData: false,
            isIndexable: false,
            hasMixedContent: false,
            isHtml: false,
            inSitemap: false,
            responseTimeMs: null,
          },
        ],
        total: 2,
        limit: 50,
        offset: 0,
      });
      const { getAuditPagesTool } = await import("./site-audit-tools");

      const rendered = text(
        await getAuditPagesTool.handler({ projectId: "project_1" }, toolExtra),
      );

      expect(rendered).toContain("https://example.com/pricing");
      expect(rendered).toContain("Pricing");
      expect(rendered).toContain("812");
      expect(rendered).toContain("143");
      expect(rendered).toContain("404");
      // Booleans must read as words, and a genuinely absent value as the dash —
      // both come from the shared cell formatter rather than per-column code.
      expect(rendered).toContain("yes");
      expect(rendered).toContain("no");
      expect(rendered).toContain("—");
    });
  });
});
