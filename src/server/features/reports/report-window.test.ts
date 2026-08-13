import { describe, expect, it } from "vitest";
import {
  buildWeeklyPeriod,
  GSC_SETTLED_LAG_DAYS,
  isoWeekKey,
  WEEKLY_WINDOW_DAYS,
} from "@/server/features/reports/report-window";

const MS_PER_DAY = 86_400_000;

function dayCount(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  // Both bounds inclusive, the way the report describes its windows.
  return (end - start) / MS_PER_DAY + 1;
}

describe("buildWeeklyPeriod", () => {
  it("ends the window at the last settled day", () => {
    const period = buildWeeklyPeriod(new Date("2026-08-17T09:00:00Z"));
    expect(period.endDate).toBe("2026-08-13");
    expect(dayCount(period.endDate, "2026-08-17")).toBe(
      GSC_SETTLED_LAG_DAYS + 1,
    );
  });

  it("produces two adjacent, equal-length, non-overlapping windows", () => {
    const period = buildWeeklyPeriod(new Date("2026-08-17T09:00:00Z"));
    expect(period).toEqual({
      startDate: "2026-08-07",
      endDate: "2026-08-13",
      prevStartDate: "2026-07-31",
      prevEndDate: "2026-08-06",
      key: "2026-W33",
    });
    expect(dayCount(period.startDate, period.endDate)).toBe(WEEKLY_WINDOW_DAYS);
    expect(dayCount(period.prevStartDate, period.prevEndDate)).toBe(
      WEEKLY_WINDOW_DAYS,
    );
    // Adjacent, not overlapping: the comparison window ends the day before.
    expect(dayCount(period.prevEndDate, period.startDate)).toBe(2);
  });

  it("is identical for any time of day within the same UTC day", () => {
    // Two runs of the same occurrence (the 01:00 alarm and a later retry) must
    // agree on the key, or the customer receives the report twice.
    const early = buildWeeklyPeriod(new Date("2026-08-17T00:00:00Z"));
    const late = buildWeeklyPeriod(new Date("2026-08-17T23:59:59.999Z"));
    expect(late).toEqual(early);
  });

  it("keys off the window end, not the clock", () => {
    // 2026-08-17 sits in 2026-W34, but the window it reports on ends in W33.
    const period = buildWeeklyPeriod(new Date("2026-08-17T09:00:00Z"));
    expect(isoWeekKey(new Date("2026-08-17T00:00:00Z"))).toBe("2026-W34");
    expect(period.key).toBe("2026-W33");
    expect(period.key).toBe(
      isoWeekKey(new Date(`${period.endDate}T00:00:00Z`)),
    );
  });

  it("crosses a year boundary without splitting the window", () => {
    const period = buildWeeklyPeriod(new Date("2027-01-04T01:00:00Z"));
    expect(period).toEqual({
      startDate: "2026-12-25",
      endDate: "2026-12-31",
      prevStartDate: "2026-12-18",
      prevEndDate: "2026-12-24",
      key: "2026-W53",
    });
  });
});

describe("isoWeekKey", () => {
  it("assigns a January day to the previous ISO year when its week ends there", () => {
    // ISO-8601: the week belongs to the year containing its Thursday, so these
    // days carry a year none of them fall in.
    expect(isoWeekKey(new Date("2027-01-01T00:00:00Z"))).toBe("2026-W53");
    expect(isoWeekKey(new Date("2021-01-01T00:00:00Z"))).toBe("2020-W53");
    expect(isoWeekKey(new Date("2016-01-03T00:00:00Z"))).toBe("2015-W53");
  });

  it("numbers a 53-week year through its final week", () => {
    expect(isoWeekKey(new Date("2020-12-31T00:00:00Z"))).toBe("2020-W53");
    expect(isoWeekKey(new Date("2015-12-28T00:00:00Z"))).toBe("2015-W53");
  });

  it("starts week 01 on the week holding the first Thursday", () => {
    // 2026-01-01 is a Thursday, so its whole week (Mon 2025-12-29 onward) is W01.
    expect(isoWeekKey(new Date("2025-12-29T00:00:00Z"))).toBe("2026-W01");
    expect(isoWeekKey(new Date("2026-01-01T00:00:00Z"))).toBe("2026-W01");
    expect(isoWeekKey(new Date("2026-01-04T00:00:00Z"))).toBe("2026-W01");
    // Monday of the next week rolls over.
    expect(isoWeekKey(new Date("2026-01-05T00:00:00Z"))).toBe("2026-W02");
  });

  it("gives every day of one Monday-to-Sunday week the same key", () => {
    const keys = new Set<string>();
    const monday = Date.parse("2026-08-10T00:00:00Z");
    for (let offset = 0; offset < WEEKLY_WINDOW_DAYS; offset += 1) {
      keys.add(isoWeekKey(new Date(monday + offset * MS_PER_DAY)));
    }
    expect([...keys]).toEqual(["2026-W33"]);
    // Sunday closes the week; the next Monday must move on.
    expect(isoWeekKey(new Date("2026-08-17T00:00:00Z"))).toBe("2026-W34");
  });

  it("pads single-digit week numbers to two digits", () => {
    expect(isoWeekKey(new Date("2026-03-02T00:00:00Z"))).toBe("2026-W10");
    expect(isoWeekKey(new Date("2026-02-23T00:00:00Z"))).toBe("2026-W09");
  });

  it("ignores local time by reading the date in UTC", () => {
    // A late-evening timestamp in a west-of-UTC zone is already the next UTC day.
    expect(isoWeekKey(new Date("2026-08-16T23:00:00Z"))).toBe("2026-W33");
    expect(isoWeekKey(new Date("2026-08-17T01:00:00Z"))).toBe("2026-W34");
  });
});
