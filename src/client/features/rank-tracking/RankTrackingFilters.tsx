import { RotateCcw } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import type {
  DomainListFilterOption,
  DomainListFilters,
  Filters,
} from "./rankTrackingFilterTypes";

export function FilterPanel({
  filters,
  setFilters,
  activeFilterCount,
  onReset,
}: {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  activeFilterCount: number;
  onReset: () => void;
}) {
  const intl = useIntl();
  const update = (key: keyof Filters, value: string) =>
    setFilters({ ...filters, [key]: value });

  return (
    <div className="shrink-0 border-b border-base-300 bg-gradient-to-b from-base-100 to-base-200/30 px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">
            <FormattedMessage id="rank.table.filter.refineResults" />
          </p>
          {activeFilterCount > 0 && (
            <span className="badge badge-xs badge-primary border-0 text-primary-content">
              <FormattedMessage
                id="rank.table.filter.activeCount"
                values={{ count: activeFilterCount }}
              />
            </span>
          )}
        </div>
        <button
          className="btn btn-xs btn-ghost gap-1"
          onClick={onReset}
          disabled={activeFilterCount === 0}
        >
          <RotateCcw className="size-3" />
          <FormattedMessage id="rank.table.filter.clearAll" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-base-content/60">
            <FormattedMessage id="rank.table.filter.include" />
          </p>
          <input
            className="input input-bordered input-sm w-full bg-base-100"
            placeholder={intl.formatMessage({
              id: "rank.table.filter.includePlaceholder",
            })}
            value={filters.include}
            onChange={(e) => update("include", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-base-content/60">
            <FormattedMessage id="rank.table.filter.exclude" />
          </p>
          <input
            className="input input-bordered input-sm w-full bg-base-100"
            placeholder={intl.formatMessage({
              id: "rank.table.filter.excludePlaceholder",
            })}
            value={filters.exclude}
            onChange={(e) => update("exclude", e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <RangeFilter
          title={intl.formatMessage({
            id: "rank.table.filter.desktopPosition",
          })}
          minValue={filters.minDesktopPos}
          maxValue={filters.maxDesktopPos}
          onMinChange={(v) => update("minDesktopPos", v)}
          onMaxChange={(v) => update("maxDesktopPos", v)}
        />
        <RangeFilter
          title={intl.formatMessage({ id: "rank.table.filter.mobilePosition" })}
          minValue={filters.minMobilePos}
          maxValue={filters.maxMobilePos}
          onMinChange={(v) => update("minMobilePos", v)}
          onMaxChange={(v) => update("maxMobilePos", v)}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <RangeFilter
          title={intl.formatMessage({ id: "rank.table.filter.volume" })}
          minValue={filters.minVolume}
          maxValue={filters.maxVolume}
          onMinChange={(v) => update("minVolume", v)}
          onMaxChange={(v) => update("maxVolume", v)}
        />
        <RangeFilter
          title={intl.formatMessage({ id: "rank.table.filter.kd" })}
          minValue={filters.minKd}
          maxValue={filters.maxKd}
          onMinChange={(v) => update("minKd", v)}
          onMaxChange={(v) => update("maxKd", v)}
        />
        <RangeFilter
          title={intl.formatMessage({ id: "rank.table.filter.cpc" })}
          minValue={filters.minCpc}
          maxValue={filters.maxCpc}
          onMinChange={(v) => update("minCpc", v)}
          onMaxChange={(v) => update("maxCpc", v)}
          // CPC is currency: without this the number input's implicit step=1
          // marks every cent value invalid.
          step="0.01"
        />
      </div>
    </div>
  );
}

export function DomainListFilterBar({
  filters,
  options,
  activeFilterCount,
  onChange,
  onReset,
}: {
  filters: DomainListFilters;
  options: {
    devices: DomainListFilterOption[];
    locations: DomainListFilterOption[];
  };
  activeFilterCount: number;
  onChange: (filters: DomainListFilters) => void;
  onReset: () => void;
}) {
  const intl = useIntl();
  return (
    <div className="border-t border-base-300 px-5 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <label className="form-control flex-1 gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-base-content/60">
            <FormattedMessage id="rank.table.domainFilter.search" />
          </span>
          <input
            className="input input-bordered input-sm w-full bg-base-100"
            placeholder={intl.formatMessage({
              id: "rank.table.domainFilter.searchPlaceholder",
            })}
            value={filters.query}
            onChange={(event) =>
              onChange({ ...filters, query: event.target.value })
            }
          />
        </label>
        <label className="form-control gap-1.5 lg:w-44">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-base-content/60">
            <FormattedMessage id="rank.table.domainFilter.device" />
          </span>
          <select
            className="select select-bordered select-sm w-full bg-base-100"
            value={filters.device}
            onChange={(event) => {
              const value = event.target.value;
              if (
                value === "all" ||
                value === "both" ||
                value === "desktop" ||
                value === "mobile"
              ) {
                onChange({ ...filters, device: value });
              }
            }}
          >
            <option value="all">
              {intl.formatMessage({ id: "rank.table.domainFilter.allDevices" })}
            </option>
            {options.devices.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="form-control gap-1.5 lg:w-52">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-base-content/60">
            <FormattedMessage id="rank.table.domainFilter.country" />
          </span>
          <select
            className="select select-bordered select-sm w-full bg-base-100"
            value={filters.locationCode}
            onChange={(event) =>
              onChange({ ...filters, locationCode: event.target.value })
            }
          >
            <option value="all">
              {intl.formatMessage({
                id: "rank.table.domainFilter.allCountries",
              })}
            </option>
            {options.locations.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {activeFilterCount > 0 && (
          <button
            className="btn btn-ghost btn-sm gap-1.5 self-start lg:self-auto"
            onClick={onReset}
          >
            <RotateCcw className="size-3" />
            <FormattedMessage id="rank.table.domainFilter.clear" />
            <span className="badge badge-xs badge-primary border-0 text-primary-content">
              {activeFilterCount}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

function RangeFilter({
  title,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  step,
}: {
  title: string;
  minValue: string;
  maxValue: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
  step?: string;
}) {
  const intl = useIntl();
  return (
    <div className="rounded-lg border border-base-300 bg-base-100 p-2.5 space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-base-content/60">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <input
          className="input input-bordered input-xs bg-base-100"
          placeholder={intl.formatMessage({ id: "rank.table.filter.min" })}
          type="number"
          step={step}
          value={minValue}
          onChange={(e) => onMinChange(e.target.value)}
        />
        <input
          className="input input-bordered input-xs bg-base-100"
          placeholder={intl.formatMessage({ id: "rank.table.filter.max" })}
          type="number"
          step={step}
          value={maxValue}
          onChange={(e) => onMaxChange(e.target.value)}
        />
      </div>
    </div>
  );
}
