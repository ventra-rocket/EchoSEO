import { FileWarning, Info, TriangleAlert } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import type {
  CategoryTab,
  ExportPayload,
  LighthouseIssue,
  LighthouseMetrics,
  LighthouseScores,
} from "./types";
import { LighthouseIssueRow } from "./LighthouseIssueRow";
import { LighthouseIssuesSummary } from "./LighthouseIssuesSummary";
import { ExportMenu } from "./LighthouseIssuesExportMenu";
import {
  categoryLabel,
  parseLighthouseTimestamp,
  severityLabel,
} from "./utils";
import { categoryTabs } from "./types";

export function LighthouseIssuesHeader({
  backLabel,
  onBack,
  scannedAt,
  finalUrl,
  scores,
  metrics,
  severityCounts,
}: {
  backLabel: string;
  onBack: () => void;
  scannedAt?: string;
  finalUrl?: string;
  scores?: LighthouseScores | null;
  metrics?: LighthouseMetrics | null;
  severityCounts: { critical: number; warning: number; info: number };
}) {
  const intl = useIntl();

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <button className="btn btn-ghost btn-sm px-2" onClick={onBack}>
          <FormattedMessage
            id="lighthouseIssues.header.backTo"
            values={{ backLabel }}
          />
        </button>
        <span className="text-xs text-base-content/60">
          {scannedAt ? (
            <FormattedMessage
              id="lighthouseIssues.header.scanned"
              values={{
                date: intl.formatDate(parseLighthouseTimestamp(scannedAt), {
                  dateStyle: "medium",
                  timeStyle: "short",
                }),
              }}
            />
          ) : (
            <FormattedMessage id="lighthouseIssues.header.loadingScanTime" />
          )}
        </span>
      </div>

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body py-5 gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">
              <FormattedMessage id="lighthouseIssues.header.title" />
            </h1>
            <p className="text-sm text-base-content/70 break-all">
              {finalUrl ??
                intl.formatMessage({
                  id: "lighthouseIssues.header.loadingUrl",
                })}
            </p>
          </div>
          <LighthouseIssuesSummary scores={scores} metrics={metrics} />
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="badge border border-error/30 bg-error/10 text-error/80 gap-1">
              <FileWarning className="size-3" />
              {severityLabel(intl, "critical")}{" "}
              {intl.formatNumber(severityCounts.critical)}
            </span>
            <span className="badge border border-warning/30 bg-warning/10 text-warning/80 gap-1">
              <TriangleAlert className="size-3" />
              {severityLabel(intl, "warning")}{" "}
              {intl.formatNumber(severityCounts.warning)}
            </span>
            <span className="badge border border-info/30 bg-info/10 text-info/80 gap-1">
              <Info className="size-3" />
              {severityLabel(intl, "info")}{" "}
              {intl.formatNumber(severityCounts.info)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

export function LighthouseIssuesToolbar({
  category,
  categoryCounts,
  selectedCategoryLabel,
  isBusy,
  visibleIssues,
  allIssues,
  onCategoryChange,
  onCopy,
  onExport,
  onExportCsv,
  onExportSheets,
}: {
  category: CategoryTab;
  categoryCounts: Record<CategoryTab, number>;
  selectedCategoryLabel: string;
  isBusy: boolean;
  visibleIssues: LighthouseIssue[];
  allIssues: LighthouseIssue[];
  onCategoryChange: (next: CategoryTab) => void;
  onCopy: (data: ExportPayload, toastMessage: string) => void;
  onExport: (data: ExportPayload) => void;
  onExportCsv: (issues: LighthouseIssue[], variant: "all" | "current") => void;
  onExportSheets: (
    issues: LighthouseIssue[],
    variant: "all" | "current",
  ) => void;
}) {
  const exportCurrentCategory: ExportPayload =
    category === "all" ? { mode: "issues" } : { mode: "category", category };

  return (
    <div className="sticky top-0 z-[2] -mx-2 px-2 py-2 bg-base-100/95 backdrop-blur-sm border-b border-base-300">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CategoryTabs
          category={category}
          categoryCounts={categoryCounts}
          onCategoryChange={onCategoryChange}
        />
        <ExportMenu
          allIssues={allIssues}
          selectedCategoryLabel={selectedCategoryLabel}
          exportCurrentCategory={exportCurrentCategory}
          isBusy={isBusy}
          onCopy={onCopy}
          onExport={onExport}
          onExportCsv={onExportCsv}
          onExportSheets={onExportSheets}
          visibleIssues={visibleIssues}
        />
      </div>
    </div>
  );
}

function CategoryTabs({
  category,
  categoryCounts,
  onCategoryChange,
}: {
  category: CategoryTab;
  categoryCounts: Record<CategoryTab, number>;
  onCategoryChange: (next: CategoryTab) => void;
}) {
  const intl = useIntl();

  return (
    <div className="flex flex-wrap items-center gap-4">
      {categoryTabs.map((tab) => (
        <button
          key={tab}
          className={`pb-2 border-b-2 text-sm font-medium transition-colors ${
            category === tab
              ? "border-primary text-base-content"
              : "border-transparent text-base-content/60 hover:text-base-content"
          }`}
          onClick={() => onCategoryChange(tab)}
        >
          <span>{categoryLabel(intl, tab)}</span>
          <span className="ml-1 text-xs opacity-70">
            ({intl.formatNumber(categoryCounts[tab])})
          </span>
        </button>
      ))}
    </div>
  );
}

export function LighthouseIssueList({
  issues,
  isLoading,
  emptyMessage,
}: {
  issues: LighthouseIssue[];
  isLoading: boolean;
  emptyMessage?: string;
}) {
  const intl = useIntl();

  if (isLoading) {
    return (
      <p className="text-sm text-base-content/60">
        <FormattedMessage id="lighthouseIssues.list.loading" />
      </p>
    );
  }
  if (!issues.length) {
    return (
      <p className="text-sm text-base-content/60">
        {emptyMessage ??
          intl.formatMessage({ id: "lighthouseIssues.list.emptyDefault" })}
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {/* Discloses that the Issue column below is a mix of EchoSEO's own
          chrome (Severity, Category, Score) and Lighthouse's own English
          report text (issue title/description in the Issue column) — see
          the scope note atop lighthouseIssues.ts. */}
      <p className="text-xs text-base-content/50">
        <FormattedMessage id="lighthouseIssues.list.providerNotice" />
      </p>
      <table className="table table-sm w-full table-fixed">
        <colgroup>
          <col className="w-8" />
          <col className="w-24" />
          <col />
          <col className="w-28 hidden sm:table-column" />
          <col className="w-28 hidden md:table-column" />
          <col className="w-14" />
        </colgroup>
        <thead>
          <tr className="text-xs text-base-content/50 uppercase tracking-wide border-b border-base-300">
            <th />
            <th className="font-medium">
              <FormattedMessage id="lighthouseIssues.list.column.severity" />
            </th>
            <th className="font-medium">
              <FormattedMessage id="lighthouseIssues.list.column.issue" />
            </th>
            <th className="font-medium hidden sm:table-cell">
              <FormattedMessage id="lighthouseIssues.list.column.category" />
            </th>
            <th className="font-medium hidden md:table-cell text-right">
              <FormattedMessage id="lighthouseIssues.list.column.impact" />
            </th>
            <th className="font-medium text-right">
              <FormattedMessage id="lighthouseIssues.list.column.score" />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-base-300">
          {issues.map((issue, issueIndex) => (
            <LighthouseIssueRow
              key={`${issue.category}-${issue.auditKey}-${issueIndex}`}
              issue={issue}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
