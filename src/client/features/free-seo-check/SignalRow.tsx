import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { Signal, SignalStatus } from "@/server/services/seo-check/types";
import type { DeepSignal } from "@/server/services/seo-check/deep-types";
import type { Locale } from "@/client/i18n/config";
import { CHECK_RESULT_COPY } from "./check-result-copy";
import { STATUS_BADGE, STATUS_TEXT } from "./score-presentation";
import { formatMeasurement } from "./format-measurement";

const STATUS_ICON: Record<SignalStatus, LucideIcon> = {
  pass: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
};

/**
 * One signal row: severity icon + human label + machine id (mono) + status
 * badge. Non-passing signals expand to a console-style fix block and the
 * Google-cited guidance behind the rule.
 *
 * Lite and Deep signals differ only in how wide their `category` enum is, which
 * this row never reads — so it renders either.
 */
export function SignalRow({
  signal,
  locale,
  defaultOpen = false,
}: {
  signal: Signal | DeepSignal;
  locale: Locale;
  /** Opens this row's fix on first paint — used for the worst finding. */
  defaultOpen?: boolean;
}) {
  const copy = CHECK_RESULT_COPY[locale].signal;
  const Icon = STATUS_ICON[signal.status];

  return (
    // The status is on the element so a test can assert ORDER, not just
    // presence — "the failure is first" is the whole point of the sort.
    <div
      data-signal-status={signal.status}
      className="rounded-box border border-base-300 bg-base-100 px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <Icon
          className={`size-4 shrink-0 ${STATUS_TEXT[signal.status]}`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          {/* Two lines before clipping: the NAME of the finding is the one
              thing that must survive a 390px viewport. */}
          <div
            className="line-clamp-2 text-sm font-medium"
            title={signal.label}
          >
            {signal.label}
          </div>
          {/* The measured value sits beside the machine id, which is what
              makes a row scannable: the verdict says "warn", this says what
              the page actually had. Absent on a rule with nothing to report,
              and on any report persisted before measurements existed. */}
          <div className="flex flex-wrap items-baseline gap-x-2 font-mono text-xs text-base-content/60">
            <code>{signal.id}</code>
            {signal.measurement ? (
              <span data-measurement className="text-base-content/80">
                {formatMeasurement(signal.measurement, locale)}
              </span>
            ) : null}
          </div>
        </div>
        <span className={`badge badge-sm ${STATUS_BADGE[signal.status]}`}>
          {copy.statusBadge[signal.status]}
        </span>
      </div>

      {signal.status !== "pass" ? (
        <details className="group mt-2" open={defaultOpen}>
          <summary className="fsc-summary flex cursor-pointer items-center gap-1 py-1 text-sm text-base-content/60">
            <ChevronRight
              className="size-3.5 transition-transform group-open:rotate-90"
              aria-hidden="true"
            />
            {copy.howToFix}
          </summary>
          <div className="mt-2 space-y-3 text-sm">
            <p className="text-base-content/80">{signal.problem}</p>
            <div className="fsc-console rounded-box p-3 font-mono text-xs leading-relaxed">
              <ol className="space-y-1.5">
                {signal.fixSteps.map((step, index) => (
                  <li key={index} className="flex gap-2">
                    <span
                      className="fsc-console-gutter select-none"
                      aria-hidden="true"
                    >
                      ▸
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            {/* Only the chrome is localized — `guideQuote` is Google's
                verbatim English text, and the VI copy names Google as the
                source so the quote reads as citation, not our prose. */}
            <p className="text-xs text-base-content/60">
              {copy.guidancePrefix}
              <a
                href={signal.googleSourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="link link-primary"
              >
                {copy.guidanceLinkText}
              </a>
              {copy.guidanceReviewed(signal.lastReviewedDate)}&ldquo;
              {signal.guideQuote}&rdquo;
            </p>
          </div>
        </details>
      ) : null}
    </div>
  );
}
