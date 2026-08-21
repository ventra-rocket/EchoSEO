import type { IntlShape } from "react-intl";
import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import { SortableHeader } from "@/client/components/table/SortableHeader";
import {
  extractPathname,
  HttpStatusBadge,
} from "@/client/features/audit/shared";
import { safeHttpUrl } from "@/lib/safe-url";
import {
  nullableNumberSort,
  nullableStringSort,
  type PageRow,
} from "@/client/features/audit/results/AuditResultsTableFilterLogic";

const pageColumnHelper = createColumnHelper<PageRow>();

/**
 * A URL the crawler read off a customer's site, so third-party input. A
 * `javascript:` URL that reached `href` would be clickable from inside an
 * authenticated session, so anything that is not http(s) renders as plain text
 * instead of a link.
 */
function CrawledUrlCell({ url }: { url: string }) {
  const safeUrl = safeHttpUrl(url);

  if (!safeUrl) {
    return (
      <span className="text-xs text-base-content/60" title={url}>
        {extractPathname(url)}
      </span>
    );
  }

  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="link link-primary inline-flex items-center gap-1 text-xs"
    >
      <span className="truncate">{extractPathname(url)}</span>
      <ExternalLink className="size-3 shrink-0" />
    </a>
  );
}

export function buildPagesColumns(intl: IntlShape): ColumnDef<PageRow>[] {
  return [
    pageColumnHelper.accessor("url", {
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "audit.results.columns.url" })}
        />
      ),
      cell: ({ getValue }) => <CrawledUrlCell url={getValue()} />,
      meta: { cellClassName: "max-w-[240px] truncate" },
    }),
    pageColumnHelper.accessor("statusCode", {
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "audit.results.columns.status" })}
        />
      ),
      cell: ({ getValue }) => <HttpStatusBadge code={getValue()} />,
      sortingFn: nullableNumberSort,
    }),
    pageColumnHelper.accessor("title", {
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "audit.results.columns.title" })}
        />
      ),
      cell: ({ getValue }) => {
        const title = getValue();
        return title ? (
          <span title={title}>{title}</span>
        ) : (
          <span className="text-error text-xs">
            {intl.formatMessage({
              id: "audit.results.pagesTable.missingTitle",
            })}
          </span>
        );
      },
      sortingFn: nullableStringSort,
      meta: { cellClassName: "max-w-[220px] truncate" },
    }),
    pageColumnHelper.accessor("h1Count", {
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "audit.results.columns.h1" })}
        />
      ),
    }),
    pageColumnHelper.accessor("wordCount", {
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "audit.results.columns.words" })}
        />
      ),
    }),
    pageColumnHelper.display({
      id: "images",
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "audit.results.columns.images" })}
        />
      ),
      cell: ({ row }) =>
        row.original.imagesMissingAlt > 0 ? (
          <span className="text-warning">
            {row.original.imagesMissingAlt}/{row.original.imagesTotal}
          </span>
        ) : (
          row.original.imagesTotal
        ),
      enableSorting: true,
      sortingFn: (left, right) =>
        left.original.imagesMissingAlt - right.original.imagesMissingAlt ||
        left.original.imagesTotal - right.original.imagesTotal,
    }),
    pageColumnHelper.accessor("responseTimeMs", {
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "audit.results.columns.speed" })}
        />
      ),
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? (
          <span className="text-xs">{value}ms</span>
        ) : (
          <span className="text-xs text-base-content/40">-</span>
        );
      },
      sortingFn: nullableNumberSort,
    }),
  ];
}
