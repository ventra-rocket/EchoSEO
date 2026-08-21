import {
  ChevronDown,
  Download,
  FileDown,
  Globe,
  Save,
  Sheet,
  SlidersHorizontal,
} from "lucide-react";
import { FormattedMessage, type IntlShape, useIntl } from "react-intl";
import type { MessageId } from "@/client/i18n/messages";
import type { ResearchSource } from "@/client/features/keywords/keywordResearchTypes";
import {
  downloadKeywordResearchCsv,
  KEYWORD_RESEARCH_HEADERS,
  keywordResearchExportRow,
} from "@/client/features/keywords/state/keywordControllerActions";
import { exportTableToSheets } from "@/client/lib/exportToSheets";
import { captureClientEvent } from "@/client/lib/posthog";
import {
  AreaTrendChart,
  OverviewStats,
  SerpAnalysisCard,
} from "@/client/features/keywords/components";
import type { KeywordResearchRow } from "@/types/keywords";
import type { KeywordResearchControllerState } from "./types";
import { DesktopFilters } from "./keywordResearchDesktopFilters";
import { KeywordResearchDesktopTable } from "./KeywordResearchDesktopTable";
import {
  KeywordResearchPagination,
  useKeywordResearchPagination,
} from "./KeywordResearchPagination";
import {
  TableBulkActionBar,
  TableBulkActionButton,
  TableBulkExportMenu,
} from "@/client/components/table/TableBulkActionBar";

function formatTrendRangeLabel(
  intl: IntlShape,
  trend: KeywordResearchRow["trend"],
): string {
  if (trend.length === 0) {
    return intl.formatMessage({
      id: "keywordResearch.desktopResults.trendRangeDefault",
    });
  }

  const sorted = trend.toSorted(
    (a, b) => a.year * 100 + a.month - (b.year * 100 + b.month),
  );
  const last12 = sorted.slice(-12);
  const start = last12[0];
  const end = last12[last12.length - 1];

  // Month/year only, no day — pinned to UTC so the label never rolls to the
  // adjacent month for a reader west of Greenwich.
  const toLabel = (month: number, year: number) =>
    intl.formatDate(Date.UTC(year, month - 1, 1), {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });

  const startLabel = toLabel(start.month, start.year);
  const endLabel = toLabel(end.month, end.year);
  return startLabel === endLabel
    ? startLabel
    : intl.formatMessage(
        { id: "keywordResearch.desktopResults.trendRange" },
        { start: startLabel, end: endLabel },
      );
}

// `lastResultSource` is a KeywordSource ("related" | "suggestions" | "ideas")
// or "google_ads" — the same values the search bar's mode <select> offers, so
// the fallback-source note below reuses those labels instead of leaking the
// raw enum value into a Vietnamese sentence.
const SOURCE_LABEL_IDS: Record<ResearchSource, MessageId> = {
  related: "keywordResearch.mode.related",
  suggestions: "keywordResearch.mode.suggestions",
  ideas: "keywordResearch.mode.ideas",
  google_ads: "keywordResearch.mode.googleAds",
};

type Props = {
  controller: KeywordResearchControllerState;
};

export function KeywordResearchDesktopResults({ controller }: Props) {
  return (
    <div className="flex-1 hidden md:flex flex-col xl:flex-row overflow-y-auto xl:overflow-hidden gap-4">
      <DesktopKeywordPanel controller={controller} />
      <DesktopSerpPanel controller={controller} />
    </div>
  );
}

