/**
 * Hosted session resolution against a real SQLite database, focused on the
 * membership revocation seam: a session's `activeOrganizationId` outlives the
 * `member` row it points at, so `resolveHostedContext` must re-check live
 * membership and refuse to resolve an organization the user was removed from.
 *
 * The database and the org helpers are real; only Better Auth's session API is
 * mocked (there is no auth server in the test).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFreeCheckTestDb,
  type FreeCheckTestDb,
} from "@/server/services/seo-check/__tests__/free-check-test-db";
import { organization, user, member } from "@/db/better-auth-schema";

const { testDb } = vi.hoisted(() => ({
  testDb: { current: null } as { current: unknown },
}));
vi.mock("@/db", () => ({
  get db() {
    return testDb.current;
  },
}));

const { getSessionMock, setActiveOrganizationMock, createOrganizationMock } =
  vi.hoisted(() => ({
    getSessionMock: vi.fn<(args: { headers: Headers }) => Promise<unknown>>(),
    setActiveOrganizationMock:
      vi.fn<
        (args: {
          headers: Headers;
          body: { organizationId: string };
        }) => Promise<void>
      >(),
    createOrganizationMock: vi.fn<(args: unknown) => Promise<{ id: string }>>(),
  }));
vi.mock("@/lib/auth", () => ({
  hasHostedAuthConfig: () => true,
  getAuth: () => ({
    api: {
      getSession: getSessionMock,
      setActiveOrganization: setActiveOrganizationMock,
      createOrganization: createOrganizationMock,
    },
  }),
}));

const { resolveHostedContext } = await import("./hosted");
const { isHostedOrganizationMember } =
  await import("@/server/auth/default-hosted-organization");

const USER_ID = "u1";
const OTHER_USER_ID = "u2";
const OWN_ORG = "org-own";
const OTHER_ORG = "org-other";

let harness: FreeCheckTestDb;

function sessionWithActiveOrg(activeOrganizationId: string | null) {
  return {
    user: { id: USER_ID, email: "u1@example.com", emailVerified: true },
    session: activeOrganizationId ? { activeOrganizationId } : {},
  };
}

describe("resolveHostedContext — membership revocation seam", () => {
  beforeEach(async () => {
    harness = await createFreeCheckTestDb();
    testDb.current = harness.db;
    getSessionMock.mockReset();
    setActiveOrganizationMock.mockReset();
    setActiveOrganizationMock.mockResolvedValue(undefined);
    createOrganizationMock.mockReset();

    await harness.db.insert(user).values({
      id: USER_ID,
      name: "User One",
      email: "u1@example.com",
      updatedAt: new Date(),
    });
    await harness.db.insert(organization).values([
      { id: OWN_ORG, name: "Own", slug: "own", createdAt: new Date() },
      { id: OTHER_ORG, name: "Other", slug: "other", createdAt: new Date() },
    ]);
    // The user owns OWN_ORG (their earliest membership) and is NOT a member of
    // OTHER_ORG — the org a removed member's session would still point at.
    await harness.db.insert(member).values({
      id: "m-own",
      organizationId: OWN_ORG,
      userId: USER_ID,
      role: "owner",
      createdAt: new Date(),
    });
    // A DIFFERENT user is a live member of OTHER_ORG. This makes "u1 is not a
    // member" distinct from "OTHER_ORG has no members", so the check's userId
    // predicate is load-bearing (dropping it would read OTHER_ORG as a match).
    await harness.db.insert(user).values({
      id: OTHER_USER_ID,
      name: "User Two",
      email: "u2@example.com",
      updatedAt: new Date(),
    });
    await harness.db.insert(member).values({
      id: "m-other",
      organizationId: OTHER_ORG,
      userId: OTHER_USER_ID,
      role: "owner",
      createdAt: new Date(),
    });
  });

  it("resolves the active org when the user is still a member", async () => {
    getSessionMock.mockResolvedValue(sessionWithActiveOrg(OWN_ORG));

    const context = await resolveHostedContext(new Headers());

    expect(context.organizationId).toBe(OWN_ORG);
    // No repair needed, so the session is not rewritten.
    expect(setActiveOrganizationMock).not.toHaveBeenCalled();
  });

  it("refuses an org the user was removed from and resets to their own", async () => {
    // Session still names OTHER_ORG, but no membership row exists for it.
    getSessionMock.mockResolvedValue(sessionWithActiveOrg(OTHER_ORG));

    const context = await resolveHostedContext(new Headers());

    expect(context.organizationId).toBe(OWN_ORG);
    expect(context.organizationId).not.toBe(OTHER_ORG);
    expect(setActiveOrganizationMock).toHaveBeenCalledOnce();
    expect(setActiveOrganizationMock.mock.calls[0][0].body).toEqual({
      organizationId: OWN_ORG,
    });
  });

  it("resets a session that carries no active org", async () => {
    getSessionMock.mockResolvedValue(sessionWithActiveOrg(null));

    const context = await resolveHostedContext(new Headers());

    expect(context.organizationId).toBe(OWN_ORG);
    expect(setActiveOrganizationMock).toHaveBeenCalledOnce();
  });
});

describe("isHostedOrganizationMember", () => {
  beforeEach(async () => {
    harness = await createFreeCheckTestDb();
    testDb.current = harness.db;
    await harness.db.insert(user).values({
      id: USER_ID,
      name: "User One",
      email: "u1@example.com",
      updatedAt: new Date(),
    });
    await harness.db.insert(organization).values([
      { id: OWN_ORG, name: "Own", slug: "own", createdAt: new Date() },
      { id: OTHER_ORG, name: "Other", slug: "other", createdAt: new Date() },
    ]);
    await harness.db.insert(member).values({
      id: "m-own",
      organizationId: OWN_ORG,
      userId: USER_ID,
      role: "owner",
      createdAt: new Date(),
    });
    // OTHER_ORG has a member — but not USER_ID.
    await harness.db.insert(user).values({
      id: OTHER_USER_ID,
      name: "User Two",
      email: "u2@example.com",
      updatedAt: new Date(),
    });
    await harness.db.insert(member).values({
      id: "m-other",
      organizationId: OTHER_ORG,
      userId: OTHER_USER_ID,
      role: "owner",
      createdAt: new Date(),
    });
  });

  it("is true only for the caller's own membership", async () => {
    await expect(isHostedOrganizationMember(USER_ID, OWN_ORG)).resolves.toBe(
      true,
    );
    // An org the user does not belong to, even though it has other members.
    await expect(isHostedOrganizationMember(USER_ID, OTHER_ORG)).resolves.toBe(
      false,
    );
    // An org that does not exist at all.
    await expect(isHostedOrganizationMember(USER_ID, "org-nope")).resolves.toBe(
      false,
    );
  });
});
