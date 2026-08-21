import { useMemo } from "react";
import { useQuery, type QueryClient } from "@tanstack/react-query";
import { getRankTrackingSearchActuals } from "@/serverFunctions/rank-tracking";
import type { RankTrackingRow } from "@/types/schemas/rank-tracking";
import type { RankTrackingGscExport } from "./RankTrackingTableParts";

/** Shared by the query below and by every caller that has to reset it, so the
 *  two can never drift apart — a key typo here would silently defeat
 *  `resetRankTrackingSearchActuals`. */
function searchActualsQueryKey(projectId: string, configId: string) {
  return ["rankTrackingSearchActuals", projectId, configId] as const;
}

/**
 * Drops a cached Search Console overlay so it cannot outlive the keyword set
 * it was read for. Call this from every mutation that adds or removes tracked
 * keywords (`RankTrackingTable`'s remove handler, `RankTrackingDomainDetail`'s
 * add handler) — the same event `rankTrackingResults` already invalidates on.
 *
 * `resetQueries`, not `invalidateQueries`: invalidation keeps serving the old
 * data while the refetch is in flight, so a keyword added right after a
 * `complete: true` read would merge against a payload that was never read for
 * it — the exact bug this exists to close. `resetQueries` clears the cached
 * payload immediately, so `useRankTrackingSearchActuals` falls back to
 * unmerged rows (no GSC columns) for the one or two renders until the fresh
 * read resolves, instead of rendering a false "0" for a keyword nobody asked
 * Search Console about yet.
 */
export function resetRankTrackingSearchActuals(
  queryClient: QueryClient,
  projectId: string,
  configId: string,
) {
  void queryClient.resetQueries({
    queryKey: searchActualsQueryKey(projectId, configId),
  });
}

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
    queryKey: searchActualsQueryKey(projectId, configId),
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
