import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import type { MutableRefObject } from "react";
import type { IntlShape } from "react-intl";
import { makeSelectionColumn } from "@/client/components/table/AppDataTable";
import { SortableHeader } from "@/client/components/table/SortableHeader";
import type { SelectionAnchor } from "@/client/components/table/tableSelection";
import type {
  getSearchPerformanceReport,
  getSearchPerformanceTable,
} from "@/serverFunctions/searchPerformance";

export type Report = Extract<
  Awaited<ReturnType<typeof getSearchPerformanceReport>>,
  { connected: true }
>;
export type SearchPerformanceTableRow = Extract<
  Awaited<ReturnType<typeof getSearchPerformanceTable>>,
  { connected: true }
>["rows"][number];
type DimensionRow = SearchPerformanceTableRow;
type StrikingRow = Report["strikingDistance"][number];

export function formatCount(intl: IntlShape, value: number): string {
  return intl.formatNumber(Math.round(value));
}

export function formatCtr(intl: IntlShape, value: number): string {
  return intl.formatNumber(value, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function formatPosition(intl: IntlShape, value: number): string {
  return intl.formatNumber(value, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

const rightAligned = {
  headerClassName: "text-right",
  cellClassName: "text-right tabular-nums",
} as const;

const dimensionHelper = createColumnHelper<DimensionRow>();

export function buildDimensionColumns(
  intl: IntlShape,
  keyLabel: string,
): ColumnDef<DimensionRow>[] {
  return [
    dimensionHelper.accessor("key", {
      enableSorting: false,
      header: () => keyLabel,
      cell: ({ getValue }) => (
        <span className="block max-w-xl truncate" title={getValue()}>
          {getValue()}
        </span>
      ),
    }),
    dimensionHelper.accessor("clicks", {
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "searchPerf.metric.clicks" })}
          align="right"
        />
      ),
      cell: ({ getValue }) => formatCount(intl, getValue()),
      meta: rightAligned,
    }),
    dimensionHelper.accessor("impressions", {
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "searchPerf.metric.impressions" })}
          align="right"
        />
      ),
      cell: ({ getValue }) => formatCount(intl, getValue()),
      meta: rightAligned,
    }),
    dimensionHelper.accessor("ctr", {
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "searchPerf.metric.ctr" })}
          align="right"
        />
      ),
      cell: ({ getValue }) => formatCtr(intl, getValue()),
      meta: rightAligned,
    }),
    dimensionHelper.accessor("position", {
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "searchPerf.metric.avgPosition" })}
          align="right"
        />
      ),
      cell: ({ getValue }) => formatPosition(intl, getValue()),
      meta: rightAligned,
    }),
  ];
}

const strikingHelper = createColumnHelper<StrikingRow>();

export function buildStrikingColumns(
  anchorRef: MutableRefObject<SelectionAnchor | null>,
  intl: IntlShape,
): ColumnDef<StrikingRow>[] {
  return [
    makeSelectionColumn<StrikingRow>(anchorRef),
    strikingHelper.accessor("query", {
      enableSorting: false,
      header: () => intl.formatMessage({ id: "searchPerf.metric.query" }),
      cell: ({ getValue }) => (
        <span className="block max-w-xs truncate" title={getValue()}>
          {getValue()}
        </span>
      ),
    }),
    strikingHelper.accessor("page", {
      enableSorting: false,
      header: () => intl.formatMessage({ id: "searchPerf.metric.page" }),
      // GSC page keys are canonical http(s) URLs of the verified property;
      // the scheme check is defense-in-depth before rendering an href.
      cell: ({ getValue }) =>
        /^https?:\/\//.test(getValue()) ? (
          <a
            href={getValue()}
            target="_blank"
            rel="noreferrer"
            className="link link-hover block max-w-sm truncate"
            title={getValue()}
          >
            {getValue()}
          </a>
        ) : (
          <span className="block max-w-sm truncate" title={getValue()}>
            {getValue()}
          </span>
        ),
    }),
    strikingHelper.accessor("impressions", {
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "searchPerf.metric.impressions" })}
          align="right"
        />
      ),
      cell: ({ getValue }) => formatCount(intl, getValue()),
      meta: rightAligned,
    }),
    strikingHelper.accessor("clicks", {
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "searchPerf.metric.clicks" })}
          align="right"
        />
      ),
      cell: ({ getValue }) => formatCount(intl, getValue()),
      meta: rightAligned,
    }),
    strikingHelper.accessor("position", {
      header: ({ column }) => (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "searchPerf.metric.avgPosition" })}
          align="right"
        />
      ),
      cell: ({ getValue }) => formatPosition(intl, getValue()),
      meta: rightAligned,
    }),
  ];
}
