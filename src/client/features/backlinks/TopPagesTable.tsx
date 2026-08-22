import { createColumnHelper } from "@tanstack/react-table";
import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { useMemo } from "react";
import { type IntlShape, useIntl } from "react-intl";
import { SafeExternalLink } from "@/client/components/SafeExternalLink";
import {
  AppDataTable,
  useAppTable,
} from "@/client/components/table/AppDataTable";
import { SortableHeader } from "@/client/components/table/SortableHeader";
import { HeaderHelpLabel } from "@/client/features/keywords/components";
import { EmptyTableState } from "./BacklinksPageEmptyTableState";
import type { TopPageRow } from "./backlinksPageTypes";
import type { TopPagesSortField } from "@/types/schemas/backlinks";
import { formatNumber } from "./backlinksPageUtils";

const columnHelper = createColumnHelper<TopPageRow>();

// Column ids map to server-side sort fields; sorting re-queries DataForSEO
// across all pages, not just the loaded page of results. A function rather
// than a module-scope constant: useIntl() is a hook, callable only inside a
// component (see buildKeywordSuggestionColumns in
// rank-tracking/KeywordSuggestionColumns.tsx for the same pattern).
function buildTopPagesColumns(intl: IntlShape) {
  return [
    columnHelper.accessor("page", {
      id: "page",
      enableSorting: false,
      header: () => (
        <HeaderHelpLabel
          label={intl.formatMessage({ id: "backlinksTables.column.page" })}
          helpText={intl.formatMessage({ id: "backlinksTables.tooltip.page" })}
        />
      ),
      cell: ({ getValue }) => {
        const page = getValue();
        return page ? (
          <SafeExternalLink
            url={page}
            label={page}
            className="link link-hover break-all inline-flex items-center gap-1"
          />
        ) : (
          "-"
        );
      },
    }),
    columnHelper.accessor("backlinks", {
      id: "backlinks" satisfies TopPagesSortField,
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "backlinksTables.metric.backlinks" })}
          helpText={intl.formatMessage({
            id: "backlinksTables.tooltip.pagesBacklinks",
          })}
        />
      ),
      cell: ({ getValue }) => formatNumber(intl, getValue()),
      sortDescFirst: true,
    }),
    columnHelper.accessor("referringDomains", {
      id: "referringDomains" satisfies TopPagesSortField,
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({
            id: "backlinksTables.metric.referringDomains",
          })}
          helpText={intl.formatMessage({
            id: "backlinksTables.tooltip.pagesReferringDomains",
          })}
        />
      ),
      cell: ({ getValue }) => formatNumber(intl, getValue()),
      sortDescFirst: true,
    }),
    columnHelper.accessor("rank", {
      id: "rank" satisfies TopPagesSortField,
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "backlinksTables.metric.rank" })}
          helpText={intl.formatMessage({
            id: "backlinksTables.tooltip.pagesRank",
          })}
        />
      ),
      cell: ({ getValue }) => formatNumber(intl, getValue()),
      sortDescFirst: true,
    }),
    columnHelper.accessor("brokenBacklinks", {
      id: "brokenBacklinks" satisfies TopPagesSortField,
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({
            id: "backlinksTables.column.brokenBacklinks",
          })}
          helpText={intl.formatMessage({
            id: "backlinksTables.tooltip.pagesBrokenBacklinks",
          })}
        />
      ),
      cell: ({ getValue }) => formatNumber(intl, getValue()),
      sortDescFirst: true,
    }),
  ];
}

export function TopPagesTable({
  rows,
  sorting,
  onSortingChange,
}: {
  rows: TopPageRow[];
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
}) {
  const intl = useIntl();
  const columns = useMemo(() => buildTopPagesColumns(intl), [intl]);
  const table = useAppTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange,
    manualSorting: true,
  });

  if (rows.length === 0) {
    return <EmptyTableState labelId="backlinksTables.empty.pages" />;
  }

  return (
    <AppDataTable
      table={table}
      getCellClassName={(_, columnId) =>
        columnId === "page" ? "min-w-80" : undefined
      }
    />
  );
}
