import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useIntl } from "react-intl";
import { TableExportMenu } from "@/client/components/table/TableBulkActionBar";
import { TableLoadingRows } from "@/client/features/domain/components/TableLoadingRows";

type DomainTableExportAction = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
};

type Props = {
  showFilters: boolean;
  onToggleFilters: () => void;
  activeFilterCount: number;
  /** Pre-formatted "N keywords" / "N pages" summary; the caller owns the
   * pluralization since only it knows which noun applies. */
  resultSummary: ReactNode;
  exportActions: DomainTableExportAction[];
  filterPanel?: ReactNode;
  isLoading: boolean;
  showTableLoading: boolean;
  children: ReactNode;
  pagination: ReactNode;
};

export function DomainTableTabSurface({
  showFilters,
  onToggleFilters,
  activeFilterCount,
  resultSummary,
  exportActions,
  filterPanel,
  isLoading,
  showTableLoading,
  children,
  pagination,
}: Props) {
  const intl = useIntl();
  return (
    <>
      <div className="flex items-center gap-2 px-4 py-2 border-b border-base-300">
        <button
          className={`btn btn-ghost btn-sm gap-1.5 ${showFilters ? "btn-active" : ""}`}
          onClick={onToggleFilters}
          title={intl.formatMessage({
            id: "domainTables.toolbar.toggleFiltersTitle",
          })}
          type="button"
        >
          <SlidersHorizontal className="size-3.5" />
          {intl.formatMessage({ id: "domainTables.toolbar.filtersLabel" })}
          {activeFilterCount > 0 ? (
            <span className="badge badge-xs badge-primary border-0 text-primary-content">
              {intl.formatNumber(activeFilterCount)}
            </span>
          ) : null}
        </button>
        <span className="text-sm text-base-content/60">{resultSummary}</span>
        <div className="flex-1" />
        <TableExportMenu actions={exportActions} />
      </div>

      {filterPanel}

      <div className="p-4">
        <div
          className={
            isLoading && !showTableLoading
              ? "opacity-60 transition-opacity"
              : "transition-opacity"
          }
        >
          {showTableLoading ? <TableLoadingRows /> : children}
        </div>
      </div>

      {pagination}
    </>
  );
}
