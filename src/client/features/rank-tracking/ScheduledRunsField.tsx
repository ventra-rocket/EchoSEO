import { Info } from "lucide-react";
import type { RankTrackingConfig } from "@/types/schemas/rank-tracking";

type Props = {
  isEdit: boolean;
  schedule: RankTrackingConfig["scheduleInterval"];
  enabled: boolean;
  onChange: (enabled: boolean) => void;
};

/**
 * Opt-in control for the scheduled rank-check cron.
 *
 * A config carries an interval *and* a separate `scheduledEnabled` flag, and the
 * cron only picks up configs whose flag is on. Without this control the Schedule
 * dropdown reads as a promise the product never keeps: a config starts opted
 * out, so "Weekly" would sit there never running. Automatic checks also spend
 * the organization's own DataForSEO key unattended, which is why turning them on
 * stays a deliberate act rather than a side effect of picking an interval.
 *
 * A manual config has no schedule to run, so the control has nothing to say.
 */
export function ScheduledRunsField({
  isEdit,
  schedule,
  enabled,
  onChange,
}: Props) {
  if (schedule === "manual") return null;

  // Creating a config always starts opted out, so the toggle would be a
  // decision the save can't carry. Say so instead of showing a dead control.
  if (!isEdit) {
    return (
      <div className="flex items-start gap-1.5 text-xs text-base-content/60">
        <Info className="size-3.5 shrink-0 mt-0.5" />
        <span>
          Automatic checks start off. Add the domain, then turn them on from
          Configure when you're ready to spend on this schedule.
        </span>
      </div>
    );
  }

  return (
    <div className="form-control">
      <label className="label cursor-pointer justify-start gap-2 p-0">
        <input
          type="checkbox"
          className="toggle toggle-sm toggle-primary"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="label-text font-medium">Run checks automatically</span>
      </label>
      <div className="mt-1.5 text-xs text-base-content/50">
        {enabled
          ? "Checks run on the schedule above and bill your DataForSEO key without asking."
          : "Checks only run when you start them yourself."}
      </div>
    </div>
  );
}
