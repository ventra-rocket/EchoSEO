import type { Locale } from "@/server/lib/seo-rules/types";

/**
 * Shared shapes for the periodic report feature (Phase 07).
 *
 * These types are the contract between the four independent producers — the
 * subscription store, the Search Console gatherer, the audit-issue differ, and
 * the email builder — so none of them has to import another's module just to
 * name a field. Keep them free of Drizzle rows and of anything that needs a
 * request: every producer runs inside a Durable Object alarm with no session.
 */

/**
 * The reporting window, already shifted back to where Search Console actually
 * has data.
 *
 * Search Console finalizes a day 2–3 days late. A Monday report covering
 * "the last 7 days" would therefore read the final days as zero and announce a
 * traffic collapse that never happened. Both windows carry the *same* lag, so
 * the comparison stays fair even though neither ends yesterday.
 */
export type ReportPeriod = {
  /** Inclusive YYYY-MM-DD (UTC) of the first day covered. */
  startDate: string;
  /** Inclusive YYYY-MM-DD (UTC) of the last day covered. */
  endDate: string;
  /** Same-length window immediately before, carrying the same lag. */
  prevStartDate: string;
  /** Inclusive end of the comparison window. */
  prevEndDate: string;
  /**
   * Stable identity of this occurrence, e.g. `2026-W33`. It is the dedupe key
   * for sends, so it must be derived from the window — never from the clock at
   * send time, or a retry becomes a second report.
   */
  key: string;
};

export type SearchTotals = {
  clicks: number;
  impressions: number;
  /** 0..1 (clicks / impressions). */
  ctr: number;
  /** Impression-weighted average position; 0 when there were no impressions. */
  position: number;
};

export type SearchDimensionRow = {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

/**
 * Search Console numbers for one period, or an honest reason there are none.
 *
 * `no_data` and `error` are deliberately separate states. The GSC client
 * returns `rows ?? []` (src/server/lib/gscClient.ts), so a failed call and a
 * quiet week look identical downstream — collapsing them would let the email
 * report "0 clicks, down 100%" when the real story is a revoked grant.
 */
export type WeeklySearchSignals =
  | { state: "not_connected" }
  /** The stored grant can no longer reach Search Console; the owner must relink. */
  | { state: "needs_reconnect" }
  | { state: "error"; message: string }
  /** The call succeeded and Search Console genuinely reported nothing. */
  | { state: "no_data"; siteUrl: string }
  | {
      state: "ok";
      siteUrl: string;
      totals: SearchTotals;
      prevTotals: SearchTotals;
      topPages: SearchDimensionRow[];
      topQueries: SearchDimensionRow[];
      devices: SearchDimensionRow[];
      countries: SearchDimensionRow[];
    };

/** One issue as the email presents it: what broke, where, and how to fix it. */
export type ReportIssue = {
  ruleId: string;
  url: string;
  issueGroup: string;
  /** Audit severities are exactly critical | high | low (seo-rules/types.ts). */
  severity: string;
  label: string;
  problem: string;
  fixSteps: string[];
  googleSourceUrl: string;
  guideQuote: string;
  lastReviewedDate: string;
  /** False when the requested locale has no translation and English is served. */
  localized: boolean;
};

export type ReportSnapshotRef = {
  auditId: string;
  sealedAt: string;
  pagesCrawled: number;
};

export type FixedRuleSummary = {
  ruleId: string;
  label: string;
  resolvedCount: number;
};

/**
 * The technical half of the report: what the crawl found that the previous
 * crawl did not.
 *
 * `not_comparable` is load-bearing. Comparing against a snapshot whose issues
 * were never materialized reads every baseline issue as resolved, so the email
 * would congratulate the owner for fixes that never happened.
 */
export type WeeklyIssueReport =
  | { state: "no_audit" }
  | { state: "not_comparable"; reason: string }
  | {
      /** First sealed crawl for this target: everything is new by definition. */
      state: "no_baseline";
      current: ReportSnapshotRef;
      newIssues: ReportIssue[];
      criticalCount: number;
    }
  | {
      state: "ok";
      current: ReportSnapshotRef;
      baseline: ReportSnapshotRef;
      /** Present now, absent in the baseline, and never seen before it. */
      newIssues: ReportIssue[];
      /**
       * Present now, absent in the baseline, but present in the crawl before
       * it — a fix that came undone. Disjoint from `newIssues`.
       */
      regressedIssues: ReportIssue[];
      fixedCount: number;
      fixedRules: FixedRuleSummary[];
      /** Count of critical-severity entries across new + regressed. */
      criticalCount: number;
    };

/** Everything the email builder needs; it performs no I/O of its own. */
export type WeeklyReportData = {
  locale: Locale;
  siteLabel: string;
  period: ReportPeriod;
  issues: WeeklyIssueReport;
  search: WeeklySearchSignals;
  /** Absolute link into the app's audit view for this target. */
  reportUrl: string;
  /** Absolute one-click unsubscribe link; also used for List-Unsubscribe. */
  unsubscribeUrl: string;
};
