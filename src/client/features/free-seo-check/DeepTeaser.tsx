import { ArrowRight, Lock } from "lucide-react";

/**
 * Teaser for the email-gated Deep report (wired up in a later phase). Purely
 * informational here — no fake CTA — matching the current Lite behavior.
 */
export function DeepTeaser({ metricCount }: { metricCount: number }) {
  return (
    <div className="rounded-box border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <Lock
          className="mt-0.5 size-4 shrink-0 text-primary"
          aria-hidden="true"
        />
        <div className="flex-1 text-sm">
          <p className="font-medium">Unlock the Deep report</p>
          <p className="mt-0.5 text-base-content/70">
            Adds {metricCount} Core Web Vitals metrics plus a full site crawl —
            free, delivered to your inbox.
          </p>
        </div>
        <ArrowRight
          className="mt-0.5 size-4 shrink-0 text-primary"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
