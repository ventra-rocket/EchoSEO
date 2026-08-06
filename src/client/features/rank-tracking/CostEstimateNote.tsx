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
        <span className="font-mono font-semibold text-base-content">
          ~${costPerKeyword.toFixed(4)}
        </span>{" "}
        per keyword per check
      </div>
      {schedule !== "manual" && (
        <div>
          50 keywords would cost{" "}
          <span className="font-mono font-semibold text-base-content">
            ~${(costPerKeyword * 50 * checksPerMonth).toFixed(2)}
          </span>
          /month
        </div>
      )}
    </div>
  );
}
