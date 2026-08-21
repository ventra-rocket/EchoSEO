import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import { Loader2, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import { FormattedMessage, useIntl } from "react-intl";
import { getDomainKeywordSuggestions } from "@/serverFunctions/domain";
import { addTrackingKeywords } from "@/serverFunctions/rank-tracking";
import { isLabsLocationCode } from "@/client/features/keywords/locations";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import {
  AppDataTable,
  makeSelectionColumn,
  useAppTable,
} from "@/client/components/table/AppDataTable";
import {
  buildKeywordSuggestionColumns,
  type SuggestedKeyword,
} from "./KeywordSuggestionColumns";
import {
  applyShiftRangeSelection,
  type SelectionAnchor,
} from "@/client/components/table/tableSelection";

const PRE_SELECT_COUNT = 20;

type Props = {
  configId: string;
  projectId: string;
  domain: string;
  locationCode: number;
  languageCode: string;
  onDone: (configId: string) => void;
  onClose: () => void;
};

export function KeywordSuggestionStep({
  configId,
  projectId,
  domain,
  locationCode,
  languageCode,
  onDone,
  onClose,
}: Props) {
  const intl = useIntl();
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [hasInitialized, setHasInitialized] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "traffic", desc: true },
  ]);
  const selectAnchorRef = useRef<SelectionAnchor | null>(null);

  const columns = useMemo<ColumnDef<SuggestedKeyword>[]>(
    () => [
      makeSelectionColumn<SuggestedKeyword>(selectAnchorRef),
      ...buildKeywordSuggestionColumns(intl),
    ],
    [intl],
  );

  // Ranked-keyword suggestions are Labs-backed; countries served from Google
  // Ads keyword data (e.g. Iceland) have no ranking data to suggest from.
  const labsSupported = isLabsLocationCode(locationCode);
  const suggestionsQuery = useQuery({
    queryKey: [
      "domainKeywordSuggestions",
      projectId,
      domain,
      locationCode,
      languageCode,
    ],
    queryFn: () =>
      getDomainKeywordSuggestions({
        data: { projectId, domain, locationCode, languageCode },
      }),
    enabled: labsSupported,
  });

  const data = suggestionsQuery.data ?? [];

  // Pre-select top 20 by traffic once data loads.
  useEffect(() => {
    const items = suggestionsQuery.data;
    if (items && items.length > 0 && !hasInitialized) {
      const indexed = items.map((item, i) => ({
        index: i,
        traffic: item.traffic ?? 0,
      }));
      indexed.sort((a, b) => b.traffic - a.traffic);
      const initial: RowSelectionState = {};
      for (let i = 0; i < Math.min(PRE_SELECT_COUNT, indexed.length); i++) {
        initial[indexed[i].index] = true;
      }
      setRowSelection(initial);
      setHasInitialized(true);
    }
  }, [suggestionsQuery.data, hasInitialized]);

  const table = useAppTable({
    data,
    columns,
    state: { rowSelection, sorting },
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    withSorting: true,
    enableRowSelection: true,
  });

  const selectedCount = Object.keys(rowSelection).filter(
    (k) => rowSelection[k],
  ).length;

  const addMutation = useMutation({
    mutationFn: (keywords: string[]) =>
      addTrackingKeywords({ data: { projectId, configId, keywords } }),
    // `keywords` is what this call was made with, so its length vs
    // `result.added` reports what the server silently dropped (duplicates or
    // over the per-config limit) — see AddKeywordsPanel for the same check.
    onSuccess: (result, keywords) => {
      if (result.added < keywords.length) {
        toast.info(
          intl.formatMessage(
            { id: "rank.config.addKeywords.skippedToast" },
            { skipped: keywords.length - result.added },
          ),
        );
      }
      toast.success(
        intl.formatMessage(
          { id: "rank.config.keywordSuggestions.addedToast" },
          { count: result.added },
        ),
      );
      onDone(configId);
    },
    onError: (error) => {
      toast.error(
        getStandardErrorMessage(
          error,
          intl.formatMessage({ id: "rank.config.addKeywords.errorDefault" }),
        ),
      );
    },
  });

  const handleAdd = () => {
    const selectedKeywords = table
      .getSelectedRowModel()
      .rows.map((row) => row.original.keyword);
    if (selectedKeywords.length > 0) {
      addMutation.mutate(selectedKeywords);
    }
  };

  const sectionHeader = (title: string) => (
    <div className="flex items-center justify-between">
      <h2 id="keyword-suggestions-title" className="text-lg font-semibold">
        {title}
      </h2>
      <button className="btn btn-ghost btn-sm btn-square" onClick={onClose}>
        <X className="size-4" />
      </button>
    </div>
  );

  if (!labsSupported) {
    return (
      <>
        {sectionHeader(
          intl.formatMessage({
            id: "rank.config.keywordSuggestions.title.manual",
          }),
        )}
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <p className="text-xs text-base-content/50">
            <FormattedMessage id="rank.config.keywordSuggestions.notSupportedBody" />
          </p>
          <button className="btn btn-primary btn-sm mt-2" onClick={onClose}>
            <FormattedMessage id="rank.config.keywordSuggestions.continue" />
          </button>
        </div>
      </>
    );
  }

  // Loading state
  if (suggestionsQuery.isLoading) {
    return (
      <>
        {sectionHeader(
          intl.formatMessage({
            id: "rank.config.keywordSuggestions.title.loading",
          }),
        )}
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-xs text-base-content/50">
            <FormattedMessage id="rank.config.keywordSuggestions.loadingHint" />
          </p>
        </div>
      </>
    );
  }

  // Error state
  if (suggestionsQuery.isError) {
    return (
      <>
        {sectionHeader(
          intl.formatMessage({
            id: "rank.config.keywordSuggestions.title.error",
          }),
        )}
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <AlertCircle className="size-8 text-error" />
          <p className="text-xs text-base-content/50">
            <FormattedMessage id="rank.config.keywordSuggestions.errorBody" />
          </p>
          <div className="flex gap-2 mt-2">
            <button className="btn btn-primary btn-sm" onClick={onClose}>
              <FormattedMessage id="rank.config.keywordSuggestions.skip" />
            </button>
          </div>
        </div>
      </>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <>
        {sectionHeader(
          intl.formatMessage({
            id: "rank.config.keywordSuggestions.title.empty",
          }),
        )}
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <p className="text-xs text-base-content/50">
            <FormattedMessage
              id="rank.config.keywordSuggestions.emptyBody"
              values={{ domain }}
            />
          </p>
          <button className="btn btn-primary btn-sm mt-2" onClick={onClose}>
            <FormattedMessage id="rank.config.keywordSuggestions.skip" />
          </button>
        </div>
      </>
    );
  }

  // Data loaded
  return (
    <div className="flex flex-col gap-3">
      {sectionHeader(
        intl.formatMessage({
          id: "rank.config.keywordSuggestions.title.choose",
        }),
      )}
      <div className="flex items-center justify-between">
        <p className="text-sm text-base-content/60">
          <FormattedMessage
            id="rank.config.keywordSuggestions.foundSummary"
            values={{ count: data.length, domain }}
          />
        </p>
      </div>

      <AppDataTable
        table={table}
        className="table table-xs table-pin-rows w-full"
        wrapperClassName="overflow-y-auto max-h-[400px] border border-base-300 rounded-lg"
        stickyHeader
        getRowProps={(row) => ({
          className: "hover:bg-base-200/50 cursor-pointer",
          onClick: (event) => {
            if (applyShiftRangeSelection(event, row, table, selectAnchorRef)) {
              return;
            }

            row.toggleSelected();
          },
        })}
      />

      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-xs text-base-content/60">
          <FormattedMessage
            id="rank.config.keywordSuggestions.selectedCount"
            values={{ selected: selectedCount, total: data.length }}
          />
        </p>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <FormattedMessage id="rank.config.keywordSuggestions.skip" />
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleAdd}
            disabled={addMutation.isPending || selectedCount === 0}
          >
            {addMutation.isPending && (
              <Loader2 className="size-3.5 animate-spin" />
            )}
            <FormattedMessage
              id="rank.config.keywordSuggestions.saveKeywords"
              values={{ count: selectedCount }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
