import {
  createColumnHelper,
  type ColumnDef,
  type OnChangeFn,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import { Search } from "lucide-react";
import { useMemo } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  AppDataTable,
  makeSelectionColumn,
  useAppTable,
  useSelectionAnchor,
} from "@/client/components/table/AppDataTable";
import { SortableHeader } from "@/client/components/table/SortableHeader";
import { DifficultyBadge } from "@/client/features/domain/components/DifficultyBadge";
import { IntentBadge } from "@/client/features/keywords/components";
import type { KeywordIntent, SavedKeywordRow } from "@/types/keywords";
import { TagChip } from "./TagChip";
import {
  formatSavedKeywordDate,
  formatSavedKeywordNumber,
} from "./savedKeywordsUtils";

const columnHelper = createColumnHelper<SavedKeywordRow>();

export function SavedKeywordsTable({
  rows,
  rowSelection,
  sorting,
  isLoading,
  hasActiveFilters,
  onRowSelectionChange,
  onSortingChange,
}: {
  rows: SavedKeywordRow[];
  rowSelection: RowSelectionState;
  sorting: SortingState;
  isLoading: boolean;
  hasActiveFilters: boolean;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  onSortingChange: OnChangeFn<SortingState>;
}) {
  const intl = useIntl();
  const selectAnchorRef = useSelectionAnchor();
  const columns = useMemo<ColumnDef<SavedKeywordRow>[]>(
    () => [
      makeSelectionColumn<SavedKeywordRow>(selectAnchorRef),
      columnHelper.accessor("keyword", {
        header: ({ column }) => (
          <SortableHeader
            column={column}
            label={intl.formatMessage({ id: "saved.table.column.keyword" })}
          />
        ),
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue()}</span>
        ),
      }),
      columnHelper.accessor("searchVolume", {
        header: ({ column }) => (
          <SortableHeader
            column={column}
            label={intl.formatMessage({ id: "saved.table.column.volume" })}
          />
        ),
        cell: ({ getValue }) => formatSavedKeywordNumber(intl, getValue()),
      }),
      columnHelper.accessor("cpc", {
        header: ({ column }) => (
          <SortableHeader
            column={column}
            label={intl.formatMessage({ id: "saved.table.column.cpc" })}
          />
        ),
        cell: ({ getValue }) => {
          const value = getValue();
          return value == null
            ? "-"
            : intl.formatNumber(value, {
                style: "currency",
                currency: "USD",
              });
        },
      }),
      columnHelper.accessor("competition", {
        header: ({ column }) => (
          <SortableHeader
            column={column}
            label={intl.formatMessage({
              id: "saved.table.column.competition",
            })}
            helpText={intl.formatMessage({
              id: "saved.table.tooltip.competition",
            })}
          />
        ),
        cell: ({ getValue }) => {
          const value = getValue();
          return value == null
            ? "-"
            : intl.formatNumber(value, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
        },
      }),
      columnHelper.accessor("keywordDifficulty", {
        header: ({ column }) => (
          <SortableHeader
            column={column}
            label={intl.formatMessage({
              id: "saved.table.column.difficulty",
            })}
            helpText={intl.formatMessage({
              id: "saved.table.tooltip.difficulty",
            })}
          />
        ),
        cell: ({ getValue }) => <DifficultyBadge value={getValue()} />,
      }),
      columnHelper.accessor("intent", {
        header: () => intl.formatMessage({ id: "saved.table.column.intent" }),
        cell: ({ getValue }) => (
          <IntentBadge intent={normalizeIntent(getValue())} />
        ),
        enableSorting: false,
      }),
      columnHelper.display({
        id: "tags",
        header: () => intl.formatMessage({ id: "saved.table.column.tags" }),
        cell: ({ row }) => <TagList tags={row.original.tags} />,
        enableSorting: false,
        meta: { cellClassName: "min-w-40 max-w-64" },
      }),
      columnHelper.accessor("fetchedAt", {
        header: ({ column }) => (
          <SortableHeader
            column={column}
            label={intl.formatMessage({
              id: "saved.table.column.lastFetched",
            })}
          />
        ),
        cell: ({ getValue }) => (
          <span className="text-xs text-base-content/55">
            {formatSavedKeywordDate(intl, getValue())}
          </span>
        ),
      }),
    ],
    [intl, selectAnchorRef],
  );
  const table = useAppTable({
    data: rows,
    columns,
    state: { rowSelection, sorting },
    onRowSelectionChange,
    onSortingChange,
    getRowId: (row) => row.id,
    enableRowSelection: true,
    manualSorting: true,
  });

  return (
    <AppDataTable
      table={table}
      className="table table-zebra table-sm"
      isLoading={isLoading}
      loading={<SavedKeywordsSkeleton />}
      empty={<SavedKeywordsEmptyState hasActiveFilters={hasActiveFilters} />}
    />
  );
}

function normalizeIntent(value: string | null): KeywordIntent {
  switch (value) {
    case "informational":
    case "commercial":
    case "transactional":
    case "navigational":
    case "unknown":
      return value;
    default:
      return "unknown";
  }
}

function TagList({ tags }: { tags: SavedKeywordRow["tags"] }) {
  if (tags.length === 0) {
    return <span className="text-base-content/35">-</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <TagChip key={tag.id} tag={tag} size="xs" />
      ))}
    </div>
  );
}

function SavedKeywordsSkeleton() {
  return (
    <div className="space-y-3" aria-busy>
      <div className="skeleton h-4 w-48" />
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="grid grid-cols-9 items-center gap-3">
          <div className="skeleton h-4" />
          <div className="skeleton col-span-2 h-4" />
          <div className="skeleton h-4" />
          <div className="skeleton h-4" />
          <div className="skeleton h-4" />
          <div className="skeleton h-4" />
          <div className="skeleton h-4" />
          <div className="skeleton h-4" />
        </div>
      ))}
    </div>
  );
}

function SavedKeywordsEmptyState({
  hasActiveFilters,
}: {
  hasActiveFilters: boolean;
}) {
  return (
    <div className="py-12 text-center text-sm text-base-content/55">
      <Search className="mx-auto mb-2 size-8 opacity-40" />
      <p>
        <FormattedMessage
          id={
            hasActiveFilters
              ? "saved.table.empty.noMatch"
              : "saved.table.empty.noneYet"
          }
        />
      </p>
    </div>
  );
}
