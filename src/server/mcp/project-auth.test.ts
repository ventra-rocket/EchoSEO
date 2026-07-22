import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { ToolExtra } from "@/server/mcp/context";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MCP_AUTH_CONTEXT_PROP } from "@/server/mcp/context";

const mocks = vi.hoisted(() => ({
  getProjectForOrganization: vi.fn(),
  isHostedServerAuthMode: vi.fn<() => Promise<boolean>>(),
  isHostedOrganizationMember: vi.fn<() => Promise<boolean>>(),
}));

vi.mock("@/server/features/projects/services/ProjectService", () => ({
  ProjectService: {
    getProjectForOrganization: mocks.getProjectForOrganization,
  },
}));

vi.mock("@/server/lib/runtime-env", () => ({
  isHostedServerAuthMode: mocks.isHostedServerAuthMode,
}));

vi.mock("@/server/auth/default-hosted-organization", () => ({
  isHostedOrganizationMember: mocks.isHostedOrganizationMember,
}));

const authContext = {
  userId: "user_123",
  userEmail: "alice@example.com",
  organizationId: "org_123",
  clientId: "client_123",
  scopes: ["mcp"],
  audience: "https://open-seo.test/mcp",
  subject: "user_123",
  baseUrl: "https://open-seo.test",
};

const toolExtra: ToolExtra = {
  signal: new AbortController().signal,
  requestId: 1,
  sendNotification: vi.fn(),
  sendRequest: vi.fn(),
  authInfo: {
    token: "token",
    clientId: "client_123",
    scopes: ["mcp"],
    resource: new URL("https://open-seo.test/mcp"),
    extra: { [MCP_AUTH_CONTEXT_PROP]: authContext },
  } satisfies AuthInfo,
};

