import type { ColumnDef } from "@tanstack/react-table";
import { ChevronRight } from "lucide-react";
import { FormattedMessage, type IntlShape, useIntl } from "react-intl";
import { SortableHeader } from "@/client/components/table/SortableHeader";
import { HeaderHelpLabel } from "@/client/features/keywords/components";
import { BacklinksSourceLink } from "./BacklinksPageLinks";
import type { BacklinksRow } from "./backlinksPageTypes";
import type { BacklinksRowsSortField } from "@/types/schemas/backlinks";
import {
  formatCompactDate,
  formatDecimal,
  formatNumber,
} from "./backlinksPageUtils";
import type { DomainRatings } from "./useAhrefsDomainRatings";

/**
 * Row model for the backlinks table. In the one-per-domain view, depth-0 rows
 * are each domain's strongest link and can expand into the domain's remaining
 * links (depth-1) plus a transient status row while they load.
 */
export type BacklinksDisplayRow =
  | {
      kind: "link";
      row: BacklinksRow;
      depth: 0 | 1;
      expandable: boolean;
      expanded: boolean;
    }
  | { kind: "status"; domain: string; status: "loading" | "error" | "empty" };

function BacklinkFlags({ row }: { row: BacklinksRow }) {
  return (
    <div className="flex flex-wrap gap-1">
      {row.isLost ? (
        <span className="badge badge-sm badge-error badge-outline">
          <FormattedMessage id="backlinksTables.flag.lost" />
        </span>
      ) : null}
      {row.isBroken ? (
        <span className="badge badge-sm badge-warning badge-outline">
          <FormattedMessage id="backlinksTables.flag.broken" />
        </span>
      ) : null}
      {row.isDofollow === false ? (
        <span className="badge badge-sm badge-outline">
          <FormattedMessage id="backlinksTables.flag.nofollow" />
        </span>
      ) : null}
      {row.linksCount != null && row.linksCount > 1 ? (
        <span className="badge badge-sm badge-outline min-w-fit whitespace-nowrap">
          <FormattedMessage
            id="backlinksTables.flag.linksCount"
            values={{ count: row.linksCount }}
          />
        </span>
      ) : null}
    </div>
  );
}

function StatusCell({ status }: { status: "loading" | "error" | "empty" }) {
  if (status === "loading") {
    return (
      <span className="flex items-center gap-2 pl-6 text-sm text-base-content/60">
        <span className="loading loading-spinner loading-xs" />
        <FormattedMessage id="backlinksTables.state.loadingLinks" />
      </span>
    );
  }
  return (
    <span className="pl-6 text-sm text-base-content/60">
      <FormattedMessage
        id={
          status === "error"
            ? "backlinksTables.state.loadError"
            : "backlinksTables.state.noOtherLinks"
        }
      />
    </span>
  );
}

function SourceCell({
  displayRow,
  onToggleDomain,
}: {
  displayRow: BacklinksDisplayRow;
  onToggleDomain?: (domain: string) => void;
}) {
  const intl = useIntl();
  if (displayRow.kind === "status") {
    return <StatusCell status={displayRow.status} />;
  }

  const { row, depth, expandable, expanded } = displayRow;
  if (depth > 0) {
    return (
      <div className="break-all pl-6">
        {row.urlFrom ? (
          <BacklinksSourceLink url={row.urlFrom} maxLength={48} muted />
        ) : (
          <span className="text-base-content/55">-</span>
        )}
      </div>
    );
  }

  const domainLabel = row.domainFrom?.replace(/^www\./, "") ?? "-";
  return (
    <div className="flex items-start gap-1.5 break-all">
      {expandable && row.domainFrom && onToggleDomain ? (
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-square shrink-0 -ml-1"
          aria-label={intl.formatMessage(
            {
              id: expanded
                ? "backlinksTables.source.hideLinksFromDomain"
                : "backlinksTables.source.showLinksFromDomain",
            },
            { domain: domainLabel },
          )}
          aria-expanded={expanded}
          onClick={() => onToggleDomain(row.domainFrom ?? "")}
        >
          <ChevronRight
            className={`size-4 transition-transform ${expanded ? "rotate-90" : ""}`}
          />
        </button>
      ) : null}
      <div>
        <div className="font-semibold">{domainLabel}</div>
        {row.urlFrom ? (
          <BacklinksSourceLink url={row.urlFrom} maxLength={48} muted />
        ) : null}
      </div>
    </div>
  );
}

