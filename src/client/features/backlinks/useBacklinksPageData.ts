import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useIntl, type IntlShape } from "react-intl";
import type {
  BacklinksPageProps,
  BacklinksSearchState,
} from "./backlinksPageTypes";
import { useAccessGate } from "@/client/features/access-gate/useAccessGate";
import { useSeoApiKeyStatus } from "@/client/features/access-gate/useSeoApiKeyStatus";
import {
  getErrorCode,
  getLocalizedErrorMessage,
} from "@/client/lib/error-messages";
import {
  getBacklinksOverview,
  getBacklinksReferringDomains,
  getBacklinksRows,
  getBacklinksTopPages,
} from "@/serverFunctions/backlinks";
import { getBacklinksAccessSetupStatus } from "@/serverFunctions/backlinksAccess";
import {
  BACKLINKS_DEFAULT_SORT,
  backlinksRowsSortFieldSchema,
  referringDomainsSortFieldSchema,
  topPagesSortFieldSchema,
  type BacklinksSortOrder,
} from "@/types/schemas/backlinks";
import {
  toBacklinksFiltersPayload,
  toReferringDomainsFiltersPayload,
  toTopPagesFiltersPayload,
} from "./backlinksFilterTypes";
import type { BacklinksFiltersState } from "./useBacklinksFilters";
import { getPersistedBacklinksSearchScope } from "./backlinksSearchScope";

type UseBacklinksPageDataArgs = {
  projectId: string;
  searchState: BacklinksSearchState;
  filters: BacklinksFiltersState;
};

// Five-minute client staleness on top of the server's 6h R2 cache, so window
// refocus doesn't re-run the server functions for bytes that can't change.
const BACKLINKS_QUERY_STALE_TIME_MS = 5 * 60 * 1000;

function getBacklinksErrorMessage(
  intl: IntlShape,
  error: unknown,
  fallback: string,
): string | null {
  if (!error) return null;
  if (getErrorCode(error) === "VALIDATION_ERROR") {
    return intl.formatMessage({
      id: "backlinksOverview.error.invalidTarget",
    });
  }

  return getLocalizedErrorMessage(intl, error, fallback);
}

/**
 * Maps the URL's sort/order params to a request's sortField/sortOrder pair.
 * The sort param is checked against the tab's allowed sort fields; anything
 * unexpected falls back to the tab's default sort.
 */
function toSort<T extends string>(
  sortParam: string | undefined,
  orderParam: BacklinksSortOrder | undefined,
  allowedFields: readonly T[],
  fallback: { field: T; order: BacklinksSortOrder },
): { field: T; order: BacklinksSortOrder } {
  const field = sortParam
    ? allowedFields.find((candidate) => candidate === sortParam)
    : undefined;
  if (!field) return fallback;
  return { field, order: orderParam ?? "desc" };
}

