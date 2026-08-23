import { beforeEach, describe, expect, it } from "vitest";
import { AUDIT_VERIFICATION_PAGE_THRESHOLD } from "@/shared/audit-limits";
import {
  mocks,
  resetAuditToolMocks,
  text,
  toolExtra,
} from "./site-audit-tools.test-harness";

// Two properties of the Site Audit MCP surface that no other test covers, and
// that a plausible refactor would silently break:
//  - every tool proves the caller owns the project before touching audit data;
//  - a large crawl on an unverified domain is REFUSED with an explanation, and
//    never quietly shrunk to a size that would pass.
//
// Both are about entitlement: what the tools refuse to do, and for whom. What
// they say once the work is allowed is site-audit-tools.output.test.ts.

describe("site audit MCP tool access control", () => {
  beforeEach(resetAuditToolMocks);

  describe("project ownership", () => {
    /** Nothing in the audit domain may be reached for an unowned project. */
    function expectNoAuditWork() {
      expect(mocks.startAudit).not.toHaveBeenCalled();
      expect(mocks.getStatus).not.toHaveBeenCalled();
      expect(mocks.getIssueSummary).not.toHaveBeenCalled();
      expect(mocks.listIssueOccurrences).not.toHaveBeenCalled();
      expect(mocks.listAuditPages).not.toHaveBeenCalled();
      expect(mocks.getCommandCenterAudits).not.toHaveBeenCalled();
    }

    // The projectId is caller-supplied. Every tool must authorize it against
    // the token's organization before it reads or writes anything. Each tool is
    // driven with its own arguments rather than through a shared table, so the
    // handler's input type stays concrete.
    it("run_site_audit refuses a project the caller does not own", async () => {
      mocks.getProjectForOrganization.mockResolvedValue(undefined);
      const { runSiteAuditTool } = await import("./site-audit-tools");

      await expect(
        runSiteAuditTool.handler(
          { projectId: "someone_elses_project", url: "https://example.com" },
          toolExtra,
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expectNoAuditWork();
    });

    it("get_audit_status refuses a project the caller does not own", async () => {
      mocks.getProjectForOrganization.mockResolvedValue(undefined);
      const { getAuditStatusTool } = await import("./site-audit-tools");

      await expect(
        getAuditStatusTool.handler(
          { projectId: "someone_elses_project", waitSeconds: 0 },
          toolExtra,
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expectNoAuditWork();
    });

    it("get_audit_issues refuses a project the caller does not own", async () => {
      mocks.getProjectForOrganization.mockResolvedValue(undefined);
      const { getAuditIssuesTool } = await import("./site-audit-tools");

      await expect(
        getAuditIssuesTool.handler(
          { projectId: "someone_elses_project" },
          toolExtra,
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expectNoAuditWork();
    });

    it("get_audit_pages refuses a project the caller does not own", async () => {
      mocks.getProjectForOrganization.mockResolvedValue(undefined);
      const { getAuditPagesTool } = await import("./site-audit-tools");

      await expect(
        getAuditPagesTool.handler(
          { projectId: "someone_elses_project" },
          toolExtra,
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expectNoAuditWork();
    });

    it("never lets a caller-supplied auditId escape the authorized project", async () => {
      mocks.listAuditPages.mockResolvedValue({
        audit: {
          id: "audit_9",
          startUrl: "https://example.com",
          status: "completed",
        },
        pages: [],
        total: 0,
        limit: 50,
        offset: 0,
      });
      const { getAuditPagesTool } = await import("./site-audit-tools");

      await getAuditPagesTool.handler(
        { projectId: "project_1", auditId: "audit_from_another_workspace" },
        toolExtra,
      );

      // The audit id is passed through, but always paired with the project the
      // caller was authorized for — the service rejects the mismatch, so a
      // guessed id can never read another workspace's crawl.
      expect(mocks.listAuditPages).toHaveBeenCalledWith(
        expect.objectContaining({
          auditId: "audit_from_another_workspace",
          projectId: "project_1",
        }),
      );
    });
  });

  describe("verified-domain gate", () => {
    it("refuses a large crawl on an unverified domain instead of shrinking it", async () => {
      // `AppError` comes from the post-reset registry, not a static import:
      // `resetAuditToolMocks()` clears the module cache, so the tool module
      // evaluates its own copy of `@/server/lib/errors`, and `asAppError`
      // narrows with `instanceof`. A refusal built from the pre-reset class is
      // a different constructor and would fall through as a genuine fault.
      const { AppError } = await import("@/server/lib/errors");
      mocks.startAudit.mockRejectedValue(
        new AppError(
          "AUDIT_VERIFICATION_REQUIRED",
          "Verify domain ownership in Search Console to run an audit of this size",
        ),
      );
      const { runSiteAuditTool } = await import("./site-audit-tools");

      const result = await runSiteAuditTool.handler(
        { projectId: "project_1", url: "https://example.com", maxPages: 5000 },
        toolExtra,
      );

      expect(result.structuredContent).toMatchObject({
        ok: false,
        reason: "verification_required",
      });
      // The refusal must name the threshold and both remedies, so the agent can
      // act instead of retrying the same call.
      expect(text(result)).toContain(String(AUDIT_VERIFICATION_PAGE_THRESHOLD));
      expect(text(result)).toContain("Search Console");
      expect(text(result)).toContain("NOT silently shrunk");
      // Exactly one launch attempt: no silent retry at a passing size.
      expect(mocks.startAudit).toHaveBeenCalledTimes(1);
    });

    it("passes the deployment's auth mode to the gate rather than defaulting", async () => {
      mocks.startAudit.mockResolvedValue({
        auditId: "audit_1",
        maxPages: 5000,
        lighthouseStrategy: "none",
      });
      const { runSiteAuditTool } = await import("./site-audit-tools");

      await runSiteAuditTool.handler(
        { projectId: "project_1", url: "https://example.com" },
        toolExtra,
      );

      // A hardcoded self-host default here would disable the hosted-only
      // verification and throttle gates inside startAudit.
      expect(mocks.startAudit).toHaveBeenCalledWith(
        expect.objectContaining({ authMode: "hosted" }),
      );
    });

    it("refuses the launch when the hosted org has no managed access", async () => {
      mocks.orgMayUseManagedFeatures.mockResolvedValue(false);
      const { runSiteAuditTool } = await import("./site-audit-tools");

      const result = await runSiteAuditTool.handler(
        { projectId: "project_1", url: "https://example.com" },
        toolExtra,
      );

      expect(result.structuredContent).toMatchObject({
        ok: false,
        reason: "payment_required",
      });
      expect(mocks.startAudit).not.toHaveBeenCalled();
    });
  });
});
