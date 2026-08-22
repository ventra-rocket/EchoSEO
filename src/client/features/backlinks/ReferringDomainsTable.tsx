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
import type { ReferringDomainRow } from "./backlinksPageTypes";
import type { ReferringDomainsSortField } from "@/types/schemas/backlinks";
import {
  formatCompactDate,
  formatDecimal,
  formatNumber,
} from "./backlinksPageUtils";
import type { DomainRatings } from "./useAhrefsDomainRatings";

const columnHelper = createColumnHelper<ReferringDomainRow>();

/**
 * Columns for the referring domains table. When `domainRatings` is provided
 * (the user clicked "Ahrefs DR"), an Ahrefs DR column is inserted after Rank;
 * otherwise it stays hidden. DR is loaded client-side from Ahrefs, so it can't
 * participate in server-side sorting. A function rather than a module-scope
 * constant: the header labels are translated strings, and useIntl() is a hook,
 * callable only inside a component.
 */
function buildReferringDomainColumns(
  intl: IntlShape,
  domainRatings: DomainRatings | null,
) {
  // Column ids map to server-side sort fields; sorting re-queries DataForSEO
  // across all referring domains, not just the loaded page.
  const baseColumns = [
    columnHelper.accessor("domain", {
      id: "domain" satisfies ReferringDomainsSortField,
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "backlinksTables.column.domain" })}
          helpText={intl.formatMessage({
            id: "backlinksTables.tooltip.domain",
          })}
        />
      ),
      cell: ({ getValue }) => {
        const domain = getValue();
        if (!domain) return "-";
        return (
          <SafeExternalLink
            url={getDomainWebsiteHref(domain)}
            label={domain}
            className="link link-primary link-hover break-all inline-flex items-center gap-1"
          />
        );
      },
    }),
    columnHelper.accessor("backlinks", {
      id: "backlinks" satisfies ReferringDomainsSortField,
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "backlinksTables.metric.backlinks" })}
          helpText={intl.formatMessage({
            id: "backlinksTables.tooltip.domainsBacklinks",
          })}
        />
      ),
      cell: ({ getValue }) => formatNumber(intl, getValue()),
      sortDescFirst: true,
    }),
    columnHelper.accessor("referringPages", {
      id: "referringPages" satisfies ReferringDomainsSortField,
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({
            id: "backlinksTables.column.referringPages",
          })}
          helpText={intl.formatMessage({
            id: "backlinksTables.tooltip.referringPages",
          })}
        />
      ),
      cell: ({ getValue }) => formatNumber(intl, getValue()),
      sortDescFirst: true,
    }),
    columnHelper.accessor("rank", {
      id: "rank" satisfies ReferringDomainsSortField,
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "backlinksTables.metric.rank" })}
          helpText={intl.formatMessage({
            id: "backlinksTables.tooltip.domainsRank",
          })}
        />
      ),
      cell: ({ getValue }) => formatNumber(intl, getValue()),
      sortDescFirst: true,
    }),
    columnHelper.accessor("spamScore", {
      id: "spamScore" satisfies ReferringDomainsSortField,
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "backlinksTables.metric.spam" })}
          helpText={intl.formatMessage({
            id: "backlinksTables.tooltip.domainsSpam",
          })}
        />
      ),
      cell: ({ getValue }) => formatDecimal(intl, getValue()),
      sortDescFirst: true,
    }),
    columnHelper.accessor("firstSeen", {
      id: "firstSeen" satisfies ReferringDomainsSortField,
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "backlinksTables.column.firstSeen" })}
          helpText={intl.formatMessage({
            id: "backlinksTables.tooltip.domainsFirstSeen",
          })}
        />
      ),
      cell: ({ getValue }) => formatCompactDate(intl, getValue()),
      sortDescFirst: true,
    }),
    columnHelper.accessor("brokenBacklinks", {
      id: "brokenBacklinks" satisfies ReferringDomainsSortField,
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "backlinksTables.column.issues" })}
          helpText={intl.formatMessage({
            id: "backlinksTables.tooltip.issues",
          })}
        />
      ),
      cell: ({ row }) => (
        <div className="text-sm">
          <div>
            {intl.formatMessage(
              { id: "backlinksTables.issues.brokenLinks" },
              { count: formatNumber(intl, row.original.brokenBacklinks) },
            )}
          </div>
          <div className="text-base-content/55">
            {intl.formatMessage(
              { id: "backlinksTables.issues.brokenPages" },
              { count: formatNumber(intl, row.original.brokenPages) },
            )}
          </div>
        </div>
      ),
      sortDescFirst: true,
    }),
  ];

  if (!domainRatings) return baseColumns;

  const ratings = domainRatings;
  const drColumn = columnHelper.display({
    id: "ahrefsDr",
    header: () => (
      <HeaderHelpLabel
        label={intl.formatMessage({ id: "backlinksTables.metric.ahrefsDr" })}
        helpText={intl.formatMessage({
          id: "backlinksTables.tooltip.domainsAhrefsDr",
        })}
      />
    ),
    cell: ({ row }) => {
      const domain = row.original.domain;
      const dr = domain ? (ratings[domain] ?? null) : null;
      return dr == null ? "—" : formatDecimal(intl, dr);
    },
  });

  const insertAt = baseColumns.findIndex((column) => column.id === "rank") + 1;
  return [
    ...baseColumns.slice(0, insertAt),
    drColumn,
    ...baseColumns.slice(insertAt),
  ];
}

function getDomainWebsiteHref(domain: string) {
  try {
    return new URL(domain).toString();
  } catch {
    return `https://${domain}`;
  }
}

export function ReferringDomainsTable({
  rows,
  domainRatings,
  sorting,
  onSortingChange,
}: {
  rows: ReferringDomainRow[];
  domainRatings: DomainRatings | null;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
}) {
  const intl = useIntl();
  const columns = useMemo(
    () => buildReferringDomainColumns(intl, domainRatings),
    [intl, domainRatings],
  );

  const table = useAppTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange,
    manualSorting: true,
  });

  if (rows.length === 0) {
    return <EmptyTableState labelId="backlinksTables.empty.domains" />;
  }

  return (
    <AppDataTable
      table={table}
      getCellClassName={(_, columnId) =>
        columnId === "domain" ? "font-medium break-all" : undefined
      }
    />
  );
}
