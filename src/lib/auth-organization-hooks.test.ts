/**
 * The last-owner guards run against a real SQLite database: removing or demoting
 * the sole owner must be blocked, while the same action on a non-last owner (or a
 * non-owner) must be allowed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFreeCheckTestDb,
  type FreeCheckTestDb,
} from "@/server/services/seo-check/__tests__/free-check-test-db";
import { member, organization, user } from "@/db/better-auth-schema";

const { testDb, checkInviteThrottleMock } = vi.hoisted(() => ({
  testDb: { current: null } as { current: unknown },
  checkInviteThrottleMock:
    vi.fn<
      (input: {
        organizationId: string;
        emailNormalized: string;
      }) => Promise<{ allowed: boolean }>
    >(),
}));
vi.mock("@/db", () => ({
  get db() {
    return testDb.current;
  },
}));
// invite-throttle statically imports `cloudflare:workers` (the DO binding); mock
// it so loading the module under test resolves in the node test env, and so the
// throttle decision is driven directly. runtime-env is left real and steered via
// process.env.AUTH_MODE below.
vi.mock("@/server/auth/invite-throttle", () => ({
  checkInviteThrottle: checkInviteThrottleMock,
}));

const {
  assertNotLastOwnerRemoval,
  assertNotLastOwnerDemotion,
  assertInviteWithinThrottle,
} = await import("./auth-organization-hooks");

const ORG = "org1";
let harness: FreeCheckTestDb;

async function seedMember(id: string, role: string) {
  await harness.db.insert(user).values({
    id,
    name: id,
    email: `${id}@example.com`,
    updatedAt: new Date(),
  });
  await harness.db.insert(member).values({
    id: `m-${id}`,
    organizationId: ORG,
    userId: id,
    role,
    createdAt: new Date(),
  });
}

describe("last-owner guards", () => {
  beforeEach(async () => {
    harness = await createFreeCheckTestDb();
    testDb.current = harness.db;
    await harness.db
      .insert(organization)
      .values({ id: ORG, name: "Org", slug: "org-1", createdAt: new Date() });
  });

  describe("assertNotLastOwnerRemoval", () => {
    it("blocks removing the only owner", async () => {
      await seedMember("owner1", "owner");
      await expect(
        assertNotLastOwnerRemoval({ role: "owner", organizationId: ORG }),
      ).rejects.toThrow(/last owner/);
    });

    it("allows removing an owner when another owner remains", async () => {
      await seedMember("owner1", "owner");
      await seedMember("owner2", "owner");
      await expect(
        assertNotLastOwnerRemoval({ role: "owner", organizationId: ORG }),
      ).resolves.toBeUndefined();
    });

    it("allows removing a non-owner", async () => {
      await seedMember("owner1", "owner");
      await seedMember("editor1", "editor");
      await expect(
        assertNotLastOwnerRemoval({ role: "editor", organizationId: ORG }),
      ).resolves.toBeUndefined();
    });
  });

  describe("assertNotLastOwnerDemotion", () => {
    it("blocks demoting the only owner", async () => {
      await seedMember("owner1", "owner");
      await expect(
        assertNotLastOwnerDemotion({
          role: "owner",
          newRole: "editor",
          organizationId: ORG,
        }),
      ).rejects.toThrow(/last owner/);
    });

    it("allows demoting an owner when another owner remains", async () => {
      await seedMember("owner1", "owner");
      await seedMember("owner2", "owner");
      await expect(
        assertNotLastOwnerDemotion({
          role: "owner",
          newRole: "admin",
          organizationId: ORG,
        }),
      ).resolves.toBeUndefined();
    });

    it("allows a no-op owner→owner and any non-owner change", async () => {
      await seedMember("owner1", "owner");
      await expect(
        assertNotLastOwnerDemotion({
          role: "owner",
          newRole: "owner",
          organizationId: ORG,
        }),
      ).resolves.toBeUndefined();
      await expect(
        assertNotLastOwnerDemotion({
          role: "admin",
          newRole: "viewer",
          organizationId: ORG,
        }),
      ).resolves.toBeUndefined();
    });
  });
});

describe("assertInviteWithinThrottle", () => {
  const INVITE = { organizationId: "org1", email: "  New.Person@Example.com " };

  beforeEach(() => {
    checkInviteThrottleMock.mockResolvedValue({ allowed: true });
  });

  afterEach(() => {
    delete process.env.AUTH_MODE;
  });

  it("throws TOO_MANY_REQUESTS when the throttle blocks (hosted)", async () => {
    process.env.AUTH_MODE = "hosted";
    checkInviteThrottleMock.mockResolvedValue({ allowed: false });
    await expect(assertInviteWithinThrottle(INVITE)).rejects.toThrow(
      /too many invitations/i,
    );
  });

  it("resolves under the cap and passes a normalized email (hosted)", async () => {
    process.env.AUTH_MODE = "hosted";
    await expect(assertInviteWithinThrottle(INVITE)).resolves.toBeUndefined();
    expect(checkInviteThrottleMock).toHaveBeenCalledWith({
      organizationId: "org1",
      emailNormalized: "new.person@example.com",
    });
  });

  it("skips the throttle entirely outside hosted mode", async () => {
    process.env.AUTH_MODE = "cloudflare_access";
    await expect(assertInviteWithinThrottle(INVITE)).resolves.toBeUndefined();
    expect(checkInviteThrottleMock).not.toHaveBeenCalled();
  });
});
