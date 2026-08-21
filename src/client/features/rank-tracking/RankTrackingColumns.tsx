import { useMemo, type MutableRefObject } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useIntl } from "react-intl";
import type { ColumnDef, SortingFn } from "@tanstack/react-table";
import { makeSelectionColumn } from "@/client/components/table/AppDataTable";
import type { RankTrackingRow } from "@/types/schemas/rank-tracking";
import {
  CpcCell,
  DeviceRankCell,
  DeviceUrlCell,
  DifficultyCell,
  GscCountCell,
  GscPositionCell,
  SerpFeatureTags,
  VolumeCell,
} from "./RankTrackingTableParts";
import type { SelectionAnchor } from "@/client/components/table/tableSelection";

/** Column id -> the message id for its header tooltip. Desktop and mobile
 *  position share one id: the position column's meaning does not change with
 *  the device, only which device it is reporting on. */
const HEADER_TOOLTIP_IDS: Record<string, string> = {
  keyword: "rank.table.tooltip.keyword",
  volume: "rank.table.tooltip.volume",
  kd: "rank.table.tooltip.kd",
  cpc: "rank.table.tooltip.cpc",
  desktopPosition: "rank.table.tooltip.position",
  mobilePosition: "rank.table.tooltip.position",
  url: "rank.table.tooltip.url",
  serp: "rank.table.tooltip.serpFeatures",
  gscClicks: "rank.table.tooltip.gscClicks",
  gscImpressions: "rank.table.tooltip.gscImpressions",
  gscPosition: "rank.table.tooltip.gscAvgPosition",
};

export function SortableHeader({
  column,
  label,
  id,
  tooltip,
}: {
  column: {
    getIsSorted: () => false | "asc" | "desc";
    getToggleSortingHandler: () => ((event: unknown) => void) | undefined;
  };
  label: string;
  id: string;
  /** Message id override for the header tooltip. Unset falls back to
   *  HEADER_TOOLTIP_IDS[id]; no current caller passes this. */
  tooltip?: string;
}) {
  const intl = useIntl();
  const sorted = column.getIsSorted();
  const tooltipId = tooltip ?? HEADER_TOOLTIP_IDS[id];
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-xs uppercase tracking-wide font-medium text-base-content/60 transition-colors hover:text-base-content"
      onClick={column.getToggleSortingHandler()}
      title={tooltipId ? intl.formatMessage({ id: tooltipId }) : undefined}
      aria-label={intl.formatMessage(
        { id: "rank.table.column.sortByAriaLabel" },
        { label },
      )}
      aria-pressed={!!sorted}
    >
      {label}
      {sorted === "asc" ? (
        <ArrowUp className="size-3 shrink-0" />
      ) : sorted === "desc" ? (
        <ArrowDown className="size-3 shrink-0" />
      ) : null}
    </button>
  );
}

const nullsLastNumeric: SortingFn<RankTrackingRow> = (rowA, rowB, columnId) => {
  const a = rowA.getValue<number | null>(columnId);
  const b = rowB.getValue<number | null>(columnId);
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a - b;
};

const volumeColumn: ColumnDef<RankTrackingRow> = {
  id: "volume",
  accessorKey: "searchVolume",
  header: ({ column }) => {
    const intl = useIntl();
    return (
      <SortableHeader
        column={column}
        label={intl.formatMessage({ id: "rank.table.column.volume" })}
        id="volume"
      />
    );
  },
  size: 90,
  cell: ({ getValue }) => <VolumeCell value={getValue<number | null>()} />,
  sortingFn: nullsLastNumeric,
};

const kdColumn: ColumnDef<RankTrackingRow> = {
  id: "kd",
  accessorKey: "keywordDifficulty",
  header: ({ column }) => {
    const intl = useIntl();
    return (
      <SortableHeader
        column={column}
        label={intl.formatMessage({ id: "rank.table.column.kd" })}
        id="kd"
      />
    );
  },
  size: 70,
  cell: ({ getValue }) => <DifficultyCell value={getValue<number | null>()} />,
  sortingFn: nullsLastNumeric,
};

const cpcColumn: ColumnDef<RankTrackingRow> = {
  id: "cpc",
  accessorKey: "cpc",
  header: ({ column }) => {
    const intl = useIntl();
    return (
      <SortableHeader
        column={column}
        label={intl.formatMessage({ id: "rank.table.column.cpc" })}
        id="cpc"
      />
    );
  },
  size: 80,
  cell: ({ getValue }) => <CpcCell value={getValue<number | null>()} />,
  sortingFn: nullsLastNumeric,
};

function makeKeywordColumn(
  onKeywordClick: (row: RankTrackingRow) => void,
): ColumnDef<RankTrackingRow> {
  return {
    id: "keyword",
    accessorKey: "keyword",
    header: ({ column }) => {
      const intl = useIntl();
      return (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "rank.table.column.keyword" })}
          id="keyword"
        />
      );
    },
    cell: ({ row }) => {
      const intl = useIntl();
      return (
        <button
          type="button"
          className="font-medium text-left link link-hover decoration-dotted underline-offset-2"
          onClick={() => onKeywordClick(row.original)}
          title={intl.formatMessage({
            id: "rank.table.column.viewPositionHistory",
          })}
        >
          {row.original.keyword}
        </button>
      );
    },
    sortingFn: "alphanumeric",
  };
}

