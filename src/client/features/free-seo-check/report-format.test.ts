import { describe, expect, it } from "vitest";
import { formatScanDate, pagePathOnly } from "./report-format";

describe("formatScanDate", () => {
  it("formats an ISO instant as a short date in each locale", () => {
    const iso = "2026-07-19T17:34:07.569Z";
    expect(formatScanDate(iso, "en")).toBe("Jul 19, 2026");
    // Vietnamese short-month form; the exact rendering comes from Intl, so pin
    // the parts that matter: day, year, and that it differs from English.
    const vi = formatScanDate(iso, "vi");
    expect(vi).toContain("19");
    expect(vi).toContain("2026");
    expect(vi).not.toBe(formatScanDate(iso, "en"));
  });

  it("uses the UTC date, not the runtime zone's", () => {
    // 23:30 UTC is already "the 20th" east of UTC+1 — the label must not
    // depend on where the report happens to be opened.
    expect(formatScanDate("2026-07-19T23:30:00.000Z", "en")).toBe(
      "Jul 19, 2026",
    );
  });

  it("falls back to the raw string when unparseable", () => {
    expect(formatScanDate("not-a-date", "en")).toBe("not-a-date");
  });
});

describe("pagePathOnly", () => {
  it("drops the shared host and keeps the varying path", () => {
    expect(pagePathOnly("https://kello.ventrarocket.vn/en/pricing")).toBe(
      "/en/pricing",
    );
  });

  it("keeps the query string — it distinguishes real pages", () => {
    expect(pagePathOnly("https://a.example/list?page=2")).toBe("/list?page=2");
  });

  it("renders a bare origin as the root path", () => {
    expect(pagePathOnly("https://a.example")).toBe("/");
  });

  it("returns a malformed URL unchanged", () => {
    expect(pagePathOnly("not a url")).toBe("not a url");
  });
});
