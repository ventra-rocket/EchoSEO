import { useMemo, useState } from "react";
import { useIntl } from "react-intl";
import type { SortingState } from "@tanstack/react-table";
import {
  AppDataTable,
  useAppTable,
} from "@/client/components/table/AppDataTable";
import { TableExportMenu } from "@/client/components/table/TableBulkActionBar";
import { extractPathname } from "@/client/features/audit/shared";
import type { AuditResultsData } from "@/client/features/audit/results/types";
import {
  countActiveFilters,
  EmptyTableMessage,
  PagesFilterBar,
  PerformanceFilterBar,
  TableFilterToggle,
} from "@/client/features/audit/results/AuditResultsTableFilters";
import {
  EMPTY_PAGES_FILTERS,
  EMPTY_PERFORMANCE_FILTERS,
  filterPages,
  filterPerformanceRows,
  type PagesFilters,
  type PerformanceFilters,
} from "@/client/features/audit/results/AuditResultsTableFilterLogic";
import { buildPagesColumns } from "@/client/features/audit/results/PagesTableColumns";
import { buildPerformanceColumns } from "@/client/features/audit/results/PerformanceTableColumns";

export function PagesTable({ pages }: { pages: AuditResultsData["pages"] }) {
  const intl = useIntl();
  const [filters, setFilters] = useState<PagesFilters>(EMPTY_PAGES_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "statusCode", desc: true },
  ]);
  const activeFilterCount = countActiveFilters(filters, EMPTY_PAGES_FILTERS);
  const filteredPages = useMemo(
    () => filterPages(pages, filters),
    [filters, pages],
  );
  const columns = useMemo(() => buildPagesColumns(intl), [intl]);
  const table = useAppTable({
    data: filteredPages,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    withSorting: true,
  });

  return (
    <div className="space-y-3">
      <TableFilterToggle
        showFilters={showFilters}
        onToggle={() => setShowFilters((current) => !current)}
        activeFilterCount={activeFilterCount}
        resultCount={filteredPages.length}
        totalCount={pages.length}
      />
      {showFilters ? (
        <PagesFilterBar
          filters={filters}
          onChange={setFilters}
          activeFilterCount={activeFilterCount}
          onReset={() => setFilters(EMPTY_PAGES_FILTERS)}
        />
      ) : null}
      <AppDataTable
        table={table}
        className="table table-sm"
        empty={
          <EmptyTableMessage
            label={intl.formatMessage({
              id: "audit.results.pagesTable.emptyFiltered",
            })}
          />
        }
      />
    </div>
  );
}

export function PerformanceTable({
  auditId,
  projectId,
  lighthouse,
  pages,
}: {
  auditId: string;
  projectId: string;
  lighthouse: AuditResultsData["lighthouse"];
  pages: AuditResultsData["pages"];
}) {
  const intl = useIntl();
  const [filters, setFilters] = useState<PerformanceFilters>(
    EMPTY_PERFORMANCE_FILTERS,
  );
  const [showFilters, setShowFilters] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "performanceScore", desc: false },
  ]);
  const rows = useMemo(
    () =>
      lighthouse.map((result) => {
        const page = pages.find((candidate) => candidate.id === result.pageId);
        const pageUrl = page?.url ?? null;
        return {
          ...result,
          pageUrl,
          pagePath: pageUrl ? extractPathname(pageUrl) : null,
        };
      }),
    [lighthouse, pages],
  );
  const filteredRows = useMemo(
    () => filterPerformanceRows(rows, filters),
    [filters, rows],
  );
  const activeFilterCount = countActiveFilters(
    filters,
    EMPTY_PERFORMANCE_FILTERS,
  );
  const columns = useMemo(
    () => buildPerformanceColumns({ auditId, projectId, intl }),
    [auditId, projectId, intl],
  );
  const table = useAppTable({
    data: filteredRows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    withSorting: true,
  });

  return (
    <div className="space-y-3">
      <TableFilterToggle
        showFilters={showFilters}
        onToggle={() => setShowFilters((current) => !current)}
        activeFilterCount={activeFilterCount}
        resultCount={filteredRows.length}
        totalCount={rows.length}
      />
      {showFilters ? (
        <PerformanceFilterBar
          filters={filters}
          onChange={setFilters}
          activeFilterCount={activeFilterCount}
          onReset={() => setFilters(EMPTY_PERFORMANCE_FILTERS)}
        />
      ) : null}
      <AppDataTable
        table={table}
        className="table table-sm"
        empty={
          <EmptyTableMessage
            label={intl.formatMessage({
              id: "audit.results.performanceTable.emptyFiltered",
            })}
          />
        }
      />
    </div>
  );
}

export function ExportDropdown({
  onExport,
}: {
  onExport: (format: "csv" | "json" | "sheets") => void;
}) {
  const intl = useIntl();
  return (
    <TableExportMenu
      label={intl.formatMessage({ id: "audit.results.export.trigger" })}
      buttonClassName="btn btn-sm btn-ghost gap-1"
      menuClassName="dropdown-content z-10 menu p-2 shadow-lg bg-base-100 border border-base-300 rounded-box w-52"
      actions={[
        {
          label: intl.formatMessage({ id: "audit.results.export.sheets" }),
          onClick: () => onExport("sheets"),
        },
        {
          label: intl.formatMessage({ id: "audit.results.export.csv" }),
          onClick: () => onExport("csv"),
        },
        {
          label: intl.formatMessage({ id: "audit.results.export.json" }),
          onClick: () => onExport("json"),
        },
      ]}
    />
  );
}
