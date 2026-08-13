import type { ReportPeriod } from "@/server/features/reports/report-types";

/**
 * Pure window arithmetic for the periodic report. No clock and no I/O: the
 * caller passes `now`, so a Durable Object alarm, a manual re-send and a test
 * all agree on the window they are describing.
 */

/** Search Console finalizes a day 2–3 days late. Ending the window at T-4
 *  guarantees every day in it is settled — a T-1 window would read the tail as
 *  zero and report a traffic collapse that never happened. */
export const GSC_SETTLED_LAG_DAYS = 4;
export const WEEKLY_WINDOW_DAYS = 7;

const MS_PER_DAY = 86_400_000;

export function buildWeeklyPeriod(now: Date): ReportPeriod {
  // Collapse to the UTC calendar day first. Everything downstream is a whole
  // number of days, so keeping the time-of-day would make two runs of the same
  // occurrence (01:00 alarm, 09:00 retry) disagree on nothing but noise.
  const endMs = startOfUtcDay(now) - GSC_SETTLED_LAG_DAYS * MS_PER_DAY;
  // Both bounds are inclusive, so a 7-day window spans 6 steps, not 7.
  const startMs = endMs - (WEEKLY_WINDOW_DAYS - 1) * MS_PER_DAY;
  // The comparison window ends the day before this one starts: adjacent, never
  // overlapping, and carrying the identical settle lag so the delta is fair.
  const prevEndMs = startMs - MS_PER_DAY;
  const prevStartMs = prevEndMs - (WEEKLY_WINDOW_DAYS - 1) * MS_PER_DAY;

  return {
    startDate: formatUtcDate(startMs),
    endDate: formatUtcDate(endMs),
    prevStartDate: formatUtcDate(prevStartMs),
    prevEndDate: formatUtcDate(prevEndMs),
    // Keyed off `endDate`, never off `now`: the key is the dedupe token for
    // sends, so every run that produces this window — the scheduled one and any
    // later retry — has to land on the same string or the customer gets the
    // same report twice.
    key: isoWeekKey(new Date(endMs)),
  };
}

/** ISO-8601 week identity, e.g. "2026-W33". Weeks start Monday. */
export function isoWeekKey(date: Date): string {
  // ISO-8601 assigns a week to the year containing its Thursday, so a week can
  // belong to a year none of its own days fall in (2027-01-01 is 2026-W53).
  // Shifting to that week's Thursday resolves the year and the week number in
  // one move, which is why the ordinal below is counted from Jan 1 of the
  // *Thursday's* year rather than of the input's year.
  // ISO numbers Monday 1 … Sunday 7; JS numbers Sunday 0.
  const jsWeekday = date.getUTCDay();
  const weekday = jsWeekday === 0 ? 7 : jsWeekday;
  const thursdayMs = startOfUtcDay(date) + (4 - weekday) * MS_PER_DAY;
  const thursday = new Date(thursdayMs);
  const isoYear = thursday.getUTCFullYear();
  const firstOfIsoYearMs = Date.UTC(isoYear, 0, 1);
  const week = Math.floor((thursdayMs - firstOfIsoYearMs) / MS_PER_DAY / 7) + 1;
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function formatUtcDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
