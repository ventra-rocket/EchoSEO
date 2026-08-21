import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AutumnProvider, useCustomer } from "autumn-js/react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  getLatestRankResults,
  getRankPositionMatrix,
  estimateRankCheckCost,
} from "@/serverFunctions/rank-tracking";
import { ArrowLeft } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { getCustomerPlanStatus } from "@/client/features/billing/plan-detection";
import { captureClientEvent } from "@/client/lib/posthog";
import { FreePlanAlert } from "./FreePlanAlert";
import { RankTrackingRunAlerts } from "./RankTrackingRunAlerts";
import { RankTrackingDetailHeader } from "./RankTrackingDetailHeader";
import { RankTrackingOverview } from "./RankTrackingOverview";
import { RankTrackingTable } from "./RankTrackingTable";
import { RankTrackingSearchActualsNote } from "./RankTrackingSearchActualsNote";
import {
  countMatrixRuns,
  RankTrackingHistoryMatrix,
} from "./RankTrackingHistoryMatrix";
import { RankTrackingTableToolbar } from "./RankTrackingTableToolbar";
import {
  exportRankTrackingCsv,
  exportRankTrackingToSheets,
} from "./RankTrackingTableParts";
import type {
  RankTrackingConfig,
  ComparePeriod,
} from "@/types/schemas/rank-tracking";
import { AddKeywordsPanel } from "./AddKeywordsPanel";
import {
  FilterPanel,
  applyFilters,
  countActiveFilters,
  EMPTY_FILTERS,
  type Filters,
} from "./RankTrackingFilters";
import { CheckConfirmModal } from "./CheckConfirmModal";
import { useMetricsRefresh } from "./useMetricsRefresh";
import { useRankCheckTrigger } from "./useRankCheckTrigger";
import { useRankRunPolling } from "./useRankRunPolling";
import {
  resetRankTrackingSearchActuals,
  useRankTrackingSearchActuals,
} from "./useRankTrackingSearchActuals";

function deviceVisibility(
  devices: RankTrackingConfig["devices"],
  activeDevice: "desktop" | "mobile",
): { showDesktop: boolean; showMobile: boolean } {
  if (devices === "both") {
    return {
      showDesktop: activeDevice === "desktop",
      showMobile: activeDevice === "mobile",
    };
  }
  return {
    showDesktop: devices !== "mobile",
    showMobile: devices !== "desktop",
  };
}

export function RankTrackingDomainDetail(props: {
  config: RankTrackingConfig;
  projectId: string;
  onBack: () => void;
  onEdit: () => void;
}) {
  return (
    <AutumnProvider>
      <RankTrackingDomainDetailInner {...props} />
    </AutumnProvider>
  );
}

