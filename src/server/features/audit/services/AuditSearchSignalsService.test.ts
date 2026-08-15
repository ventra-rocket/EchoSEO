/**
 * GSC signal composition, with the GSC client and audit repo mocked. What must
 * hold: the property↔target match gates every read (a mismatched property is
 * refused BEFORE any query), an expected grant failure degrades to a reconnect
 * state, totals come from the exact date dimension while drops come from the
 * capped page dimension, and a mid-flight property switch is caught.
 *
 * The coverage predicate itself (`propertyCoversOrigin`) and the pure diffs are
 * NOT mocked — the gate is only trustworthy if the real predicate runs here.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuditForProject = vi.fn();
const getConnection = vi.fn();
// Typed so `mock.calls` can be read without an unsafe cast; the service still
// typechecks getPerformance against the real GscService signature, not this one.
const getPerformance = vi.fn<
  (input: { dimensions: string[] }) => Promise<{
    siteUrl: string;
    rows: unknown[];
  }>
>();

vi.mock("@/server/features/audit/repositories/AuditRepository", () => ({
  AuditRepository: { getAuditForProject },
}));

vi.mock("@/server/features/gsc/services/GscService", () => ({
  GscService: { getConnection, getPerformance },
  GscNotConnectedError: class extends Error {},
  isExpectedGrantFailure: (error: unknown) =>
    error instanceof Error && error.message === "grant-failed",
}));

const { AuditSearchSignalsService } =
  await import("./AuditSearchSignalsService");

const INPUT = { projectId: "proj1", auditId: "audit1" };
const PROPERTY = "https://example.com/";

/** A GscService.getPerformance result: the property it read + its rows. */
function perf(rows: unknown[], siteUrl = PROPERTY) {
  return { siteUrl, connectedBy: null, request: {}, rows };
}

function pageRow(page: string, position: number, impressions: number) {
  return { keys: [page], clicks: 0, impressions, ctr: 0, position };
}

function dayRow(date: string, clicks: number, impressions: number) {
  return { keys: [date], clicks, impressions, ctr: 0, position: 0 };
}

/** Wire the four calls in Promise.all order: page(current), page(prev),
 *  daily(current), daily(prev). */
function mockFourWindows(input: {
  currentPages: unknown[];
  previousPages: unknown[];
  currentDaily: unknown[];
  previousDaily: unknown[];
  siteUrl?: string;
}) {
  getPerformance
    .mockResolvedValueOnce(perf(input.currentPages, input.siteUrl))
    .mockResolvedValueOnce(perf(input.previousPages, input.siteUrl))
    .mockResolvedValueOnce(perf(input.currentDaily, input.siteUrl))
    .mockResolvedValueOnce(perf(input.previousDaily, input.siteUrl));
}

beforeEach(() => {
  vi.clearAllMocks();
  getAuditForProject.mockResolvedValue({ startUrl: "https://example.com/" });
});

