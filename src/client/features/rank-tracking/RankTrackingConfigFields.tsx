import { FormattedMessage, useIntl } from "react-intl";
import { Info } from "lucide-react";
import { depthToPages, pagesToDepth } from "@/shared/rank-tracking";
import type { RankTrackingConfig } from "@/types/schemas/rank-tracking";
import { ScheduledRunsField } from "./ScheduledRunsField";

/**
 * Three self-contained form-control blocks from RankTrackingConfigModal's
 * form — each owns its own label, select, and inline hints, and none share
 * state beyond the value/onChange pair passed in. Extracted into their own
 * file (rather than left inline) once the modal's line count made clear this
 * is a real seam: "which devices/schedule/depth to track" is a distinct unit
 * from the modal's submit/validation flow around it.
 */
export function DevicesField({
  devices,
  onChange,
}: {
  devices: "both" | "desktop" | "mobile";
  onChange: (value: "both" | "desktop" | "mobile") => void;
}) {
  const intl = useIntl();
  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text font-medium">
          <FormattedMessage id="rank.config.form.devicesLabel" />
        </span>
      </label>
      <select
        className="select select-bordered w-full"
        value={devices}
        onChange={(e) => {
          const value = e.target.value;
          if (value === "both" || value === "desktop" || value === "mobile") {
            onChange(value);
          }
        }}
      >
        <option value="both">
          {intl.formatMessage({ id: "rank.config.device.both" })}
        </option>
        <option value="desktop">
          {intl.formatMessage({ id: "rank.config.form.deviceOnly.desktop" })}
        </option>
        <option value="mobile">
          {intl.formatMessage({ id: "rank.config.form.deviceOnly.mobile" })}
        </option>
      </select>
      <div className="mt-1.5 text-xs text-base-content/50">
        <FormattedMessage id="rank.config.form.devicesHint" />
      </div>
      {devices === "both" && (
        <div className="mt-1.5 flex items-start gap-1.5 text-xs text-info">
          <Info className="size-3.5 shrink-0 mt-0.5" />
          <span>
            <FormattedMessage id="rank.config.form.devicesBothInfo" />
          </span>
        </div>
      )}
    </div>
  );
}

export function ScheduleFieldGroup({
  schedule,
  onScheduleChange,
  isEdit,
  scheduledEnabled,
  onScheduledEnabledChange,
}: {
  schedule: RankTrackingConfig["scheduleInterval"];
  onScheduleChange: (value: RankTrackingConfig["scheduleInterval"]) => void;
  isEdit: boolean;
  scheduledEnabled: boolean;
  onScheduledEnabledChange: (value: boolean) => void;
}) {
  const intl = useIntl();
  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text font-medium">
          <FormattedMessage id="rank.config.form.scheduleLabel" />
        </span>
      </label>
      <select
        className="select select-bordered w-full"
        value={schedule}
        onChange={(e) => {
          const value = e.target.value;
          if (
            value === "daily" ||
            value === "weekly" ||
            value === "monthly" ||
            value === "manual"
          ) {
            onScheduleChange(value);
          }
        }}
      >
        <option value="daily">
          {intl.formatMessage({ id: "rank.config.schedule.daily" })}
        </option>
        <option value="weekly">
          {intl.formatMessage({ id: "rank.config.schedule.weekly" })}
        </option>
        <option value="monthly">
          {intl.formatMessage({ id: "rank.config.form.scheduleMonthly" })}
        </option>
        <option value="manual">
          {intl.formatMessage({ id: "rank.config.form.scheduleManualOnly" })}
        </option>
      </select>
      {schedule === "daily" && (
        <div className="mt-1.5 flex items-start gap-1.5 text-xs text-warning">
          <Info className="size-3.5 shrink-0 mt-0.5" />
          <span>
            <FormattedMessage id="rank.config.form.scheduleDailyInfo" />
          </span>
        </div>
      )}
      <div className="mt-3">
        <ScheduledRunsField
          isEdit={isEdit}
          schedule={schedule}
          enabled={scheduledEnabled}
          onChange={onScheduledEnabledChange}
        />
      </div>
    </div>
  );
}

export function DepthField({
  serpDepth,
  onChange,
}: {
  serpDepth: number;
  onChange: (depth: number) => void;
}) {
  const intl = useIntl();
  return (
    <div className="form-control">
      <label className="label">
        <span className="label-text font-medium">
          <FormattedMessage id="rank.config.form.depthLabel" />
        </span>
      </label>
      <select
        className="select select-bordered w-full"
        value={depthToPages(serpDepth)}
        onChange={(e) => onChange(pagesToDepth(Number(e.target.value)))}
      >
        {Array.from({ length: 10 }, (_, i) => i + 1).map((pages) => (
          <option key={pages} value={pages}>
            {intl.formatMessage(
              { id: "rank.config.form.depthOption" },
              { pages, results: pages * 10 },
            )}
          </option>
        ))}
      </select>
      <div className="mt-1.5 text-xs text-base-content/50">
        <FormattedMessage id="rank.config.form.depthHint" />
      </div>
    </div>
  );
}
