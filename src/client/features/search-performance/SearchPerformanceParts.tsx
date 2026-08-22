import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, Save } from "lucide-react";
import { FormattedMessage, useIntl, type IntlShape } from "react-intl";
import { toast } from "sonner";
import {
  AppDataTable,
  useAppTable,
  useSelectionAnchor,
} from "@/client/components/table/AppDataTable";
import {
  TableBulkActionBar,
  TableBulkActionButton,
} from "@/client/components/table/TableBulkActionBar";
import { TablePagination } from "@/client/components/table/TablePagination";
import {
  buildDimensionColumns,
  buildStrikingColumns,
  formatCount,
  formatCtr,
  formatPosition,
  type Report,
  type SearchPerformanceTableRow,
} from "@/client/features/search-performance/SearchPerformanceColumns";
import { buildCsv, downloadCsv, type CsvValue } from "@/client/lib/csv";
import { getLocalizedErrorMessage } from "@/client/lib/error-messages";
import { exportTableToSheets } from "@/client/lib/exportToSheets";
import { captureClientEvent } from "@/client/lib/posthog";
import {
  SEARCH_PERFORMANCE_PAGE_SIZES,
  type SearchPerformanceTableDimension,
} from "@/types/schemas/search-performance";
import { saveKeywords } from "@/serverFunctions/keywords";

export type Tab = "striking" | "queries" | "pages";
export type ExportTarget = "csv" | "sheets";

type ExportTable = { filename: string; headers: string[]; rows: CsvValue[][] };

function strikingExportTable(report: Report): ExportTable {
  const stamp = `${report.range.startDate}-to-${report.range.endDate}`;
  return {
    filename: `search-performance-striking-distance-${stamp}.csv`,
    headers: ["Query", "Page", "Impressions", "Clicks", "Position"],
    rows: report.strikingDistance.map((row) => [
      row.query,
      row.page,
      row.impressions,
      row.clicks,
      row.position,
    ]),
  };
}

function dimensionExportTable(
  dimension: SearchPerformanceTableDimension,
  rows: SearchPerformanceTableRow[],
  stamp: string,
): ExportTable {
  const isPage = dimension === "page";
  return {
    filename: `search-performance-${isPage ? "pages" : "queries"}-${stamp}.csv`,
    headers: [
      isPage ? "Page" : "Query",
      "Clicks",
      "Impressions",
      "CTR",
      "Position",
    ],
    rows: rows.map((row) => [
      row.key,
      row.clicks,
      row.impressions,
      row.ctr,
      row.position,
    ]),
  };
}

function runExport(table: ExportTable, target: ExportTarget): void {
  if (target === "csv") {
    downloadCsv(table.filename, buildCsv(table.headers, table.rows));
    captureClientEvent("data:export", {
      source_feature: "search_performance",
      result_count: table.rows.length,
    });
    return;
  }
  void exportTableToSheets({
    headers: table.headers,
    rows: table.rows,
    feature: "search_performance",
  });
}

export function exportStriking(report: Report, target: ExportTarget): void {
  runExport(strikingExportTable(report), target);
}

/** Export the full queries/pages dataset (fetched separately, not the visible
 *  page) so pagination never truncates a download. */
export function exportDimensionRows(
  dimension: SearchPerformanceTableDimension,
  rows: SearchPerformanceTableRow[],
  range: Report["range"],
  target: ExportTarget,
): void {
  const stamp = `${range.startDate}-to-${range.endDate}`;
  runExport(dimensionExportTable(dimension, rows, stamp), target);
}