function DesktopKeywordPanel({ controller }: Props) {
  const {
    lastResultSource,
    lastUsedFallback,
    searchedKeyword,
    showApproximateMatchNotice,
  } = controller;

  const intl = useIntl();

  return (
    <div className="order-2 xl:order-1 flex flex-col min-w-0 gap-2 xl:basis-3/5">
      {showApproximateMatchNotice ? (
        <div
          className="rounded-lg border border-warning/40 bg-warning/15 px-3 py-2 text-sm text-base-content"
          role="status"
        >
          <FormattedMessage
            id="keywordResearch.desktopResults.approximateMatch"
            values={{
              keyword: searchedKeyword,
              b: (chunks) => <span className="font-medium">{chunks}</span>,
            }}
          />
          {lastUsedFallback ? (
            <span className="text-base-content/75">
              <FormattedMessage
                id="keywordResearch.desktopResults.approximateMatchSource"
                values={{
                  source: intl.formatMessage({
                    id: SOURCE_LABEL_IDS[lastResultSource],
                  }),
                }}
              />
            </span>
          ) : null}
        </div>
      ) : null}
      {controller.overviewKeyword ? (
        <OverviewStats keyword={controller.overviewKeyword} />
      ) : null}
      <DesktopTableCard controller={controller} />
    </div>
  );
}

