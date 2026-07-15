import { Clock, Lock } from "lucide-react";

/**
 * What the Deep tier offers. Shared by the request form and the paused notice so
 * the two can never drift into promising different things.
 */
export function DeepTierPitch({
  metricCount,
  paused = false,
}: {
  metricCount: number;
  paused?: boolean;
}) {
  const Icon = paused ? Clock : Lock;

  return (
    <div className="flex items-start gap-3">
      <Icon
        className="mt-0.5 size-4 shrink-0 text-primary"
        aria-hidden="true"
      />
      <div className="flex-1 text-sm">
        <p className="font-medium">Unlock the Deep report</p>
        <p className="mt-0.5 text-base-content/70">
          Adds {metricCount} Core Web Vitals metrics from real Chrome users,
          Google Lighthouse scores, and a crawl of your other pages — free.
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
export function DeepTierPausedNotice({ metricCount }: { metricCount: number }) {
  return (
    <div className="rounded-box border border-base-300 bg-base-200 p-4">
      <DeepTierPitch metricCount={metricCount} paused />
      <p className="mt-3 text-sm text-base-content/60">
        Deep reports are paused while we finish setting up delivery — check back
        soon.
      </p>
    </div>
  );
}
