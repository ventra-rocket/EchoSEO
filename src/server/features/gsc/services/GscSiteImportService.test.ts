import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as WorkspaceRole from "@/server/features/audit/authz/workspace-role";
import { AppError } from "@/server/lib/errors";

/**
 * The importer's contract is per-row independence and never trusting the client.
 * `planGscSiteTarget` and the workspace-role matrix are NOT mocked — a gate is
 * only worth asserting if the real one runs.
 */
const {
  listSitesForUserWithGrantStatusMock,
  listByOrganizationMock,
  upsertConnectionMock,
  createProjectMock,
  getProjectByIdMock,
  getOrCreateTargetMock,
  startAuditMock,
  resolveWorkspaceRoleMock,
} = vi.hoisted(() => ({
  listSitesForUserWithGrantStatusMock: vi.fn(),
  listByOrganizationMock: vi.fn(),
  upsertConnectionMock: vi.fn(),
  createProjectMock: vi.fn(),
  getProjectByIdMock: vi.fn(),
  getOrCreateTargetMock: vi.fn(),
  startAuditMock: vi.fn(),
  resolveWorkspaceRoleMock: vi.fn(),
}));

vi.mock("@/server/features/gsc/services/GscService", () => ({
  GscService: {
    listSitesForUserWithGrantStatus: listSitesForUserWithGrantStatusMock,
  },
}));
vi.mock("@/server/features/gsc/repositories/GscConnectionRepository", () => ({
  GscConnectionRepository: {
    listByOrganization: listByOrganizationMock,
    upsert: upsertConnectionMock,
  },
}));
vi.mock("@/server/features/projects/repositories/ProjectRepository", () => ({
  ProjectRepository: {
    createProject: createProjectMock,
    getProjectById: getProjectByIdMock,
  },
}));
vi.mock("@/server/features/audit/repositories/AuditTargetRepository", () => ({
  AuditTargetRepository: { getOrCreateTarget: getOrCreateTargetMock },
}));
vi.mock("@/server/features/audit/services/AuditService", () => ({
  AuditService: { startAudit: startAuditMock },
}));
// `workspace-role` reaches for `@/db`, which imports `cloudflare:workers` and is
// unresolvable in the node test project. Every repository here is mocked and the
// role lookup itself is stubbed, so an inert handle is enough — and it keeps
// `canInvestigate` the real matrix rather than a restatement of it.
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/server/features/audit/authz/workspace-role", async () => {
  const real = await vi.importActual<typeof WorkspaceRole>(
    "@/server/features/audit/authz/workspace-role",
  );
  return { ...real, resolveWorkspaceRole: resolveWorkspaceRoleMock };
});

// Imported after the mocks are registered: a static import would bind the real
// repositories before `vi.mock` runs.
const { GscSiteImportService, MAX_IMPORT_SITES } =
  await import("./GscSiteImportService");

const ACTOR = {
  actorUserId: "user-1",
  authMode: "hosted" as const,
  organizationId: "org-1",
};
const BILLING = {
  organizationId: "org-1",
  userId: "user-1",
  userEmail: "seo@example.com",
};

function importInput(
  siteUrls: string[],
  overrides: { startAudits?: boolean; auditsAllowed?: boolean } = {},
) {
  return {
    ...ACTOR,
    userEmail: BILLING.userEmail,
    billingCustomer: BILLING,
    siteUrls,
    startAudits: overrides.startAudits ?? false,
    auditsAllowed: overrides.auditsAllowed ?? true,
  };
}

function grantHolds(...sites: { siteUrl: string; permissionLevel?: string }[]) {
  listSitesForUserWithGrantStatusMock.mockResolvedValue({
    failure: null,
    sites: sites.map((site) => ({
      siteUrl: site.siteUrl,
      permissionLevel: site.permissionLevel ?? "siteOwner",
    })),
  });
}

