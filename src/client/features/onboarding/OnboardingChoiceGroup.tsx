import { Check } from "lucide-react";
import { Fragment } from "react";
import { useIntl } from "react-intl";

/**
 * A single-purpose picker used by every PostSignupOnboarding step: a grid of
 * toggle buttons, an optional nested follow-up picker shown under one
 * specific option (the client-site-count follow-up under "My clients"), and a
 * free-text input that appears once "Other" is selected.
 *
 * `options`/`followUp.options` carry already-localized `{ value, label }`
 * pairs (see `localizedOptions` in PostSignupOnboarding.tsx): `value` is the
 * canonical English string persisted to the DB and is what `selectedValues`,
 * `onToggle` and `showForValue` compare against; `label` is only what renders.
 */
export function OnboardingChoiceGroup({
  title,
  description,
  options,
  selectedValues,
  onToggle,
  otherValue,
  onOtherChange,
  multiple = false,
  maxSelections,
  followUp,
}: {
  title: string;
  description?: string;
  options: { value: string; label: string }[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  otherValue: string;
  onOtherChange: (value: string) => void;
  multiple?: boolean;
  maxSelections?: number;
  followUp?: {
    showForValue: string;
    label: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
  };
}) {
  const intl = useIntl();
  const isOtherSelected = selectedValues.includes("Other");
  const showFollowUp =
    followUp !== undefined && selectedValues.includes(followUp.showForValue);
  const atLimit =
    maxSelections !== undefined && selectedValues.length >= maxSelections;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-base-content/60">{description}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        {options.map(({ value, label }) => {
          const selected = selectedValues.includes(value);
          const disabled = atLimit && !selected;
          const showFollowUpHere =
            showFollowUp && followUp?.showForValue === value;

          return (
            <Fragment key={value}>
              <button
                type="button"
                className={`flex min-h-11 items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  selected
                    ? "border-base-content bg-base-200 text-base-content"
                    : disabled
                      ? "border-base-300 text-base-content/35 cursor-not-allowed"
                      : "border-base-300 text-base-content/75 hover:border-base-content/40 hover:bg-base-200/60"
                }`}
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => onToggle(value)}
              >
                <span>{label}</span>
                {selected ? <Check className="size-4 shrink-0" /> : null}
              </button>

              {showFollowUpHere && followUp ? (
                <div className="rounded-lg border border-base-300 bg-base-200/40 px-3 py-2.5">
                  <p className="text-sm text-base-content/70">
                    {followUp.label}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {followUp.options.map((followUpOption) => {
                      const followUpSelected =
                        followUp.value === followUpOption.value;

                      return (
                        <button
                          key={followUpOption.value}
                          type="button"
                          className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                            followUpSelected
                              ? "border-base-content bg-base-200 text-base-content"
                              : "border-base-300 text-base-content/75 hover:border-base-content/40 hover:bg-base-200/60"
                          }`}
                          aria-pressed={followUpSelected}
                          onClick={() =>
                            followUp.onChange(
                              followUpSelected ? "" : followUpOption.value,
                            )
                          }
                        >
                          {followUpOption.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </Fragment>
          );
        })}
      </div>

      {isOtherSelected ? (
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder={intl.formatMessage({
            id: multiple
              ? "onboarding.otherInput.placeholderMultiple"
              : "onboarding.otherInput.placeholderSingle",
          })}
          value={otherValue}
          onChange={(event) => onOtherChange(event.target.value)}
        />
      ) : null}
    </div>
  );
}