/** Renders nothing for status rows, the link cell otherwise. */
function linkCell(
  render: (row: BacklinksRow) => React.ReactNode,
): (ctx: { row: { original: BacklinksDisplayRow } }) => React.ReactNode {
  return ({ row }) =>
    row.original.kind === "link" ? render(row.original.row) : null;
}

function buildBaseColumns(
  intl: IntlShape,
  onToggleDomain?: (domain: string) => void,
): ColumnDef<BacklinksDisplayRow>[] {
  // Sortable column ids ("rank", "domainRank", "spamScore", "firstSeen") map
  // to server-side sort fields — sorting re-queries DataForSEO across the
  // full backlink profile, not just the loaded page.
  return [
    {
      id: "source",
      enableSorting: false,
      header: () => (
        <HeaderHelpLabel
          label={intl.formatMessage({ id: "backlinksTables.column.source" })}
          helpText={intl.formatMessage({
            id: "backlinksTables.tooltip.source",
          })}
        />
      ),
      size: 250,
      minSize: 180,
      cell: ({ row }) => (
        <SourceCell displayRow={row.original} onToggleDomain={onToggleDomain} />
      ),
    },
    {
      id: "target",
      enableSorting: false,
      header: () => (
        <HeaderHelpLabel
          label={intl.formatMessage({ id: "backlinksTables.column.target" })}
          helpText={intl.formatMessage({
            id: "backlinksTables.tooltip.target",
          })}
        />
      ),
      size: 220,
      minSize: 150,
      cell: linkCell((row) => (
        <div className="break-all">
          {row.urlTo ? (
            <BacklinksSourceLink url={row.urlTo} maxLength={40} />
          ) : (
            "-"
          )}
        </div>
      )),
    },
    {
      id: "anchor",
      enableSorting: false,
      header: () => (
        <HeaderHelpLabel
          label={intl.formatMessage({ id: "backlinksTables.column.anchor" })}
          helpText={intl.formatMessage({
            id: "backlinksTables.tooltip.anchor",
          })}
        />
      ),
      size: 150,
      minSize: 100,
      cell: linkCell((row) => (
        <div className="space-y-0.5 break-words">
          <span className="text-sm">
            {row.anchor ||
              intl.formatMessage({ id: "backlinksTables.anchorEmpty" })}
          </span>
          {row.itemType ? (
            <div className="text-xs text-base-content/55">{row.itemType}</div>
          ) : null}
        </div>
      )),
    },
    {
      id: "flags",
      enableSorting: false,
      header: () => (
        <HeaderHelpLabel
          label={intl.formatMessage({ id: "backlinksTables.column.flags" })}
          helpText={intl.formatMessage({
            id: "backlinksTables.tooltip.flags",
          })}
        />
      ),
      size: 130,
      minSize: 80,
      cell: linkCell((row) => <BacklinkFlags row={row} />),
    },
    {
      id: "rank" satisfies BacklinksRowsSortField,
      accessorFn: (displayRow) =>
        displayRow.kind === "link" ? displayRow.row.rank : null,
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "backlinksTables.column.link" })}
          helpText={intl.formatMessage({ id: "backlinksTables.tooltip.link" })}
          align="right"
        />
      ),
      size: 70,
      minSize: 50,
      sortDescFirst: true,
      cell: linkCell((row) => (
        <div className="text-right tabular-nums text-sm">
          {formatNumber(intl, row.rank)}
        </div>
      )),
    },
    {
      id: "domainRank" satisfies BacklinksRowsSortField,
      accessorFn: (displayRow) =>
        displayRow.kind === "link" ? displayRow.row.domainFromRank : null,
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "backlinksTables.column.da" })}
          helpText={intl.formatMessage({ id: "backlinksTables.tooltip.da" })}
          align="right"
        />
      ),
      size: 70,
      minSize: 50,
      sortDescFirst: true,
      cell: linkCell((row) => (
        <div className="text-right tabular-nums text-sm">
          {formatNumber(intl, row.domainFromRank)}
        </div>
      )),
    },
    {
      id: "spamScore" satisfies BacklinksRowsSortField,
      accessorFn: (displayRow) =>
        displayRow.kind === "link" ? displayRow.row.spamScore : null,
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "backlinksTables.metric.spam" })}
          helpText={intl.formatMessage({
            id: "backlinksTables.tooltip.backlinksSpam",
          })}
          align="right"
        />
      ),
      size: 70,
      minSize: 50,
      sortDescFirst: true,
      cell: linkCell((row) => {
        const value = row.spamScore;
        return (
          <div className="text-right tabular-nums text-sm">
            {value != null && value > 0 ? Math.round(value) : null}
          </div>
        );
      }),
    },
    {
      id: "firstSeen" satisfies BacklinksRowsSortField,
      accessorFn: (displayRow) =>
        displayRow.kind === "link" ? displayRow.row.firstSeen : null,
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({
            id: "backlinksTables.column.firstSeen",
          })}
          helpText={intl.formatMessage({
            id: "backlinksTables.tooltip.backlinksFirstSeen",
          })}
        />
      ),
      size: 110,
      minSize: 80,
      sortDescFirst: true,
      cell: linkCell((row) => (
        <div className="whitespace-nowrap text-sm">
          <div>{formatCompactDate(intl, row.firstSeen)}</div>
          {row.lastSeen ? (
            <div className="text-xs text-base-content/55">
              {intl.formatMessage(
                { id: "backlinksTables.lastSeen" },
                { date: formatCompactDate(intl, row.lastSeen) },
              )}
            </div>
          ) : null}
        </div>
      )),
    },
  ];
}