beforeEach(() => {
  resolveWorkspaceRoleMock.mockResolvedValue("owner");
  listByOrganizationMock.mockResolvedValue([]);
  createProjectMock.mockImplementation(
    async (organizationId: string, name: string, domain?: string) => ({
      id: `proj-${name}`,
      organizationId,
      name,
      domain: domain ?? null,
      createdAt: "2026-08-13",
    }),
  );
  upsertConnectionMock.mockResolvedValue({ id: "conn-1" });
  getOrCreateTargetMock.mockResolvedValue({ id: "target-1" });
  startAuditMock.mockResolvedValue({ auditId: "audit-1" });
  getProjectByIdMock.mockResolvedValue(null);
});

describe("GscSiteImportService.importSites", () => {
  it("creates one project per property, named and domained by its host", async () => {
    // One project per property is the whole design: every per-site Google surface
    // resolves gsc_connections by projectId, so two properties in one project
    // would leave one of them unable to read Search Console at all.
    grantHolds(
      { siteUrl: "sc-domain:example.com" },
      {
        siteUrl: "https://www.other.com/",
      },
    );

    const result = await GscSiteImportService.importSites(
      importInput(["sc-domain:example.com", "https://www.other.com/"]),
    );

    expect(result.rows.map((row) => row.outcome)).toEqual([
      "created",
      "created",
    ]);
    expect(createProjectMock).toHaveBeenCalledTimes(2);
    expect(createProjectMock).toHaveBeenNthCalledWith(
      1,
      "org-1",
      "example.com",
      "example.com",
    );
    expect(createProjectMock).toHaveBeenNthCalledWith(
      2,
      "org-1",
      "www.other.com",
      "www.other.com",
    );
    // The target is created eagerly, on the origin the mapping derived.
    expect(getOrCreateTargetMock).toHaveBeenNthCalledWith(1, {
      projectId: "proj-example.com",
      organizationId: "org-1",
      origin: "https://example.com",
    });
    expect(getOrCreateTargetMock).toHaveBeenNthCalledWith(2, {
      projectId: "proj-www.other.com",
      organizationId: "org-1",
      origin: "https://www.other.com",
    });
  });

  it("refuses a property the caller's own grant does not hold", async () => {
    // The client names the properties, so the client is not trusted: otherwise a
    // crafted request binds this workspace to someone else's site.
    grantHolds({ siteUrl: "sc-domain:mine.com" });

    const result = await GscSiteImportService.importSites(
      importInput(["sc-domain:notmine.com"]),
    );

    expect(result.rows[0]).toMatchObject({
      outcome: "failed",
      detail: "Not available on your connected Google account",
    });
    expect(createProjectMock).not.toHaveBeenCalled();
  });

  it("refuses a property the caller has not verified", async () => {
    grantHolds({
      siteUrl: "sc-domain:example.com",
      permissionLevel: "siteUnverifiedUser",
    });

    const result = await GscSiteImportService.importSites(
      importInput(["sc-domain:example.com"]),
    );

    expect(result.rows[0]).toMatchObject({ outcome: "failed" });
    expect(result.rows[0]?.detail).toContain("verified");
    expect(createProjectMock).not.toHaveBeenCalled();
  });

  it("skips a property some project in the org already holds", async () => {
    listByOrganizationMock.mockResolvedValue([
      { siteUrl: "sc-domain:example.com", projectId: "proj-existing" },
    ]);
    grantHolds({ siteUrl: "sc-domain:example.com" });

    const result = await GscSiteImportService.importSites(
      importInput(["sc-domain:example.com"]),
    );

    expect(result.rows[0]).toMatchObject({
      outcome: "skipped_duplicate",
      projectId: "proj-existing",
    });
    expect(createProjectMock).not.toHaveBeenCalled();
  });

  it("does not create two projects for the same property named twice", async () => {
    // De-duped before the loop, and claimed inside it, so a repeated selection
    // cannot double every weekly report for that site later on.
    grantHolds({ siteUrl: "sc-domain:example.com" });

    const result = await GscSiteImportService.importSites(
      importInput(["sc-domain:example.com", " sc-domain:example.com "]),
    );

    expect(result.rows).toHaveLength(1);
    expect(createProjectMock).toHaveBeenCalledTimes(1);
  });
  it("lets one failing row cost only that row", async () => {
    grantHolds(
      { siteUrl: "sc-domain:first.com" },
      { siteUrl: "sc-domain:second.com" },
      { siteUrl: "sc-domain:third.com" },
    );
    createProjectMock.mockImplementationOnce(async () => {
      throw new Error("UNIQUE constraint failed: projects.id");
    });

    const result = await GscSiteImportService.importSites(
      importInput([
        "sc-domain:first.com",
        "sc-domain:second.com",
        "sc-domain:third.com",
      ]),
    );

    expect(result.rows.map((row) => row.outcome)).toEqual([
      "failed",
      "created",
      "created",
    ]);
    // An infrastructure message names tables and constraints, so the row stays
    // generic and the cause goes to the operator's log instead.
    expect(result.rows[0]?.detail).toBe("Could not create the project");
    expect(result.rows[0]?.detail).not.toContain("UNIQUE");
  });

  it("shows an AppError's own message, which was written to be read", async () => {
    grantHolds({ siteUrl: "sc-domain:example.com" });
    createProjectMock.mockImplementationOnce(async () => {
      throw new AppError(
        "CONFLICT",
        'A project named "Default" with no domain already exists.',
      );
    });

    const result = await GscSiteImportService.importSites(
      importInput(["sc-domain:example.com"]),
    );

    expect(result.rows[0]?.detail).toContain("already exists");
  });
  it("reports the path a scoped property loses to the crawl origin", async () => {
    grantHolds({ siteUrl: "https://example.com/shop/" });

    const result = await GscSiteImportService.importSites(
      importInput(["https://example.com/shop/"]),
    );

    expect(result.rows[0]?.outcome).toBe("created");
    expect(result.rows[0]?.detail).toContain("/shop/");
  });

  it("asks for a reconnect instead of failing every row", async () => {
    // Nothing was attempted, so nothing may be reported as attempted — a screen
    // full of red rows would send the user looking for the wrong problem.
    listSitesForUserWithGrantStatusMock.mockResolvedValue({
      sites: [],
      failure: { reason: "grant_expired", providerStatus: null },
    });

    const result = await GscSiteImportService.importSites(
      importInput(["sc-domain:example.com"]),
    );

    expect(result).toEqual({ rows: [], requiresReconnect: true });
    expect(createProjectMock).not.toHaveBeenCalled();
  });

  it("refuses a viewer", async () => {
    resolveWorkspaceRoleMock.mockResolvedValue("viewer");

    await expect(
      GscSiteImportService.importSites(importInput(["sc-domain:example.com"])),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(listSitesForUserWithGrantStatusMock).not.toHaveBeenCalled();
  });

  it("rejects an empty selection and an oversized batch", async () => {
    await expect(
      GscSiteImportService.importSites(importInput([])),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    const tooMany = Array.from(
      { length: MAX_IMPORT_SITES + 1 },
      (_, index) => `sc-domain:site${index}.com`,
    );
    await expect(
      GscSiteImportService.importSites(importInput(tooMany)),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  describe("the optional first crawl", () => {
    it("launches one per created project and reports the audit id", async () => {
      grantHolds({ siteUrl: "sc-domain:example.com" });

      const result = await GscSiteImportService.importSites(
        importInput(["sc-domain:example.com"], { startAudits: true }),
      );

      expect(result.rows[0]).toMatchObject({
        audit: "started",
        auditId: "audit-1",
      });
      expect(startAuditMock).toHaveBeenCalledWith({
        actorUserId: "user-1",
        authMode: "hosted",
        billingCustomer: BILLING,
        projectId: "proj-example.com",
        startUrl: "https://example.com",
      });
    });

    it("keeps the project when the launch throttle refuses the crawl", async () => {
      // Ten sites and a ten-per-hour ceiling: the sites still had to be imported,
      // and the row says why its crawl did not start.
      grantHolds(
        { siteUrl: "sc-domain:first.com" },
        { siteUrl: "sc-domain:second.com" },
      );
      startAuditMock
        .mockResolvedValueOnce({ auditId: "audit-1" })
        .mockRejectedValueOnce(
          new AppError("RATE_LIMITED", "Too many site audits started"),
        );

      const result = await GscSiteImportService.importSites(
        importInput(["sc-domain:first.com", "sc-domain:second.com"], {
          startAudits: true,
        }),
      );

      expect(result.rows.map((row) => row.outcome)).toEqual([
        "created",
        "created",
      ]);
      expect(result.rows.map((row) => row.audit)).toEqual([
        "started",
        "throttled",
      ]);
    });

    it("imports without crawling when the org may not spend on crawls", async () => {
      grantHolds({ siteUrl: "sc-domain:example.com" });

      const result = await GscSiteImportService.importSites(
        importInput(["sc-domain:example.com"], {
          startAudits: true,
          auditsAllowed: false,
        }),
      );

      expect(result.rows[0]).toMatchObject({
        outcome: "created",
        audit: "unavailable",
      });
      expect(startAuditMock).not.toHaveBeenCalled();
    });

    it("does not crawl when the caller did not ask", async () => {
      grantHolds({ siteUrl: "sc-domain:example.com" });

      const result = await GscSiteImportService.importSites(
        importInput(["sc-domain:example.com"]),
      );

      expect(result.rows[0]?.audit).toBe("not_requested");
      expect(startAuditMock).not.toHaveBeenCalled();
    });
  });
});

describe("GscSiteImportService.listCandidates", () => {
  it("annotates each property with why it cannot be picked", async () => {
    // Unselectable rows are listed, not filtered: a user hunting for a missing
    // property must see it with a reason rather than doubt we read the account.
    listByOrganizationMock.mockResolvedValue([
      { siteUrl: "sc-domain:taken.com", projectId: "proj-taken" },
    ]);
    getProjectByIdMock.mockResolvedValue({
      id: "proj-taken",
      name: "taken.com",
    });
    grantHolds(
      { siteUrl: "sc-domain:free.com" },
      { siteUrl: "sc-domain:taken.com" },
      {
        siteUrl: "sc-domain:unverified.com",
        permissionLevel: "siteUnverifiedUser",
      },
      { siteUrl: "android-app://com.example/" },
    );

    const { candidates, requiresReconnect } =
      await GscSiteImportService.listCandidates(ACTOR);

    expect(requiresReconnect).toBe(false);
    expect(
      candidates.map((candidate) => [candidate.siteUrl, candidate.block]),
    ).toEqual([
      ["sc-domain:free.com", null],
      ["sc-domain:taken.com", "already_imported"],
      ["sc-domain:unverified.com", "unverified"],
      ["android-app://com.example/", "unsupported"],
    ]);
    expect(candidates[1]).toMatchObject({
      existingProjectId: "proj-taken",
      existingProjectName: "taken.com",
    });
  });

  it("carries the mapping through so the UI can show the derived host", async () => {
    grantHolds({ siteUrl: "https://www.example.com/blog/" });

    const { candidates } = await GscSiteImportService.listCandidates(ACTOR);

    expect(candidates[0]).toMatchObject({
      kind: "url_prefix",
      host: "www.example.com",
      origin: "https://www.example.com",
      droppedPath: "/blog/",
    });
  });

  it("passes the reconnect signal through rather than an empty list", async () => {
    listSitesForUserWithGrantStatusMock.mockResolvedValue({
      sites: [],
      failure: { reason: "consent_blocked", providerStatus: 403 },
    });

    await expect(GscSiteImportService.listCandidates(ACTOR)).resolves.toEqual({
      candidates: [],
      requiresReconnect: true,
    });
  });

  it("refuses a viewer", async () => {
    resolveWorkspaceRoleMock.mockResolvedValue("viewer");

    await expect(
      GscSiteImportService.listCandidates(ACTOR),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
