import { memo, useMemo } from "react";
import {
  createColumnHelper,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table";
import { useIntl } from "react-intl";
import {
  AppDataTable,
  makeSelectionColumn,
  useAppTable,
  useSelectionAnchor,
} from "@/client/components/table/AppDataTable";
import { ExternalUrlCell } from "@/client/components/table/url";
import { DifficultyBadge } from "@/client/features/domain/components/DifficultyBadge";
import { SortableHeader } from "@/client/features/domain/components/SortableHeader";
import { useDomainRenderDebug } from "@/client/features/domain/domainDebug";
import type {
  DomainSortMode,
  KeywordRow,
  SortOrder,
} from "@/client/features/domain/types";

type Props = {
  domain: string;
  rows: KeywordRow[];
  selectedKeywords: Set<string>;
  visibleKeywords: string[];
  sortMode: DomainSortMode;
  currentSortOrder: SortOrder;
  onSortClick: (sort: DomainSortMode) => void;
  onToggleKeyword: (keyword: string) => void;
};

const keywordColumnHelper = createColumnHelper<KeywordRow>();

function DomainKeywordsTableComponent({
  domain,
  rows,
  selectedKeywords,
  visibleKeywords,
  sortMode,
  currentSortOrder,
  onSortClick,
  onToggleKeyword,
}: Props) {
  const intl = useIntl();
  const renderStarted = performance.now();
  const selectAnchorRef = useSelectionAnchor();
  const rowSelection = useMemo<RowSelectionState>(
    () =>
      Object.fromEntries(
        [...selectedKeywords].map((keyword) => [keyword, true]),
      ) as RowSelectionState,
    [selectedKeywords],
  );
  const columns = useMemo<ColumnDef<KeywordRow>[]>(
    () => [
      makeSelectionColumn<KeywordRow>(selectAnchorRef),
      keywordColumnHelper.accessor("keyword", {
        header: () =>
          intl.formatMessage({ id: "domainTables.keywords.column.keyword" }),
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue()}</span>
        ),
      }),
      keywordColumnHelper.accessor("position", {
        header: () => (
          <SortableHeader
            label={intl.formatMessage({
              id: "domainTables.keywords.column.rank",
            })}
            isActive={sortMode === "rank"}
            order={currentSortOrder}
            onClick={() => onSortClick("rank")}
          />
        ),
        cell: ({ getValue }) => {
          const value = getValue();
          return value == null ? "-" : intl.formatNumber(value);
        },
      }),
      keywordColumnHelper.accessor("searchVolume", {
        header: () => (
          <SortableHeader
            label={intl.formatMessage({
              id: "domainTables.keywords.column.volume",
            })}
            isActive={sortMode === "volume"}
            order={currentSortOrder}
            onClick={() => onSortClick("volume")}
          />
        ),
        cell: ({ getValue }) => {
          const value = getValue();
          return value == null ? "-" : intl.formatNumber(value);
        },
      }),
      keywordColumnHelper.accessor("traffic", {
        header: () => (
          <SortableHeader
            label={intl.formatMessage({
              id: "domainTables.keywords.column.traffic",
            })}
            isActive={sortMode === "traffic"}
            order={currentSortOrder}
            onClick={() => onSortClick("traffic")}
          />
        ),
        cell: ({ getValue }) => {
          const value = getValue();
          return value == null ? "-" : intl.formatNumber(Math.round(value));
        },
      }),
      keywordColumnHelper.accessor("cpc", {
        header: () => (
          <SortableHeader
            label={intl.formatMessage({
              id: "domainTables.keywords.column.cpc",
            })}
            helpText={intl.formatMessage({
              id: "domainTables.keywords.column.cpcTooltip",
            })}
            isActive={sortMode === "cpc"}
            order={currentSortOrder}
            onClick={() => onSortClick("cpc")}
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
      keywordColumnHelper.display({
        id: "url",
        header: () =>
          intl.formatMessage({ id: "domainTables.keywords.column.url" }),
        cell: ({ row }) => (
          <ExternalUrlCell
            value={row.original.relativeUrl ?? row.original.url}
            label={row.original.relativeUrl ?? row.original.url ?? ""}
            baseDomain={domain}
          />
        ),
        meta: {
          cellClassName: "max-w-[260px] truncate",
        },
      }),
      keywordColumnHelper.accessor("keywordDifficulty", {
        header: () => (
          <SortableHeader
            label={intl.formatMessage({
              id: "domainTables.keywords.column.score",
            })}
            helpText={intl.formatMessage({
              id: "domainTables.keywords.column.scoreTooltip",
            })}
            isActive={sortMode === "score"}
            order={currentSortOrder}
            onClick={() => onSortClick("score")}
          />
        ),
        cell: ({ getValue }) => <DifficultyBadge value={getValue()} />,
      }),
    ],
    [currentSortOrder, domain, intl, onSortClick, selectAnchorRef, sortMode],
  );
  const table = useAppTable({
    data: rows,
    columns,
    state: { rowSelection },
    onRowSelectionChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(rowSelection) : updater;
      const selected = Object.entries(next)
        .filter(([, value]) => value)
        .map(([keyword]) => keyword);
      for (const keyword of visibleKeywords) {
        const shouldBeSelected = selected.includes(keyword);
        if (selectedKeywords.has(keyword) !== shouldBeSelected) {
          onToggleKeyword(keyword);
        }
      }
    },
    getRowId: (row) => row.keyword,
    enableRowSelection: true,
  });
  useDomainRenderDebug("DomainKeywordsTable", {
    rows: rows.length,
    selectedCount: selectedKeywords.size,
    durationMs: Math.round(performance.now() - renderStarted),
    sortMode,
    currentSortOrder,
  });

  return (
    <div className="overflow-x-auto">
      <div className="mb-2 text-xs text-base-content/60">
        {selectedKeywords.size > 0 ? (
          <>
            {intl.formatNumber(selectedKeywords.size)}{" "}
            {intl.formatMessage({ id: "common.table.selected" })}
          </>
        ) : (
          intl.formatMessage({ id: "domainTables.keywords.selectionHint" })
        )}
      </div>
      <AppDataTable
        table={table}
        className="table table-zebra table-sm"
        wrapperClassName=""
        empty={
          <div className="py-6 text-center text-base-content/60">
            {intl.formatMessage({ id: "domainTables.keywords.empty" })}
          </div>
        }
      />
    </div>
  );
}

export const DomainKeywordsTable = memo(DomainKeywordsTableComponent);
