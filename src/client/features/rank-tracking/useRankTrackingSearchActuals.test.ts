/**
 * The cache lifetime of the Search Console overlay query. What must hold: a
 * payload read for one keyword set must not still answer for a different one
 * — see `resetRankTrackingSearchActuals`'s own comment for why this has to be
 * a reset rather than a plain invalidate.
 */
import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";

// `useRankTrackingSearchActuals.ts` imports the real server function, which
// pulls in `cloudflare:workers` — unresolvable under plain node/vitest. Mocked
// so the module loads; this test never calls the query function itself.
vi.mock("@/serverFunctions/rank-tracking", () => ({
  getRankTrackingSearchActuals: vi.fn(),
}));

const { resetRankTrackingSearchActuals } =
  await import("./useRankTrackingSearchActuals");

const PROJECT_ID = "proj1";
const CONFIG_ID = "cfg1";
const QUERY_KEY = ["rankTrackingSearchActuals", PROJECT_ID, CONFIG_ID];

const STALE_COMPLETE_PAYLOAD = {
  state: "ready" as const,
  source: "GSC" as const,
  property: "sc-domain:example.com",
  window: { from: "2026-07-24", to: "2026-08-18" },
  complete: true,
  rows: [],
};

describe("resetRankTrackingSearchActuals", () => {
  it("drops the cached payload instead of leaving a stale complete:true read queryable as fresh data", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(QUERY_KEY, STALE_COMPLETE_PAYLOAD);
    expect(queryClient.getQueryData(QUERY_KEY)).toEqual(STALE_COMPLETE_PAYLOAD);

    resetRankTrackingSearchActuals(queryClient, PROJECT_ID, CONFIG_ID);

    // A component reading this query right now must not see the stale
    // `complete: true` payload merged against a keyword set it was never read
    // for — that merge is what rendered a false "0 impressions" for a keyword
    // added after the read. Unlike `invalidateQueries`, which keeps serving
    // this exact object while a background refetch is in flight, `resetQueries`
    // clears it synchronously.
    expect(queryClient.getQueryData(QUERY_KEY)).toBeUndefined();
  });

  it("only clears the query for the given project and config, not a sibling domain's overlay", () => {
    const queryClient = new QueryClient();
    const otherKey = ["rankTrackingSearchActuals", PROJECT_ID, "cfg2"];
    queryClient.setQueryData(QUERY_KEY, STALE_COMPLETE_PAYLOAD);
    queryClient.setQueryData(otherKey, STALE_COMPLETE_PAYLOAD);

    resetRankTrackingSearchActuals(queryClient, PROJECT_ID, CONFIG_ID);

    expect(queryClient.getQueryData(QUERY_KEY)).toBeUndefined();
    expect(queryClient.getQueryData(otherKey)).toEqual(STALE_COMPLETE_PAYLOAD);
  });
});
