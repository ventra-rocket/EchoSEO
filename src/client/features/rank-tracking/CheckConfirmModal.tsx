import { Loader2, Zap } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import { Modal } from "@/client/components/Modal";
import type { RankTrackingConfig } from "@/types/schemas/rank-tracking";
import {
  estimateRankCheckCredits,
  devicesCount,
  KEYWORDS_PER_BATCH,
  SECONDS_PER_BATCH,
} from "@/shared/rank-tracking";

export function CheckConfirmModal({
  keywordCount,
  devices,
  serpDepth,
  isPending,
  onRunNow,
  onCancel,
}: {
  keywordCount: number;
  devices: RankTrackingConfig["devices"];
  serpDepth: number;
  isPending: boolean;
  onRunNow: () => void;
  onCancel: () => void;
}) {
  const intl = useIntl();
  const { costUsd } = estimateRankCheckCredits(
    keywordCount,
    devices,
    serpDepth,
    "live",
  );
  const dc = devicesCount(devices);
  const totalChecks = keywordCount * dc;
  const liveTime =
    Math.ceil(totalChecks / KEYWORDS_PER_BATCH) * SECONDS_PER_BATCH;

  return (
    <Modal
      maxWidth="max-w-md"
      onClose={onCancel}
      labelledBy="rank-check-confirm-title"
    >
      <div>
        <h3 id="rank-check-confirm-title" className="text-lg font-semibold">
          <FormattedMessage
            id="rank.config.checkModal.title"
            values={{ count: keywordCount }}
          />
        </h3>
        <p className="text-sm text-base-content/60 mt-1">
          <FormattedMessage
            id="rank.config.checkModal.subtitle"
            values={{ count: keywordCount, deviceCount: dc, totalChecks }}
          />
        </p>
      </div>

      <button
        className="flex w-full items-center gap-4 rounded-xl border-2 border-base-300 p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
        onClick={onRunNow}
        disabled={isPending}
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Zap className="size-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-medium">
            <FormattedMessage id="rank.config.checkModal.runNow" />
          </p>
          <p className="text-xs text-base-content/60">
            <FormattedMessage
              id={
                liveTime < 60
                  ? "rank.config.checkModal.etaSeconds"
                  : "rank.config.checkModal.etaMinutes"
              }
              values={
                liveTime < 60
                  ? { seconds: liveTime }
                  : { minutes: Math.ceil(liveTime / 60) }
              }
            />
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono font-semibold">
            <FormattedMessage
              id="rank.config.checkModal.cost"
              values={{
                amount: intl.formatNumber(costUsd, {
                  style: "currency",
                  currency: "USD",
                }),
              }}
            />
          </p>
          {isPending && <Loader2 className="size-3 animate-spin ml-auto" />}
        </div>
      </button>

      <button className="btn btn-ghost btn-sm self-center" onClick={onCancel}>
        <FormattedMessage id="rank.config.action.cancel" />
      </button>
    </Modal>
  );
}
