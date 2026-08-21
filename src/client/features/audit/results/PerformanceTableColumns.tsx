import type { IntlShape } from "react-intl";
import type { MessageId } from "@/client/i18n/messages";
import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import { SortableHeader } from "@/client/components/table/SortableHeader";
import { LighthouseScoreBadge } from "@/client/features/audit/shared";
import {
  isLighthouseFailure,
  nullableNumberSort,
  nullableStringSort,
  type PerformanceRowData,
} from "@/client/features/audit/results/AuditResultsTableFilterLogic";

const performanceColumnHelper = createColumnHelper<PerformanceRowData>();

/** The raw "desktop"/"mobile" strategy value is Lighthouse's own device id,
 * not UI copy — map it through the same labels the device filter already
 * uses rather than rendering the English enum value verbatim. */
const DEVICE_LABEL_ID: Record<"desktop" | "mobile", MessageId> = {
  desktop: "audit.results.filters.option.desktop",
  mobile: "audit.results.filters.option.mobile",
};

export function buildPerformanceColumns({
  auditId,
  projectId,
  intl,
}: {
  auditId: string;
  projectId: string;
  intl: IntlShape;
}): ColumnDef<PerformanceRowData>[] {
  return [
    performanceColumnHelper.accessor("pagePath", {
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "audit.results.columns.url" })}
        />
      ),
      cell: ({ getValue }) => (
        <span className="text-xs">{getValue() ?? "-"}</span>
      ),
      sortingFn: nullableStringSort,
      meta: { cellClassName: "max-w-[180px] truncate" },
    }),
    performanceColumnHelper.accessor("strategy", {
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "audit.results.columns.device" })}
        />
      ),
      cell: ({ getValue }) => (
        <span className="text-xs">
          {intl.formatMessage({ id: DEVICE_LABEL_ID[getValue()] })}
        </span>
      ),
    }),
    performanceColumnHelper.display({
      id: "status",
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "audit.results.columns.status" })}
        />
      ),
      cell: ({ row }) => {
        const isFailed = isLighthouseFailure(row.original);
        const failureMessage =
          row.original.errorMessage ??
          intl.formatMessage({
            id: "audit.results.performanceTable.defaultFailureMessage",
          });
        return isFailed ? (
          <span
            className="badge badge-error badge-outline text-xs"
            title={failureMessage}
          >
            {intl.formatMessage({
              id: "audit.results.performanceTable.failed",
            })}
          </span>
        ) : (
          <span className="badge badge-success badge-outline text-xs">
            {intl.formatMessage({ id: "audit.results.performanceTable.ok" })}
          </span>
        );
      },
      enableSorting: true,
      sortingFn: (left, right) =>
        Number(isLighthouseFailure(left.original)) -
        Number(isLighthouseFailure(right.original)),
    }),
    performanceColumnHelper.accessor("performanceScore", {
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "audit.results.columns.perf" })}
        />
      ),
      cell: ({ getValue }) => <LighthouseScoreBadge score={getValue()} />,
      sortingFn: nullableNumberSort,
    }),
    performanceColumnHelper.accessor("accessibilityScore", {
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "audit.results.columns.a11y" })}
        />
      ),
      cell: ({ getValue }) => <LighthouseScoreBadge score={getValue()} />,
      sortingFn: nullableNumberSort,
    }),
    performanceColumnHelper.accessor("seoScore", {
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "audit.results.columns.seo" })}
        />
      ),
      cell: ({ getValue }) => <LighthouseScoreBadge score={getValue()} />,
      sortingFn: nullableNumberSort,
    }),
    performanceColumnHelper.accessor("lcpMs", {
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "audit.results.columns.lcp" })}
        />
      ),
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? (
          <span className="text-xs">{(value / 1000).toFixed(1)}s</span>
        ) : (
          <span className="text-xs text-base-content/40">-</span>
        );
      },
      sortingFn: nullableNumberSort,
    }),
    performanceColumnHelper.accessor("cls", {
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "audit.results.columns.cls" })}
        />
      ),
      cell: ({ getValue }) => {
        const value = getValue();
        return value != null ? (
          <span className="text-xs">{value.toFixed(3)}</span>
        ) : (
          <span className="text-xs text-base-content/40">-</span>
        );
      },
      sortingFn: nullableNumberSort,
    }),
    performanceColumnHelper.accessor("inpMs", {
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "audit.results.columns.inp" })}
        />
      ),
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? (
          <span className="text-xs">{Math.round(value)}ms</span>
        ) : (
          <span className="text-xs text-base-content/40">-</span>
        );
      },
      sortingFn: nullableNumberSort,
    }),
    performanceColumnHelper.accessor("ttfbMs", {
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "audit.results.columns.ttfb" })}
        />
      ),
      cell: ({ getValue }) => {
        const value = getValue();
        return value ? (
          <span className="text-xs">{Math.round(value)}ms</span>
        ) : (
          <span className="text-xs text-base-content/40">-</span>
        );
      },
      sortingFn: nullableNumberSort,
    }),
    performanceColumnHelper.display({
      id: "issues",
      header: () => intl.formatMessage({ id: "audit.results.columns.issues" }),
      cell: ({ row }) =>
        row.original.r2Key && !isLighthouseFailure(row.original) ? (
          <Link
            className="btn btn-primary btn-xs"
            to="/p/$projectId/audit/issues/$resultId"
            params={{ projectId, resultId: row.original.id }}
            search={{ auditId, category: "performance" }}
          >
            {intl.formatMessage({
              id: "audit.results.performanceTable.viewIssues",
            })}
          </Link>
        ) : (
          <span className="text-xs text-base-content/40">-</span>
        ),
    }),
  ];
}