function makeDeviceColumn(
  device: "desktop" | "mobile",
): ColumnDef<RankTrackingRow> {
  const id = device === "desktop" ? "desktopPosition" : "mobilePosition";
  return {
    id,
    accessorFn: (row) => row[device].position,
    header: ({ column }) => {
      const intl = useIntl();
      return (
        <SortableHeader
          column={column}
          label={intl.formatMessage({ id: "rank.table.column.position" })}
          id={id}
        />
      );
    },
    size: 120,
    maxSize: 140,
    cell: ({ row }) => <DeviceRankCell result={row.original[device]} />,
    sortingFn: nullsLastNumeric,
  };
}

function makeUrlColumn(
  device: "desktop" | "mobile",
  domain: string,
): ColumnDef<RankTrackingRow> {
  return {
    id: device === "desktop" ? "desktopUrl" : "mobileUrl",
    enableSorting: false,
    header: () => {
      const intl = useIntl();
      return (
        <span
          className="text-xs uppercase tracking-wide font-medium text-base-content/60 cursor-help"
          title={intl.formatMessage({ id: HEADER_TOOLTIP_IDS.url })}
        >
          {intl.formatMessage({ id: "rank.table.column.url" })}
        </span>
      );
    },
    size: 240,
    cell: ({ row }) => (
      <DeviceUrlCell result={row.original[device]} domain={domain} />
    ),
  };
}

function makeSerpColumn(
  device: "desktop" | "mobile",
): ColumnDef<RankTrackingRow> {
  return {
    id: device === "desktop" ? "desktopSerp" : "mobileSerp",
    enableSorting: false,
    header: () => {
      const intl = useIntl();
      return (
        <span
          className="text-xs uppercase tracking-wide font-medium text-base-content/60 cursor-help"
          title={intl.formatMessage({ id: HEADER_TOOLTIP_IDS.serp })}
        >
          {intl.formatMessage({ id: "rank.table.column.serpFeatures" })}
        </span>
      );
    },
    cell: ({ row }) => {
      const features = row.original[device].serpFeatures;
      if (features.length === 0) return null;
      return <SerpFeatureTags features={features} />;
    },
  };
}

/**
 * Search Console columns are only built once the overlay has resolved, and they
 * carry the source in their own header: a reader scanning this table must not
 * be able to mistake a 28-day average for the live position two columns left.
 */
function makeGscColumns(complete: boolean): ColumnDef<RankTrackingRow>[] {
  return [
    {
      id: "gscClicks",
      accessorFn: (row) => row.gsc?.clicks ?? null,
      header: ({ column }) => {
        const intl = useIntl();
        return (
          <SortableHeader
            column={column}
            label={intl.formatMessage({ id: "rank.table.column.gscClicks" })}
            id="gscClicks"
          />
        );
      },
      size: 100,
      cell: ({ row }) => (
        <GscCountCell value={row.original.gsc?.clicks} complete={complete} />
      ),
      sortingFn: nullsLastNumeric,
    },
    {
      id: "gscImpressions",
      accessorFn: (row) => row.gsc?.impressions ?? null,
      header: ({ column }) => {
        const intl = useIntl();
        return (
          <SortableHeader
            column={column}
            label={intl.formatMessage({
              id: "rank.table.column.gscImpressions",
            })}
            id="gscImpressions"
          />
        );
      },
      size: 100,
      cell: ({ row }) => (
        <GscCountCell
          value={row.original.gsc?.impressions}
          complete={complete}
        />
      ),
      sortingFn: nullsLastNumeric,
    },
    {
      id: "gscPosition",
      accessorFn: (row) => row.gsc?.position ?? null,
      header: ({ column }) => {
        const intl = useIntl();
        return (
          <SortableHeader
            column={column}
            label={intl.formatMessage({
              id: "rank.table.column.gscAvgPosition",
            })}
            id="gscPosition"
          />
        );
      },
      size: 110,
      cell: ({ row }) => (
        <GscPositionCell
          value={row.original.gsc?.position}
          complete={complete}
        />
      ),
      sortingFn: nullsLastNumeric,
    },
  ];
}

export function useRankTrackingColumns({
  showDesktop,
  showMobile,
  domain,
  selectAnchorRef,
  onKeywordClick,
  gscComplete,
}: {
  showDesktop: boolean;
  showMobile: boolean;
  domain: string;
  selectAnchorRef: MutableRefObject<SelectionAnchor | null>;
  onKeywordClick: (row: RankTrackingRow) => void;
  /** Null while the Search Console overlay is unavailable: no columns at all. */
  gscComplete: boolean | null;
}): ColumnDef<RankTrackingRow>[] {
  return useMemo(() => {
    const cols: ColumnDef<RankTrackingRow>[] = [
      makeSelectionColumn<RankTrackingRow>(selectAnchorRef),
      makeKeywordColumn(onKeywordClick),
    ];
    if (showDesktop) {
      cols.push(makeDeviceColumn("desktop"));
      cols.push(makeUrlColumn("desktop", domain));
    }
    if (showMobile) {
      cols.push(makeDeviceColumn("mobile"));
      cols.push(makeUrlColumn("mobile", domain));
    }
    cols.push(volumeColumn, kdColumn, cpcColumn);
    if (gscComplete !== null) {
      cols.push(...makeGscColumns(gscComplete));
    }
    if (showDesktop) {
      cols.push(makeSerpColumn("desktop"));
    }
    if (showMobile) {
      cols.push(makeSerpColumn("mobile"));
    }
    return cols;
  }, [
    showDesktop,
    showMobile,
    domain,
    selectAnchorRef,
    onKeywordClick,
    gscComplete,
  ]);
}
