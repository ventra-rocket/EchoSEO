/**
 * Report subscription + send-ledger access against a real SQLite database, so
 * the unique indexes that carry the deduplication guarantees are exercised the
 * way D1 runs them rather than mocked away.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFreeCheckTestDb,
  type FreeCheckTestDb,
} from "@/server/services/seo-check/__tests__/free-check-test-db";
import { organization } from "@/db/better-auth-schema";
import { projects } from "@/db/app.schema";
import { auditTargets } from "@/db/audit.schema";

const { testDb } = vi.hoisted(() => ({
  testDb: { current: null } as { current: unknown },
}));

vi.mock("@/db", () => ({
  get db() {
    return testDb.current;
  },
}));

// Deliberately dynamic (matching AuditTargetRepository.test.ts): a static import
// is hoisted above `vi.mock`, so the module under test would capture the real
// `@/db` — which touches `cloudflare:workers` and cannot load under node.
const { ReportSendRepository, ReportSubscriptionRepository } =
  await import("./ReportSubscriptionRepository");

const baseInput = {
  targetId: "target1",
  projectId: "proj1",
  organizationId: "org1",
  recipientEmail: "owner@example.com",
  locale: "en" as const,
  ownerUserId: "user1",
  ownerEmail: "owner@example.com",
};

describe("ReportSubscriptionRepository", () => {
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
    await harness.db.insert(auditTargets).values({
      id: "target1",
      projectId: "proj1",
      organizationId: "org1",
      origin: "https://example.com",
    });
  });

  it("creates a subscription with delivery defaults", async () => {
    const created = await ReportSubscriptionRepository.upsert(baseInput);

    expect(created.cadence).toBe("weekly");
    expect(created.enabled).toBe(true);
    expect(created.locale).toBe("en");
    // Stays at or below AUDIT_VERIFICATION_PAGE_THRESHOLD so a scheduled crawl
    // is never blocked by the hosted-mode domain verification rule.
    expect(created.maxPages).toBe(100);
    expect(created.unsubscribeToken).toBeTruthy();
    expect(created.lastSentAt).toBeNull();
  });

  it("keeps the existing unsubscribe token when a subscription is updated", async () => {
    const created = await ReportSubscriptionRepository.upsert(baseInput);

    const updated = await ReportSubscriptionRepository.upsert({
      ...baseInput,
      recipientEmail: "client@example.com",
      locale: "vi",
      maxPages: 40,
    });

    // Links already sitting in a delivered email must keep resolving.
    expect(updated.unsubscribeToken).toBe(created.unsubscribeToken);
    expect(updated.id).toBe(created.id);
    expect(updated.recipientEmail).toBe("client@example.com");
    expect(updated.locale).toBe("vi");
    expect(updated.maxPages).toBe(40);
  });

  it("leaves maxPages alone when an update does not mention it", async () => {
    await ReportSubscriptionRepository.upsert({ ...baseInput, maxPages: 25 });

    const updated = await ReportSubscriptionRepository.upsert(baseInput);

    expect(updated.maxPages).toBe(25);
  });

  it("resolves an already-unsubscribed token instead of failing", async () => {
    const created = await ReportSubscriptionRepository.upsert(baseInput);

    const first = await ReportSubscriptionRepository.markUnsubscribed(
      created.unsubscribeToken,
    );
    const second = await ReportSubscriptionRepository.markUnsubscribed(
      created.unsubscribeToken,
    );

    expect(first?.enabled).toBe(false);
    expect(first?.unsubscribedAt).toBeTruthy();
    expect(second?.id).toBe(created.id);
    // A retried one-click POST must not rewrite when consent was withdrawn.
    expect(second?.unsubscribedAt).toBe(first?.unsubscribedAt);
  });

  it("returns null for an unknown unsubscribe token", async () => {
    expect(await ReportSubscriptionRepository.markUnsubscribed("nope")).toBe(
      null,
    );
    expect(
      await ReportSubscriptionRepository.getByUnsubscribeToken("nope"),
    ).toBe(null);
  });

  it("re-arms delivery when the owner saves the subscription again", async () => {
    const created = await ReportSubscriptionRepository.upsert(baseInput);
    await ReportSubscriptionRepository.markUnsubscribed(
      created.unsubscribeToken,
    );

    const resubscribed = await ReportSubscriptionRepository.upsert(baseInput);

    expect(resubscribed.enabled).toBe(true);
    expect(resubscribed.unsubscribedAt).toBeNull();
  });

  it("toggles delivery without touching the opt-out record", async () => {
    await ReportSubscriptionRepository.upsert(baseInput);

    const paused = await ReportSubscriptionRepository.setEnabled(
      "target1",
      false,
    );

    expect(paused?.enabled).toBe(false);
    expect(paused?.unsubscribedAt).toBeNull();
    expect(await ReportSubscriptionRepository.setEnabled("missing", true)).toBe(
      null,
    );
  });
});

describe("ReportSendRepository", () => {
  let harness: FreeCheckTestDb;
  let subscriptionId: string;

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
    await harness.db.insert(auditTargets).values({
      id: "target1",
      projectId: "proj1",
      organizationId: "org1",
      origin: "https://example.com",
    });
    const subscription = await ReportSubscriptionRepository.upsert(baseInput);
    subscriptionId = subscription.id;
  });

  it("lets only the first run claim a period", async () => {
    const first = await ReportSendRepository.tryClaim({
      subscriptionId,
      kind: "weekly",
      periodKey: "2026-W33",
    });
    const second = await ReportSendRepository.tryClaim({
      subscriptionId,
      kind: "weekly",
      periodKey: "2026-W33",
    });

    expect(first?.periodKey).toBe("2026-W33");
    expect(first?.sentAt).toBeNull();
    // The losing run must back off entirely, not send a second copy.
    expect(second).toBe(null);
  });

  it("keeps claims of different kinds and periods independent", async () => {
    await ReportSendRepository.tryClaim({
      subscriptionId,
      kind: "weekly",
      periodKey: "2026-W33",
    });

    const nextWeek = await ReportSendRepository.tryClaim({
      subscriptionId,
      kind: "weekly",
      periodKey: "2026-W34",
    });
    const alert = await ReportSendRepository.tryClaim({
      subscriptionId,
      kind: "alert",
      periodKey: "2026-W33",
    });

    expect(nextWeek).not.toBe(null);
    expect(alert).not.toBe(null);
  });

  it("reopens a period after the claim is released", async () => {
    const claim = await ReportSendRepository.tryClaim({
      subscriptionId,
      kind: "weekly",
      periodKey: "2026-W33",
    });
    expect(claim).not.toBe(null);

    await ReportSendRepository.release(claim!.id);

    expect(await ReportSendRepository.getById(claim!.id)).toBe(null);
    const retry = await ReportSendRepository.tryClaim({
      subscriptionId,
      kind: "weekly",
      periodKey: "2026-W33",
    });
    expect(retry).not.toBe(null);
  });

  it("records the audit and the delivery on a claim", async () => {
    const claim = await ReportSendRepository.tryClaim({
      subscriptionId,
      kind: "weekly",
      periodKey: "2026-W33",
    });
    const sentAt = new Date().toISOString();

    await ReportSendRepository.attachAudit(claim!.id, "audit1");
    await ReportSendRepository.markSent(claim!.id, sentAt);

    const stored = await ReportSendRepository.getById(claim!.id);
    expect(stored?.auditId).toBe("audit1");
    expect(stored?.sentAt).toBe(sentAt);
  });

  it("counts only delivered alerts inside the window", async () => {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const delivered = await ReportSendRepository.tryClaim({
      subscriptionId,
      kind: "alert",
      periodKey: "audit1",
    });
    await ReportSendRepository.markSent(
      delivered!.id,
      new Date().toISOString(),
    );
    const stale = await ReportSendRepository.tryClaim({
      subscriptionId,
      kind: "alert",
      periodKey: "audit0",
    });
    await ReportSendRepository.markSent(
      stale!.id,
      new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    );
    // An outstanding claim is work in flight, not a delivered alert.
    await ReportSendRepository.tryClaim({
      subscriptionId,
      kind: "alert",
      periodKey: "audit2",
    });

    expect(
      await ReportSendRepository.countSentSince(
        subscriptionId,
        "alert",
        dayAgo,
      ),
    ).toBe(1);
    expect(
      await ReportSendRepository.countSentSince(
        subscriptionId,
        "weekly",
        dayAgo,
      ),
    ).toBe(0);
  });
});
