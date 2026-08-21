import { Monitor, Plus, Settings, Smartphone } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import { SegmentedToggle } from "@/client/components/SegmentedToggle";
import { LOCATIONS } from "@/client/features/keywords/locations";
import type { MessageId } from "@/client/i18n/messages";
import type {
  ComparePeriod,
  RankTrackingConfig,
} from "@/types/schemas/rank-tracking";

const COMPARE_PERIODS: Record<string, true> = {
  "1d": true,
  "7d": true,
  "30d": true,
  "90d": true,
};
function isComparePeriod(v: string): v is ComparePeriod {
  return COMPARE_PERIODS[v];
}

// The compact "location · devices · schedule" summary line (here and in
// RankTrackingDomainList) needs the same device/schedule wording the config
// form uses, just shorter — "Desktop" rather than "Desktop only". Duplicated
// in both files rather than shared: the lookup itself is trivial, and the
// actual translations live once in the catalog, so there is nothing to drift.
const DEVICE_SUMMARY_IDS: Record<RankTrackingConfig["devices"], MessageId> = {
  both: "rank.config.device.both",
  desktop: "rank.config.device.desktop",
  mobile: "rank.config.device.mobile",
};

const SCHEDULE_SUMMARY_IDS: Record<
  RankTrackingConfig["scheduleInterval"],
  MessageId
> = {
  daily: "rank.config.schedule.daily",
  weekly: "rank.config.schedule.weekly",
  monthly: "rank.config.schedule.monthly",
  manual: "rank.config.schedule.manual",
};

/**
 * `rank_snapshots.checked_at` — the source of `run.lastCheckedAt` below, via
 * rankTrackingResults.ts's `latestStartedAt` — is D1's own `current_timestamp`
 * default: `"YYYY-MM-DD HH:MM:SS"` in UTC with no zone marker. That is the
 * exact shape `parseAuditTimestamp` (src/client/features/audit/shared.tsx)
 * exists to fix, and the same bug: `new Date(...)` reads it as local time, so
 * a check that ran at 06:03 UTC printed as 06:03 in Hanoi, seven hours early.
 * `rank_check_runs.completed_at`, used by RankTrackingDomainList's "Last:",
 * gets the identical fix there — app code always writes it zoned via
 * `new Date().toISOString()`, but this project's own local seed data proves a
 * different write path (a seed script, here) can still land the same
 * zone-less shape in that column, so trusting the app's write path alone
 * isn't enough.
 *
 * Duplicated here rather than imported: rank-tracking has no dependency on
 * the audit feature today, and importing a helper out of `audit/shared.tsx` —
 * a file mid-conversion by other agents in this same batch, and not owned by
 * this slice — would couple this file's correctness to a sibling's in-flight
 * edits. The fix itself is three lines of generic string handling, not
 * audit-specific logic, so a local copy costs little and keeps the feature
 * boundary honest.
 */
function parseRankCheckTimestamp(dateStr: string): Date {
  const hasZoneDesignator = /(?:Z|[+-]\d{2}:\d{2})$/.test(dateStr);
  if (hasZoneDesignator) {
    return new Date(dateStr);
  }
  return new Date(dateStr.replace(" ", "T") + "Z");
}

export function RankTrackingDetailHeader({
  config,
  run,
  costEstimate,
  hasBothDevices,
  activeDevice,
  onActiveDeviceChange,
  comparePeriod,
  onComparePeriodChange,
  onEdit,
  onToggleAddKeywords,
}: {
  config: RankTrackingConfig;
  run: { lastCheckedAt: string } | null | undefined;
  costEstimate: { keywordCount: number; costUsd: number } | undefined;
  hasBothDevices: boolean;
  activeDevice: "desktop" | "mobile";
  onActiveDeviceChange: (v: "desktop" | "mobile") => void;
  comparePeriod: ComparePeriod;
  onComparePeriodChange: (v: ComparePeriod) => void;
  onEdit: () => void;
  onToggleAddKeywords: () => void;
}) {
  const intl = useIntl();
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 px-4 pt-4 pb-3">
      <div>
        <h2 className="text-lg font-semibold">{config.domain}</h2>
        <p className="text-xs text-base-content/60">
          {LOCATIONS[config.locationCode] ?? "US"} &middot;{" "}
          {intl.formatMessage({ id: DEVICE_SUMMARY_IDS[config.devices] })}{" "}
          &middot;{" "}
          {intl.formatMessage({
            id: SCHEDULE_SUMMARY_IDS[config.scheduleInterval],
          })}
          {/* An interval alone doesn't run anything — the cron reads the
              separate opt-in. Say when the schedule is only a setting. */}
          {config.scheduleInterval !== "manual" && !config.scheduledEnabled && (
            <FormattedMessage id="rank.config.summary.paused" />
          )}
          {run && (
            <FormattedMessage
              id="rank.config.summary.lastRunSuffix"
              values={{
                date: intl.formatDate(
                  parseRankCheckTimestamp(run.lastCheckedAt),
                  { dateStyle: "medium" },
                ),
              }}
            />
          )}
          {costEstimate && costEstimate.keywordCount > 0 && (
            <FormattedMessage
              id="rank.config.detail.costPerCheck"
              values={{
                amount: intl.formatNumber(costEstimate.costUsd, {
                  style: "currency",
                  currency: "USD",
                }),
              }}
            />
          )}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {hasBothDevices && (
          <SegmentedToggle
            items={[
              {
                value: "desktop" as const,
                icon: <Monitor className="size-3.5" />,
                label: intl.formatMessage({
                  id: "rank.config.device.desktop",
                }),
              },
              {
                value: "mobile" as const,
                icon: <Smartphone className="size-3.5" />,
                label: intl.formatMessage({ id: "rank.config.device.mobile" }),
              },
            ]}
            value={activeDevice}
            onChange={onActiveDeviceChange}
          />
        )}
        <select
          className="select select-bordered select-sm text-xs w-auto"
          title={intl.formatMessage({
            id: "rank.config.detail.comparePeriod.title",
          })}
          value={comparePeriod}
          onChange={(e) => {
            if (isComparePeriod(e.target.value))
              onComparePeriodChange(e.target.value);
          }}
        >
          <option value="1d">
            {intl.formatMessage({ id: "rank.config.detail.comparePeriod.1d" })}
          </option>
          <option value="7d">
            {intl.formatMessage({ id: "rank.config.detail.comparePeriod.7d" })}
          </option>
          <option value="30d">
            {intl.formatMessage({
              id: "rank.config.detail.comparePeriod.30d",
            })}
          </option>
          <option value="90d">
            {intl.formatMessage({
              id: "rank.config.detail.comparePeriod.90d",
            })}
          </option>
        </select>
        <div className="hidden sm:block h-6 w-px bg-base-300" />
        <button className="btn btn-outline btn-sm gap-1" onClick={onEdit}>
          <Settings className="size-3.5" />
          <FormattedMessage id="rank.config.detail.configure" />
        </button>
        <button
          className="btn btn-primary btn-sm gap-1"
          onClick={onToggleAddKeywords}
        >
          <Plus className="size-3.5" />
          <FormattedMessage id="rank.config.detail.addKeywords" />
        </button>
      </div>
    </div>
  );
}
