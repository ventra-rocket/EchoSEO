import { useIntl } from "react-intl";
import { DomainFilterPanel } from "@/client/features/domain/components/DomainFilterPanel";
import type { BacklinksTab } from "@/types/schemas/backlinks";
import {
  BACKLINKS_FILTER_FIELDS,
  REFERRING_DOMAINS_FILTER_FIELDS,
  TOP_PAGES_FILTER_FIELDS,
  countFilterConditions,
  type BacklinksTabFilterValues,
} from "./backlinksFilterTypes";
import type { BacklinksFiltersState } from "./useBacklinksFilters";

/**
 * Filters are applied explicitly (not per keystroke) because every change
 * triggers a billed DataForSEO request. Each include/exclude term and each
 * set field costs one DataForSEO filter condition, capped per request —
 * DomainFilterPanel surfaces the count and gates Apply.
 */
export function BacklinksFilterPanel({
  activeTab,
  filters,
  onApplied,
}: {
  activeTab: BacklinksTab;
  filters: BacklinksFiltersState;
  onApplied: () => void;
}) {
  if (activeTab === "backlinks") {
    const state = filters.backlinks;
    return (
      <DomainFilterPanel
        key="backlinks"
        debugName="BacklinksFilterPanel"
        appliedFilters={state.values}
        fields={BACKLINKS_FILTER_FIELDS}
        activeFilterCount={state.activeFilterCount}
        countConditions={countFilterConditions}
        textFields={[
          {
            key: "include",
            labelId: "backlinksTables.filter.backlinks.sourceContains",
            placeholderId: "backlinksTables.filter.placeholder.domainExample",
          },
          {
            key: "exclude",
            labelId: "backlinksTables.filter.backlinks.sourceExcludes",
            placeholderId: "backlinksTables.filter.placeholder.spamExample",
          },
        ]}
        rangeFields={[
          {
            titleId: "backlinksTables.filter.range.domainAuthority",
            minKey: "minDomainRank",
            maxKey: "maxDomainRank",
          },
          {
            titleId: "backlinksTables.filter.range.linkAuthority",
            minKey: "minLinkAuthority",
            maxKey: "maxLinkAuthority",
          },
          {
            titleId: "backlinksTables.metric.spamScore",
            minKey: "minSpamScore",
            maxKey: "maxSpamScore",
            step: "0.1",
          },
        ]}
        onApply={(values) => {
          state.apply(values);
          onApplied();
        }}
        onClear={() => {
          state.reset();
          onApplied();
        }}
        renderExtra={(draft, setValue) => (
          <BacklinksToggleControls draft={draft} setValue={setValue} />
        )}
      />
    );
  }

  if (activeTab === "domains") {
    const state = filters.domains;
    return (
      <DomainFilterPanel
        key="domains"
        debugName="ReferringDomainsFilterPanel"
        appliedFilters={state.values}
        fields={REFERRING_DOMAINS_FILTER_FIELDS}
        activeFilterCount={state.activeFilterCount}
        countConditions={countFilterConditions}
        textFields={[
          {
            key: "include",
            labelId: "backlinksTables.filter.domains.domainContains",
            placeholderId: "backlinksTables.filter.placeholder.domainExample",
          },
          {
            key: "exclude",
            labelId: "backlinksTables.filter.domains.domainExcludes",
            placeholderId: "backlinksTables.filter.placeholder.spamExample",
          },
        ]}
        rangeFields={[
          {
            titleId: "backlinksTables.metric.backlinks",
            minKey: "minBacklinks",
            maxKey: "maxBacklinks",
          },
          {
            titleId: "backlinksTables.metric.rank",
            minKey: "minRank",
            maxKey: "maxRank",
          },
          {
            titleId: "backlinksTables.metric.spamScore",
            minKey: "minSpamScore",
            maxKey: "maxSpamScore",
            step: "0.1",
          },
        ]}
        onApply={(values) => {
          state.apply(values);
          onApplied();
        }}
        onClear={() => {
          state.reset();
          onApplied();
        }}
      />
    );
  }

  const state = filters.pages;
  return (
    <DomainFilterPanel
      key="pages"
      debugName="TopPagesFilterPanel"
      appliedFilters={state.values}
      fields={TOP_PAGES_FILTER_FIELDS}
      activeFilterCount={state.activeFilterCount}
      countConditions={countFilterConditions}
      textFields={[
        {
          key: "include",
          labelId: "backlinksTables.filter.pages.pageContains",
          placeholderId: "backlinksTables.filter.pages.pageContainsPlaceholder",
        },
        {
          key: "exclude",
          labelId: "backlinksTables.filter.pages.pageExcludes",
          placeholderId: "backlinksTables.filter.pages.pageExcludesPlaceholder",
        },
      ]}
      rangeFields={[
        {
          titleId: "backlinksTables.metric.backlinks",
          minKey: "minBacklinks",
          maxKey: "maxBacklinks",
        },
        {
          titleId: "backlinksTables.metric.referringDomains",
          minKey: "minReferringDomains",
          maxKey: "maxReferringDomains",
        },
        {
          titleId: "backlinksTables.metric.rank",
          minKey: "minRank",
          maxKey: "maxRank",
        },
      ]}
      onApply={(values) => {
        state.apply(values);
        onApplied();
      }}
      onClear={() => {
        state.reset();
        onApplied();
      }}
    />
  );
}

function BacklinksToggleControls({
  draft,
  setValue,
}: {
  draft: BacklinksTabFilterValues;
  setValue: (key: keyof BacklinksTabFilterValues, value: string) => void;
}) {
  const intl = useIntl();
  const linkTypeLabels: Record<"" | "dofollow" | "nofollow", string> = {
    "": intl.formatMessage({ id: "backlinksTables.filter.linkType.all" }),
    dofollow: intl.formatMessage({
      id: "backlinksTables.filter.linkType.dofollow",
    }),
    nofollow: intl.formatMessage({
      id: "backlinksTables.filter.linkType.nofollow",
    }),
  };
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-base-content/60">
          {intl.formatMessage({
            id: "backlinksTables.filter.linkType.label",
          })}
        </p>
        <div className="flex items-center gap-1">
          {(["", "dofollow", "nofollow"] as const).map((value) => (
            <button
              key={value || "all"}
              type="button"
              className={`btn btn-xs ${draft.linkType === value ? "btn-soft" : "btn-ghost"}`}
              onClick={() => setValue("linkType", value)}
            >
              {linkTypeLabels[value]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-base-content/60">
          {intl.formatMessage({
            id: "backlinksTables.filter.visibility.label",
          })}
        </p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              className="checkbox checkbox-xs"
              checked={draft.hideLost === "true"}
              onChange={(event) =>
                setValue("hideLost", event.target.checked ? "true" : "")
              }
            />
            <span className="text-xs">
              {intl.formatMessage({
                id: "backlinksTables.filter.visibility.hideLost",
              })}
            </span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              className="checkbox checkbox-xs"
              checked={draft.hideBroken === "true"}
              onChange={(event) =>
                setValue("hideBroken", event.target.checked ? "true" : "")
              }
            />
            <span className="text-xs">
              {intl.formatMessage({
                id: "backlinksTables.filter.visibility.hideBroken",
              })}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
