import { RotateCcw } from "lucide-react";
import { useIntl } from "react-intl";
import type { CitationTab } from "@/client/features/ai-search/brandLookupFilterTypes";
import { formatPlatformLabel } from "@/client/features/ai-search/platformLabels";
import type { BrandLookupFiltersState } from "@/client/features/ai-search/useBrandLookupFilters";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyForm = { Field: React.ComponentType<any> };

function FilterTextInput({
  form,
  name,
  label,
  placeholder,
}: {
  form: AnyForm;
  name: string;
  label: string;
  placeholder: string;
}) {
  return (
    <label className="form-control gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-base-content/60">
        {label}
      </span>
      <form.Field name={name}>
        {(field: {
          state: { value: string };
          handleChange: (v: string) => void;
        }) => (
          <input
            className="input input-bordered input-sm w-full bg-base-100"
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
}: {
  form: AnyForm;
  title: string;
  minName: string;
  maxName: string;
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
            id: "aiCitations.filterPanel.min",
          })}
        />
        <CompactRangeInput
          form={form}
          name={maxName}
          placeholder={intl.formatMessage({
            id: "aiCitations.filterPanel.max",
          })}
        />
      </div>
    </div>
  );
}

function CompactRangeInput({
  form,
  name,
  placeholder,
}: {
  form: AnyForm;
  name: string;
  placeholder: string;
}) {
  return (
    <form.Field name={name}>
      {(field: {
        state: { value: string };
        handleChange: (v: string) => void;
      }) => (
        <input
          className="input input-bordered input-xs bg-base-100"
          placeholder={placeholder}
          type="number"
          value={field.state.value}
          onChange={(event) => field.handleChange(event.target.value)}
        />
      )}
    </form.Field>
  );
}

function PlatformToggle({ form }: { form: AnyForm }) {
  const intl = useIntl();
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-base-content/60">
        {intl.formatMessage({ id: "aiCitations.filterPanel.platformLabel" })}
      </p>
      <form.Field name="platform">
        {(field: {
          state: { value: string };
          handleChange: (v: string) => void;
        }) => (
          <div className="flex flex-wrap items-center gap-1">
            {(["", "chat_gpt", "google"] as const).map((value) => (
              <button
                key={value || "all"}
                type="button"
                className={`btn btn-xs ${field.state.value === value ? "btn-soft" : "btn-ghost"}`}
                onClick={() => field.handleChange(value)}
              >
                {value === ""
                  ? intl.formatMessage({
                      id: "aiCitations.filterPanel.platformAll",
                    })
                  : formatPlatformLabel(value)}
              </button>
            ))}
          </div>
        )}
      </form.Field>
    </div>
  );
}

function TopPagesFilters({
  form,
}: {
  form: BrandLookupFiltersState["pages"]["form"];
}) {
  const intl = useIntl();
  return (
    <>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <FilterTextInput
          form={form}
          name="include"
          label={intl.formatMessage({
            id: "aiCitations.filterPanel.includeLabel",
          })}
          placeholder={intl.formatMessage({
            id: "aiCitations.filterPanel.pages.includePlaceholder",
          })}
        />
        <FilterTextInput
          form={form}
          name="exclude"
          label={intl.formatMessage({
            id: "aiCitations.filterPanel.excludeLabel",
          })}
          placeholder={intl.formatMessage({
            id: "aiCitations.filterPanel.pages.excludePlaceholder",
          })}
        />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <PlatformToggle form={form} />
        <div className="min-w-[220px]">
          <FilterRangeInputs
            form={form}
            title={intl.formatMessage({
              id: "aiCitations.filterPanel.pages.mentionsTitle",
            })}
            minName="minMentions"
            maxName="maxMentions"
          />
        </div>
      </div>
    </>
  );
}

function QueriesFilters({
  form,
}: {
  form: BrandLookupFiltersState["queries"]["form"];
}) {
  const intl = useIntl();
  return (
    <>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <FilterTextInput
          form={form}
          name="include"
          label={intl.formatMessage({
            id: "aiCitations.filterPanel.includeLabel",
          })}
          placeholder={intl.formatMessage({
            id: "aiCitations.filterPanel.queries.includePlaceholder",
          })}
        />
        <FilterTextInput
          form={form}
          name="exclude"
          label={intl.formatMessage({
            id: "aiCitations.filterPanel.excludeLabel",
          })}
          placeholder={intl.formatMessage({
            id: "aiCitations.filterPanel.queries.excludePlaceholder",
          })}
        />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <PlatformToggle form={form} />
        <div className="min-w-[220px]">
          <FilterRangeInputs
            form={form}
            title={intl.formatMessage({
              id: "aiCitations.filterPanel.queries.volumeTitle",
            })}
            minName="minVolume"
            maxName="maxVolume"
          />
        </div>
      </div>
    </>
  );
}

export function BrandLookupFilterPanel({
  activeTab,
  filters,
}: {
  activeTab: CitationTab;
  filters: BrandLookupFiltersState;
}) {
  const intl = useIntl();
  const current = filters[activeTab];

  return (
    <div className="shrink-0 border-b border-base-300 bg-gradient-to-b from-base-100 to-base-200/30 px-4 py-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">
            {intl.formatMessage({ id: "aiCitations.filterPanel.heading" })}
          </p>
          {current.activeFilterCount > 0 ? (
            <span className="badge badge-xs badge-primary border-0 text-primary-content">
              {intl.formatMessage(
                { id: "aiCitations.filterPanel.activeCount" },
                { count: current.activeFilterCount },
              )}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="btn btn-xs btn-ghost gap-1"
          onClick={current.reset}
          disabled={current.activeFilterCount === 0}
        >
          <RotateCcw className="size-3" />
          {intl.formatMessage({ id: "aiCitations.filterPanel.clearAll" })}
        </button>
      </div>

      {activeTab === "pages" ? (
        <TopPagesFilters form={filters.pages.form} />
      ) : null}
      {activeTab === "queries" ? (
        <QueriesFilters form={filters.queries.form} />
      ) : null}
    </div>
  );
}
