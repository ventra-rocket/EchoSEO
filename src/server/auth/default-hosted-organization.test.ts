/**
 * resolveInitialActiveOrganization restores the workspace a returning user last
 * worked in — read from their most recent still-valid prior session — but only
 * while they are still a member of it; otherwise it falls back to their own
 * default workspace. Runs against a real SQLite database.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFreeCheckTestDb,
  type FreeCheckTestDb,
} from "@/server/services/seo-check/__tests__/free-check-test-db";
import { member, organization, session, user } from "@/db/better-auth-schema";

const { testDb } = vi.hoisted(() => ({
  testDb: { current: null } as { current: unknown },
}));
vi.mock("@/db", () => ({
  get db() {
    return testDb.current;
  },
}));

const { resolveInitialActiveOrganization } =
  await import("./default-hosted-organization");

const USER = "user1";
const OWN_ORG = "own-org";
const SHARED_ORG = "shared-org";
// The fallback path never needs to create an org in these tests — the user
// always already has their own membership — so this throws if it is reached.
const failCreate = () => {
  throw new Error("createOrganization should not be called");
};

let harness: FreeCheckTestDb;

async function seedOrg(id: string) {
  await harness.db
    .insert(organization)
    .values({ id, name: id, slug: id, createdAt: new Date() });
}

async function seedMembership(organizationId: string, createdAt = new Date()) {
  await harness.db.insert(member).values({
    id: `m-${organizationId}`,
    organizationId,
    userId: USER,
    role: "owner",
    createdAt,
  });
}

let sessionCounter = 0;
async function seedSession(opts: {
  activeOrganizationId: string;
  expiresAt: Date;
  updatedAt?: Date;
  userId?: string;
}) {
  const n = sessionCounter++;
  await harness.db.insert(session).values({
    id: `s-${n}`,
    token: `t-${n}`,
    userId: opts.userId ?? USER,
    activeOrganizationId: opts.activeOrganizationId,
    expiresAt: opts.expiresAt,
    updatedAt: opts.updatedAt ?? new Date(),
  });
}

const future = () => new Date(Date.now() + 60_000);
const past = () => new Date(Date.now() - 60_000);

describe("resolveInitialActiveOrganization", () => {
  beforeEach(async () => {
    harness = await createFreeCheckTestDb();
    testDb.current = harness.db;
    await harness.db.insert(user).values({
      id: USER,
      name: USER,
      email: `${USER}@example.com`,
      updatedAt: new Date(),
    });
    await seedOrg(OWN_ORG);
    await seedMembership(OWN_ORG, new Date(1000));
  });

  it("restores the last active workspace when the user is still a member", async () => {
    await seedOrg(SHARED_ORG);
    await seedMembership(SHARED_ORG);
    await seedSession({
      activeOrganizationId: SHARED_ORG,
      expiresAt: future(),
    });

    await expect(
      resolveInitialActiveOrganization(USER, failCreate),
    ).resolves.toBe(SHARED_ORG);
  });

  it("falls back to the default workspace when membership was lost", async () => {
    // Prior session names SHARED_ORG, but the user is not a member of it.
    await seedSession({
      activeOrganizationId: SHARED_ORG,
      expiresAt: future(),
    });

    await expect(
      resolveInitialActiveOrganization(USER, failCreate),
    ).resolves.toBe(OWN_ORG);
  });

  it("falls back to the default workspace when there is no prior session", async () => {
    await expect(
      resolveInitialActiveOrganization(USER, failCreate),
    ).resolves.toBe(OWN_ORG);
  });

  it("ignores an expired prior session", async () => {
    await seedOrg(SHARED_ORG);
    await seedMembership(SHARED_ORG);
    await seedSession({ activeOrganizationId: SHARED_ORG, expiresAt: past() });

    await expect(
      resolveInitialActiveOrganization(USER, failCreate),
    ).resolves.toBe(OWN_ORG);
  });

  it("ignores another user's session (pins the userId predicate)", async () => {
    // The user is a member of SHARED_ORG but has no session of their own; a
    // different user's session names SHARED_ORG. Restoring it would be a
    // cross-user leak, so the user must still get their own default workspace.
    await seedOrg(SHARED_ORG);
    await seedMembership(SHARED_ORG, new Date(2000));
    await harness.db.insert(user).values({
      id: "user2",
      name: "user2",
      email: "user2@example.com",
      updatedAt: new Date(),
    });
    await seedSession({
      activeOrganizationId: SHARED_ORG,
      expiresAt: future(),
      userId: "user2",
    });

    await expect(
      resolveInitialActiveOrganization(USER, failCreate),
    ).resolves.toBe(OWN_ORG);
  });

  it("restores the most recently updated session (pins updatedAt ordering)", async () => {
    await seedOrg(SHARED_ORG);
    await seedMembership(SHARED_ORG, new Date(2000));
    // Insert the older own-org session first so scan order differs from recency.
    await seedSession({
      activeOrganizationId: OWN_ORG,
      expiresAt: future(),
      updatedAt: new Date(1000),
    });
    await seedSession({
      activeOrganizationId: SHARED_ORG,
      expiresAt: future(),
      updatedAt: new Date(2000),
    });

    await expect(
      resolveInitialActiveOrganization(USER, failCreate),
    ).resolves.toBe(SHARED_ORG);
  });
});
