import { SlidersHorizontal } from "lucide-react";
import { useIntl } from "react-intl";

export { PagesFilterBar } from "@/client/features/audit/results/PagesFilterBar";
export { PerformanceFilterBar } from "@/client/features/audit/results/PerformanceFilterBar";

export function EmptyTableMessage({ label }: { label: string }) {
  return <div className="py-6 text-center text-base-content/60">{label}</div>;
}

export function TableFilterToggle({
  showFilters,
  onToggle,
  activeFilterCount,
  resultCount,
  totalCount,
}: {
  showFilters: boolean;
  onToggle: () => void;
  activeFilterCount: number;
  resultCount: number;
  totalCount: number;
}) {
  const intl = useIntl();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 px-4 py-2.5">
      <button
        className={`btn btn-ghost btn-sm gap-1.5 ${showFilters ? "btn-active" : ""}`}
        onClick={onToggle}
        title={intl.formatMessage({
          id: "audit.results.filters.toggleTitle",
        })}
        type="button"
      >
        <SlidersHorizontal className="size-3.5" />
        {intl.formatMessage({ id: "audit.results.filters.toggleLabel" })}
        {activeFilterCount > 0 ? (
          <span className="badge badge-xs badge-primary border-0 text-primary-content">
            {activeFilterCount}
          </span>
        ) : null}
      </button>
      <span className="text-sm tabular-nums text-base-content/60">
        {intl.formatMessage(
          { id: "audit.results.filters.resultCount" },
          { result: resultCount, total: totalCount },
        )}
      </span>
    </div>
  );
}

export function countActiveFilters<TFilters extends Record<string, string>>(
  filters: TFilters,
  emptyFilters: TFilters,
) {
  return Object.keys(filters).reduce((count, key) => {
    const filterKey = key as keyof TFilters;
    return filters[filterKey] !== emptyFilters[filterKey] ? count + 1 : count;
  }, 0);
}
