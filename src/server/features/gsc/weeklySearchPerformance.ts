import type { GscDimension } from "@/server/features/gsc/searchAnalytics";
import {
  sumSearchTotals,
  toDimensionRows,
} from "@/server/features/gsc/searchPerformanceReport";
import {
  GscNotConnectedError,
  GscService,
  isExpectedGrantFailure,
} from "@/server/features/gsc/services/GscService";
import {
  GscApiError,
  type GscSearchAnalyticsRow,
} from "@/server/lib/gscClient";
import type {
  ReportPeriod,
  WeeklySearchSignals,
} from "@/server/features/reports/report-types";

/**
 * Collects the Search Console half of the weekly report.
 *
 * This runs unattended inside a Durable Object alarm, so every failure has to
 * be classified rather than thrown at a user who could retry: the email either
 * carries numbers, or it carries an honest reason there are none.
 */

/** Enough to fill an email table without turning the report into a data dump. */
const TOP_ROW_LIMIT = 10;
/** Provider error text is not ours; cap it before it reaches a log line. */
const MAX_ERROR_MESSAGE_LENGTH = 200;

/** The slice of a GSC performance response this report reads. Declared here
 *  rather than borrowed from the service so the six calls below share one
 *  narrow shape and the injected test double only has to supply what is used. */
type PerformanceResponse = {
  siteUrl: string;
  rows: GscSearchAnalyticsRow[];
};

export async function gatherWeeklySearchSignals(input: {
  projectId: string;
  period: ReportPeriod;
  /** Injected for tests; defaults to the real GscService.getPerformance. */
  getPerformance?: typeof GscService.getPerformance;
}): Promise<WeeklySearchSignals> {
  const getPerformance = input.getPerformance ?? GscService.getPerformance;
  const { projectId, period } = input;

  // Explicit start/end on every call, never the `dateRange` shorthand: that
  // shorthand resolves against the wall clock inside the GSC layer, which would
  // silently drift the window away from the one this report is keyed on.
  const current = { startDate: period.startDate, endDate: period.endDate };
  const previous = {
    startDate: period.prevStartDate,
    endDate: period.prevEndDate,
  };

  // Totals come from the `date` dimension, not from the page/query rows: those
  // are capped at TOP_ROW_LIMIT and ordered by clicks, so summing them would
  // understate any site with more than ten pages. The `date` dimension returns
  // one row per day — a complete total whatever the site's size.
  const dateDimension: GscDimension[] = ["date"];

  let responses: PerformanceResponse[];
  try {
    // One round trip's worth of latency for six queries; the alarm has no user
    // waiting on it, but a serial chain multiplies the window in which a token
    // refresh can expire mid-report.
    responses = await Promise.all([
      getPerformance({ projectId, ...current, dimensions: dateDimension }),
      getPerformance({ projectId, ...previous, dimensions: dateDimension }),
      getPerformance({
        projectId,
        ...current,
        dimensions: ["page"],
        rowLimit: TOP_ROW_LIMIT,
      }),
      getPerformance({
        projectId,
        ...current,
        dimensions: ["query"],
        rowLimit: TOP_ROW_LIMIT,
      }),
      getPerformance({ projectId, ...current, dimensions: ["device"] }),
      getPerformance({
        projectId,
        ...current,
        dimensions: ["country"],
        rowLimit: TOP_ROW_LIMIT,
      }),
    ]);
  } catch (error) {
    if (error instanceof GscNotConnectedError) {
      return { state: "not_connected" };
    }
    // A dead or rejected grant is an expected end state, not a fault: the owner
    // has to relink, and no amount of retrying inside the alarm fixes it.
    // Deliberately *not* routed through listSitesForUserWithGrantStatus, which
    // unlinks the grant on a GscTokenError — a transient refresh hiccup must not
    // disconnect a customer's property behind their back.
    if (isExpectedGrantFailure(error)) {
      return { state: "needs_reconnect" };
    }
    const message = describeFailure(error);
    console.error(`[weekly-report] search performance failed: ${message}`);
    // Never degrade to `no_data` here. The GSC client returns `rows ?? []`, so a
    // failed call and a quiet week are indistinguishable downstream; reporting
    // "down 100%" when the truth is a 500 is the worst mistake this email can
    // make, and the only way to avoid it is to keep the states separate.
    return { state: "error", message };
  }

  const [currentDaily, previousDaily, pages, queries, devices, countries] =
    responses;

  const totals = sumSearchTotals(currentDaily.rows);
  const prevTotals = sumSearchTotals(previousDaily.rows);
  const topPages = toDimensionRows(pages.rows);
  const topQueries = toDimensionRows(queries.rows);
  const deviceRows = toDimensionRows(devices.rows);
  const countryRows = toDimensionRows(countries.rows);

  // Every call succeeded and Search Console still reported nothing, in either
  // window — a genuinely empty property (brand new, deindexed, wrong site
  // mapped). Impressions rather than clicks is the test: a page can rank all
  // week without a single click, and that is not "no data".
  const empty =
    totals.impressions === 0 &&
    prevTotals.impressions === 0 &&
    topPages.length === 0 &&
    topQueries.length === 0 &&
    deviceRows.length === 0 &&
    countryRows.length === 0;
  if (empty) {
    return { state: "no_data", siteUrl: currentDaily.siteUrl };
  }

  return {
    state: "ok",
    siteUrl: currentDaily.siteUrl,
    totals,
    prevTotals,
    topPages,
    topQueries,
    devices: deviceRows,
    countries: countryRows,
  };
}

/** A message a human can act on, with nothing a log should not hold. Provider
 *  error bodies are outside our control, so URLs (which can carry tokens in a
 *  query string) and long opaque blobs are stripped rather than trusted. */
function describeFailure(error: unknown): string {
  if (error instanceof GscApiError) {
    // Status is the whole diagnosis (429 = throttled, 5xx = Google is down) and
    // it cannot contain credentials, so the body is dropped entirely.
    return `Search Console returned HTTP ${error.status}`;
  }
  if (!(error instanceof Error)) {
    return "Search Console request failed for an unknown reason";
  }
  const scrubbed = error.message
    .replace(/https?:\/\/\S+/g, "[url]")
    .replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]");
  const message = scrubbed.trim().slice(0, MAX_ERROR_MESSAGE_LENGTH);
  return message.length > 0 ? `${error.name}: ${message}` : error.name;
}
