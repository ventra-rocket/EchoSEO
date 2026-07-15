import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { Signal, SignalStatus } from "@/server/services/seo-check/types";
import type { DeepSignal } from "@/server/services/seo-check/deep-types";
import { STATUS_BADGE, STATUS_TEXT } from "./score-presentation";

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
export function SignalRow({ signal }: { signal: Signal | DeepSignal }) {
  const Icon = STATUS_ICON[signal.status];

  return (
    <div className="rounded-box border border-base-300 bg-base-100 px-4 py-3">
      <div className="flex items-center gap-3">
        <Icon
          className={`size-4 shrink-0 ${STATUS_TEXT[signal.status]}`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium" title={signal.label}>
            {signal.label}
          </div>
          <code className="font-mono text-xs text-base-content/40">
            {signal.id}
          </code>
        </div>
        <span className={`badge badge-sm ${STATUS_BADGE[signal.status]}`}>
          {signal.status}
        </span>
      </div>

      {signal.status !== "pass" ? (
        <details className="group mt-2">
          <summary className="fsc-summary flex cursor-pointer items-center gap-1 py-1 text-sm text-base-content/60">
            <ChevronRight
              className="size-3.5 transition-transform group-open:rotate-90"
              aria-hidden="true"
            />
            How to fix this
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
            <p className="text-xs text-base-content/50">
              Per{" "}
              <a
                href={signal.googleSourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="link link-primary"
              >
                Google&apos;s guidance
              </a>
              , reviewed {signal.lastReviewedDate}: &ldquo;{signal.guideQuote}
              &rdquo;
            </p>
          </div>
        </details>
      ) : null}
    </div>
  );
}
