import { useIntl } from "react-intl";
import {
  FilterPanel,
  RangeFilter,
  SelectFilter,
  TextFilter,
} from "@/client/features/audit/results/AuditResultsFilterPrimitives";
import type { PerformanceFilters } from "@/client/features/audit/results/AuditResultsTableFilterLogic";

export function PerformanceFilterBar({
  filters,
  onChange,
  activeFilterCount,
  onReset,
}: {
  filters: PerformanceFilters;
  onChange: (filters: PerformanceFilters) => void;
  activeFilterCount: number;
  onReset: () => void;
}) {
  const intl = useIntl();
  return (
    <FilterPanel activeFilterCount={activeFilterCount} onReset={onReset}>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <TextFilter
          label={intl.formatMessage({ id: "audit.results.filters.search" })}
          value={filters.query}
          placeholder={intl.formatMessage({
            id: "audit.results.filters.searchPlaceholderUrl",
          })}
          onChange={(query) => onChange({ ...filters, query })}
        />
        <SelectFilter
          label={intl.formatMessage({ id: "audit.results.filters.device" })}
          value={filters.device}
          onChange={(device) => onChange({ ...filters, device })}
          options={[
            [
              "all",
              intl.formatMessage({ id: "audit.results.filters.option.all" }),
            ],
            [
              "desktop",
              intl.formatMessage({
                id: "audit.results.filters.option.desktop",
              }),
            ],
            [
              "mobile",
              intl.formatMessage({
                id: "audit.results.filters.option.mobile",
              }),
            ],
          ]}
        />
        <SelectFilter
          label={intl.formatMessage({ id: "audit.results.filters.status" })}
          value={filters.status}
          onChange={(status) => onChange({ ...filters, status })}
          options={[
            [
              "all",
              intl.formatMessage({ id: "audit.results.filters.option.all" }),
            ],
            [
              "ok",
              intl.formatMessage({
                id: "audit.results.filters.option.perfOk",
              }),
            ],
            [
              "failed",
              intl.formatMessage({
                id: "audit.results.filters.option.perfFailed",
              }),
            ],
          ]}
        />
        <TextFilter
          label={intl.formatMessage({ id: "audit.results.filters.maxLcpS" })}
          value={filters.maxLcpSeconds}
          placeholder="2.5"
          type="number"
          onChange={(maxLcpSeconds) => onChange({ ...filters, maxLcpSeconds })}
        />
      </div>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <RangeFilter
          label={intl.formatMessage({ id: "audit.results.filters.perf" })}
          min={filters.minPerf}
          max={filters.maxPerf}
          onMinChange={(minPerf) => onChange({ ...filters, minPerf })}
          onMaxChange={(maxPerf) => onChange({ ...filters, maxPerf })}
        />
        <RangeFilter
          label={intl.formatMessage({ id: "audit.results.filters.seo" })}
          min={filters.minSeo}
          max={filters.maxSeo}
          onMinChange={(minSeo) => onChange({ ...filters, minSeo })}
          onMaxChange={(maxSeo) => onChange({ ...filters, maxSeo })}
        />
      </div>
    </FilterPanel>
  );
}