/**
 * Columns for the backlinks table. When `domainRatings` is provided (the user
 * clicked "Ahrefs DR"), an Ahrefs DR column is inserted after DA; otherwise it
 * stays hidden. DR is loaded client-side from Ahrefs, so it can't participate
 * in server-side sorting.
 */
export function buildBacklinksColumns(
  intl: IntlShape,
  domainRatings: DomainRatings | null,
  onToggleDomain?: (domain: string) => void,
): ColumnDef<BacklinksDisplayRow>[] {
  const baseColumns = buildBaseColumns(intl, onToggleDomain);
  if (!domainRatings) return baseColumns;

  const ratings = domainRatings;
  const drColumn: ColumnDef<BacklinksDisplayRow> = {
    id: "ahrefsDr",
    enableSorting: false,
    header: () => (
      <span className="flex w-full justify-end">
        <HeaderHelpLabel
          label={intl.formatMessage({ id: "backlinksTables.metric.ahrefsDr" })}
          helpText={intl.formatMessage({
            id: "backlinksTables.tooltip.backlinksAhrefsDr",
          })}
        />
      </span>
    ),
    size: 90,
    minSize: 70,
    cell: linkCell((row) => {
      const domain = row.domainFrom?.replace(/^www\./, "");
      const dr = domain ? (ratings[domain] ?? null) : null;
      return (
        <div className="text-right tabular-nums text-sm">
          {dr == null ? "—" : formatDecimal(intl, dr)}
        </div>
      );
    }),
  };

  const insertAt =
    baseColumns.findIndex((column) => column.id === "domainRank") + 1;
  return [
    ...baseColumns.slice(0, insertAt),
    drColumn,
    ...baseColumns.slice(insertAt),
  ];
}
