import {
  emailBadge,
  emailDivider,
  emailHeading,
  emailMuted,
  emailOrderedList,
  emailParagraph,
  emailQuote,
  emailRawParagraph,
  emailSection,
  emailTable,
  type EmailCell,
} from "@/server/email/html-layout";
import {
  COPY,
  severityLabel,
  SEVERITY_TONE,
  type Copy,
} from "@/server/features/reports/report-email-copy";
import type {
  ReportIssue,
  SearchDimensionRow,
  SearchTotals,
} from "@/server/features/reports/report-types";
import { escapeHtml } from "@/server/services/seo-check/output-encode";
import type { Locale } from "@/server/lib/seo-rules";

/**
 * Rendering pieces shared by the weekly report and the critical alert.
 *
 * Everything here is presentation only: no I/O, no clock, no decisions about
 * what to send. The two email builders compose these into a document.
 */

/**
 * How many findings get the full treatment — problem, numbered fix steps, and
 * the Google quote. Beyond this the mail lists them compactly and sends the
 * reader to the app; an email that inlines 100 remediation guides is one nobody
 * finishes reading, and Gmail clips messages past ~102KB anyway.
 */
export const DETAILED_ISSUE_LIMIT = 5;
/** Compact rows shown after the detailed cards, before the "and N more" line. */
const COMPACT_ISSUE_LIMIT = 20;
/** Rows per Search Console breakdown table. */
const SEARCH_ROW_LIMIT = 5;

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US").format(
    Math.round(value),
  );
}

function formatPercent(ratio: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(ratio);
}

export function formatPosition(position: number, locale: Locale): string {
  if (position <= 0) return "—";
  return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(position);
}

/**
 * Relative change as a signed percentage. A previous value of zero has no
 * percentage — dividing by it would print `Infinity%` — so the mail says "new"
 * instead, which is what a jump from nothing actually means.
 */
export function formatDelta(
  current: number,
  previous: number,
  locale: Locale,
): string {
  if (previous === 0) return current === 0 ? "—" : COPY[locale].brandNew;
  const ratio = (current - previous) / previous;
  const sign = ratio > 0 ? "+" : "";
  return `${sign}${formatPercent(ratio, locale)}`;
}

/** Position improves as it falls, so its delta is inverted before display. */
function formatPositionDelta(
  current: number,
  previous: number,
  locale: Locale,
): string {
  if (previous <= 0 || current <= 0) return "—";
  const change = previous - current;
  const sign = change > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
    maximumFractionDigits: 1,
  }).format(change)}`;
}

/** Shorten a URL for a table cell without hiding which page it is. */
function shortenUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = `${parsed.pathname}${parsed.search}`;
    const shown = path === "/" ? parsed.host : path;
    return shown.length > 60 ? `${shown.slice(0, 57)}…` : shown;
  } catch {
    return url.length > 60 ? `${url.slice(0, 57)}…` : url;
  }
}

export function issueCard(issue: ReportIssue, copy: Copy): string {
  const parts: string[] = [
    emailHeading(issue.label, 3),
    // The badge is markup, so the severity line is assembled from helper output
    // rather than escaped text. `issue.ruleId` comes from our own rule catalog,
    // but it still goes through emailMuted's escaping — nothing untrusted is
    // ever concatenated into markup here.
    emailRawParagraph(
      `${emailBadge(
        severityLabel(issue.severity, copy),
        SEVERITY_TONE[issue.severity] ?? "neutral",
      )} ${escapeHtml(issue.ruleId)}`,
    ),
  ];
  if (issue.problem) parts.push(emailParagraph(issue.problem));
  parts.push(emailMuted(`${copy.affectedUrl}: ${issue.url}`));
  if (issue.fixSteps.length > 0) {
    parts.push(emailHeading(copy.howToFix, 3));
    parts.push(emailOrderedList(issue.fixSteps));
  }
  if (issue.guideQuote && issue.googleSourceUrl) {
    parts.push(
      emailQuote(
        issue.guideQuote,
        issue.googleSourceUrl,
        copy.googleSourceLabel,
      ),
    );
  }
  return parts.join("\n");
}

function issueTable(issues: ReportIssue[], copy: Copy): string {
  const rows: EmailCell[][] = issues.map((issue) => [
    { text: issue.label },
    { text: severityLabel(issue.severity, copy) },
    { text: shortenUrl(issue.url), href: issue.url },
  ]);
  return emailTable({
    headers: [copy.issueColumn, copy.severityColumn, copy.urlColumn],
    rows,
  });
}

export function issueBlock(
  title: string,
  intro: string | null,
  issues: ReportIssue[],
  totalKnown: number,
  copy: Copy,
): string {
  const detailed = issues.slice(0, DETAILED_ISSUE_LIMIT);
  const compact = issues.slice(
    DETAILED_ISSUE_LIMIT,
    DETAILED_ISSUE_LIMIT + COMPACT_ISSUE_LIMIT,
  );
  const remaining = totalKnown - detailed.length - compact.length;
  const inner: string[] = [];
  if (intro) inner.push(emailParagraph(intro));
  inner.push(
    detailed.map((issue) => issueCard(issue, copy)).join(emailDivider()),
  );
  if (compact.length > 0) inner.push(issueTable(compact, copy));
  if (remaining > 0) inner.push(emailMuted(copy.moreIssues(remaining)));
  return emailSection(title, inner.join("\n"));
}

export function totalsTable(
  totals: SearchTotals,
  prev: SearchTotals,
  copy: Copy,
  locale: Locale,
): string {
  const rows: EmailCell[][] = [
    [
      { text: copy.clicks },
      { text: formatNumber(totals.clicks, locale), align: "right" },
      { text: formatNumber(prev.clicks, locale), align: "right" },
      { text: formatDelta(totals.clicks, prev.clicks, locale), align: "right" },
    ],
    [
      { text: copy.impressions },
      { text: formatNumber(totals.impressions, locale), align: "right" },
      { text: formatNumber(prev.impressions, locale), align: "right" },
      {
        text: formatDelta(totals.impressions, prev.impressions, locale),
        align: "right",
      },
    ],
    [
      { text: copy.ctr },
      { text: formatPercent(totals.ctr, locale), align: "right" },
      { text: formatPercent(prev.ctr, locale), align: "right" },
      { text: formatDelta(totals.ctr, prev.ctr, locale), align: "right" },
    ],
    [
      { text: copy.position },
      { text: formatPosition(totals.position, locale), align: "right" },
      { text: formatPosition(prev.position, locale), align: "right" },
      {
        text: formatPositionDelta(totals.position, prev.position, locale),
        align: "right",
      },
    ],
  ];
  return emailTable({
    headers: [
      copy.metricColumn,
      copy.thisPeriod,
      copy.previousPeriod,
      copy.change,
    ],
    rows,
  });
}

export function dimensionTable(
  title: string,
  rows: SearchDimensionRow[],
  copy: Copy,
  locale: Locale,
  asLink: boolean,
): string {
  if (rows.length === 0) return "";
  const cells: EmailCell[][] = rows
    .slice(0, SEARCH_ROW_LIMIT)
    .map((row) => [
      asLink ? { text: shortenUrl(row.key), href: row.key } : { text: row.key },
      { text: formatNumber(row.clicks, locale), align: "right" },
      { text: formatNumber(row.impressions, locale), align: "right" },
      { text: formatPosition(row.position, locale), align: "right" },
    ]);
  return [
    emailHeading(title, 3),
    emailTable({
      headers: [title, copy.clicks, copy.impressions, copy.position],
      rows: cells,
    }),
  ].join("\n");
}
