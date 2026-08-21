import { Link } from "@tanstack/react-router";
import { FormattedMessage, type IntlShape, useIntl } from "react-intl";
import { Clock, Globe, History, Search, X } from "lucide-react";
import { DataforseoKeyMissingState } from "@/client/features/access-gate/DataforseoKeyMissingState";
import {
  DEFAULT_LOCATION_CODE,
  LOCATION_OPTIONS,
} from "@/shared/keyword-locations";
import type { KeywordResearchControllerState } from "./types";

// The slice of the controller these states actually read. Narrower than the
// whole controller on purpose: it documents the dependency, and a test can build
// this state without asserting a stub through 50 unrelated fields.
type EmptyStateController = Pick<
  KeywordResearchControllerState,
  | "hasSearched"
  | "isLoading"
  | "lastSearchError"
  | "seoKeyMissing"
  | "lastSearchKeyword"
  | "lastSearchLocationCode"
  | "history"
  | "historyLoaded"
  | "removeHistoryItem"
>;

type Props = {
  controller: EmptyStateController;
  projectId: string;
};

function formatLocationName(
  intl: IntlShape,
  locationCode: number,
  fallback: string,
): string {
  const option = LOCATION_OPTIONS.find(({ code }) => code === locationCode);
  if (!option) return fallback;
  return (
    intl.formatDisplayName(option.shortLabel, { type: "region" }) ??
    option.label
  );
}

export function KeywordResearchEmptyState({ controller, projectId }: Props) {
  const { hasSearched, isLoading, lastSearchError, seoKeyMissing } = controller;

  // Checked before "no results": with no key the provider was never asked, so it
  // cannot be quoted as having found nothing.
  if (seoKeyMissing) {
    return (
      <div className="pt-1">
        <DataforseoKeyMissingState />
      </div>
    );
  }

  if (hasSearched && !isLoading && !lastSearchError) {
    return <NoResultsState controller={controller} />;
  }

  return <SearchHistoryState controller={controller} projectId={projectId} />;
}

function NoResultsState({ controller }: { controller: EmptyStateController }) {
  const { lastSearchKeyword, lastSearchLocationCode } = controller;
  const intl = useIntl();

  return (
    <div className="pt-1">
      <div className="w-full max-w-2xl rounded-2xl border border-base-300 bg-base-100 p-6 md:p-8 text-center space-y-4 mx-auto">
        <Globe className="size-10 mx-auto text-base-content/40" />
        <div className="space-y-2">
          <p className="text-lg font-semibold text-base-content">
            <FormattedMessage id="keywordResearch.emptyState.noResults.heading" />
          </p>
          <p className="text-sm text-base-content/70">
            <FormattedMessage
              id="keywordResearch.emptyState.noResults.body"
              values={{
                keyword: lastSearchKeyword,
                location: formatLocationName(
                  intl,
                  lastSearchLocationCode,
                  intl.formatMessage({
                    id: "keywordResearch.emptyState.noResults.unknownLocation",
                  }),
                ),
                b: (chunks) => (
                  <span className="font-medium text-base-content">
                    {chunks}
                  </span>
                ),
              }}
            />
          </p>
        </div>
      </div>
    </div>
  );
}

function SearchHistoryState({
  controller,
  projectId,
}: {
  controller: EmptyStateController;
  projectId: string;
}) {
  const { history, historyLoaded, removeHistoryItem } = controller;
  const intl = useIntl();

  if (!historyLoaded) {
    return null;
  }

  return (
    <div className="space-y-4 pt-1">
      {history.length > 0 ? (
        <section className="rounded-2xl border border-base-300 bg-base-100 p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="size-4 text-base-content/45" />
              <span className="text-sm text-base-content/60">
                <FormattedMessage
                  id="keywordResearch.emptyState.history.recentSearches"
                  values={{ count: history.length }}
                />
              </span>
            </div>
          </div>
          <div className="grid gap-2">
            {history.map((item) => (
              <div
                key={item.timestamp}
                className="group flex items-center gap-2 rounded-lg border border-base-300 bg-base-100 p-2"
              >
                <Link
                  from="/p/$projectId/keywords"
                  to="/p/$projectId/keywords"
                  params={{ projectId }}
                  search={{
                    q: item.keyword,
                    loc:
                      item.locationCode === DEFAULT_LOCATION_CODE
                        ? undefined
                        : item.locationCode,
                  }}
                  replace
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-1 py-1 text-left transition-colors hover:bg-base-200"
                >
                  <Clock className="size-4 shrink-0 text-base-content/40" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-base-content">
                      {item.keyword}
                    </p>
                    <p className="truncate text-sm text-base-content/60">
                      {formatLocationName(
                        intl,
                        item.locationCode,
                        item.locationName,
                      )}
                    </p>
                  </div>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-base-content/40">
                    {intl.formatDate(item.timestamp, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 p-1"
                    onClick={() => removeHistoryItem(item.timestamp)}
                    aria-label={intl.formatMessage(
                      {
                        id: "keywordResearch.emptyState.history.removeSearch",
                      },
                      { keyword: item.keyword },
                    )}
                  >
                    <X className="size-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-base-300 bg-base-100/70 p-6 text-center text-base-content/50 space-y-3">
          <Search className="size-10 mx-auto opacity-40" />
          <p className="text-lg font-medium text-base-content/80">
            <FormattedMessage id="keywordResearch.emptyState.history.getStarted" />
          </p>
          <p className="text-sm max-w-md mx-auto">
            <FormattedMessage id="keywordResearch.emptyState.history.getStartedBody" />
          </p>
        </section>
      )}
    </div>
  );
}
