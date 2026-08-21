import { AlertTriangle } from "lucide-react";
import { FormattedMessage } from "react-intl";
import { isProviderAuthFailureMessage } from "@/shared/provider-failure";
import { RankTrackingSearchPerformanceHint } from "./RankTrackingSearchPerformanceHint";
import type { RankTrackingConfig } from "@/types/schemas/rank-tracking";
import type { useRankRunPolling } from "./useRankRunPolling";

/**
 * The three ways a scheduled or triggered check can have gone wrong, each
 * with its own alert: insufficient credits is a billing state rather than a
 * bug, general staleness is cleaned up automatically so the alert only has to
 * say so, and an outright failure gets the provider's own error text plus a
 * pointer to Search Console when the failure was an auth problem, since that
 * leaves the user with zero rank data and a free alternative worth naming.
 *
 * Extracted out of RankTrackingDomainDetail.tsx: three conditional alert
 * blocks were pushing that file's component past the line budget, and "what
 * can be wrong with the latest run" is a real seam — it doesn't share state
 * with the results card below it, only the run status feeding both.
 */
export function RankTrackingRunAlerts({
  config,
  latestRun,
  projectId,
}: {
  config: RankTrackingConfig;
  latestRun: ReturnType<typeof useRankRunPolling>;
  projectId: string;
}) {
  return (
    <>
      {config.lastSkipReason === "insufficient_credits" && (
        <div className="alert alert-warning text-sm py-2">
          <AlertTriangle className="size-4" />
          <span>
            <FormattedMessage id="rank.config.detail.creditsSkippedAlert" />
          </span>
        </div>
      )}

      {latestRun?.maybeStale && (
        <div className="alert alert-warning text-sm py-2">
          <AlertTriangle className="size-4" />
          <span>
            <FormattedMessage id="rank.config.detail.staleRunAlert" />
          </span>
        </div>
      )}

      {/* Surface any other failed-run reason (e.g. missing DataForSEO key,
          workflow error) instead of leaving the failure invisible. The
          insufficient-credits case has its own friendlier alert above. When the
          provider is what refused, the user has no rank data at all, so name
          the free alternative rather than leaving them at the error. */}
      {latestRun?.status === "failed" &&
        latestRun.errorMessage &&
        config.lastSkipReason !== "insufficient_credits" && (
          <div className="alert alert-error text-sm py-2 items-start">
            <AlertTriangle className="size-4 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <span>
                <FormattedMessage
                  id="rank.config.detail.lastCheckFailed"
                  values={{ error: latestRun.errorMessage }}
                />
              </span>
              {isProviderAuthFailureMessage(latestRun.errorMessage) && (
                <RankTrackingSearchPerformanceHint projectId={projectId} />
              )}
            </div>
          </div>
        )}
    </>
  );
}
