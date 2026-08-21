import {
  ChevronDown,
  Download,
  FileDown,
  RotateCcw,
  Save,
  Sheet,
  SlidersHorizontal,
} from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  downloadKeywordResearchCsv,
  KEYWORD_RESEARCH_HEADERS,
  keywordResearchExportRow,
} from "@/client/features/keywords/state/keywordControllerActions";
import { exportTableToSheets } from "@/client/lib/exportToSheets";
import { captureClientEvent } from "@/client/lib/posthog";
import { SerpAnalysisCard } from "@/client/features/keywords/components";
import { KeywordResearchDesktopTable } from "./KeywordResearchDesktopTable";
import {
  KeywordResearchPagination,
  useKeywordResearchPagination,
} from "./KeywordResearchPagination";
import type { KeywordResearchControllerState } from "./types";
import {
  TableBulkActionBar,
  TableBulkActionButton,
  TableBulkExportMenu,
} from "@/client/components/table/TableBulkActionBar";

type Props = {
  controller: KeywordResearchControllerState;
};

export function KeywordResearchMobileResults({ controller }: Props) {
  const { filteredRows, mobileTab } = controller;

  return (
    <div className="flex-1 flex flex-col overflow-hidden md:hidden">
      <div className="shrink-0 flex border-b border-base-300 bg-base-100">
        <button
          className={`flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors ${
            mobileTab === "keywords"
              ? "border-primary text-primary"
              : "border-transparent text-base-content/60"
          }`}
          onClick={() => controller.setMobileTab("keywords")}
        >
          <FormattedMessage
            id="keywordResearch.mobileResults.tabKeywords"
            values={{ count: filteredRows.length }}
          />
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors ${
            mobileTab === "serp"
              ? "border-primary text-primary"
              : "border-transparent text-base-content/60"
          }`}
          onClick={() => controller.setMobileTab("serp")}
        >
          <FormattedMessage id="keywordResearch.results.serpHeading" />
        </button>
      </div>

      {mobileTab === "keywords" ? (
        <MobileKeywordResults controller={controller} />
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
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
      )}
    </div>
  );
}

function MobileKeywordResults({ controller }: Props) {
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
          { id: "keywordResearch.mobileResults.selectedCount" },
          { count: selectedRows.size },
        )
      : activeFilterCount > 0
        ? intl.formatMessage(
            { id: "keywordResearch.mobileResults.filteredOfTotal" },
            { filtered: filteredRows.length, total: rows.length },
          )
        : intl.formatMessage(
            { id: "keywordResearch.mobileResults.filteredCount" },
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
    <div className="flex-1 flex flex-col overflow-hidden">
      {controller.showApproximateMatchNotice ? (
        <div
          className="mx-4 mt-2 rounded-lg border border-warning/40 bg-warning/15 px-3 py-2 text-xs text-base-content"
          role="status"
        >
          <FormattedMessage
            id="keywordResearch.mobileResults.approximateMatch"
            values={{
              keyword: controller.searchedKeyword,
              b: (chunks) => <span className="font-medium">{chunks}</span>,
            }}
          />
        </div>
      ) : null}

      <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-base-300 bg-base-100">
        <button
          className={`btn btn-ghost btn-xs gap-1 ${showFilters ? "btn-active" : ""}`}
          onClick={() => controller.setShowFilters((current) => !current)}
        >
          <SlidersHorizontal className="size-3.5" />
          <FormattedMessage id="keywordResearch.results.filtersButton" />
          {activeFilterCount > 0 ? (
            <span className="badge badge-xs badge-primary border-0 text-primary-content">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
        <span className="text-xs text-base-content/60">
          {keywordCountLabel}
        </span>
        <div className="flex-1" />
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className={`btn btn-ghost btn-xs gap-1 ${!canExport ? "btn-disabled" : ""}`}
            aria-label={intl.formatMessage({ id: "common.table.export" })}
          >
            <Download className="size-3.5" />
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
              <FormattedMessage id="keywordResearch.mobileResults.saveButton" />
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

      {showFilters ? <MobileFilters controller={controller} /> : null}

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

function MobileFilters({ controller }: Props) {
  const { activeFilterCount, filtersForm } = controller;
  const intl = useIntl();

  return (
    <div className="shrink-0 border-b border-base-300 bg-gradient-to-b from-base-100 to-base-200/30 px-4 py-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold">
            <FormattedMessage id="keywordResearch.results.refineResults" />
          </p>
          {activeFilterCount > 0 ? (
            <span className="badge badge-xs badge-primary border-0 text-primary-content">
              {activeFilterCount}
            </span>
          ) : null}
        </div>
        <button
          className="btn btn-xs btn-ghost gap-1"
          onClick={controller.resetFilters}
          disabled={activeFilterCount === 0}
        >
          <RotateCcw className="size-3" />
          <FormattedMessage id="keywordResearch.mobileResults.clear" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <filtersForm.Field name="include">
          {(field) => (
            <input
              className="input input-bordered input-sm bg-base-100"
              placeholder={intl.formatMessage({
                id: "keywordResearch.mobileResults.includePlaceholder",
              })}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          )}
        </filtersForm.Field>
        <filtersForm.Field name="exclude">
          {(field) => (
            <input
              className="input input-bordered input-sm bg-base-100"
              placeholder={intl.formatMessage({
                id: "keywordResearch.mobileResults.excludePlaceholder",
              })}
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          )}
        </filtersForm.Field>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MobileRangeInput
          form={filtersForm}
          name="minVol"
          placeholder={intl.formatMessage({
            id: "keywordResearch.mobileResults.minVolume",
          })}
        />
        <MobileRangeInput
          form={filtersForm}
          name="maxVol"
          placeholder={intl.formatMessage({
            id: "keywordResearch.mobileResults.maxVolume",
          })}
        />
        <MobileRangeInput
          form={filtersForm}
          name="minCpc"
          placeholder={intl.formatMessage({
            id: "keywordResearch.mobileResults.minCpc",
          })}
          step="0.01"
        />
        <MobileRangeInput
          form={filtersForm}
          name="maxCpc"
          placeholder={intl.formatMessage({
            id: "keywordResearch.mobileResults.maxCpc",
          })}
          step="0.01"
        />
        <MobileRangeInput
          form={filtersForm}
          name="minKd"
          placeholder={intl.formatMessage({
            id: "keywordResearch.mobileResults.minDifficulty",
          })}
        />
        <MobileRangeInput
          form={filtersForm}
          name="maxKd"
          placeholder={intl.formatMessage({
            id: "keywordResearch.mobileResults.maxDifficulty",
          })}
        />
      </div>
    </div>
  );
}

function MobileRangeInput({
  form,
  name,
  placeholder,
  step,
}: {
  form: KeywordResearchControllerState["filtersForm"];
  name: "minVol" | "maxVol" | "minCpc" | "maxCpc" | "minKd" | "maxKd";
  placeholder: string;
  step?: string;
}) {
  return (
    <form.Field name={name}>
      {(field) => (
        <input
          className="input input-bordered input-sm bg-base-100"
          placeholder={placeholder}
          type="number"
          step={step}
          value={field.state.value}
          onChange={(event) => field.handleChange(event.target.value)}
        />
      )}
    </form.Field>
  );
}
