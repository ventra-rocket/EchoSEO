import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRankTrackingSearchActuals } from "@/serverFunctions/rank-tracking";
import type { RankTrackingRow } from "@/types/schemas/rank-tracking";
import type { RankTrackingGscExport } from "./RankTrackingTableParts";

/**
 * The Search Console overlay for a tracked domain, kept in its own query so the
 * table renders from D1 immediately and a missing grant or a mismatched
 * property costs the overlay only.
 *
 * The merge is keyed by tracking keyword id: a keyword the window holds no data
 * for becomes an explicit `null`, which is what lets the table tell "Google
 * reported nothing" apart from "the overlay has not resolved yet".
 */
export function useRankTrackingSearchActuals(
  projectId: string,
  configId: string,
  snapshotRows: RankTrackingRow[] | undefined,
) {
  const { data: actuals } = useQuery({
    queryKey: ["rankTrackingSearchActuals", projectId, configId],
    queryFn: () =>
      getRankTrackingSearchActuals({ data: { projectId, configId } }),
  });

  const ready = actuals?.state === "ready" ? actuals : null;

  const rows = useMemo(() => {
    if (!snapshotRows || !ready) return snapshotRows;
    const byKeywordId = new Map(
      ready.rows.map((row) => [row.trackingKeywordId, row]),
    );
    return snapshotRows.map((row) => ({
      ...row,
      gsc: byKeywordId.get(row.trackingKeywordId) ?? null,
    }));
  }, [snapshotRows, ready]);

  const exportContext: RankTrackingGscExport | null = ready
    ? { window: ready.window, complete: ready.complete }
    : null;

  return { actuals, rows, exportContext };
}
