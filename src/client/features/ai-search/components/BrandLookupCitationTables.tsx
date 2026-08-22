import { useState } from "react";
import { createColumnHelper, type Table } from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { useIntl, type IntlShape } from "react-intl";
import { AppDataTable } from "@/client/components/table/AppDataTable";
import { SortableHeader } from "@/client/components/table/SortableHeader";
import { HeaderHelpLabel } from "@/client/features/keywords/components";
import { numericNullsLast } from "@/client/components/table/nullSafeSort";
import {
  PLATFORM_DOT_CLASS,
  PLATFORM_SHORT_LABEL,
} from "@/client/features/ai-search/platformLabels";
import { formatUrlForDisplay } from "@/client/components/table/url";
import type { BrandLookupResult } from "@/types/schemas/ai-search";

type TopPageRow = BrandLookupResult["topPages"][number];
type PlatformKey = TopPageRow["platform"];

/**
 * Uppercase column header with a hover/focus popover explaining the column.
 * Exported: BrandLookupQueriesTable.tsx (split out to stay under the 400-line
 * max-lines ceiling) shares this and the three helpers below it.
 */
export function HeaderWithHelp({
  label,
  helpText,
}: {
  label: string;
  helpText: string;
}) {
  return (
    <span className="uppercase tracking-wider">
      <HeaderHelpLabel label={label} helpText={helpText} />
    </span>
  );
}

/**
 * Platform indicator used only when a table actually spans >1 platform. A dot +
 * short label replaces the old full-width pill that repeated identically on
 * every row.
 */
export function PlatformCell({ platform }: { platform: PlatformKey }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-base-content/70">
      <span
        className={`size-1.5 rounded-full ${PLATFORM_DOT_CLASS[platform]}`}
      />
      {PLATFORM_SHORT_LABEL[platform]}
    </span>
  );
}

/**
 * Locale-aware replacement for platformLabels' formatCount, which hardcodes
 * en-US — matches the intl-param convention in
 * search-performance/SearchPerformanceColumns.tsx.
 */
export function formatCount(
  intl: IntlShape,
  value: number | null | undefined,
): string {
  if (value == null) return "—";
  return intl.formatNumber(value);
}

function urlPath(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const path = `${url.pathname}${url.search}`;
    return path === "/" ? "" : path;
  } catch {
    return "";
  }
}

/**
 * The lookup targets a domain with include_subdomains, so the target's own
 * pages can surface under any subdomain (docs.acme.com for acme.com) — those
 * must get the "You" badge too.
 */
function isTargetDomain(domain: string, targetDomain: string): boolean {
  const candidate = domain.replace(/^www\./i, "").toLowerCase();
  const target = targetDomain.replace(/^www\./i, "").toLowerCase();
  return candidate === target || candidate.endsWith(`.${target}`);
}

/** Domain-led cited page: bold domain + truncated path, links out. */
function PageUrlCell({
  row,
  targetDomain,
}: {
  row: TopPageRow;
  targetDomain: string | null;
}) {
  const intl = useIntl();
  const path = urlPath(row.url);
  const isOwn =
    targetDomain != null &&
    row.domain != null &&
    isTargetDomain(row.domain, targetDomain);

  return (
    <a
      href={row.url}
      target="_blank"
      rel="noreferrer"
      className="group block max-w-xl"
    >
      <span className="inline-flex items-center gap-1.5">
        <span className="font-medium text-base-content group-hover:underline">
          {row.domain ?? formatUrlForDisplay(row.url)}
        </span>
        {isOwn ? (
          <span className="badge badge-primary badge-xs border-0">
            {intl.formatMessage({ id: "aiCitations.table.you" })}
          </span>
        ) : null}
        <ExternalLink className="size-3 shrink-0 text-base-content/40" />
      </span>
      {path ? (
        <span className="block truncate text-xs text-base-content/50">
          {path}
        </span>
      ) : null}
    </a>
  );
}

/**
 * The prompts (keywords) whose answers cited this page. Shows the top 3 inline;
 * if there are more, a "+N more" toggle reveals the rest. Each prompt links into
 * Prompt Explorer prefilled with it.
 */
