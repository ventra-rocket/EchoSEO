import { RotateCcw } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import type { KeywordResearchControllerState } from "./types";

function FilterTextInput({
  form,
  name,
  label,
  placeholder,
}: {
  form: KeywordResearchControllerState["filtersForm"];
  name: "include" | "exclude";
  label: string;
  placeholder: string;
}) {
  return (
    <label className="form-control gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-base-content/60">
        {label}
      </span>
      <form.Field name={name}>
        {(field) => (
          <input
            className="input input-bordered input-sm bg-base-100"
            placeholder={placeholder}
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
          />
        )}
      </form.Field>
    </label>
  );
}

function FilterRangeInputs({
  form,
  title,
  minName,
  maxName,
  step,
}: {
  form: KeywordResearchControllerState["filtersForm"];
  title: string;
  minName: "minVol" | "minCpc" | "minKd";
  maxName: "maxVol" | "maxCpc" | "maxKd";
  step?: string;
}) {
  const intl = useIntl();
  return (
    <div className="rounded-lg border border-base-300 bg-base-100 p-2.5 space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-base-content/60">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <CompactRangeInput
          form={form}
          name={minName}
          placeholder={intl.formatMessage({
            id: "keywordResearch.filters.min",
          })}
          step={step}
        />
        <CompactRangeInput
          form={form}
          name={maxName}
          placeholder={intl.formatMessage({
            id: "keywordResearch.filters.max",
          })}
          step={step}
        />
      </div>
    </div>
  );
}

function CompactRangeInput({
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
          className="input input-bordered input-xs bg-base-100"
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

export function DesktopFilters({
  controller,
}: {
  controller: KeywordResearchControllerState;
}) {
  const { activeFilterCount, filtersForm } = controller;
  const intl = useIntl();

  return (
    <div className="shrink-0 border-b border-base-300 bg-gradient-to-b from-base-100 to-base-200/30 px-4 py-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">
            <FormattedMessage id="keywordResearch.results.refineResults" />
          </p>
          {activeFilterCount > 0 ? (
            <span className="badge badge-xs badge-primary border-0 text-primary-content">
              <FormattedMessage
                id="keywordResearch.desktopResults.filters.activeCount"
                values={{ count: activeFilterCount }}
              />
            </span>
          ) : null}
        </div>
        <button
          className="btn btn-xs btn-ghost gap-1"
          onClick={controller.resetFilters}
          disabled={activeFilterCount === 0}
        >
          <RotateCcw className="size-3" />
          <FormattedMessage id="keywordResearch.desktopResults.filters.clearAll" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <FilterTextInput
          form={filtersForm}
          name="include"
          label={intl.formatMessage({
            id: "keywordResearch.desktopResults.filters.includeLabel",
          })}
          placeholder={intl.formatMessage({
            id: "keywordResearch.desktopResults.filters.includePlaceholder",
          })}
        />
        <FilterTextInput
          form={filtersForm}
          name="exclude"
          label={intl.formatMessage({
            id: "keywordResearch.desktopResults.filters.excludeLabel",
          })}
          placeholder={intl.formatMessage({
            id: "keywordResearch.desktopResults.filters.excludePlaceholder",
          })}
        />
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        <FilterRangeInputs
          form={filtersForm}
          title={intl.formatMessage({
            id: "keywordResearch.desktopResults.filters.searchVolume",
          })}
          minName="minVol"
          maxName="maxVol"
        />
        <FilterRangeInputs
          form={filtersForm}
          title={intl.formatMessage({
            id: "keywordResearch.desktopResults.filters.cpcUsd",
          })}
          minName="minCpc"
          maxName="maxCpc"
          step="0.01"
        />
        <FilterRangeInputs
          form={filtersForm}
          title={intl.formatMessage({
            id: "keywordResearch.desktopResults.filters.difficulty",
          })}
          minName="minKd"
          maxName="maxKd"
        />
      </div>
    </div>
  );
}

export function EmptyFilterResults({
  activeFilterCount,
  resetFilters,
}: {
  activeFilterCount: number;
  resetFilters: () => void;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-4 text-base-content/50 gap-3">
      <p className="text-sm font-medium">
        <FormattedMessage id="keywordResearch.filters.emptyResults" />
      </p>
      {activeFilterCount > 0 ? (
        <button className="btn btn-ghost btn-sm" onClick={resetFilters}>
          <FormattedMessage id="keywordResearch.filters.clearFilters" />
        </button>
      ) : null}
    </div>
  );
}
