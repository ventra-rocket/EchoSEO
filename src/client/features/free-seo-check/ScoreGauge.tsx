import type { Locale } from "@/client/i18n/config";
import { useCountUp } from "./use-count-up";
import { CHECK_RESULT_COPY } from "./check-result-copy";
import {
  BAND_COLOR_VAR,
  BAND_TEXT,
  scoreBand,
  scoreGrade,
} from "./score-presentation";

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Circular score gauge (Concept A) with a monospace count-up readout and letter
 * grade (Concept B). The ring sweep and the number are both driven by a single
 * eased count-up value, so they animate together and settle at the same time.
 */
export function ScoreGauge({
  score,
  locale,
}: {
  score: number;
  locale: Locale;
}) {
  const copy = CHECK_RESULT_COPY[locale].gauge;
  const shown = useCountUp(score);
  const band = scoreBand(score);
  const grade = scoreGrade(score);
  const fraction = Math.max(0, Math.min(1, shown / 100));
  const dashOffset = CIRCUMFERENCE * (1 - fraction);

  return (
    <div className="relative mx-auto grid size-40 place-items-center">
      <svg
        viewBox="0 0 100 100"
        className="size-40 -rotate-90"
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
          className={`font-mono text-4xl font-bold tabular-nums ${BAND_TEXT[band]}`}
        >
          {Math.round(shown)}
        </span>
        <span className="text-[0.7rem] text-base-content/60">
          {copy.outOf100}
        </span>
      </div>

      {/* Anchored ON the ring: bottom-center, its own surface color masking the
          stroke behind it, so it reads as a clasp on the gauge rather than a
          stray element floating in the card's corner. */}
      <span
        className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 rounded-full border border-current bg-base-100 px-2 font-mono text-xs font-bold ${BAND_TEXT[band]}`}
        aria-label={copy.gradeAria(grade)}
      >
        {grade}
      </span>
    </div>
  );
}