export function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`tab ${active ? "tab-active" : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

type Delta = { text: string; improved: boolean } | null;

function percentDelta(
  intl: IntlShape,
  current: number,
  previous: number,
): Delta {
  if (previous <= 0) return null;
  const change = (current - previous) / previous;
  return {
    text: intl.formatNumber(change, {
      style: "percent",
      signDisplay: "always",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
    improved: change >= 0,
  };
}

/** Position falls as rankings improve, so the delta is inverted. */
function positionDelta(
  intl: IntlShape,
  current: number,
  previous: number,
): Delta {
  if (previous <= 0 || current <= 0) return null;
  const change = previous - current;
  return {
    text: intl.formatNumber(change, {
      signDisplay: "always",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
    improved: change >= 0,
  };
}

export function TotalsCards({ report }: { report: Report }) {
  const intl = useIntl();
  const { totals, prevTotals, range } = report;
  // range.prevStartDate/prevEndDate are calendar-day strings (YYYY-MM-DD), not
  // instants — formatting in the viewer's local zone could shift the
  // displayed day, so the UTC offset is pinned to match the string exactly.
  const deltaTitle = intl.formatMessage(
    { id: "searchPerf.totals.deltaTitle" },
    {
      prevStart: intl.formatDate(range.prevStartDate, {
        dateStyle: "medium",
        timeZone: "UTC",
      }),
      prevEnd: intl.formatDate(range.prevEndDate, {
        dateStyle: "medium",
        timeZone: "UTC",
      }),
    },
  );
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <TotalCard
        label={intl.formatMessage({ id: "searchPerf.metric.clicks" })}
        value={formatCount(intl, totals.clicks)}
        delta={percentDelta(intl, totals.clicks, prevTotals.clicks)}
        deltaTitle={deltaTitle}
      />
      <TotalCard
        label={intl.formatMessage({ id: "searchPerf.metric.impressions" })}
        value={formatCount(intl, totals.impressions)}
        delta={percentDelta(intl, totals.impressions, prevTotals.impressions)}
        deltaTitle={deltaTitle}
      />
      <TotalCard
        label={intl.formatMessage({ id: "searchPerf.metric.ctr" })}
        value={formatCtr(intl, totals.ctr)}
        delta={percentDelta(intl, totals.ctr, prevTotals.ctr)}
        deltaTitle={deltaTitle}
      />
      <TotalCard
        label={intl.formatMessage({ id: "searchPerf.metric.avgPosition" })}
        value={formatPosition(intl, totals.position)}
        delta={positionDelta(intl, totals.position, prevTotals.position)}
        deltaTitle={deltaTitle}
      />
    </div>
  );
}

function TotalCard({
  label,
  value,
  delta,
  deltaTitle,
}: {
  label: string;
  value: string;
  delta: Delta;
  deltaTitle: string;
}) {
  return (
    <div className="rounded-lg border border-base-300 bg-base-100 p-4">
      <div className="text-xs uppercase tracking-wide text-base-content/60">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold">{value}</span>
        {delta ? (
          <span
            className={`text-xs ${delta.improved ? "text-success" : "text-error"}`}
            title={deltaTitle}
          >
            {delta.text}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function DimensionTable({
  rows,
  keyLabel,
}: {
  rows: SearchPerformanceTableRow[];
  keyLabel: string;
}) {
  const intl = useIntl();
  const columns = useMemo(
    () => buildDimensionColumns(intl, keyLabel),
    [intl, keyLabel],
  );
  const table = useAppTable({
    data: rows,
    columns,
    withSorting: true,
    initialState: { sorting: [{ id: "clicks", desc: true }] },
  });
  return (
    <AppDataTable
      table={table}
      className="table table-zebra table-sm"
      wrapperClassName="overflow-x-auto"
      empty={
        <p className="p-6 text-sm text-base-content/60">
          <FormattedMessage id="searchPerf.dimensionTable.empty" />
        </p>
      }
    />
  );
}

export function StrikingDistanceTable({
  projectId,
  rows,
}: {
  projectId: string;
  rows: Report["strikingDistance"];
}) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const anchorRef = useSelectionAnchor();
  const [rowSelection, setRowSelection] = useState({});
  const columns = useMemo(
    () => buildStrikingColumns(anchorRef, intl),
    [anchorRef, intl],
  );
  const table = useAppTable({
    data: rows,
    columns,
    withSorting: true,
    withPagination: true,
    enableRowSelection: true,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => `${row.query}::${row.page}`,
    initialState: {
      sorting: [{ id: "impressions", desc: true }],
      // All rows are already loaded; paginate client-side to keep the table
      // short. 50/page by default.
      pagination: { pageIndex: 0, pageSize: 50 },
    },
  });
  const pagination = table.getState().pagination;

  // Rows are query x page; saving/copying dedupes to the query strings.
  const selectedQueries = Array.from(
    new Set(table.getSelectedRowModel().rows.map((row) => row.original.query)),
  );

  const copyKeywords = async () => {
    try {
      await navigator.clipboard.writeText(selectedQueries.join("\n"));
      toast.success(
        intl.formatMessage(
          { id: "searchPerf.striking.copySuccess" },
          { count: selectedQueries.length },
        ),
      );
    } catch {
      toast.error(intl.formatMessage({ id: "searchPerf.striking.copyError" }));
    }
  };

  const save = useMutation({
    mutationFn: (keywords: string[]) =>
      saveKeywords({ data: { projectId, keywords } }),
    onSuccess: (_result, keywords) => {
      captureClientEvent("keyword:save", {
        source_feature: "search_performance",
        keyword_count: keywords.length,
      });
      void queryClient.invalidateQueries({
        queryKey: ["savedKeywords", projectId],
      });
      toast.success(
        intl.formatMessage(
          { id: "searchPerf.striking.saveSuccess" },
          { count: keywords.length },
        ),
      );
      setRowSelection({});
    },
    onError: (error) => {
      toast.error(
        getLocalizedErrorMessage(
          intl,
          error,
          intl.formatMessage({ id: "searchPerf.striking.saveError" }),
        ),
      );
    },
  });

  if (rows.length === 0) {
    return (
      <p className="p-6 text-sm text-base-content/60">
        <FormattedMessage id="searchPerf.striking.empty" />
      </p>
    );
  }

  return (
    <>
      <div className="p-4">
        <p className="mb-3 text-sm text-base-content/60">
          <FormattedMessage id="searchPerf.striking.explanation" />
        </p>
        <AppDataTable
          table={table}
          className="table table-zebra table-sm"
          wrapperClassName="overflow-x-auto"
        />
      </div>
      <TablePagination
        page={pagination.pageIndex + 1}
        pageSize={pagination.pageSize}
        pageSizes={SEARCH_PERFORMANCE_PAGE_SIZES}
        totalCount={rows.length}
        hasNextPage={table.getCanNextPage()}
        isLoading={false}
        onPageChange={(nextPage) => table.setPageIndex(nextPage - 1)}
        onPageSizeChange={(nextSize) => table.setPageSize(nextSize)}
      />
      <TableBulkActionBar
        selectedCount={selectedQueries.length}
        selectedLabel={intl.formatMessage(
          { id: "searchPerf.striking.selectedLabel" },
          { count: selectedQueries.length },
        )}
        onClear={() => setRowSelection({})}
        actions={
          <div className="flex items-center gap-1 px-1.5">
            <TableBulkActionButton
              icon={<Copy className="size-3.5" />}
              onClick={() => void copyKeywords()}
            >
              <FormattedMessage id="searchPerf.striking.copyKeywords" />
            </TableBulkActionButton>
            <TableBulkActionButton
              icon={
                save.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Save className="size-3.5" />
                )
              }
              onClick={() => save.mutate(selectedQueries)}
              disabled={save.isPending}
            >
              <FormattedMessage id="searchPerf.striking.saveAsKeywords" />
            </TableBulkActionButton>
          </div>
        }
      />
    </>
  );
}
