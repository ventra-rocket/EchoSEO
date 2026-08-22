import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { FormattedMessage, useIntl } from "react-intl";
import { FileDown, Loader2, Sheet, Trash2 } from "lucide-react";
import { Modal } from "@/client/components/Modal";
import {
  AppDataTable,
  useAppTable,
} from "@/client/components/table/AppDataTable";
import {
  TableBulkActionBar,
  TableBulkActionButton,
  TableBulkExportMenu,
} from "@/client/components/table/TableBulkActionBar";
import { buildCsv } from "@/client/lib/csv";
import { downloadCsv } from "@/client/lib/csv";
import { exportTableToSheets } from "@/client/lib/exportToSheets";
import { captureClientEvent } from "@/client/lib/posthog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { removeTrackingKeywords } from "@/serverFunctions/rank-tracking";
import { getLocalizedErrorMessage } from "@/client/lib/error-messages";
import type { RankTrackingRow } from "@/types/schemas/rank-tracking";
import { useRankTrackingColumns } from "./RankTrackingColumns";
import { RankTrackingSearchPerformanceHint } from "./RankTrackingSearchPerformanceHint";
import {
  buildRankTrackingExport,
  type RankTrackingGscExport,
} from "./RankTrackingTableParts";
import {
  KeywordTrendModal,
  type KeywordTrendTarget,
} from "./KeywordTrendModal";
import { resetRankTrackingSearchActuals } from "./useRankTrackingSearchActuals";
import type { SelectionAnchor } from "@/client/components/table/tableSelection";

