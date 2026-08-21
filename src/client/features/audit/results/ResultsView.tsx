import { useMemo } from "react";
import { FormattedMessage, useIntl } from "react-intl";
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
import { AuditSearchSignalsPanel } from "@/client/features/audit/search/AuditSearchSignalsPanel";
import { AuditReferringDomainsPanel } from "@/client/features/audit/search/AuditReferringDomainsPanel";
import type { IssueFilters } from "@/client/features/audit/issues/issue-filters";
import type { AuditTab } from "@/types/schemas/audit";
import { AlertTriangle } from "lucide-react";
import { classifyPageStatus } from "@/shared/http-status";

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
  const intl = useIntl();

  // Which tabs this audit can actually back with data. Performance disappears
  // when Lighthouse never ran; Issues is always offered because "issues were
  // never materialized" is itself a state the tab has to report, and hiding the
  // tab would make a failed materializer invisible.
  const availableTabs: Array<{ tab: ResultsTab; label: string }> = [
    {
      tab: "pages",
      label: intl.formatMessage(
        { id: "audit.results.tab.pages" },
        { count: pages.length },
      ),
    },
    ...(lighthouse.length > 0
      ? [
          {
            tab: "performance" as const,
            label: intl.formatMessage(
              { id: "audit.results.tab.performance" },
              { count: lighthouse.length },
            ),
          },
        ]
      : []),
    {
      tab: "issues" as const,
      label: intl.formatMessage({ id: "audit.results.tab.allIssues" }),
    },
    // Always offered: "Search Console isn't connected" is itself a state the tab
    // reports, and hiding it would make a missing connection invisible.
    {
      tab: "search" as const,
      label: intl.formatMessage({ id: "audit.results.tab.search" }),
    },
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

      {stats.throttledCount > 0 && (
        <ThrottledCrawlNotice throttledCount={stats.throttledCount} />
      )}

      {audit.pagesCrawled >= audit.config.maxPages && (
        <TruncatedCrawlNotice
          limit={audit.config.maxPages}
          startUrl={audit.startUrl}
        />
      )}

      <div className="card bg-base-100 border border-base-300">
        <div className="card-body gap-3">
          <ResultsHeader
            tabs={availableTabs}
            activeTab={activeTab}
            onTabChange={onTabChange}
            // Only the two client-held tables export. Issues page through the
            // server and Search is live GSC data — neither has a full set here.
            showExport={activeTab === "pages" || activeTab === "performance"}
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
          {activeTab === "search" && (
            <div className="space-y-6">
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-base-content/80">
                  <FormattedMessage id="audit.results.search.consoleTitle" />
                  <span className="ml-2 font-normal text-base-content/50">
                    <FormattedMessage id="audit.results.search.consoleTag" />
                  </span>
                </h3>
                <AuditSearchSignalsPanel
                  auditId={audit.id}
                  projectId={projectId}
                />
              </section>
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-base-content/80">
                  <FormattedMessage id="audit.results.search.referringDomainsTitle" />
                  <span className="ml-2 font-normal text-base-content/50">
                    <FormattedMessage id="audit.results.search.referringDomainsTag" />
                  </span>
                </h3>
                <AuditReferringDomainsPanel
                  auditId={audit.id}
                  projectId={projectId}
                />
              </section>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * Says out loud that the crawl stopped at its limit.
 *
 * Without this the report is a quiet lie by omission: a 30,000-page site returns
 * a page count and no indication that most of it was never looked at, and the
 * reader concludes the site is small or the tool is thorough. Both wrong.
 *
 * It also explains the two missing checks. A partial crawl switches off
 * orphan-page and sitemap-coverage detection (`cross-page-signals.ts`), because a
 * page nothing appears to link to may simply not have been reached yet — and
 * "orphan" is an accusation worth being sure about.
 */
function TruncatedCrawlNotice({
  limit,
  startUrl,
}: {
  limit: number;
  startUrl: string;
}) {
  return (
    <div className="alert alert-warning items-start" role="status">
      <AlertTriangle className="size-5 shrink-0" />
      <div className="space-y-1 text-sm">
        <p className="font-medium">
          <FormattedMessage
            id="audit.results.truncatedNotice.title"
            values={{ limit }}
          />
        </p>
        <p>
          <FormattedMessage
            id="audit.results.truncatedNotice.body"
            values={{ limit, startUrl }}
          />
        </p>
        <p className="text-base-content/70">
          <FormattedMessage id="audit.results.truncatedNotice.note" />
        </p>
      </div>
    </div>
  );
}

/**
 * Says out loud that part of the crawl never happened, and whose fault that is.
 *
 * Rendered from the rows themselves rather than a stored counter: the snapshot has
 * no `pages_throttled` column, and deriving it here means the notice can never
 * disagree with the `Throttled` filter beside it.
 */
function ThrottledCrawlNotice({ throttledCount }: { throttledCount: number }) {
  return (
    <div className="alert alert-warning items-start" role="status">
      <AlertTriangle className="size-5 shrink-0" />
      <div className="space-y-1 text-sm">
        <p className="font-medium">
          <FormattedMessage
            id="audit.results.throttledNotice.title"
            values={{ count: throttledCount }}
          />
        </p>
        <p>
          <FormattedMessage
            id="audit.results.throttledNotice.body"
            values={{
              mono: (chunks) => <span className="font-mono">{chunks}</span>,
              em: (chunks) => <em>{chunks}</em>,
            }}
          />
        </p>
        <p className="text-base-content/70">
          <FormattedMessage id="audit.results.throttledNotice.note" />
        </p>
      </div>
    </div>
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

  const throttledCount = useMemo(
    () =>
      pages.filter(
        (page: AuditResultsData["pages"][number]) =>
          classifyPageStatus(page.statusCode) === "throttled",
      ).length,
    [pages],
  );

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

  return { averageResponseMs, lighthouseSummary, throttledCount };
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
  const intl = useIntl();
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        label={intl.formatMessage({ id: "audit.results.stats.pagesCrawled" })}
        value={String(pagesCrawled)}
      />
      <StatCard
        label={intl.formatMessage({ id: "audit.results.stats.totalUrls" })}
        value={String(totalPages)}
      />
      <StatCard
        label={intl.formatMessage({
          id: "audit.results.stats.lighthouseTests",
        })}
        value={String(totalLighthouse)}
      />
      <StatCard
        label={intl.formatMessage({ id: "audit.results.stats.avgResponse" })}
        value={`${averageResponseMs}ms`}
      />
      {totalLighthouse > 0 && (
        <>
          <StatCard
            label={intl.formatMessage({
              id: "audit.results.stats.avgLighthousePerf",
            })}
            value={
              lighthouseSummary.avgPerformance == null
                ? "-"
                : String(lighthouseSummary.avgPerformance)
            }
            className={scoreClass(lighthouseSummary.avgPerformance)}
          />
          <StatCard
            label={intl.formatMessage({
              id: "audit.results.stats.avgLighthouseSeo",
            })}
            value={
              lighthouseSummary.avgSeo == null
                ? "-"
                : String(lighthouseSummary.avgSeo)
            }
            className={scoreClass(lighthouseSummary.avgSeo)}
          />
          <StatCard
            label={intl.formatMessage({
              id: "audit.results.stats.avgLighthouseA11y",
            })}
            value={
              lighthouseSummary.avgAccessibility == null
                ? "-"
                : String(lighthouseSummary.avgAccessibility)
            }
            className={scoreClass(lighthouseSummary.avgAccessibility)}
          />
          <StatCard
            label={intl.formatMessage({
              id: "audit.results.stats.lighthouseFailures",
            })}
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