function DesktopTableCard({ controller }: Props) {
  const {
    activeFilterCount,
    filteredRows,
    rows,
    selectedRows,
    sheetsExportRows,
    showFilters,
  } = controller;
  const intl = useIntl();
  const { page, pageSize, pageRows, setPage, setPageSize } =
    useKeywordResearchPagination(filteredRows);

  const keywordCountLabel =
    selectedRows.size > 0
      ? intl.formatMessage(
          { id: "keywordResearch.desktopResults.selectedOfTotal" },
          { selected: selectedRows.size, total: filteredRows.length },
        )
      : activeFilterCount > 0
        ? intl.formatMessage(
            { id: "keywordResearch.desktopResults.filteredOfTotal" },
            { filtered: filteredRows.length, total: rows.length },
          )
        : intl.formatMessage(
            { id: "keywordResearch.desktopResults.filteredCount" },
            { count: filteredRows.length },
          );

  const canExport = filteredRows.length > 0;
  const selectedExportRows = filteredRows
    .filter((row) => selectedRows.has(row.keyword))
    .map(keywordResearchExportRow);
  const handleExportToSheets = () => {
    void exportTableToSheets({
      headers: KEYWORD_RESEARCH_HEADERS,
      rows: sheetsExportRows,
      feature: "keyword_research",
    });
  };
  const handleExportSelectionToSheets = () => {
    void exportTableToSheets({
      headers: KEYWORD_RESEARCH_HEADERS,
      rows: selectedExportRows,
      feature: "keyword_research",
    });
  };
  const handleExportSelectionCsv = () => {
    downloadKeywordResearchCsv(selectedExportRows);
    captureClientEvent("data:export", {
      source_feature: "keyword_research",
      result_count: selectedExportRows.length,
      scope: "selection",
    });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 border border-base-300 rounded-xl bg-base-100 overflow-hidden">
      <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-base-300">
        <button
          className={`btn btn-ghost btn-sm gap-1.5 ${showFilters ? "btn-active" : ""}`}
          onClick={() => controller.setShowFilters((current) => !current)}
          title={intl.formatMessage({
            id: "keywordResearch.desktopResults.toggleFiltersTitle",
          })}
        >
          <SlidersHorizontal className="size-3.5" />
          <FormattedMessage id="keywordResearch.results.filtersButton" />
          {activeFilterCount > 0 ? (
            <span className="badge badge-xs badge-primary border-0 text-primary-content">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
        <span className="text-sm text-base-content/60">
          {keywordCountLabel}
        </span>
        <div className="flex-1" />
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className={`btn btn-ghost btn-sm gap-1 ${!canExport ? "btn-disabled" : ""}`}
          >
            <Download className="size-3.5" />
            <span className="hidden lg:inline">
              <FormattedMessage id="common.table.export" />
            </span>
            <ChevronDown className="size-3 opacity-60" />
          </div>
          <ul
            tabIndex={0}
            className="dropdown-content z-10 menu p-2 shadow-lg bg-base-100 border border-base-300 rounded-box w-56"
          >
            <li>
              <button onClick={handleExportToSheets} disabled={!canExport}>
                <Sheet className="size-4" />
                <FormattedMessage id="common.sheets.export" />
              </button>
            </li>
            <li>
              <button onClick={controller.exportCsv} disabled={!canExport}>
                <FileDown className="size-4" />
                <FormattedMessage id="keywordResearch.results.exportCsv" />
              </button>
            </li>
          </ul>
        </div>
      </div>

      <TableBulkActionBar
        selectedCount={selectedRows.size}
        onClear={() => controller.setSelectedRows(new Set())}
        actions={
          <div className="flex items-center px-1.5">
            <TableBulkActionButton
              icon={<Save className="size-3.5" />}
              onClick={controller.handleSaveKeywords}
            >
              <FormattedMessage id="keywordResearch.desktopResults.saveKeywords" />
            </TableBulkActionButton>
            <TableBulkExportMenu
              actions={[
                {
                  label: intl.formatMessage({ id: "common.sheets.export" }),
                  icon: <Sheet className="size-4" />,
                  onClick: handleExportSelectionToSheets,
                },
                {
                  label: intl.formatMessage({
                    id: "keywordResearch.results.exportCsv",
                  }),
                  icon: <FileDown className="size-4" />,
                  onClick: handleExportSelectionCsv,
                },
              ]}
            />
          </div>
        }
      />

      {showFilters ? <DesktopFilters controller={controller} /> : null}
      <KeywordResearchDesktopTable
        activeFilterCount={controller.activeFilterCount}
        filteredRows={pageRows}
        overviewKeyword={controller.overviewKeyword}
        selectedRows={controller.selectedRows}
        setSelectedRows={controller.setSelectedRows}
        sortDir={controller.sortDir}
        sortField={controller.sortField}
        toggleSort={controller.toggleSort}
        resetFilters={controller.resetFilters}
        handleRowClick={controller.handleRowClick}
      />
      {filteredRows.length > 0 ? (
        <KeywordResearchPagination
          page={page}
          pageSize={pageSize}
          totalCount={filteredRows.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      ) : null}
    </div>
  );
}

function DesktopSerpPanel({ controller }: Props) {
  const { overviewKeyword } = controller;
  const intl = useIntl();
  const trendRangeLabel = formatTrendRangeLabel(
    intl,
    overviewKeyword?.trend ?? [],
  );

  return (
    <div className="order-1 xl:order-2 flex flex-col min-w-0 gap-2 xl:basis-2/5 xl:overflow-y-auto">
      {overviewKeyword && overviewKeyword.trend.length > 0 ? (
        <div className="shrink-0 overflow-hidden border border-base-300 rounded-xl bg-base-100 px-4 py-3">
          <h4 className="text-sm font-semibold mb-1">
            <FormattedMessage id="keywordResearch.desktopResults.trendHeading" />{" "}
            <span className="font-normal text-base-content/50">
              {trendRangeLabel}
            </span>
          </h4>
          <AreaTrendChart trend={overviewKeyword.trend} />
        </div>
      ) : null}

      <div className="flex flex-col overflow-hidden border border-base-300 rounded-xl bg-base-100">
        <div className="shrink-0 px-4 py-3 border-b border-base-300">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Globe className="size-3.5" />
            <FormattedMessage id="keywordResearch.results.serpHeading" />
            {controller.activeSerpKeyword ? (
              <span className="font-normal text-base-content/50 truncate">
                : {controller.activeSerpKeyword}
              </span>
            ) : null}
          </h3>
        </div>
        <div className="p-4">
          <SerpAnalysisCard
            items={controller.serpResults}
            keyword={controller.activeSerpKeyword}
            loading={controller.serpLoading}
            error={controller.serpError}
            onRetry={() => void controller.serpQuery.refetch()}
            page={controller.serpPage}
            pageSize={controller.SERP_PAGE_SIZE}
            onPageChange={controller.setSerpPage}
            seoKeyMissing={controller.seoKeyMissing}
          />
        </div>
      </div>
    </div>
  );
}
