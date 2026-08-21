import { FormattedMessage, useIntl } from "react-intl";
import { estimateRankCheckCredits } from "@/shared/rank-tracking";
import type { RankTrackingConfig } from "@/types/schemas/rank-tracking";

type Props = {
  devices: RankTrackingConfig["devices"];
  serpDepth: number;
  schedule: RankTrackingConfig["scheduleInterval"];
};

/**
 * Shows what the settings above will cost before the owner commits to them.
 *
 * Every knob in the config form moves the price — devices double it, depth
 * multiplies it, and the interval decides how often it recurs — so the estimate
 * re-reads all three rather than caching a number that would drift.
 */
export function CostEstimateNote({ devices, serpDepth, schedule }: Props) {
  const intl = useIntl();
  // Scheduled checks run through the cheaper task queue; manual configs only
  // ever pay the live price.
  const { costUsd: costPerKeyword } = estimateRankCheckCredits(
    1,
    devices,
    serpDepth,
    schedule === "manual" ? "live" : "queued",
  );
  const checksPerMonth =
    schedule === "daily" ? 30 : schedule === "weekly" ? 4 : 1;

  return (
    <div className="rounded-lg bg-base-200/50 px-3 py-2.5 text-xs text-base-content/70 space-y-0.5">
      <div>
        <FormattedMessage
          id="rank.config.costNote.perKeyword"
          values={{
            amount: (
              <span className="font-mono font-semibold text-base-content">
                {intl.formatNumber(costPerKeyword, {
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 4,
                  maximumFractionDigits: 4,
                })}
              </span>
            ),
          }}
        />
      </div>
      {schedule !== "manual" && (
        <div>
          <FormattedMessage
            id="rank.config.costNote.monthlyEstimate"
            values={{
              amount: (
                <span className="font-mono font-semibold text-base-content">
                  {intl.formatNumber(costPerKeyword * 50 * checksPerMonth, {
                    style: "currency",
                    currency: "USD",
                  })}
                </span>
              ),
            }}
          />
        </div>
      )}
    </div>
  );
}
