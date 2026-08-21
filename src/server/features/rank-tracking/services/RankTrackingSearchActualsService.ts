/**
 * Search Console actuals for tracked keywords: the clicks, impressions and
 * average position Google itself recorded for keywords this config tracks.
 *
 * Why this exists separately from a rank snapshot: a SERP check answers "where
 * does this keyword rank right now, for this location and device"; Search
 * Console answers "what did this site actually earn for that query over a
 * window". They are different measurements and are never blended — a GSC
 * average position must never be rendered as if it were a point-in-time rank
 * (`docs/design-guidelines.md`, and the honesty constraint in
 * `plans/260812-1320-gsc-first-rank-tracking/plan.md`).
 *
 * It is also the only rank-side number a keyless organization can see: GSC is
 * first-party data with no provider account and no per-call cost.
 */
import { RankTrackingRepository } from "@/server/features/rank-tracking/repositories/RankTrackingRepository";
import {
  GscNotConnectedError,
  GscService,
  isExpectedGrantFailure,
} from "@/server/features/gsc/services/GscService";
import {
  GSC_MAX_ROW_LIMIT,
  resolveDateRange,
  type GscDateRange,
  type GscDimension,
} from "@/server/features/gsc/searchAnalytics";
import { toDimensionRows } from "@/server/features/gsc/searchPerformanceReport";
import { propertyCoversOrigin } from "@/shared/gsc-property-match";
import { AppError } from "@/server/lib/errors";

/** The window Search Console's own UI opens on, and the one the weekly report uses. */
const ACTUALS_DATE_RANGE: GscDateRange = "last_28_days";

/**
 * GSC returns query rows ordered by clicks descending, so a tracked keyword
 * with any traffic surfaces early. Pages are only walked while a tracked
 * keyword is still unaccounted for, and never past this cap: an unbounded walk
 * would let one large property spend an arbitrary number of calls on a table
 * render.
 */
const MAX_QUERY_PAGES = 3;

const QUERY_DIMENSION: GscDimension[] = ["query"];

export interface RankTrackingKeywordActuals {
  trackingKeywordId: string;
  keyword: string;
  clicks: number;
  impressions: number;
  ctr: number;
  /** Average position over the window — an average, never a live SERP rank. */
  position: number;
}

export type RankTrackingSearchActuals =
  | { state: "not_connected" }
  | { state: "property_mismatch"; property: string; domain: string }
  | {
      state: "ready";
      source: "GSC";
      property: string;
      window: { from: string; to: string };
      /**
       * Whether the whole query set GSC was willing to return was read. When
       * false, GSC truncated at the page cap and a keyword with no row is
       * *unknown*, not zero — the caller must not render an absence as "no
       * impressions". When true, an absent keyword still renders as a
       * numeral 0, but that is a display choice, not a proof: Search Console
       * omits anonymized queries — queries below its privacy threshold —
       * from the query dimension entirely, at any read depth. `complete`
       * only rules out truncation as the reason a keyword is missing; it can
       * never rule out anonymization.
       */
      complete: boolean;
      rows: RankTrackingKeywordActuals[];
    };

/**
 * GSC returns queries lower-cased already; normalise both sides regardless.
 * Also collapses inner whitespace runs to one space — Google folds "seo  tools"
 * to "seo tools" before matching, so a tracked keyword saved with a stray double
 * space must fold the same way or it silently never matches its GSC row.
 */
function normalizeKeyword(keyword: string): string {
  return keyword.trim().toLowerCase().replace(/\s+/g, " ");
}

async function getActuals(input: {
  projectId: string;
  configId: string;
}): Promise<RankTrackingSearchActuals> {
  const config = await RankTrackingRepository.getConfigById({
    configId: input.configId,
    projectId: input.projectId,
  });
  if (!config) throw new AppError("NOT_FOUND");

  const connection = await GscService.getConnection(input.projectId);
  if (!connection) return { state: "not_connected" };

  // The isolation gate, same as the audit's: only read a property that covers
  // the domain being tracked. Overlaying another site's numbers on these
  // keywords would be a fabricated join, not a missing one.
  const origin = `https://${config.domain}`;
  if (!propertyCoversOrigin(origin, connection.siteUrl)) {
    return {
      state: "property_mismatch",
      property: connection.siteUrl,
      domain: config.domain,
    };
  }

  const keywords = await RankTrackingRepository.getKeywordsForConfig(
    input.configId,
  );
  const window = resolveDateRange({ dateRange: ACTUALS_DATE_RANGE });
  const windowView = { from: window.startDate, to: window.endDate };

  if (keywords.length === 0) {
    return {
      state: "ready",
      source: "GSC",
      property: connection.siteUrl,
      window: windowView,
      complete: true,
      rows: [],
    };
  }

  const wanted = new Map<string, { id: string; keyword: string }>();
  for (const keyword of keywords) {
    // Two tracked rows normalising to the same query would both read the same
    // GSC row; first one wins, which keeps the output one row per query.
    const key = normalizeKeyword(keyword.keyword);
    if (!wanted.has(key)) {
      wanted.set(key, { id: keyword.id, keyword: keyword.keyword });
    }
  }

  const rows: RankTrackingKeywordActuals[] = [];
  let complete = false;

  try {
    for (let page = 0; page < MAX_QUERY_PAGES; page += 1) {
      const result = await GscService.getPerformance({
        projectId: input.projectId,
        startDate: window.startDate,
        endDate: window.endDate,
        dimensions: QUERY_DIMENSION,
        rowLimit: GSC_MAX_ROW_LIMIT,
        startRow: page * GSC_MAX_ROW_LIMIT,
      });

      // Guard the gate against a property switch between the check and the
      // read: getPerformance resolves the connection itself, so a concurrent
      // setSite could answer from a property this gate never vetted.
      if (result.siteUrl !== connection.siteUrl) {
        return {
          state: "property_mismatch",
          property: connection.siteUrl,
          domain: config.domain,
        };
      }

      for (const row of toDimensionRows(result.rows)) {
        const match = wanted.get(normalizeKeyword(row.key));
        if (!match) continue;
        wanted.delete(normalizeKeyword(row.key));
        rows.push({
          trackingKeywordId: match.id,
          keyword: match.keyword,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          position: row.position,
        });
      }

      // A short page is the end of the query set GSC was willing to name: every
      // tracked keyword still absent was either genuinely zero or below
      // Google's anonymization threshold, and the two look identical from
      // here — `complete` says the read wasn't truncated, never that an
      // absence is a proven zero.
      if (result.rows.length < GSC_MAX_ROW_LIMIT) {
        complete = true;
        break;
      }
      // Everything asked for was found; further pages cannot change an answer.
      if (wanted.size === 0) {
        complete = true;
        break;
      }
    }
  } catch (error) {
    // A revoked or expired grant, or Google refusing the call, is an expected
    // external-auth failure: the caller shows a reconnect path instead of an
    // error. Real faults (429, 5xx) propagate.
    if (
      error instanceof GscNotConnectedError ||
      isExpectedGrantFailure(error)
    ) {
      return { state: "not_connected" };
    }
    throw error;
  }

  return {
    state: "ready",
    source: "GSC",
    property: connection.siteUrl,
    window: windowView,
    complete,
    rows,
  };
}

export const RankTrackingSearchActualsService = { getActuals } as const;