export function useBacklinksPageData({
  projectId,
  searchState,
  filters,
}: UseBacklinksPageDataArgs) {
  const intl = useIntl();
  const accessGate = useAccessGate({
    queryKey: ["backlinksAccessStatus", projectId],
    queryFn: () => getBacklinksAccessSetupStatus({ data: { projectId } }),
    statusErrorFallback: intl.formatMessage({
      id: "backlinksOverview.error.setupStatusFallback",
    }),
  });
  const backlinksEnabled = accessGate.enabled;
  const retryAccessGate = accessGate.onRetry;
  const seoApiKeyStatus = useSeoApiKeyStatus();
  const searchCardInitialValues = useMemo(
    () => ({
      target: searchState.target,
      scope: searchState.scope,
    }),
    [searchState.scope, searchState.target],
  );

  const { target, scope, tab, page, pageSize, sort, order, view } = searchState;
  const rowsMode = view === "all" ? "as_is" : "one_per_domain";
  const targetReady =
    backlinksEnabled &&
    Boolean(target) &&
    seoApiKeyStatus.data?.configured === true;
  // The same fact `targetReady` gates on, kept for the empty state: with no key
  // no backlinks request is sent, so "could not load" plus a Retry that fires
  // nothing is not what happened.
  const seoKeyMissing = seoApiKeyStatus.data?.configured === false;
  const baseQueryKeyParts = [projectId, scope, target] as const;
  const pageInputBase = { projectId, target, scope, page, pageSize };

  const overviewQuery = useQuery({
    queryKey: ["backlinksOverview", ...baseQueryKeyParts],
    enabled: targetReady,
    staleTime: BACKLINKS_QUERY_STALE_TIME_MS,
    queryFn: () => getBacklinksOverview({ data: { projectId, target, scope } }),
  });

  const rowsSort = toSort(
    sort,
    order,
    backlinksRowsSortFieldSchema.options,
    BACKLINKS_DEFAULT_SORT.backlinks,
  );
  const rowsFilters = useMemo(
    () => toBacklinksFiltersPayload(filters.backlinks.values),
    [filters.backlinks.values],
  );
  const rowsQuery = useQuery({
    queryKey: [
      "backlinksRows",
      ...baseQueryKeyParts,
      page,
      pageSize,
      rowsSort.field,
      rowsSort.order,
      rowsFilters,
      rowsMode,
    ],
    enabled: targetReady && tab === "backlinks",
    staleTime: BACKLINKS_QUERY_STALE_TIME_MS,
    queryFn: () =>
      getBacklinksRows({
        data: {
          ...pageInputBase,
          sortField: rowsSort.field,
          sortOrder: rowsSort.order,
          filters: rowsFilters,
          mode: rowsMode,
        },
      }),
  });

  const domainsSort = toSort(
    sort,
    order,
    referringDomainsSortFieldSchema.options,
    BACKLINKS_DEFAULT_SORT.domains,
  );
  const domainsFilters = useMemo(
    () => toReferringDomainsFiltersPayload(filters.domains.values),
    [filters.domains.values],
  );
  const referringDomainsQuery = useQuery({
    queryKey: [
      "backlinksReferringDomains",
      ...baseQueryKeyParts,
      page,
      pageSize,
      domainsSort.field,
      domainsSort.order,
      domainsFilters,
    ],
    enabled: targetReady && tab === "domains",
    staleTime: BACKLINKS_QUERY_STALE_TIME_MS,
    queryFn: () =>
      getBacklinksReferringDomains({
        data: {
          ...pageInputBase,
          sortField: domainsSort.field,
          sortOrder: domainsSort.order,
          filters: domainsFilters,
        },
      }),
  });

  const pagesSort = toSort(
    sort,
    order,
    topPagesSortFieldSchema.options,
    BACKLINKS_DEFAULT_SORT.pages,
  );
  const pagesFilters = useMemo(
    () => toTopPagesFiltersPayload(filters.pages.values),
    [filters.pages.values],
  );
  const topPagesQuery = useQuery({
    queryKey: [
      "backlinksTopPages",
      ...baseQueryKeyParts,
      page,
      pageSize,
      pagesSort.field,
      pagesSort.order,
      pagesFilters,
    ],
    enabled: targetReady && tab === "pages",
    staleTime: BACKLINKS_QUERY_STALE_TIME_MS,
    queryFn: () =>
      getBacklinksTopPages({
        data: {
          ...pageInputBase,
          sortField: pagesSort.field,
          sortOrder: pagesSort.order,
          filters: pagesFilters,
        },
      }),
  });

  const overviewErrorMessage = getBacklinksErrorMessage(
    intl,
    overviewQuery.error,
    intl.formatMessage({ id: "backlinksOverview.error.overviewFallback" }),
  );
  const backlinksDisabledByError =
    getErrorCode(overviewQuery.error) === "BACKLINKS_NOT_ENABLED";
  const activeTabQuery =
    tab === "backlinks"
      ? rowsQuery
      : tab === "domains"
        ? referringDomainsQuery
        : topPagesQuery;
  const activeTabErrorMessage = getBacklinksErrorMessage(
    intl,
    activeTabQuery.error,
    intl.formatMessage({ id: "backlinksOverview.error.tabFallback" }),
  );
  const backlinksDisabledByTabError =
    getErrorCode(activeTabQuery.error) === "BACKLINKS_NOT_ENABLED";

  useEffect(() => {
    if (
      (backlinksDisabledByError || backlinksDisabledByTabError) &&
      backlinksEnabled
    ) {
      retryAccessGate();
    }
  }, [
    backlinksDisabledByError,
    backlinksDisabledByTabError,
    backlinksEnabled,
    retryAccessGate,
  ]);

  return {
    accessGate,
    activeTabErrorMessage,
    activeTabQuery,
    backlinksDisabledByError,
    overviewErrorMessage,
    overviewQuery,
    referringDomainsQuery,
    rowsQuery,
    searchCardInitialValues,
    seoKeyMissing,
    topPagesQuery,
  };
}

export function navigateToBacklinksSearch(
  navigate: BacklinksPageProps["navigate"],
  values: Pick<BacklinksSearchState, "target" | "scope">,
) {
  navigate({
    search: (prev) => ({
      ...prev,
      target: values.target,
      scope: getPersistedBacklinksSearchScope(values.target, values.scope),
      tab: undefined,
      page: undefined,
      sort: undefined,
      order: undefined,
    }),
    replace: true,
  });
}
