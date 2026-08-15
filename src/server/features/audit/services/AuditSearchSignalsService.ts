/**
 * Search Console signals for an audit target: organic traffic change and pages
 * that fell out of the top 10, period over period.
 *
 * Everything here is first-party GSC data, read live and stored nowhere. Two
 * gates protect it: the caller's project must own the audit, and the connected
 * GSC property must actually cover the audit's origin — a mismatched property is
 * refused before any query, so one project can never read another domain's
 * search data. A crawler cannot produce any of these figures; they are labelled
 * `GSC` with an explicit window so they can never read as crawl facts.
 */
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import { propertyCoversOrigin } from "@/shared/gsc-property-match";
import {
  GscNotConnectedError,
  GscService,
  isExpectedGrantFailure,
} from "@/server/features/gsc/services/GscService";
import {
  resolveDateRange,
  type GscDateRange,
  type GscDimension,
} from "@/server/features/gsc/searchAnalytics";
import {
  previousPeriod,
  sumSearchTotals,
  toDimensionRows,
} from "@/server/features/gsc/searchPerformanceReport";
import {
  findPagesDroppedFromTop10,
  type Top10Drop,
} from "@/server/features/audit/history/top10-drop";
import { getOrigin } from "@/server/lib/audit/url-utils";
import { safeHttpUrl } from "@/lib/safe-url";
import { AppError } from "@/server/lib/errors";

/** Default comparison window: the last 28 days against the previous 28. */
const SIGNALS_DATE_RANGE: GscDateRange = "last_28_days";
/** Enough pages to judge top-10 movement without pulling an unbounded set. */
const PAGE_ROW_LIMIT = 1000;
/** The window spans ~29 days, so one row per day fits comfortably. */
const DAILY_ROW_LIMIT = 200;

interface DateWindow {
  from: string;
  to: string;
}

type Top10DropView = {
  total: number;
  pages: Array<Top10Drop["pages"][number] & { safeUrl: string | null }>;
};

export type AuditSearchSignals =
  | { state: "not_connected" }
  | { state: "property_mismatch"; property: string }
  | { state: "no_data"; property: string; window: WindowPair }
  | {
      state: "ready";
      source: "GSC";
      property: string;
      window: WindowPair;
      traffic: {
        clicks: number;
        impressions: number;
        prevClicks: number;
        prevImpressions: number;
        clicksDelta: number;
        impressionsDelta: number;
      };
      droppedFromTop10: Top10DropView;
    };

interface WindowPair {
  current: DateWindow;
  previous: DateWindow;
}

async function getSignals(input: {
  projectId: string;
  auditId: string;
}): Promise<AuditSearchSignals> {
  const audit = await AuditRepository.getAuditForProject(
    input.auditId,
    input.projectId,
  );
  if (!audit) throw new AppError("NOT_FOUND");

  const origin = getOrigin(audit.startUrl);

  const connection = await GscService.getConnection(input.projectId);
  if (!connection) return { state: "not_connected" };

  // The isolation gate: only read a property that actually covers this target.
  if (!propertyCoversOrigin(origin, connection.siteUrl)) {
    return { state: "property_mismatch", property: connection.siteUrl };
  }

  const current = resolveDateRange({ dateRange: SIGNALS_DATE_RANGE });
  const prev = previousPeriod(current.startDate, current.endDate);
  const window: WindowPair = {
    current: { from: current.startDate, to: current.endDate },
    previous: { from: prev.startDate, to: prev.endDate },
  };

  const pageDimension: GscDimension[] = ["page"];
  const dateDimension: GscDimension[] = ["date"];
  const page = (range: { startDate: string; endDate: string }) => ({
    projectId: input.projectId,
    startDate: range.startDate,
    endDate: range.endDate,
    dimensions: pageDimension,
    rowLimit: PAGE_ROW_LIMIT,
  });
  // Totals come from the date dimension, not the page rows: page rows are capped
  // at PAGE_ROW_LIMIT and ordered by clicks, so summing them would understate a
  // large property. The date dimension returns one row per day — a complete,
  // exact total regardless of how many pages the site has.
  const daily = (range: { startDate: string; endDate: string }) => ({
    projectId: input.projectId,
    startDate: range.startDate,
    endDate: range.endDate,
    dimensions: dateDimension,
    rowLimit: DAILY_ROW_LIMIT,
  });

  let currentPages;
  let previousPages;
  let currentDaily;
  let previousDaily;
  try {
    [currentPages, previousPages, currentDaily, previousDaily] =
      await Promise.all([
        GscService.getPerformance(page(current)),
        GscService.getPerformance(page(prev)),
        GscService.getPerformance(daily(current)),
        GscService.getPerformance(daily(prev)),
      ]);
  } catch (error) {
    // A revoked/expired grant or a 401/403 is an expected external-auth failure:
    // surface a reconnect state rather than an error page. A property deleted
    // mid-flight lands here too. Real faults (429, 5xx) propagate.
    if (
      error instanceof GscNotConnectedError ||
      isExpectedGrantFailure(error)
    ) {
      return { state: "not_connected" };
    }
    throw error;
  }

  // Guard the gate against a property switch between the check and the reads:
  // every query resolves the connection itself, so a concurrent setSite could
  // return a property the gate never vetted. If any result's property differs
  // from the vetted one, refuse rather than mislabel another property's data.
  const results = [currentPages, previousPages, currentDaily, previousDaily];
  if (results.some((r) => r.siteUrl !== connection.siteUrl)) {
    return { state: "property_mismatch", property: connection.siteUrl };
  }

  if (currentDaily.rows.length === 0 && previousDaily.rows.length === 0) {
    return { state: "no_data", property: connection.siteUrl, window };
  }

  const currentTotals = sumSearchTotals(currentDaily.rows);
  const previousTotals = sumSearchTotals(previousDaily.rows);

  const dropped = findPagesDroppedFromTop10(
    toDimensionRows(currentPages.rows).map(toPagePosition),
    toDimensionRows(previousPages.rows).map(toPagePosition),
    // Absence only proves a page fell out of visibility if the current page set
    // wasn't truncated (see top10-drop.ts).
    { currentComplete: currentPages.rows.length < PAGE_ROW_LIMIT },
  );

  return {
    state: "ready",
    source: "GSC",
    property: connection.siteUrl,
    window,
    traffic: {
      clicks: currentTotals.clicks,
      impressions: currentTotals.impressions,
      prevClicks: previousTotals.clicks,
      prevImpressions: previousTotals.impressions,
      clicksDelta: currentTotals.clicks - previousTotals.clicks,
      impressionsDelta: currentTotals.impressions - previousTotals.impressions,
    },
    droppedFromTop10: {
      total: dropped.total,
      // `url` is a page string from GSC (the customer's own site); resolve its
      // linkable form once here so the client never makes that call.
      pages: dropped.pages.map((entry) => ({
        ...entry,
        safeUrl: safeHttpUrl(entry.url),
      })),
    },
  };
}

function toPagePosition(row: {
  key: string;
  position: number;
  impressions: number;
}) {
  return { url: row.key, position: row.position, impressions: row.impressions };
}

export const AuditSearchSignalsService = { getSignals } as const;
