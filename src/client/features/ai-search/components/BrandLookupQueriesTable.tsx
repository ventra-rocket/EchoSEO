import { createColumnHelper, type Table } from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useIntl, type IntlShape } from "react-intl";
import { SortableHeader } from "@/client/components/table/SortableHeader";
import { numericNullsLast } from "@/client/components/table/nullSafeSort";
import {
  BrandLookupTable,
  formatCount,
  HeaderWithHelp,
  PlatformCell,
} from "@/client/features/ai-search/components/BrandLookupCitationTables";
import type { BrandLookupResult } from "@/types/schemas/ai-search";

// Split out of BrandLookupCitationTables.tsx to stay under the 400-line
// max-lines ceiling: the queries column builder + table is a self-contained
// unit with one job, the same move as LighthouseIssuesExportMenu.tsx. Shares
// HeaderWithHelp / PlatformCell / formatCount / BrandLookupTable with the
// pages variant rather than duplicating them.

type TopQueryRow = BrandLookupResult["topQueries"][number];

const queriesHelper = createColumnHelper<TopQueryRow>();

export function buildTopQueriesColumns({
  intl,
  showPlatform,
  projectId,
  brand,
}: {
  intl: IntlShape;
  showPlatform: boolean;
  projectId: string;
  brand: string;
}) {
  return [
    queriesHelper.accessor("question", {
      id: "question",
      header: () => (
        <HeaderWithHelp
          label={intl.formatMessage({ id: "aiCitations.table.column.query" })}
          helpText={intl.formatMessage({
            id: "aiCitations.table.column.queryHelp",
          })}
        />
      ),
      enableSorting: false,
      cell: ({ row }) => (
        <>
          <p className="break-words font-medium">{row.original.question}</p>
          {row.original.brandsMentioned.length > 0 ? (
            <p className="mt-0.5 text-xs text-base-content/50">
              {intl.formatMessage(
                { id: "aiCitations.table.brandsMentioned" },
                {
                  brands: row.original.brandsMentioned.slice(0, 5).join(", "),
                },
              )}
            </p>
          ) : null}
        </>
      ),
    }),
    ...(showPlatform
      ? [
          queriesHelper.accessor("platform", {
            id: "platform",
            header: () => (
              <HeaderWithHelp
                label={intl.formatMessage({
                  id: "aiCitations.table.column.platform",
                })}
                helpText={intl.formatMessage({
                  id: "aiCitations.table.column.platformHelp",
                })}
              />
            ),
            enableSorting: false,
            cell: ({ getValue }) => <PlatformCell platform={getValue()} />,
          }),
        ]
      : []),
    queriesHelper.accessor("aiSearchVolume", {
      id: "aiSearchVolume",
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({
            id: "aiCitations.table.column.aiSearchVolume",
          })}
          helpText={intl.formatMessage({
            id: "aiCitations.table.column.aiSearchVolumeHelp",
          })}
          align="right"
        />
      ),
      cell: ({ getValue }) => (
        <span className="tabular-nums">{formatCount(intl, getValue())}</span>
      ),
      sortingFn: numericNullsLast,
      sortDescFirst: true,
    }),
    queriesHelper.display({
      id: "action",
      header: () => (
        <span className="sr-only">
          {intl.formatMessage({ id: "aiCitations.table.column.actions" })}
        </span>
      ),
      meta: { cellClassName: "w-px whitespace-nowrap text-right align-top" },
      cell: ({ row }) => {
        const runPromptTitle = intl.formatMessage(
          { id: "aiCitations.table.runPromptTitle" },
          { promptExplorer: intl.formatMessage({ id: "nav.promptExplorer" }) },
        );
        return (
          <span
            className="tooltip tooltip-left opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
            data-tip={runPromptTitle}
          >
            <Link
              to="/p/$projectId/prompt-explorer"
              params={{ projectId }}
              search={{ q: row.original.question, hb: brand || undefined }}
              className="btn btn-ghost btn-xs gap-1"
              aria-label={runPromptTitle}
            >
              <Sparkles className="size-3.5" />
            </Link>
          </span>
        );
      },
    }),
  ];
}

export function TopQueriesTable({ table }: { table: Table<TopQueryRow> }) {
  const intl = useIntl();
  if (table.getRowModel().rows.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-base-content/60">
        {intl.formatMessage({ id: "aiCitations.table.queriesEmpty" })}
      </p>
    );
  }

  return <BrandLookupTable table={table} urlLikeColumnId="question" />;
}
