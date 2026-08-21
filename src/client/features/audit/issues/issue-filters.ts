/**
 * State for the All Issues tab.
 *
 * Group and severity live in the URL so a filtered view is shareable and
 * survives a reload. They narrow the *summary*, which is one row per rule
 * (tens of rows) and already in memory — the crawl-sized data is the occurrence
 * list, and that one is filtered and paged by the server.
 */

import type { IntlShape } from "react-intl";
import type { MessageId } from "@/client/i18n/messages";
import { en } from "@/client/i18n/messages/en";

export const ISSUES_PAGE_SIZE = 50;

export interface IssueFilters {
  group?: string;
  severity?: string;
}

/**
 * Remediation text for a rule, resolved by the server from the rule catalog.
 * The client only ever renders it — rewriting any of this would break the
 * traceability from a finding back to the Google documentation it cites.
 */
export interface IssueFixText {
  label: string;
  problem: string;
  fixSteps: string[];
  googleSourceUrl: string;
  guideQuote: string;
  lastReviewedDate: string;
  /** False when the reader's locale had no translation and English was served. */
  localized: boolean;
}

/** Row offset for the server query, derived from the 1-based page a human sees. */
export function toOffset(page: number): number {
  return Math.max(page - 1, 0) * ISSUES_PAGE_SIZE;
}

export function totalPageCount(total: number): number {
  return Math.max(Math.ceil(total / ISSUES_PAGE_SIZE), 1);
}

/**
 * A human-readable name for an issue group. Groups come from the server as
 * stable slugs; this is presentation only and never invents a group that the
 * summary did not return.
 */
const GROUP_LABELS: Record<string, string> = {
  indexability: "Indexability",
  links: "Links",
  redirects: "Redirects",
  content: "Content",
  sitemaps: "Sitemaps",
  "structured-data": "Structured Data",
  performance: "Performance",
  "ai-geo": "AI / GEO",
};

/**
 * English fallback label, pinned by the test below. Components render
 * `translatedGroupLabel` instead, which resolves the locale-aware copy.
 */
export function groupLabel(group: string): string {
  return GROUP_LABELS[group] ?? group;
}

const GROUP_LABEL_IDS: Record<string, MessageId> = {
  indexability: "audit.issues.group.indexability",
  links: "audit.issues.group.links",
  redirects: "audit.issues.group.redirects",
  content: "audit.issues.group.content",
  sitemaps: "audit.issues.group.sitemaps",
  "structured-data": "audit.issues.group.structuredData",
  performance: "audit.issues.group.performance",
  "ai-geo": "audit.issues.group.aiGeo",
};

/** Locale-aware group label for the issue group headers and filter chips. */
export function translatedGroupLabel(intl: IntlShape, group: string): string {
  const id = GROUP_LABEL_IDS[group];
  return id ? intl.formatMessage({ id }) : groupLabel(group);
}

/**
 * Groups the audit has no rules for yet. These are stated in words instead of
 * being rendered with a count of zero — a fabricated zero reads as "we checked
 * and found nothing", which would be a lie.
 *
 * A test pins this list against the real rule-to-group mapping, so mapping a
 * rule into one of these groups fails the build rather than silently leaving
 * the note below telling readers the audit does not cover something it now
 * does. Kept in step with the audit issue coverage matrix.
 */
export const UNCOVERED_GROUPS = [
  "redirects",
  "structured-data",
  "ai-geo",
] as const;

/**
 * English source of truth lives in the message catalog; components render it
 * through `<FormattedMessage id="audit.issues.uncoveredNote" />` so it is
 * locale-aware. Exported here (English only) for the coverage test below.
 */
export const UNCOVERED_GROUPS_NOTE = en["audit.issues.uncoveredNote"];

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  low: 2,
};

export function compareSeverity(a: string, b: string): number {
  return (SEVERITY_ORDER[a] ?? 99) - (SEVERITY_ORDER[b] ?? 99);
}

export function severityBadgeClass(severity: string): string {
  if (severity === "critical") return "badge-error";
  if (severity === "high") return "badge-warning";
  return "badge-ghost";
}
