import { useIntl } from "react-intl";
import {
  FilterPanel,
  RangeFilter,
  SelectFilter,
  TextFilter,
} from "@/client/features/audit/results/AuditResultsFilterPrimitives";
import type { PagesFilters } from "@/client/features/audit/results/AuditResultsTableFilterLogic";

export function PagesFilterBar({
  filters,
  onChange,
  activeFilterCount,
  onReset,
}: {
  filters: PagesFilters;
  onChange: (filters: PagesFilters) => void;
  activeFilterCount: number;
  onReset: () => void;
}) {
  const intl = useIntl();
  return (
    <FilterPanel activeFilterCount={activeFilterCount} onReset={onReset}>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <TextFilter
          label={intl.formatMessage({ id: "audit.results.filters.search" })}
          value={filters.query}
          placeholder={intl.formatMessage({
            id: "audit.results.filters.searchPlaceholderPages",
          })}
          onChange={(query) => onChange({ ...filters, query })}
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
                id: "audit.results.filters.option.status2xx",
              }),
            ],
            [
              "redirect",
              intl.formatMessage({
                id: "audit.results.filters.option.status3xx",
              }),
            ],
            [
              "error",
              intl.formatMessage({
                id: "audit.results.filters.option.status4xx5xx",
              }),
            ],
            [
              "throttled",
              intl.formatMessage({
                id: "audit.results.filters.option.throttled",
              }),
            ],
            [
              "missing",
              intl.formatMessage({
                id: "audit.results.filters.option.missing",
              }),
            ],
          ]}
        />
        <SelectFilter
          label={intl.formatMessage({ id: "audit.results.filters.altText" })}
          value={filters.missingAlt}
          onChange={(missingAlt) => onChange({ ...filters, missingAlt })}
          options={[
            [
              "all",
              intl.formatMessage({ id: "audit.results.filters.option.all" }),
            ],
            [
              "yes",
              intl.formatMessage({
                id: "audit.results.filters.option.missingAlt",
              }),
            ],
            [
              "no",
              intl.formatMessage({
                id: "audit.results.filters.option.noMissingAlt",
              }),
            ],
          ]}
        />
      </div>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <RangeFilter
          label={intl.formatMessage({ id: "audit.results.filters.words" })}
          min={filters.minWords}
          max={filters.maxWords}
          onMinChange={(minWords) => onChange({ ...filters, minWords })}
          onMaxChange={(maxWords) => onChange({ ...filters, maxWords })}
        />
        <RangeFilter
          label={intl.formatMessage({ id: "audit.results.filters.speedMs" })}
          min={filters.minResponseMs}
          max={filters.maxResponseMs}
          onMinChange={(minResponseMs) =>
            onChange({ ...filters, minResponseMs })
          }
          onMaxChange={(maxResponseMs) =>
            onChange({ ...filters, maxResponseMs })
          }
        />
      </div>
    </FilterPanel>
  );
}
