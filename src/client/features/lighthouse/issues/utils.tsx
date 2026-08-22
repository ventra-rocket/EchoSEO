import type { IntlShape } from "react-intl";
import { buildCsv, type CsvValue } from "@/client/lib/csv";
import type { MessageId } from "@/client/i18n/messages";
import type { CategoryTab, LighthouseIssue } from "./types";

// CSV/Sheets headers stay English on purpose, matching the precedent at
// keywordUi.saveExport in keywordUi.ts (see KEYWORD_RESEARCH_HEADERS in
// keywordControllerActions.ts): a file a user opens in Excel or Sheets is a
// data export, not UI copy, and its columns need to stay stable for anyone
// scripting against them.
const ISSUE_HEADERS = [
  "Category",
  "Severity",
  "Score",
  "Title",
  "Display Value",
  "Description",
  "Impact (ms)",
  "Impact (bytes)",
  "Affected Items",
];

function issuesToRows(issues: LighthouseIssue[]): CsvValue[][] {
  return issues.map((issue) => [
    issue.category,
    issue.severity,
    issue.score ?? "",
    issue.title,
    issue.displayValue ?? "",
    issue.description ?? "",
    issue.impactMs ?? "",
    issue.impactBytes ?? "",
    issue.items.length,
  ]);
}

export function issuesToTable(issues: LighthouseIssue[]) {
  return { headers: ISSUE_HEADERS, rows: issuesToRows(issues) };
}

export function issuesToCsv(issues: LighthouseIssue[]) {
  return buildCsv(ISSUE_HEADERS, issuesToRows(issues));
}

const CATEGORY_LABEL_ID: Record<CategoryTab, MessageId> = {
  all: "lighthouseIssues.category.all",
  performance: "lighthouseIssues.category.performance",
  accessibility: "lighthouseIssues.category.accessibility",
  "best-practices": "lighthouseIssues.category.bestPractices",
  seo: "lighthouseIssues.category.seo",
};

/**
 * Shared by the category tabs (LighthouseIssuesParts.tsx), the score gauges
 * (LighthouseIssuesSummary.tsx) and each row's category cell
 * (LighthouseIssueRow.tsx) — one label per category, not respelled at each
 * call site.
 */
export function categoryLabel(intl: IntlShape, category: CategoryTab): string {
  return intl.formatMessage({ id: CATEGORY_LABEL_ID[category] });
}

const SEVERITY_LABEL_ID: Record<LighthouseIssue["severity"], MessageId> = {
  critical: "lighthouseIssues.severity.critical",
  warning: "lighthouseIssues.severity.warning",
  info: "lighthouseIssues.severity.info",
};

/**
 * Shared by the header's severity-count badges and each row's severity badge
 * — the row renders the same label lowercase via a CSS utility class rather
 * than a second, differently-cased catalog entry.
 */
export function severityLabel(
  intl: IntlShape,
  severity: LighthouseIssue["severity"],
): string {
  return intl.formatMessage({ id: SEVERITY_LABEL_ID[severity] });
}

/**
 * D1 hands the audit's `started_at` back as `"YYYY-MM-DD HH:MM:SS"` in UTC
 * with no zone marker, which `new Date(…)` reads as local time. Duplicated
 * from `parseAuditTimestamp` (src/client/features/audit/shared.tsx) rather
 * than imported: lighthouse has no dependency on the audit feature today,
 * and reaching into a sibling feature's file for three lines of generic
 * string handling would couple this directory's correctness to edits made
 * there by other agents in this same batch. Same fix, same reasoning as
 * RankTrackingDomainList.tsx's `parseRankCheckTimestamp`.
 */
export function parseLighthouseTimestamp(dateStr: string): Date {
  const hasZoneDesignator = /(?:Z|[+-]\d{2}:\d{2})$/.test(dateStr);
  if (hasZoneDesignator) {
    return new Date(dateStr);
  }
  return new Date(dateStr.replace(" ", "T") + "Z");
}
