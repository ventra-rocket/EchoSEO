import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getRetentionWindowsMock,
  deleteDeepReportsMock,
  sweepStaleSiteScreenshotsMock,
  findExpiredLeadIdsMock,
  findAbandonedLeadIdsMock,
  findReportKeysForLeadsMock,
  deleteLeadsByIdsMock,
} = vi.hoisted(() => ({
  getRetentionWindowsMock: vi.fn(),
  deleteDeepReportsMock: vi.fn(),
  sweepStaleSiteScreenshotsMock: vi.fn(),
  findExpiredLeadIdsMock: vi.fn(),
  findAbandonedLeadIdsMock: vi.fn(),
  findReportKeysForLeadsMock: vi.fn(),
  deleteLeadsByIdsMock: vi.fn(),
}));

vi.mock("./deep-check-config", () => ({
  getRetentionWindows: getRetentionWindowsMock,
}));
vi.mock("./report-store", () => ({ deleteDeepReports: deleteDeepReportsMock }));
vi.mock("./site-screenshot-store", () => ({
  sweepStaleSiteScreenshots: sweepStaleSiteScreenshotsMock,
}));
vi.mock("./retention-repository", () => ({
  findExpiredLeadIds: findExpiredLeadIdsMock,
  findAbandonedLeadIds: findAbandonedLeadIdsMock,
  findReportKeysForLeads: findReportKeysForLeadsMock,
  deleteLeadsByIds: deleteLeadsByIdsMock,
}));

const { sweepFreeCheckRetention } = await import("./retention");

const NOW = new Date("2026-07-15T03:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  getRetentionWindowsMock.mockResolvedValue({
    reportRetentionDays: 30,
    unconfirmedGraceDays: 7,
  });
  findExpiredLeadIdsMock.mockResolvedValue([]);
  findAbandonedLeadIdsMock.mockResolvedValue([]);
  findReportKeysForLeadsMock.mockResolvedValue([]);
  deleteDeepReportsMock.mockResolvedValue([]);
  sweepStaleSiteScreenshotsMock.mockResolvedValue(0);
  deleteLeadsByIdsMock.mockImplementation(async (ids: string[]) => ids.length);
});

describe("sweepFreeCheckRetention", () => {
  it("gives each cutoff the format of the column it is compared against", async () => {
    await sweepFreeCheckRetention(NOW);

    // finished_at / updated_at come from SQLite's current_timestamp. These are
    // bytewise TEXT comparisons and ' ' sorts below 'T', so an ISO cutoff here
    // would read every row from its own date as older and delete it a day early.
    expect(findExpiredLeadIdsMock).toHaveBeenCalledWith(
      "2026-06-15 03:00:00", // 30 days back
      500,
    );
    // confirm_token_expires_at is written with toISOString(), so it stays ISO.
    expect(findAbandonedLeadIdsMock).toHaveBeenCalledWith(
      "2026-07-08T03:00:00.000Z", // 7 days back
      500,
    );
  });

  it("honours env-tuned windows", async () => {
    getRetentionWindowsMock.mockResolvedValue({
      reportRetentionDays: 90,
      unconfirmedGraceDays: 1,
    });

    await sweepFreeCheckRetention(NOW);

    expect(findExpiredLeadIdsMock.mock.calls[0]?.[0]).toBe(
      "2026-04-16 03:00:00",
    );
    expect(findAbandonedLeadIdsMock.mock.calls[0]?.[0]).toBe(
      "2026-07-14T03:00:00.000Z",
    );
  });

  it("touches no leads when there is nothing to sweep", async () => {
    const result = await sweepFreeCheckRetention(NOW);

    expect(deleteDeepReportsMock).not.toHaveBeenCalled();
    expect(deleteLeadsByIdsMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      expiredLeads: 0,
      abandonedLeads: 0,
      leadsDeleted: 0,
    });
  });

  // Captures are not tied to any lead, so a day with no leads to expire must
  // still reap stale captures — otherwise they would accumulate forever on a
  // quiet deployment. The cutoff is 7 days back from the sweep time.
  it("reaps stale captures even when no leads expire", async () => {
    await sweepFreeCheckRetention(NOW);

    expect(sweepStaleSiteScreenshotsMock).toHaveBeenCalledWith(
      new Date("2026-07-08T03:00:00.000Z"),
    );
  });

  // The capture sweep is best-effort: an R2 failure there must never abort the
  // run that deletes email addresses. This is the whole reason the two are not
  // in one throwing sequence.
  it("still deletes PII when the capture sweep throws", async () => {
    sweepStaleSiteScreenshotsMock.mockRejectedValue(new Error("r2 list down"));
    findExpiredLeadIdsMock.mockResolvedValue(["lead-1"]);

    const result = await sweepFreeCheckRetention(NOW);

    expect(result.leadsDeleted).toBe(1);
    expect(deleteLeadsByIdsMock).toHaveBeenCalledWith(["lead-1"]);
  });

  it("purges R2 payloads before deleting the rows that point at them", async () => {
    findExpiredLeadIdsMock.mockResolvedValue(["lead-1"]);
    findReportKeysForLeadsMock.mockResolvedValue(["deep-reports/r1.json"]);
    const order: string[] = [];
    deleteDeepReportsMock.mockImplementation(async () => {
      order.push("r2");
      return [];
    });
    deleteLeadsByIdsMock.mockImplementation(async () => {
      order.push("d1");
      return 1;
    });

    await sweepFreeCheckRetention(NOW);

    // The reverse order would strand the payload with no row referencing it.
    expect(order).toEqual(["r2", "d1"]);
  });

  it("deletes both expired and abandoned leads, counting each once", async () => {
    findExpiredLeadIdsMock.mockResolvedValue(["lead-1", "shared"]);
    findAbandonedLeadIdsMock.mockResolvedValue(["lead-2", "shared"]);

    const result = await sweepFreeCheckRetention(NOW);

    expect(deleteLeadsByIdsMock).toHaveBeenCalledWith([
      "lead-1",
      "shared",
      "lead-2",
    ]);
    expect(result).toEqual({
      expiredLeads: 2,
      abandonedLeads: 2,
      leadsDeleted: 3,
    });
  });

  it("still deletes the PII when the R2 purge fails", async () => {
    // An orphaned payload holds only the audited URL and is logged for cleanup;
    // keeping the rows would retain the email indefinitely, which is worse.
    findExpiredLeadIdsMock.mockResolvedValue(["lead-1"]);
    findReportKeysForLeadsMock.mockResolvedValue([
      "deep-reports/r1.json",
      "deep-reports/r1-screenshot",
    ]);
    // The store reports what it could not delete rather than throwing, so one
    // failed batch cannot hide the keys of the batches that did succeed.
    deleteDeepReportsMock.mockResolvedValue(["deep-reports/r1-screenshot"]);

    await expect(sweepFreeCheckRetention(NOW)).resolves.toMatchObject({
      leadsDeleted: 1,
    });
    expect(deleteLeadsByIdsMock).toHaveBeenCalledWith(["lead-1"]);
    // Only the key that actually leaked is named — the payload was purged.
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("deep-reports/r1-screenshot"),
    );
    expect(console.error).not.toHaveBeenCalledWith(
      expect.stringContaining("deep-reports/r1.json"),
    );
  });
});
