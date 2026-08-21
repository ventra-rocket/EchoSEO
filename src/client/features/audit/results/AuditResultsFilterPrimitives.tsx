import { RotateCcw } from "lucide-react";
import { useIntl } from "react-intl";
import type { ReactNode } from "react";

/** Generic wrapper every filter bar renders inside: heading, active count, reset. */
export function FilterPanel({
  activeFilterCount,
  onReset,
  children,
}: {
  activeFilterCount: number;
  onReset: () => void;
  children: ReactNode;
}) {
  const intl = useIntl();
  return (
    <div className="space-y-3 border-b border-base-300 bg-gradient-to-b from-base-100 to-base-200/30 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">
            {intl.formatMessage({
              id: "audit.results.filters.refineResults",
            })}
          </p>
          {activeFilterCount > 0 ? (
            <span className="badge badge-xs badge-primary border-0 text-primary-content">
              {intl.formatMessage(
                { id: "audit.results.filters.activeCount" },
                { count: activeFilterCount },
              )}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="btn btn-xs btn-ghost gap-1"
          onClick={onReset}
          disabled={activeFilterCount === 0}
        >
          <RotateCcw className="size-3" />
          {intl.formatMessage({ id: "audit.results.filters.clearAll" })}
        </button>
      </div>
      {children}
    </div>
  );
}

export function TextFilter({
  label,
  value,
  placeholder,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  type?: "text" | "number";
  onChange: (value: string) => void;
}) {
  return (
    <label className="form-control gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-base-content/60">
        {label}
      </span>
      <input
        className="input input-bordered input-sm w-full bg-base-100"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function RangeFilter({
  label,
  min,
  max,
  onMinChange,
  onMaxChange,
}: {
  label: string;
  min: string;
  max: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
}) {
  const intl = useIntl();
  return (
    <div className="space-y-2 rounded-lg border border-base-300 bg-base-100 p-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-base-content/60">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <input
          className="input input-bordered input-xs bg-base-100"
          type="number"
          value={min}
          placeholder={intl.formatMessage({
            id: "audit.results.filters.min",
          })}
          onChange={(event) => onMinChange(event.target.value)}
        />
        <input
          className="input input-bordered input-xs bg-base-100"
          type="number"
          value={max}
          placeholder={intl.formatMessage({
            id: "audit.results.filters.max",
          })}
          onChange={(event) => onMaxChange(event.target.value)}
        />
      </div>
    </div>
  );
}

export function SelectFilter<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<[T, string]>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="form-control gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-base-content/60">
        {label}
      </span>
      <select
        className="select select-bordered select-sm w-full bg-base-100"
        value={value}
        onChange={(event) => {
          const selected = options.find(
            ([optionValue]) => optionValue === event.target.value,
          )?.[0];
          if (selected != null) onChange(selected);
        }}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
