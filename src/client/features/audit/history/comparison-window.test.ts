import { describe, expect, it } from "vitest";
import { crawlDay, describeComparisonWindow } from "./comparison-window";

describe("describeComparisonWindow", () => {
  it("names only the days when the crawls fall on different days", () => {
    const labels = describeComparisonWindow({
      from: "2026-08-12 05:00:59",
      to: "2026-08-19 08:46:52",
    });
    expect(labels).toEqual({
      current: "2026-08-19",
      baseline: "2026-08-12",
    });
  });

  it("separates two crawls that ran on the same day", () => {
    // The reported defect: both 5,000-page crawls of kello ran on 2026-08-17,
    // so the label printed that date twice and named neither snapshot.
    const labels = describeComparisonWindow({
      from: "2026-08-17 06:37:18",
      to: "2026-08-17 07:51:22",
    });
    expect(labels).toEqual({
      current: "2026-08-17 07:51 UTC",
      baseline: "06:37 UTC",
    });
  });

  it("reads both timestamp shapes as the stored UTC clock", () => {
    // The source column is UTC. No Date parsing means a contributor's or
    // reader's timezone cannot move either crawl onto a different day.
    const sqliteShape = describeComparisonWindow({
      from: "2026-08-17 06:37:18",
      to: "2026-08-19 08:46:52",
    });
    const isoShape = describeComparisonWindow({
      from: "2026-08-17T06:37:18Z",
      to: "2026-08-19T08:46:52.000Z",
    });
    expect(isoShape).toEqual(sqliteShape);
  });

  it("falls back to the leading date when a timestamp cannot be parsed", () => {
    expect(
      describeComparisonWindow({ from: "not-a-date", to: "2026-08-19" }),
    ).toEqual({ current: "2026-08-19", baseline: "not-a-date" });
  });

  it("uses the same stored day as the other audit history labels", () => {
    expect(crawlDay("2026-08-19 18:30:00")).toBe("2026-08-19");
    expect(crawlDay("2026-08-19T18:30:00Z")).toBe("2026-08-19");
  });
});
