import type { Locale } from "@/client/i18n/config";
import { CHECK_RESULT_COPY } from "./check-result-copy";
import type { FilmstripFrame } from "./filmstrip-bundle";

/**
 * The PSI-style loading filmstrip: the progressive render frames that rode
 * along in the same PSI response as the capture, rendered from the shared
 * visual-bundle fetch (`use-visual-bundle.ts` — one GET per strategy feeds
 * this AND the lab panel). Purely presentational: the caller passes the
 * parsed frames and simply doesn't mount this row while they are absent —
 * the filmstrip is corroboration, not content, so it gets no error UI and
 * no spinner.
 */
export function Filmstrip({
  frames,
  locale,
}: {
  frames: FilmstripFrame[];
  locale: Locale;
}) {
  const copy = CHECK_RESULT_COPY[locale].filmstrip;

  return (
    <ul
      aria-label={copy.ariaLabel}
      className="flex gap-2 overflow-x-auto rounded-box border border-base-300 bg-base-100 p-2"
    >
      {frames.map((frame, index) => {
        const timing = copy.timing(frame.timingMs);
        return (
          // Index keys are safe: the list is set once per fetch, never
          // reordered or edited in place.
          <li key={index} className="flex shrink-0 flex-col items-center gap-1">
            <img
              src={frame.data}
              alt={copy.frameAlt(timing)}
              // Data URIs decode instantly; the fixed height keeps mobile
              // (portrait) and desktop (landscape) frames on one even row.
              className="h-16 w-auto rounded border border-base-300 bg-base-200 sm:h-20"
            />
            <span className="font-mono text-[10px] tabular-nums text-base-content/60">
              {timing}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