function RankTrackingDomainDetailInner({
  config,
  projectId,
  onBack,
  onEdit,
}: {
  config: RankTrackingConfig;
  projectId: string;
  onBack: () => void;
  onEdit: () => void;
}) {
  const intl = useIntl();
  const { data: session } = useSession();
  const customerQuery = useCustomer({
    queryOptions: { enabled: Boolean(session?.user?.id) },
  });
  const isFreePlan =
    !!customerQuery.data &&
    getCustomerPlanStatus(customerQuery.data) === "free";

  const queryClient = useQueryClient();
  const [showAddKeywords, setShowAddKeywords] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [comparePeriod, setComparePeriod] = useState<ComparePeriod>(
    config.scheduleInterval === "daily"
      ? "1d"
      : config.scheduleInterval === "monthly"
        ? "30d"
        : "7d",
  );
  const [activeDevice, setActiveDevice] = useState<"desktop" | "mobile">(
    config.devices === "mobile" ? "mobile" : "desktop",
  );
  const [viewMode, setViewMode] = useState<"table" | "history">("table");

  const { data: resultsData, isLoading: resultsLoading } = useQuery({
    queryKey: ["rankTrackingResults", projectId, config.id, comparePeriod],
    queryFn: () =>
      getLatestRankResults({
        data: { projectId, configId: config.id, comparePeriod },
      }),
  });

  const latestRun = useRankRunPolling(projectId, config.id);

  // Also feeds the History toggle: the matrix view only earns its tab once
  // there are two checks to compare.
  const { data: matrixCells, isLoading: matrixLoading } = useQuery({
    queryKey: ["rankPositionMatrix", projectId, config.id, activeDevice],
    queryFn: () =>
      getRankPositionMatrix({
        data: { projectId, configId: config.id, device: activeDevice },
      }),
  });
  const historyAvailable = countMatrixRuns(matrixCells ?? []) >= 2;

  const { data: costEstimate } = useQuery({
    queryKey: ["rankTrackingCostEstimate", projectId, config.id],
    queryFn: () =>
      estimateRankCheckCost({ data: { projectId, configId: config.id } }),
  });

  const [pendingCheck, setPendingCheck] = useState<{
    count: number;
    keywordIds?: string[];
  } | null>(null);

  const handleKeywordsAdded = (result: {
    added: number;
    checkTriggered: boolean;
  }) => {
    void queryClient.invalidateQueries({
      queryKey: ["rankTrackingCostEstimate", projectId, config.id],
    });
    void queryClient.invalidateQueries({
      queryKey: ["rankTrackingResults", projectId, config.id],
    });
    void queryClient.invalidateQueries({
      queryKey: ["rankTrackingLatestRun", projectId, config.id],
    });
    // A newly tracked keyword must not merge against the overlay read taken
    // before it existed — see resetRankTrackingSearchActuals for why this has
    // to reset, not invalidate.
    resetRankTrackingSearchActuals(queryClient, projectId, config.id);
    setShowAddKeywords(false);
    captureClientEvent("rank_tracking:keywords_add");
    toast.success(
      intl.formatMessage(
        { id: "rank.config.detail.keywordsAddedToast" },
        { count: result.added },
      ),
    );
    if (!result.checkTriggered && result.added > 0) {
      toast.info(
        intl.formatMessage({ id: "rank.config.detail.checkNowUseMenuToast" }),
      );
    }
  };

  const isRunning =
    (latestRun?.status === "pending" || latestRun?.status === "running") &&
    !latestRun?.maybeStale;
  const { startCheck, isBusy, isPending } = useRankCheckTrigger({
    configId: config.id,
    isRunning,
    projectId,
    onSuccess: () => setPendingCheck(null),
  });

  const { refresh: refreshMetrics, isRefreshing: metricsRefreshing } =
    useMetricsRefresh(projectId, config.id);

  const requestCheck = (count: number, keywordIds?: string[]) => {
    if (count < 50) {
      startCheck({ keywordIds });
      return;
    }

    if (isBusy) return;
    setPendingCheck({ count, keywordIds });
  };

  const {
    actuals: searchActuals,
    rows,
    exportContext: gscExport,
  } = useRankTrackingSearchActuals(projectId, config.id, resultsData?.rows);
  const run = resultsData?.run;
  const hasBothDevices = config.devices === "both";
  const { showDesktop, showMobile } = deviceVisibility(
    config.devices,
    activeDevice,
  );
  const filtered = useMemo(
    () => applyFilters(rows ?? [], filters),
    [rows, filters],
  );
  const activeFilterCount = countActiveFilters(filters);
  const defaultSortId = showDesktop ? "desktopPosition" : "mobilePosition";
  // Fall back to the table if history disappears (e.g. device switch).
  const effectiveViewMode = historyAvailable ? viewMode : "table";

  return (
    <div className="space-y-3">
      <button
        className="btn btn-ghost btn-xs gap-1 -ml-2 text-base-content/60"
        onClick={onBack}
      >
        <ArrowLeft className="size-3" />
        <FormattedMessage id="rank.config.detail.backToDomains" />
      </button>

      <RankTrackingRunAlerts
        config={config}
        latestRun={latestRun}
        projectId={projectId}
      />

      <FreePlanAlert visible={isFreePlan} />

      {/* Results card */}
      <div className="flex-1 flex flex-col min-w-0 border border-base-300 rounded-xl bg-base-100 overflow-hidden">
        {/* Domain header */}
        <RankTrackingDetailHeader
          config={config}
          run={run}
          costEstimate={costEstimate}
          hasBothDevices={hasBothDevices}
          activeDevice={activeDevice}
          onActiveDeviceChange={setActiveDevice}
          comparePeriod={comparePeriod}
          onComparePeriodChange={setComparePeriod}
          onEdit={onEdit}
          onToggleAddKeywords={() => setShowAddKeywords((c) => !c)}
        />

        {showAddKeywords && (
          <div className="px-4 pb-3">
            <AddKeywordsPanel
              configId={config.id}
              projectId={projectId}
              onSuccess={handleKeywordsAdded}
              onCancel={() => setShowAddKeywords(false)}
            />
          </div>
        )}

        {/* Portfolio overview */}
        {(rows?.length ?? 0) > 0 && (
          <RankTrackingOverview
            device={activeDevice}
            projectId={projectId}
            configId={config.id}
          />
        )}

        {/* Table toolbar */}
        <RankTrackingTableToolbar
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters((c) => !c)}
          activeFilterCount={activeFilterCount}
          isRunning={isRunning}
          latestRun={latestRun}
          keywordCount={filtered.length}
          viewMode={effectiveViewMode}
          onViewModeChange={setViewMode}
          historyAvailable={historyAvailable}
          onExport={() =>
            exportRankTrackingCsv({
              sorted: filtered,
              showDesktop,
              showMobile,
              domain: config.domain,
              gsc: gscExport,
              intl,
            })
          }
          onExportToSheets={() =>
            exportRankTrackingToSheets(
              filtered,
              showDesktop,
              showMobile,
              gscExport,
            )
          }
          onCopyKeywords={() => {
            void navigator.clipboard.writeText(
              filtered.map((r) => r.keyword).join("\n"),
            );
            toast.success(
              intl.formatMessage({
                id: "rank.config.detail.keywordsCopiedToast",
              }),
            );
          }}
          onCheckNow={() => {
            const count = costEstimate?.keywordCount ?? rows?.length ?? 0;
            // Falling through silently on zero is indistinguishable from a hang:
            // the click produces no request, no toast and no disabled state, so
            // the user cannot tell whether the product is broken or the input is.
            if (count === 0) {
              toast.info(
                intl.formatMessage({
                  id: "rank.config.detail.addKeywordsFirstToast",
                }),
              );
              return;
            }
            requestCheck(count);
          }}
          onRefreshMetrics={refreshMetrics}
          metricsRefreshing={metricsRefreshing}
          checkBusy={isBusy}
          checkDisabled={isFreePlan}
          hasData={filtered.length > 0}
        />

        {/* Filters panel */}
        {showFilters && (
          <FilterPanel
            filters={filters}
            setFilters={setFilters}
            activeFilterCount={activeFilterCount}
            onReset={() => setFilters(EMPTY_FILTERS)}
          />
        )}

        {/* Table */}
        <div className="p-4">
          {effectiveViewMode === "history" ? (
            <RankTrackingHistoryMatrix
              cells={matrixCells ?? []}
              isLoading={matrixLoading}
              keywords={filtered.map((r) => ({
                trackingKeywordId: r.trackingKeywordId,
                keyword: r.keyword,
              }))}
            />
          ) : (
            <RankTrackingTable
              key={defaultSortId}
              totalCount={rows?.length ?? 0}
              rows={filtered}
              resultsLoading={resultsLoading}
              showDesktop={showDesktop}
              showMobile={showMobile}
              defaultSortId={defaultSortId}
              domain={config.domain}
              configId={config.id}
              projectId={projectId}
              locationCode={config.locationCode}
              serpDepth={config.serpDepth}
              gsc={gscExport}
            />
          )}
          {(rows?.length ?? 0) > 0 && effectiveViewMode === "table" && (
            <div className="pt-3">
              <RankTrackingSearchActualsNote
                actuals={searchActuals}
                projectId={projectId}
                domain={config.domain}
              />
            </div>
          )}
        </div>
      </div>

      {pendingCheck && (
        <CheckConfirmModal
          keywordCount={pendingCheck.count}
          devices={config.devices}
          serpDepth={config.serpDepth}
          isPending={isPending}
          onRunNow={() =>
            startCheck({
              keywordIds: pendingCheck.keywordIds,
            })
          }
          onCancel={() => setPendingCheck(null)}
        />
      )}
    </div>
  );
}
