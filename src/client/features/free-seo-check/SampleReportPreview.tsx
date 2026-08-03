import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { LandingCopy, SampleSignalStatus } from "./landing-copy";
import {
  BAND_COLOR_VAR,
  BAND_TEXT,
  STATUS_BADGE,
  STATUS_TEXT,
  scoreBand,
  scoreGrade,
} from "./score-presentation";

// Same icon-per-status vocabulary as the real SignalRow, so the sample teaches
// the visitor how to read the report they are about to get. The icon shape and
// the verdict badge both carry the status — color is never the only signal.
const STATUS_ICON: Record<SampleSignalStatus, LucideIcon> = {
  pass: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
};

/**
 * Fixed illustrative score. 72 lands in the "fair" band on purpose: it shows
 * the amber mid-state (not a flattering green, not an alarming red) and matches
 * the 2-of-4 issues in the sample rows.
 */
const SAMPLE_SCORE = 72;
const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A static "what you get" preview of the Lite report, shown before any check
 * runs. Echoes the real report's visual vocabulary — ring gauge, mono readout,
 * signal rows with machine ids — but with fixed sample numbers from
 * `LANDING_COPY`. The card is labelled as a sample both visibly (badge) and for
 * assistive tech (the section's accessible name), so it can never be mistaken
 * for a real result. Deliberately animation-free: motion is the real report's
 * reward.
 */
export function SampleReportPreview({ copy }: { copy: LandingCopy }) {
  const sample = copy.samplePreview;
  const band = scoreBand(SAMPLE_SCORE);
  const dashOffset = CIRCUMFERENCE * (1 - SAMPLE_SCORE / 100);

  return (
    <section aria-label={sample.label} className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
        {sample.heading}
      </h2>

      <div className="rounded-box border border-base-300 bg-base-100">
        <div className="flex items-center justify-between gap-3 border-b border-base-300 px-4 py-2.5">
          <span className="badge badge-accent badge-outline shrink-0 font-mono text-xs uppercase tracking-wider">
            {sample.label}
          </span>
          <span className="truncate font-mono text-xs text-base-content/60">
            {copy.urlPlaceholder}
          </span>
        </div>

        <div className="flex flex-col items-center gap-6 p-4 sm:flex-row sm:gap-8 sm:p-6">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <div className="relative grid size-28 place-items-center">
              <svg
                viewBox="0 0 100 100"
                className="size-28 -rotate-90"
                aria-hidden="true"
              >
                <circle
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className="fsc-gauge-track"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  style={{ stroke: BAND_COLOR_VAR[band] }}
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span
                  className={`font-mono text-3xl font-bold tabular-nums ${BAND_TEXT[band]}`}
                >
                  {SAMPLE_SCORE}
                </span>
                <span className="font-mono text-[0.65rem] text-base-content/60">
                  /100
                </span>
              </div>
              <span
                className={`absolute -right-1 top-1 rounded-full border border-current px-1.5 font-mono text-xs font-bold ${BAND_TEXT[band]}`}
              >
                {scoreGrade(SAMPLE_SCORE)}
              </span>
            </div>
            {/* Capped to the gauge's width so a long caption wraps instead of
                widening the column and squeezing the signal rows. */}
            <p className="max-w-28 text-center font-mono text-[0.7rem] leading-snug text-base-content/60">
              {sample.scoreCaption}
            </p>
          </div>

          <ul className="w-full min-w-0 flex-1 space-y-2">
            {sample.rows.map((row) => {
              const Icon = STATUS_ICON[row.status];
              return (
                <li
                  key={row.id}
                  className="flex items-center gap-3 rounded-lg border border-base-300 bg-base-200/60 px-3 py-2"
                >
                  <Icon
                    className={`size-4 shrink-0 ${STATUS_TEXT[row.status]}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {row.label}
                    </span>
                    {/* Wraps rather than truncates: the measured value is the
                        point of the row, and the copy is bounded sample text. */}
                    <span className="block font-mono text-xs text-base-content/60">
                      {row.id} · {row.detail}
                    </span>
                  </div>
                  <span
                    className={`badge badge-sm shrink-0 ${STATUS_BADGE[row.status]}`}
                  >
                    {sample.statusLabels[row.status]}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="border-t border-base-300 px-4 py-2.5 text-center font-mono text-xs text-base-content/60">
          {sample.footnote}
        </p>
      </div>
    </section>
  );
}