describe("withMcpProjectAuth", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.getProjectForOrganization.mockReset();
    // Default: the project belongs to the org. Individual tests override.
    mocks.getProjectForOrganization.mockResolvedValue({
      id: "project_123",
      name: "Test",
    });
    // Default: delegated mode, so the hosted membership re-check does not fire —
    // the pre-existing tests exercise the non-hosted path.
    mocks.isHostedServerAuthMode.mockReset();
    mocks.isHostedServerAuthMode.mockResolvedValue(false);
    mocks.isHostedOrganizationMember.mockReset();
    mocks.isHostedOrganizationMember.mockResolvedValue(true);
  });

  it("checks project access for the authenticated organization", async () => {
    const { withMcpProjectAuth } = await import("@/server/mcp/project-auth");
    const handler = vi.fn().mockResolvedValue("ok");

    const wrapped = withMcpProjectAuth(handler);
    await expect(
      wrapped({ projectId: "project_123" }, toolExtra),
    ).resolves.toBe("ok");

    expect(mocks.getProjectForOrganization).toHaveBeenCalledWith(
      "org_123",
      "project_123",
    );
  });

  it("passes auth, baseUrl, and billing context to the wrapped handler", async () => {
    const { withMcpProjectAuth } = await import("@/server/mcp/project-auth");
    const handler = vi.fn().mockReturnValue("ok");

    const wrapped = withMcpProjectAuth(handler);
    await wrapped({ projectId: "project_123" }, toolExtra);

    expect(handler).toHaveBeenCalledWith(
      { projectId: "project_123" },
      {
        auth: {
          userId: "user_123",
          userEmail: "alice@example.com",
          organizationId: "org_123",
          clientId: "client_123",
          scopes: ["mcp"],
          audience: "https://open-seo.test/mcp",
          subject: "user_123",
        },
        baseUrl: "https://open-seo.test",
        billing: {
          userId: "user_123",
          userEmail: "alice@example.com",
          organizationId: "org_123",
          projectId: "project_123",
        },
      },
    );
  });

  it("propagates project access failures without calling the wrapped handler", async () => {
    const error = new Error("project not found");
    mocks.getProjectForOrganization.mockRejectedValue(error);
    const { withMcpProjectAuth } = await import("@/server/mcp/project-auth");
    const handler = vi.fn();

    const wrapped = withMcpProjectAuth(handler);
    await expect(wrapped({ projectId: "project_123" }, toolExtra)).rejects.toBe(
      error,
    );

    expect(handler).not.toHaveBeenCalled();
  });

  // Defense-in-depth: even if the project lookup ever resolves falsy instead of
  // throwing (e.g. a future refactor returns null), the wrapper must still deny
  // access rather than run the handler with an unauthorized projectId.
  it("rejects when the project lookup resolves no project, without calling the handler", async () => {
    mocks.getProjectForOrganization.mockResolvedValue(null);
    const { withMcpProjectAuth } = await import("@/server/mcp/project-auth");
    const handler = vi.fn();

    const wrapped = withMcpProjectAuth(handler);
    await expect(
      wrapped({ projectId: "someone-elses-project" }, toolExtra),
    ).rejects.toThrow();

    expect(handler).not.toHaveBeenCalled();
  });

  // An MCP token freezes its organization at consent, so membership is re-checked
  // per call in hosted mode — a member removed after the grant loses access
  // without waiting for the token to expire.
  describe("hosted membership re-check", () => {
    it("denies a caller no longer in the token's organization, before any project lookup", async () => {
      mocks.isHostedServerAuthMode.mockResolvedValue(true);
      mocks.isHostedOrganizationMember.mockResolvedValue(false);
      const { withMcpProjectAuth } = await import("@/server/mcp/project-auth");
      const handler = vi.fn();

      const wrapped = withMcpProjectAuth(handler);
      await expect(
        wrapped({ projectId: "project_123" }, toolExtra),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });

      expect(mocks.isHostedOrganizationMember).toHaveBeenCalledWith(
        "user_123",
        "org_123",
      );
      // The re-check precedes — and short-circuits — the project authorization.
      expect(mocks.getProjectForOrganization).not.toHaveBeenCalled();
      expect(handler).not.toHaveBeenCalled();
    });

    it("allows a caller still in the token's organization", async () => {
      mocks.isHostedServerAuthMode.mockResolvedValue(true);
      mocks.isHostedOrganizationMember.mockResolvedValue(true);
      const { withMcpProjectAuth } = await import("@/server/mcp/project-auth");
      const handler = vi.fn().mockResolvedValue("ok");

      const wrapped = withMcpProjectAuth(handler);
      await expect(
        wrapped({ projectId: "project_123" }, toolExtra),
      ).resolves.toBe("ok");
    });

    it("skips the membership check entirely in delegated modes", async () => {
      mocks.isHostedServerAuthMode.mockResolvedValue(false);
      const { withMcpProjectAuth } = await import("@/server/mcp/project-auth");
      const handler = vi.fn().mockResolvedValue("ok");

      const wrapped = withMcpProjectAuth(handler);
      await expect(
        wrapped({ projectId: "project_123" }, toolExtra),
      ).resolves.toBe("ok");

      // No membership rows exist in delegated modes; the gate must not consult them.
      expect(mocks.isHostedOrganizationMember).not.toHaveBeenCalled();
    });
  });
});

// The shared gate that the org-scoped tools without a projectId (list_projects,
// whoami) call directly, so a removed member cannot read the frozen org.
describe("requireLiveOrgMembership", () => {
  const auth = { userId: "user_123", organizationId: "org_123" };

  beforeEach(() => {
    vi.resetModules();
    mocks.isHostedServerAuthMode.mockReset();
    mocks.isHostedOrganizationMember.mockReset();
    mocks.isHostedOrganizationMember.mockResolvedValue(true);
  });

  it("denies a hosted caller who is no longer a member", async () => {
    mocks.isHostedServerAuthMode.mockResolvedValue(true);
    mocks.isHostedOrganizationMember.mockResolvedValue(false);
    const { requireLiveOrgMembership } =
      await import("@/server/mcp/project-auth");

    await expect(requireLiveOrgMembership(auth)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows a hosted caller who is still a member", async () => {
    mocks.isHostedServerAuthMode.mockResolvedValue(true);
    mocks.isHostedOrganizationMember.mockResolvedValue(true);
    const { requireLiveOrgMembership } =
      await import("@/server/mcp/project-auth");

    await expect(requireLiveOrgMembership(auth)).resolves.toBeUndefined();
  });

  it("does not consult membership in delegated modes", async () => {
    mocks.isHostedServerAuthMode.mockResolvedValue(false);
    const { requireLiveOrgMembership } =
      await import("@/server/mcp/project-auth");

    await expect(requireLiveOrgMembership(auth)).resolves.toBeUndefined();
    expect(mocks.isHostedOrganizationMember).not.toHaveBeenCalled();
  });
});
