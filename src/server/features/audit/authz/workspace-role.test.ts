/**
 * Role resolution against a real SQLite database so the identity -> member ->
 * role path exercised in hosted mode is the one D1 actually runs. Delegated
 * modes resolve without a member row, which is the exact case that must not
 * regress before P11 private sharing ships.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFreeCheckTestDb,
  type FreeCheckTestDb,
} from "@/server/services/seo-check/__tests__/free-check-test-db";
import { member, organization, user } from "@/db/better-auth-schema";

const { testDb } = vi.hoisted(() => ({
  testDb: { current: null } as { current: unknown },
}));

vi.mock("@/db", () => ({
  get db() {
    return testDb.current;
  },
}));

const {
  canInvestigate,
  canManageTarget,
  canReadAudit,
  mapHostedMemberRole,
  resolveWorkspaceRole,
} = await import("./workspace-role");

describe("mapHostedMemberRole", () => {
  it("maps better-auth roles into the audit matrix", () => {
    expect(mapHostedMemberRole("owner")).toBe("owner");
    expect(mapHostedMemberRole("admin")).toBe("admin");
    expect(mapHostedMemberRole("member")).toBe("editor");
    expect(mapHostedMemberRole("editor")).toBe("editor");
    expect(mapHostedMemberRole("viewer")).toBe("viewer");
  });

  it("falls back to the read-only viewer for absent or unknown roles", () => {
    expect(mapHostedMemberRole(null)).toBe("viewer");
    expect(mapHostedMemberRole(undefined)).toBe("viewer");
    expect(mapHostedMemberRole("superuser")).toBe("viewer");
  });
});

describe("role predicates", () => {
  it("gate management to owner/admin", () => {
    expect(canManageTarget("owner")).toBe(true);
    expect(canManageTarget("admin")).toBe(true);
    expect(canManageTarget("editor")).toBe(false);
    expect(canManageTarget("viewer")).toBe(false);
  });

  it("gate investigation to owner/admin/editor", () => {
    expect(canInvestigate("owner")).toBe(true);
    expect(canInvestigate("admin")).toBe(true);
    expect(canInvestigate("editor")).toBe(true);
    expect(canInvestigate("viewer")).toBe(false);
  });

  it("allow every role to read", () => {
    expect(canReadAudit("owner")).toBe(true);
    expect(canReadAudit("viewer")).toBe(true);
  });
});

describe("resolveWorkspaceRole", () => {
  let harness: FreeCheckTestDb;

  beforeEach(async () => {
    harness = await createFreeCheckTestDb();
    testDb.current = harness.db;
  });

  it("resolves delegated modes to owner without a member row", async () => {
    await expect(
      resolveWorkspaceRole({
        userId: "local-admin",
        organizationId: "delegated-local-admin",
        authMode: "local_noauth",
      }),
    ).resolves.toBe("owner");

    await expect(
      resolveWorkspaceRole({
        userId: "cf-user",
        organizationId: "delegated-cf-user",
        authMode: "cloudflare_access",
      }),
    ).resolves.toBe("owner");
  });

  it("resolves hosted role from the member row", async () => {
    const now = new Date();
    await harness.db.insert(user).values({
      id: "u1",
      name: "Owner",
      email: "owner@example.com",
    });
    await harness.db.insert(organization).values({
      id: "org1",
      name: "Org",
      slug: "org-1",
      createdAt: now,
    });
    await harness.db.insert(member).values({
      id: "m1",
      organizationId: "org1",
      userId: "u1",
      role: "member",
      createdAt: now,
    });

    await expect(
      resolveWorkspaceRole({
        userId: "u1",
        organizationId: "org1",
        authMode: "hosted",
      }),
    ).resolves.toBe("editor");
  });

  it("resolves hosted with no membership to the read-only viewer", async () => {
    await expect(
      resolveWorkspaceRole({
        userId: "ghost",
        organizationId: "org-none",
        authMode: "hosted",
      }),
    ).resolves.toBe("viewer");
  });
});
