import { useMemo } from "react";
import { StatCard } from "@/client/features/audit/shared";
import {
  exportPages,
  exportPerformance,
} from "@/client/features/audit/results/export";
import type { AuditResultsData } from "@/client/features/audit/results/types";
import { isLighthouseFailure } from "@/client/features/audit/results/AuditResultsTableFilterLogic";
import {
  ExportDropdown,
  PagesTable,
  PerformanceTable,
} from "@/client/features/audit/results/ResultsTables";
import { AllIssuesTab } from "@/client/features/audit/issues/AllIssuesTab";
import { PageChangesPanel } from "@/client/features/audit/history/PageChangesPanel";
import type { IssueFilters } from "@/client/features/audit/issues/issue-filters";
import type { AuditTab } from "@/types/schemas/audit";

type ResultsTab = AuditTab;

export function ResultsView({
  projectId,
  data,
  onTabChange,
  tab,
  issueFilters,
  onIssueFiltersChange,
}: {
  projectId: string;
  data: AuditResultsData;
  tab: string;
  onTabChange: (tab: ResultsTab) => void;
  issueFilters: IssueFilters;
  onIssueFiltersChange: (filters: Partial<IssueFilters>) => void;
}) {
  const { audit, pages, lighthouse } = data;
  const stats = useResultStats(pages, lighthouse);

  // Which tabs this audit can actually back with data. Performance disappears
  // when Lighthouse never ran; Issues is always offered because "issues were
  // never materialized" is itself a state the tab has to report, and hiding the
  // tab would make a failed materializer invisible.
  const availableTabs: Array<{ tab: ResultsTab; label: string }> = [
    { tab: "pages", label: `Pages (${pages.length})` },
    ...(lighthouse.length > 0
      ? [
          {
            tab: "performance" as const,
            label: `Performance (${lighthouse.length})`,
          },
        ]
      : []),
    { tab: "issues" as const, label: "All Issues" },
  ];

  // A tab the URL asks for but this audit cannot show falls back to Pages
  // rather than rendering an empty shell.
  const activeTab: ResultsTab =
    availableTabs.find((entry) => entry.tab === tab)?.tab ?? "pages";

  return (
    <>
      <StatsGrid
        pagesCrawled={audit.pagesCrawled}
        totalPages={pages.length}
        totalLighthouse={lighthouse.length}
        averageResponseMs={stats.averageResponseMs}
        lighthouseSummary={stats.lighthouseSummary}
      />

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body gap-3">
          <ResultsHeader
            tabs={availableTabs}
            activeTab={activeTab}
            onTabChange={onTabChange}
            // The Issues tab pages through the server, so the client never
            // holds the full set an export would need.
            showExport={activeTab !== "issues"}
            onExport={(format) => {
              if (activeTab === "performance") {
                exportPerformance(lighthouse, pages, format);
                return;
              }
              exportPages(pages, format);
            }}
          />

          {activeTab === "pages" && (
            <div className="space-y-3">
              <PageChangesPanel auditId={audit.id} projectId={projectId} />
              <PagesTable pages={pages} />
            </div>
          )}
          {activeTab === "performance" && lighthouse.length > 0 && (
            <PerformanceTable
              auditId={audit.id}
              projectId={projectId}
              lighthouse={lighthouse}
              pages={pages}
            />
          )}
          {activeTab === "issues" && (
            <AllIssuesTab
              auditId={audit.id}
              projectId={projectId}
              filters={issueFilters}
              onFiltersChange={onIssueFiltersChange}
            />
          )}
        </div>
      </div>
    </>
  );
}

function useResultStats(
  pages: AuditResultsData["pages"],
  lighthouse: AuditResultsData["lighthouse"],
) {
  const averageResponseMs = useMemo(() => {
    if (pages.length === 0) return 0;
    const total = pages.reduce(
      (sum: number, page: AuditResultsData["pages"][number]) =>
        sum + (page.responseTimeMs ?? 0),
      0,
    );
    return Math.round(total / pages.length);
  }, [pages]);

  const lighthouseSummary = useMemo(() => {
    const failed = lighthouse.filter(
      (row: AuditResultsData["lighthouse"][number]) => isLighthouseFailure(row),
    ).length;
    const successful = lighthouse.filter(
      (row: AuditResultsData["lighthouse"][number]) =>
        !isLighthouseFailure(row),
    );
    const averageScore = (
      key: "performanceScore" | "seoScore" | "accessibilityScore",
    ) => {
      const values = successful
        .map((row: AuditResultsData["lighthouse"][number]) => row[key])
        .filter((value: number | null): value is number => value != null);
      if (values.length === 0) return null;
      const total = values.reduce((sum: number, value) => sum + value, 0);
      return Math.round(total / values.length);
    };

    return {
      failed,
      avgPerformance: averageScore("performanceScore"),
      avgSeo: averageScore("seoScore"),
      avgAccessibility: averageScore("accessibilityScore"),
    };
  }, [lighthouse]);

  return { averageResponseMs, lighthouseSummary };
}

function ResultsHeader({
  tabs,
  activeTab,
  onTabChange,
  showExport,
  onExport,
}: {
  tabs: Array<{ tab: ResultsTab; label: string }>;
  activeTab: string;
  onTabChange: (tab: ResultsTab) => void;
  showExport: boolean;
  onExport: (format: "csv" | "json" | "sheets") => void;
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div role="tablist" className="tabs tabs-box w-fit">
        {tabs.map(({ label, tab }) => {
          const isActive = activeTab === tab;

          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`tab ${isActive ? "tab-active" : ""}`}
              onClick={() => onTabChange(tab)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {showExport && <ExportDropdown onExport={onExport} />}
    </div>
  );
}

function StatsGrid({
  pagesCrawled,
  totalPages,
  totalLighthouse,
  averageResponseMs,
  lighthouseSummary,
}: {
  pagesCrawled: number;
  totalPages: number;
  totalLighthouse: number;
  averageResponseMs: number;
  lighthouseSummary: {
    failed: number;
    avgPerformance: number | null;
    avgSeo: number | null;
    avgAccessibility: number | null;
  };
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard label="Pages Crawled" value={String(pagesCrawled)} />
      <StatCard label="Total URLs" value={String(totalPages)} />
      <StatCard label="Lighthouse Tests" value={String(totalLighthouse)} />
      <StatCard label="Avg Response" value={`${averageResponseMs}ms`} />
      {totalLighthouse > 0 && (
        <>
          <StatCard
            label="Avg Lighthouse Perf"
            value={
              lighthouseSummary.avgPerformance == null
                ? "-"
                : String(lighthouseSummary.avgPerformance)
            }
            className={scoreClass(lighthouseSummary.avgPerformance)}
          />
          <StatCard
            label="Avg Lighthouse SEO"
            value={
              lighthouseSummary.avgSeo == null
                ? "-"
                : String(lighthouseSummary.avgSeo)
            }
            className={scoreClass(lighthouseSummary.avgSeo)}
          />
          <StatCard
            label="Avg Lighthouse A11y"
            value={
              lighthouseSummary.avgAccessibility == null
                ? "-"
                : String(lighthouseSummary.avgAccessibility)
            }
            className={scoreClass(lighthouseSummary.avgAccessibility)}
          />
          <StatCard
            label="Lighthouse Failures"
            value={String(lighthouseSummary.failed)}
            className={
              lighthouseSummary.failed > 0 ? "text-error" : "text-success"
            }
          />
        </>
      )}
    </div>
  );
}

function scoreClass(score: number | null) {
  if (score == null) return "";
  if (score >= 90) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-error";
}
