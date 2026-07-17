import { Clock, Lock } from "lucide-react";
import type { Locale } from "@/client/i18n/config";
import { CHECK_RESULT_COPY } from "./check-result-copy";

/**
 * What the Deep tier offers. Shared by the request form and the paused notice so
 * the two can never drift into promising different things.
 */
export function DeepTierPitch({
  metricCount,
  locale,
  paused = false,
}: {
  metricCount: number;
  locale: Locale;
  paused?: boolean;
}) {
  const copy = CHECK_RESULT_COPY[locale].deepPitch;
  const Icon = paused ? Clock : Lock;

  return (
    <div className="flex items-start gap-3">
      <Icon
        className="mt-0.5 size-4 shrink-0 text-primary"
        aria-hidden="true"
      />
      <div className="flex-1 text-sm">
        <p className="font-medium">{copy.unlockTitle}</p>
        <p className="mt-0.5 text-base-content/70">
          {copy.unlockBody(metricCount)}
        </p>
      </div>
    </div>
  );
}

/**
 * Stands in for the request form while the Deep tier is switched off.
 *
 * It keeps the pitch but asks for nothing: making someone hand over an email, a
 * consent tick, and a solved CAPTCHA before telling them the feature is paused
 * spends their effort on a request that was never going to run.
 */
export function DeepTierPausedNotice({
  metricCount,
  locale,
}: {
  metricCount: number;
  locale: Locale;
}) {
  return (
    <div className="rounded-box border border-base-300 bg-base-200 p-4">
      <DeepTierPitch metricCount={metricCount} locale={locale} paused />
      <p className="mt-3 text-sm text-base-content/60">
        {CHECK_RESULT_COPY[locale].deepPitch.pausedNotice}
      </p>
    </div>
  );
}
