import type { ColumnDef } from "@tanstack/react-table";
import { FormattedNumber, type IntlShape } from "react-intl";
import { SortableHeader } from "./RankTrackingColumns";

export type SuggestedKeyword = {
  keyword: string;
  position: number | null;
  searchVolume: number | null;
  traffic: number | null;
};

/**
 * A function rather than a module-scope constant: the header label and
 * tooltip on every column are translated strings, and `useIntl()` — the only
 * way to read the active locale's catalog — is a hook, callable only inside
 * a component, not at module scope. Extracted out of KeywordSuggestionStep.tsx,
 * which was over the file line budget with these definitions inline; "how each
 * suggestion column renders" doesn't share any state with the step's own
 * loading/error/empty flow, so it is a real seam, not just a line-count dodge.
 */
export function buildKeywordSuggestionColumns(
  intl: IntlShape,
): ColumnDef<SuggestedKeyword>[] {
  return [
    {
      id: "keyword",
      accessorKey: "keyword",
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({
            id: "rank.config.keywordSuggestions.column.keyword",
          })}
          id="keyword"
          tooltipId="rank.config.keywordSuggestions.column.keywordTooltip"
        />
      ),
      cell: ({ getValue }) => (
        <span className="font-medium">{getValue<string>()}</span>
      ),
      sortingFn: "alphanumeric",
    },
    {
      id: "position",
      accessorKey: "position",
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({
            id: "rank.config.keywordSuggestions.column.position",
          })}
          id="position"
          tooltipId="rank.config.keywordSuggestions.column.positionTooltip"
        />
      ),
      cell: ({ getValue }) => {
        const pos = getValue<number | null>();
        return pos != null ? (
          pos
        ) : (
          <span className="text-base-content/40">—</span>
        );
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.position ?? 999;
        const b = rowB.original.position ?? 999;
        return a - b;
      },
    },
    {
      id: "searchVolume",
      accessorKey: "searchVolume",
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({
            id: "rank.config.keywordSuggestions.column.volume",
          })}
          id="searchVolume"
          tooltipId="rank.config.keywordSuggestions.column.volumeTooltip"
        />
      ),
      cell: ({ getValue }) => {
        const vol = getValue<number | null>();
        return vol != null ? (
          <FormattedNumber value={vol} />
        ) : (
          <span className="text-base-content/40">—</span>
        );
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.searchVolume ?? 0;
        const b = rowB.original.searchVolume ?? 0;
        return a - b;
      },
    },
    {
      id: "traffic",
      accessorKey: "traffic",
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({
            id: "rank.config.keywordSuggestions.column.traffic",
          })}
          id="traffic"
          tooltipId="rank.config.keywordSuggestions.column.trafficTooltip"
        />
      ),
      cell: ({ getValue }) => {
        const traffic = getValue<number | null>();
        return traffic != null ? (
          <FormattedNumber value={Math.round(traffic)} />
        ) : (
          <span className="text-base-content/40">—</span>
        );
      },
      sortingFn: (rowA, rowB) => {
        const a = rowA.original.traffic ?? 0;
        const b = rowB.original.traffic ?? 0;
        return a - b;
      },
    },
  ];
}
