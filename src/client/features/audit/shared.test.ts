import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildCrawlEta,
  parseAuditTimestamp,
} from "@/client/features/audit/shared";

describe("parseAuditTimestamp", () => {
  it("reads the D1 space-separated shape as UTC", () => {
    const parsed = parseAuditTimestamp("2026-07-28 10:00:00");
    expect(parsed.toISOString()).toBe("2026-07-28T10:00:00.000Z");
  });

  it("passes through an ISO string that already carries the Z designator", () => {
    const parsed = parseAuditTimestamp("2026-07-28T10:00:00.000Z");
    expect(parsed.toISOString()).toBe("2026-07-28T10:00:00.000Z");
  });

  it("passes through an ISO string with a numeric zone offset", () => {
    const parsed = parseAuditTimestamp("2026-07-28T17:00:00.000+07:00");
    expect(parsed.toISOString()).toBe("2026-07-28T10:00:00.000Z");
  });

  it("agrees on the instant across all three shapes of the same moment", () => {
    const d1Shape = parseAuditTimestamp("2026-07-28 10:00:00");
    const zulu = parseAuditTimestamp("2026-07-28T10:00:00.000Z");
    const offset = parseAuditTimestamp("2026-07-28T17:00:00.000+07:00");

    expect(d1Shape.getTime()).toBe(zulu.getTime());
    expect(zulu.getTime()).toBe(offset.getTime());
  });
});

describe("buildCrawlEta", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a minutes result once the projected remaining time is at least a minute", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-28T10:10:00.000Z"));
    const eta = buildCrawlEta({
      pagesCrawled: 50,
      pagesTotal: 200,
      currentPhase: "crawling",
      startedAt: "2026-07-28 10:00:00",
    });
    // 10 min elapsed for 50 pages -> 12s/page * 150 remaining = 1800s = 30 min.
    expect(eta).toEqual({ kind: "eta", minutes: 30 });
  });

  it("returns a seconds result, floored at 5, once the projection drops under a minute", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-28T10:01:40.000Z"));
    const eta = buildCrawlEta({
      pagesCrawled: 100,
      pagesTotal: 120,
      currentPhase: "crawling",
      startedAt: "2026-07-28 10:00:00",
    });
    // 100s elapsed for 100 pages -> 1s/page * 20 remaining = 20s.
    expect(eta).toEqual({ kind: "eta_seconds", seconds: 20 });
  });

  it("is estimating during discovery, regardless of the page counters", () => {
    const eta = buildCrawlEta({
      pagesCrawled: 0,
      pagesTotal: 5000,
      currentPhase: "discovery",
      startedAt: "2026-07-28 10:00:00",
    });
    expect(eta).toEqual({ kind: "estimating" });
  });

  it("is estimating while crawling has not landed a page yet", () => {
    const eta = buildCrawlEta({
      pagesCrawled: 0,
      pagesTotal: 100,
      currentPhase: "crawling",
      startedAt: "2026-07-28 10:00:00",
    });
    expect(eta).toEqual({ kind: "estimating" });
  });

  it("is null once the crawl phase has nothing left to project", () => {
    const doneCrawling = buildCrawlEta({
      pagesCrawled: 100,
      pagesTotal: 100,
      currentPhase: "crawling",
      startedAt: "2026-07-28 10:00:00",
    });
    const otherPhase = buildCrawlEta({
      pagesCrawled: 20,
      pagesTotal: 20,
      currentPhase: "lighthouse",
      startedAt: "2026-07-28 10:00:00",
    });
    expect(doneCrawling).toBeNull();
    expect(otherPhase).toBeNull();
  });
});
