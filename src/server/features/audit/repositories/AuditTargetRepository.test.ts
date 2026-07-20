/**
 * Audit target get-or-create against a real SQLite database so the unique
 * (project, origin) convergence is exercised the way D1 runs it.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFreeCheckTestDb,
  type FreeCheckTestDb,
} from "@/server/services/seo-check/__tests__/free-check-test-db";
import { organization } from "@/db/better-auth-schema";
import { projects } from "@/db/app.schema";

const { testDb } = vi.hoisted(() => ({
  testDb: { current: null } as { current: unknown },
}));

vi.mock("@/db", () => ({
  get db() {
    return testDb.current;
  },
}));

const { AuditTargetRepository } = await import("./AuditTargetRepository");

describe("AuditTargetRepository.getOrCreateTarget", () => {
  let harness: FreeCheckTestDb;

  beforeEach(async () => {
    harness = await createFreeCheckTestDb();
    testDb.current = harness.db;
    await harness.db.insert(organization).values({
      id: "org1",
      name: "Org",
      slug: "org-1",
      createdAt: new Date(),
    });
    await harness.db.insert(projects).values({
      id: "proj1",
      organizationId: "org1",
      name: "Project",
    });
  });

  it("creates a target on first use with sane defaults", async () => {
    const target = await AuditTargetRepository.getOrCreateTarget({
      projectId: "proj1",
      organizationId: "org1",
      origin: "https://example.com",
    });

    expect(target.origin).toBe("https://example.com");
    expect(target.projectId).toBe("proj1");
    expect(target.organizationId).toBe("org1");
    expect(target.maxPagesLimit).toBe(10_000);
    expect(target.retentionDays).toBe(90);
    expect(target.allowedHostsJson).toBe("[]");
  });

  it("returns the same target for the same (project, origin)", async () => {
    const first = await AuditTargetRepository.getOrCreateTarget({
      projectId: "proj1",
      organizationId: "org1",
      origin: "https://example.com",
    });
    const second = await AuditTargetRepository.getOrCreateTarget({
      projectId: "proj1",
      organizationId: "org1",
      origin: "https://example.com",
    });

    expect(second.id).toBe(first.id);
  });

  it("keeps distinct origins as distinct targets", async () => {
    const a = await AuditTargetRepository.getOrCreateTarget({
      projectId: "proj1",
      organizationId: "org1",
      origin: "https://example.com",
    });
    const b = await AuditTargetRepository.getOrCreateTarget({
      projectId: "proj1",
      organizationId: "org1",
      origin: "https://shop.example.com",
    });

    expect(b.id).not.toBe(a.id);
  });
});
