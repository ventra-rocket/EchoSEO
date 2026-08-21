import { CalendarDays, Loader2, SlidersHorizontal, Table } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import { SegmentedToggle } from "@/client/components/SegmentedToggle";
import { ExportMenu, MoreMenu } from "./ToolbarMenus";

export function RankTrackingTableToolbar({
  showFilters,
  onToggleFilters,
  activeFilterCount,
  isRunning,
  latestRun,
  keywordCount,
  viewMode,
  onViewModeChange,
  historyAvailable,
  onExport,
  onExportToSheets,
  onCopyKeywords,
  onCheckNow,
  onRefreshMetrics,
  metricsRefreshing,
  checkBusy,
  checkDisabled,
  hasData,
}: {
  showFilters: boolean;
  onToggleFilters: () => void;
  activeFilterCount: number;
  isRunning: boolean;
  latestRun:
    | { status: string; keywordsChecked: number; keywordsTotal: number }
    | null
    | undefined;
  keywordCount: number;
  viewMode: "table" | "history";
  onViewModeChange: (v: "table" | "history") => void;
  historyAvailable: boolean;
  onExport: () => void;
  onExportToSheets: () => void;
  onCopyKeywords: () => void;
  onCheckNow: () => void;
  onRefreshMetrics: () => void;
  metricsRefreshing: boolean;
  checkBusy: boolean;
  checkDisabled: boolean;
  hasData: boolean;
}) {
  const intl = useIntl();
  return (
    <div className="shrink-0 flex flex-wrap items-center gap-2 px-4 py-2 border-y border-base-300">
      {/* History needs at least two checks to compare; until then the toggle
          would only offer a worse copy of the Latest table. */}
      {historyAvailable && (
        <SegmentedToggle
          showLabels
          items={[
            {
              value: "table" as const,
              icon: <Table className="size-3.5" />,
              label: intl.formatMessage({ id: "rank.table.toolbar.latest" }),
            },
            {
              value: "history" as const,
              icon: <CalendarDays className="size-3.5" />,
              label: intl.formatMessage({ id: "rank.table.toolbar.history" }),
            },
          ]}
          value={viewMode}
          onChange={onViewModeChange}
        />
      )}

      <button
        className={`btn btn-ghost btn-sm gap-1.5 ${showFilters ? "btn-active" : ""}`}
        onClick={onToggleFilters}
        title={intl.formatMessage({
          id: "rank.table.toolbar.filtersToggleTooltip",
        })}
      >
        <SlidersHorizontal className="size-3.5" />
        <FormattedMessage id="rank.table.toolbar.filters" />
        {activeFilterCount > 0 && (
          <span className="badge badge-xs badge-primary border-0 text-primary-content">
            {activeFilterCount}
          </span>
        )}
      </button>

      {isRunning && latestRun ? (
        <div className="flex items-center gap-2 text-sm text-base-content/70">
          <Loader2 className="size-3.5 animate-spin text-primary" />
          <span>
            {latestRun.status === "pending" ? (
              <FormattedMessage id="rank.table.toolbar.preparing" />
            ) : (
              <FormattedMessage
                id="rank.table.toolbar.gettingRankings"
                values={{ total: latestRun.keywordsTotal }}
              />
            )}{" "}
            {latestRun.keywordsChecked}/{latestRun.keywordsTotal || "?"}
          </span>
          {latestRun.keywordsTotal > 0 && (
            <progress
              className="progress progress-primary w-24"
              value={latestRun.keywordsChecked}
              max={latestRun.keywordsTotal}
            />
          )}
        </div>
      ) : (
        <span className="text-sm text-base-content/60">
          <FormattedMessage
            id="rank.table.toolbar.keywordCount"
            values={{ count: keywordCount }}
          />
        </span>
      )}

      <div className="flex-1" />

      <ExportMenu
        onExport={onExport}
        onExportToSheets={onExportToSheets}
        onCopyKeywords={onCopyKeywords}
        hasData={hasData}
      />

      <MoreMenu
        onCheckNow={onCheckNow}
        checkBusy={checkBusy}
        checkDisabled={checkDisabled}
        onRefreshMetrics={onRefreshMetrics}
        metricsRefreshing={metricsRefreshing}
        hasData={hasData}
      />
    </div>
  );
}