export function RankTrackingTable({
  totalCount,
  rows,
  resultsLoading,
  showDesktop,
  showMobile,
  defaultSortId,
  domain,
  configId,
  projectId,
  locationCode,
  serpDepth,
  gsc,
}: {
  totalCount: number;
  rows: RankTrackingRow[];
  resultsLoading: boolean;
  showDesktop: boolean;
  showMobile: boolean;
  defaultSortId: string;
  domain: string;
  configId: string;
  projectId: string;
  locationCode: number;
  serpDepth: number;
  /** Null until the Search Console overlay resolves, or when it cannot. */
  gsc: RankTrackingGscExport | null;
}) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const [trendTarget, setTrendTarget] = useState<KeywordTrendTarget | null>(
    null,
  );
  const selectAnchorRef = useRef<SelectionAnchor | null>(null);

  const handleKeywordClick = useCallback(
    (row: RankTrackingRow) =>
      setTrendTarget({
        trackingKeywordId: row.trackingKeywordId,
        keyword: row.keyword,
      }),
    [],
  );

  const columns = useRankTrackingColumns({
    showDesktop,
    showMobile,
    domain,
    selectAnchorRef,
    onKeywordClick: handleKeywordClick,
    gscComplete: gsc ? gsc.complete : null,
  });

  const table = useAppTable({
    data: rows,
    columns,
    initialState: {
      sorting: [{ id: defaultSortId, desc: false }],
    },
    withSorting: true,
    getRowId: (row) => row.trackingKeywordId,
    enableRowSelection: true,
  });

  // Only includes rows that are in the current data (respects parent filtering)
  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const selectedRankRows = selectedRows.map((row) => row.original);

  const exportSelectionToSheets = () => {
    const { headers, rows: exportRows } = buildRankTrackingExport(
      selectedRankRows,
      showDesktop,
      showMobile,
      gsc,
    );
    void exportTableToSheets({
      headers,
      rows: exportRows,
      feature: "rank_tracking",
    });
  };

  const exportSelectionCsv = () => {
    const { headers, rows: exportRows } = buildRankTrackingExport(
      selectedRankRows,
      showDesktop,
      showMobile,
      gsc,
    );
    const csvRows = exportRows.map((row) =>
      row.map((cell, idx) =>
        idx === 3 && typeof cell === "number" ? cell.toFixed(2) : cell,
      ),
    );
    downloadCsv(
      `rank-tracking-${domain}-selected.csv`,
      buildCsv(headers, csvRows),
    );
    captureClientEvent("rank_tracking:export_csv", { scope: "selection" });
  };

  const removeMutation = useMutation({
    mutationFn: (keywordIds: string[]) =>
      removeTrackingKeywords({ data: { projectId, configId, keywordIds } }),
    onSuccess: (result) => {
      table.resetRowSelection();
      setShowConfirm(false);
      void queryClient.invalidateQueries({
        queryKey: ["rankTrackingResults", projectId, configId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["rankTrackingCostEstimate", projectId, configId],
      });
      // The keywords that remain must not keep showing the overlay read for
      // the set that included the removed ones — see
      // resetRankTrackingSearchActuals for why this has to reset, not invalidate.
      resetRankTrackingSearchActuals(queryClient, projectId, configId);
      toast.success(
        intl.formatMessage(
          { id: "rank.table.remove.success" },
          { removed: result.removed },
        ),
      );
    },
    onError: (error) => {
      toast.error(
        getLocalizedErrorMessage(
          intl,
          error,
          intl.formatMessage({ id: "rank.table.remove.errorDefault" }),
        ),
      );
    },
  });

  if (resultsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="size-5 animate-spin text-base-content/50" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-base-300 p-10 text-center text-sm text-base-content/55">
        {totalCount === 0 ? (
          <div className="space-y-3">
            {/* No keywords, so a check has nothing to check. Name the action
                that actually moves the user forward, and name it as the UI
                labels it. */}
            <p>
              <FormattedMessage id="rank.table.empty.noKeywordsYet" />
            </p>
            <RankTrackingSearchPerformanceHint projectId={projectId} />
          </div>
        ) : (
          <FormattedMessage id="rank.table.empty.noMatch" />
        )}
      </div>
    );
  }

  return (
    <>
      <TableBulkActionBar
        selectedCount={selectedCount}
        selectedLabel={intl.formatMessage({
          id: "rank.table.bulk.selectedLabel",
        })}
        onClear={() => table.resetRowSelection()}
        actions={
          <div className="flex items-center px-1.5">
            <TableBulkActionButton
              icon={<Trash2 className="size-3.5" />}
              onClick={() => setShowConfirm(true)}
              variant="danger"
            >
              <FormattedMessage id="rank.table.bulk.remove" />
            </TableBulkActionButton>
            <TableBulkExportMenu
              actions={[
                {
                  label: intl.formatMessage({
                    id: "rank.table.export.toSheets",
                  }),
                  icon: <Sheet className="size-4" />,
                  onClick: exportSelectionToSheets,
                },
                {
                  label: intl.formatMessage({ id: "rank.table.export.csv" }),
                  icon: <FileDown className="size-4" />,
                  onClick: exportSelectionCsv,
                },
              ]}
            />
          </div>
        }
      />

      {/* Confirm modal */}
      {showConfirm && (
        <Modal
          onClose={() => setShowConfirm(false)}
          labelledBy="remove-keywords-title"
        >
          <h3 id="remove-keywords-title" className="text-lg font-semibold">
            <FormattedMessage id="rank.table.bulk.removeConfirmTitle" />
          </h3>
          <p className="text-sm text-base-content/70">
            <FormattedMessage
              id="rank.table.bulk.removeConfirmBody"
              values={{ count: selectedCount }}
            />
          </p>
          <div className="flex justify-end gap-2">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowConfirm(false)}
            >
              <FormattedMessage id="rank.table.bulk.cancel" />
            </button>
            <button
              className="btn btn-error btn-sm gap-1"
              onClick={() =>
                removeMutation.mutate(selectedRows.map((r) => r.id))
              }
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending && (
                <Loader2 className="size-3 animate-spin" />
              )}
              <FormattedMessage
                id="rank.table.bulk.removeConfirmButton"
                values={{ count: selectedCount }}
              />
            </button>
          </div>
        </Modal>
      )}

      {trendTarget && (
        <KeywordTrendModal
          target={trendTarget}
          projectId={projectId}
          configId={configId}
          domain={domain}
          locationCode={locationCode}
          serpDepth={serpDepth}
          onClose={() => setTrendTarget(null)}
        />
      )}

      <AppDataTable table={table} getCellClassName={() => "align-top"} />
      <p className="text-xs text-base-content/60 pt-2">
        <FormattedMessage
          id="rank.table.footer.count"
          values={{ shown: rows.length, total: totalCount }}
        />
      </p>
    </>
  );
}
