import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as WorkspaceRole from "@/server/features/audit/authz/workspace-role";
import { AppError } from "@/server/lib/errors";

/**
 * What is worth asserting here is what the service refuses. The role matrix and
 * `normalizeAndValidateStartUrl` are the real implementations — a gate restated
 * in a mock proves only that the mock was written.
 */
const {
  getAuditForProjectMock,
  getByProjectAndOriginMock,
  listByTargetMock,
  addCompetitorMock,
  removeCompetitorMock,
  resolveWorkspaceRoleMock,
} = vi.hoisted(() => ({
  getAuditForProjectMock: vi.fn(),
  getByProjectAndOriginMock: vi.fn(),
  listByTargetMock: vi.fn(),
  addCompetitorMock: vi.fn(),
  removeCompetitorMock: vi.fn(),
  resolveWorkspaceRoleMock: vi.fn(),
}));

vi.mock("@/server/features/audit/repositories/AuditRepository", () => ({
  AuditRepository: { getAuditForProject: getAuditForProjectMock },
}));
vi.mock("@/server/features/audit/repositories/AuditTargetRepository", () => ({
  AuditTargetRepository: { getByProjectAndOrigin: getByProjectAndOriginMock },
}));
vi.mock("@/server/features/audit/repositories/CompetitorRepository", () => ({
  CompetitorRepository: {
    listByTarget: listByTargetMock,
    add: addCompetitorMock,
    remove: removeCompetitorMock,
  },
}));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/server/features/audit/authz/workspace-role", async () => {
  const real = await vi.importActual<typeof WorkspaceRole>(
    "@/server/features/audit/authz/workspace-role",
  );
  return { ...real, resolveWorkspaceRole: resolveWorkspaceRoleMock };
});

// Imported after the mocks are registered: a static import would bind the real
// repositories before `vi.mock` runs.
const { CompetitorAuditService, MAX_COMPETITORS_PER_TARGET } =
  await import("./CompetitorAuditService");

const ACTOR = {
  projectId: "project-1",
  auditId: "audit-1",
  actorUserId: "user-1",
  organizationId: "org-1",
  authMode: "hosted" as const,
};

function competitor(origin: string) {
  return {
    id: `c-${origin}`,
    projectId: "project-1",
    targetId: "target-1",
    origin,
    label: null,
    source: "manual" as const,
    createdAt: "2026-08-14 00:00:00",
    updatedAt: "2026-08-14 00:00:00",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  resolveWorkspaceRoleMock.mockResolvedValue("owner");
  getAuditForProjectMock.mockResolvedValue({
    id: "audit-1",
    projectId: "project-1",
    startUrl: "https://thehourglass.test/collections",
  });
  getByProjectAndOriginMock.mockResolvedValue({
    id: "target-1",
    projectId: "project-1",
    organizationId: "org-1",
    origin: "https://thehourglass.test",
  });
  listByTargetMock.mockResolvedValue([]);
  addCompetitorMock.mockImplementation(async (input: { origin: string }) =>
    competitor(input.origin),
  );
});

describe("CompetitorAuditService.add", () => {
  it("normalizes a bare domain to an origin and drops the path", async () => {
    await CompetitorAuditService.add({
      ...ACTOR,
      domain: "cortinawatch.test/en/rolex/discover",
      label: null,
    });

    expect(addCompetitorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: "https://cortinawatch.test",
        source: "manual",
      }),
    );
  });

  it("rejects the target's own origin", async () => {
    // A site is not its own competitor, and accepting it would crawl ourselves
    // under a label that says otherwise.
    await expect(
      CompetitorAuditService.add({
        ...ACTOR,
        domain: "thehourglass.test",
        label: null,
      }),
    ).rejects.toThrow(AppError);
    expect(addCompetitorMock).not.toHaveBeenCalled();
  });

  it("refuses a new domain past the cap", async () => {
    listByTargetMock.mockResolvedValue([
      competitor("https://a.test"),
      competitor("https://b.test"),
      competitor("https://c.test"),
    ]);

    await expect(
      CompetitorAuditService.add({ ...ACTOR, domain: "d.test", label: null }),
    ).rejects.toThrow(AppError);
    expect(MAX_COMPETITORS_PER_TARGET).toBe(3);
  });

  it("still accepts a domain already stored when the list is full", async () => {
    // Two people adding the same competitor is ordinary in a shared workspace;
    // the second must not be told the list is full when nothing would be added.
    listByTargetMock.mockResolvedValue([
      competitor("https://a.test"),
      competitor("https://b.test"),
      competitor("https://c.test"),
    ]);

    await expect(
      CompetitorAuditService.add({ ...ACTOR, domain: "b.test", label: null }),
    ).resolves.toMatchObject({ origin: "https://b.test" });
  });

  it("blocks a private address instead of storing something we would fetch", async () => {
    await expect(
      CompetitorAuditService.add({
        ...ACTOR,
        domain: "http://192.168.0.10",
        label: null,
      }),
    ).rejects.toThrow(AppError);
    expect(addCompetitorMock).not.toHaveBeenCalled();
  });

  it("stores an empty label as null rather than a blank string", async () => {
    await CompetitorAuditService.add({
      ...ACTOR,
      domain: "cortinawatch.test",
      label: "   ",
    });

    expect(addCompetitorMock).toHaveBeenCalledWith(
      expect.objectContaining({ label: null }),
    );
  });

  it("refuses an audit that is not this project's", async () => {
    // `getAuditForProject` is the scope: an audit id from another workspace
    // resolves to nothing rather than to somebody else's target.
    getAuditForProjectMock.mockResolvedValue(null);

    await expect(
      CompetitorAuditService.add({ ...ACTOR, domain: "x.test", label: null }),
    ).rejects.toThrow(AppError);
    expect(getByProjectAndOriginMock).not.toHaveBeenCalled();
  });

  it("refuses an audit whose origin has no target row", async () => {
    getByProjectAndOriginMock.mockResolvedValue(null);

    await expect(
      CompetitorAuditService.add({ ...ACTOR, domain: "x.test", label: null }),
    ).rejects.toThrow(AppError);
    expect(addCompetitorMock).not.toHaveBeenCalled();
  });

  it("refuses a viewer before touching any data", async () => {
    resolveWorkspaceRoleMock.mockResolvedValue("viewer");

    await expect(
      CompetitorAuditService.add({ ...ACTOR, domain: "x.test", label: null }),
    ).rejects.toThrow(AppError);
    expect(getAuditForProjectMock).not.toHaveBeenCalled();
  });
});

describe("CompetitorAuditService.remove", () => {
  it("scopes the delete by target, not by id alone", async () => {
    await CompetitorAuditService.remove({ ...ACTOR, competitorId: "c-1" });

    expect(removeCompetitorMock).toHaveBeenCalledWith("target-1", "c-1");
  });
});

describe("CompetitorAuditService.list", () => {
  it("allows an editor to read", async () => {
    resolveWorkspaceRoleMock.mockResolvedValue("editor");
    listByTargetMock.mockResolvedValue([competitor("https://a.test")]);

    await expect(CompetitorAuditService.list(ACTOR)).resolves.toHaveLength(1);
  });
});