describe("AuditSearchSignalsService.getSignals", () => {
  it("throws when the audit is not in the caller's project", async () => {
    getAuditForProject.mockResolvedValue(undefined);
    await expect(AuditSearchSignalsService.getSignals(INPUT)).rejects.toThrow();
  });

  it("returns not_connected when the project has no GSC property", async () => {
    getConnection.mockResolvedValue(null);
    const result = await AuditSearchSignalsService.getSignals(INPUT);
    expect(result.state).toBe("not_connected");
    expect(getPerformance).not.toHaveBeenCalled();
  });

  it("REFUSES a connected property that does not cover the target — no GSC query issued", async () => {
    getConnection.mockResolvedValue({ siteUrl: "sc-domain:other-site.com" });
    const result = await AuditSearchSignalsService.getSignals(INPUT);
    expect(result.state).toBe("property_mismatch");
    // The isolation guarantee: a mismatched property never triggers a read.
    expect(getPerformance).not.toHaveBeenCalled();
  });

  it("degrades to not_connected on an expected grant failure", async () => {
    getConnection.mockResolvedValue({ siteUrl: "sc-domain:example.com" });
    getPerformance.mockRejectedValue(new Error("grant-failed"));
    const result = await AuditSearchSignalsService.getSignals(INPUT);
    expect(result.state).toBe("not_connected");
  });

  it("propagates a real fault (not an expected grant failure)", async () => {
    getConnection.mockResolvedValue({ siteUrl: "sc-domain:example.com" });
    getPerformance.mockRejectedValue(new Error("500 from GSC"));
    await expect(AuditSearchSignalsService.getSignals(INPUT)).rejects.toThrow();
  });

  it("reports no_data when GSC has no traffic in either window", async () => {
    getConnection.mockResolvedValue({ siteUrl: PROPERTY });
    mockFourWindows({
      currentPages: [],
      previousPages: [],
      currentDaily: [],
      previousDaily: [],
    });
    const result = await AuditSearchSignalsService.getSignals(INPUT);
    expect(result.state).toBe("no_data");
  });

  it("returns ready (not no_data) when only one window is empty", async () => {
    // Current has traffic, previous has none: real zeros, a genuine comparison.
    getConnection.mockResolvedValue({ siteUrl: PROPERTY });
    mockFourWindows({
      currentPages: [pageRow("https://example.com/a", 4, 100)],
      previousPages: [],
      currentDaily: [dayRow("2026-01-01", 10, 100)],
      previousDaily: [],
    });
    const result = await AuditSearchSignalsService.getSignals(INPUT);
    expect(result.state).toBe("ready");
    if (result.state !== "ready") throw new Error("unreachable");
    expect(result.traffic.prevClicks).toBe(0);
  });

  it("takes totals from the date dimension and drops from the page dimension", async () => {
    getConnection.mockResolvedValue({ siteUrl: PROPERTY });
    mockFourWindows({
      // Page rows drive the drop: /a slipped from 6 to 14.
      currentPages: [
        pageRow("https://example.com/a", 14, 40),
        pageRow("https://example.com/b", 3, 200),
      ],
      previousPages: [
        pageRow("https://example.com/a", 6, 80),
        pageRow("https://example.com/b", 3, 180),
      ],
      // Daily rows drive the exact totals: clicks 32 vs 36 → -4.
      currentDaily: [dayRow("2026-01-01", 32, 240)],
      previousDaily: [dayRow("2025-12-01", 36, 260)],
    });

    const result = await AuditSearchSignalsService.getSignals(INPUT);

    expect(result.state).toBe("ready");
    if (result.state !== "ready") throw new Error("unreachable");
    expect(result.source).toBe("GSC");
    expect(result.property).toBe(PROPERTY);
    expect(result.traffic.clicks).toBe(32);
    expect(result.traffic.prevClicks).toBe(36);
    expect(result.traffic.clicksDelta).toBe(-4);
    expect(result.droppedFromTop10.total).toBe(1);
    expect(result.droppedFromTop10.pages[0]).toMatchObject({
      url: "https://example.com/a",
      prevPosition: 6,
      position: 14,
      safeUrl: "https://example.com/a",
    });
  });

  it("queries the page and date dimensions for both windows", async () => {
    getConnection.mockResolvedValue({ siteUrl: PROPERTY });
    mockFourWindows({
      currentPages: [],
      previousPages: [],
      currentDaily: [dayRow("2026-01-01", 1, 1)],
      previousDaily: [],
    });
    await AuditSearchSignalsService.getSignals(INPUT);

    const dims = getPerformance.mock.calls.map((c) => c[0].dimensions[0]);
    expect(dims.filter((d) => d === "page")).toHaveLength(2);
    expect(dims.filter((d) => d === "date")).toHaveLength(2);
  });

  it("refuses when the connection's property changed under the read (TOCTOU)", async () => {
    // Gate vetted PROPERTY, but a query resolved a different property mid-flight.
    getConnection.mockResolvedValue({ siteUrl: PROPERTY });
    mockFourWindows({
      currentPages: [],
      previousPages: [],
      currentDaily: [dayRow("2026-01-01", 1, 1)],
      previousDaily: [],
      siteUrl: "https://switched.example/",
    });
    const result = await AuditSearchSignalsService.getSignals(INPUT);
    expect(result.state).toBe("property_mismatch");
  });
});