function KeywordsCell({
  keywords,
  projectId,
  brand,
}: {
  keywords: TopPageRow["keywords"];
  projectId: string;
  brand: string;
}) {
  const intl = useIntl();
  const [expanded, setExpanded] = useState(false);

  if (keywords.length === 0) {
    return <span className="text-base-content/40">—</span>;
  }

  const visible = expanded ? keywords : keywords.slice(0, 3);
  const remaining = keywords.length - visible.length;
  // Reuses nav.promptExplorer so this tooltip and the sidebar link can never
  // name the destination two different ways.
  const runPromptTitle = intl.formatMessage(
    { id: "aiCitations.table.runPromptTitle" },
    { promptExplorer: intl.formatMessage({ id: "nav.promptExplorer" }) },
  );

  return (
    <div className="space-y-1">
      <ul className="space-y-0.5">
        {visible.map((keyword) => (
          <li key={keyword.question}>
            <Link
              to="/p/$projectId/prompt-explorer"
              params={{ projectId }}
              search={{ q: keyword.question, hb: brand || undefined }}
              className="group/kw inline-flex items-baseline gap-2 text-xs"
              title={runPromptTitle}
            >
              <span className="text-base-content/80 group-hover/kw:underline">
                {keyword.question}
              </span>
              <span
                className="shrink-0 tabular-nums text-base-content/40"
                title={intl.formatMessage({
                  id: "aiCitations.table.volumeTooltip",
                })}
              >
                {intl.formatMessage(
                  { id: "aiCitations.table.keywordVolume" },
                  { count: formatCount(intl, keyword.aiSearchVolume) },
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {keywords.length > 3 ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="text-xs text-base-content/50 hover:text-base-content"
        >
          {expanded
            ? intl.formatMessage({ id: "aiCitations.table.keywordsShowLess" })
            : intl.formatMessage(
                { id: "aiCitations.table.keywordsMore" },
                { count: remaining },
              )}
        </button>
      ) : null}
    </div>
  );
}

const pagesHelper = createColumnHelper<TopPageRow>();

export function buildTopPagesColumns({
  intl,
  showPlatform,
  targetDomain,
  projectId,
  brand,
}: {
  intl: IntlShape;
  showPlatform: boolean;
  targetDomain: string | null;
  projectId: string;
  brand: string;
}) {
  return [
    pagesHelper.accessor("url", {
      id: "url",
      header: () => (
        <HeaderWithHelp
          label={intl.formatMessage({ id: "aiCitations.table.column.source" })}
          helpText={intl.formatMessage({
            id: "aiCitations.table.column.sourceHelp",
          })}
        />
      ),
      enableSorting: false,
      cell: ({ row }) => (
        <PageUrlCell row={row.original} targetDomain={targetDomain} />
      ),
    }),
    ...(showPlatform
      ? [
          pagesHelper.accessor("platform", {
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
    pagesHelper.display({
      id: "keywords",
      header: () => (
        <HeaderWithHelp
          label={intl.formatMessage({
            id: "aiCitations.table.column.citedFor",
          })}
          helpText={intl.formatMessage({
            id: "aiCitations.table.column.citedForHelp",
          })}
        />
      ),
      cell: ({ row }) => (
        <KeywordsCell
          keywords={row.original.keywords}
          projectId={projectId}
          brand={brand}
        />
      ),
    }),
    pagesHelper.accessor("capturedVolume", {
      id: "capturedVolume",
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({
            id: "aiCitations.table.column.sourceVolume",
          })}
          helpText={intl.formatMessage({
            id: "aiCitations.table.column.sourceVolumeHelp",
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
  ];
}

export function TopPagesTable({ table }: { table: Table<TopPageRow> }) {
  const intl = useIntl();
  if (table.getRowModel().rows.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-base-content/60">
        {intl.formatMessage({ id: "aiCitations.table.pagesEmpty" })}
      </p>
    );
  }

  return <BrandLookupTable table={table} urlLikeColumnId="url" />;
}

/**
 * Shared row/cell chrome for both citation tables. Exported: also used by
 * TopQueriesTable in BrandLookupQueriesTable.tsx.
 */
export function BrandLookupTable<T>({
  table,
  urlLikeColumnId,
}: {
  table: Table<T>;
  urlLikeColumnId: string;
}) {
  return (
    <AppDataTable
      table={table}
      getRowClassName={() => "group transition-colors hover:bg-base-200/40"}
      getCellClassName={(_, columnId) =>
        cellClassName(
          columnId,
          urlLikeColumnId,
          table.getColumn(columnId)?.getCanSort() ?? false,
        )
      }
    />
  );
}

function cellClassName(
  columnId: string,
  urlLikeColumnId: string,
  isNumeric: boolean,
): string {
  if (columnId === urlLikeColumnId) {
    return "min-w-80 max-w-2xl align-top";
  }
  if (columnId === "keywords") {
    return "max-w-lg align-top";
  }
  if (isNumeric) {
    return "whitespace-nowrap text-right align-top";
  }
  return "whitespace-nowrap align-top";
}
