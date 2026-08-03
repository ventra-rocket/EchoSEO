import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/client/i18n/config";
import { CHECK_RESULT_COPY } from "./check-result-copy";
import type { FilmstripFrame } from "./filmstrip-bundle";

/** How wide each edge fades once there is more filmstrip to scroll to. */
const FADE = "3rem";

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
  const scrollRef = useRef<HTMLUListElement>(null);
  // Which edges have off-screen frames, so the fade signals "there is more to
  // scroll to" rather than clipping a frame at a hard edge. Both false until
  // the client measures — an SSR/first paint shows no fade (deterministic, no
  // hydration mismatch), and a row that fits its container never fades.
  const [overflow, setOverflow] = useState({ start: false, end: false });

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const measure = () => {
      const { scrollLeft, scrollWidth, clientWidth } = element;
      const maxScroll = scrollWidth - clientWidth;
      setOverflow({
        start: scrollLeft > 1,
        end: scrollLeft < maxScroll - 1,
      });
    };
    measure();
    element.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [frames.length]);

  // A horizontal mask that turns each edge transparent ONLY when frames run
  // past it; when nothing overflows, both ends stay opaque and the row is
  // unmasked. Vertical is untouched (`to right`).
  const mask = `linear-gradient(to right, ${
    overflow.start ? "transparent" : "#000"
  } 0, #000 ${FADE}, #000 calc(100% - ${FADE}), ${
    overflow.end ? "transparent" : "#000"
  } 100%)`;

  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-2">
      <ul
        ref={scrollRef}
        aria-label={copy.ariaLabel}
        className="flex gap-2 overflow-x-auto"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        {frames.map((frame, index) => {
          const timing = copy.timing(frame.timingMs);
          return (
            // Index keys are safe: the list is set once per fetch, never
            // reordered or edited in place.
            <li
              key={index}
              className="flex shrink-0 flex-col items-center gap-1"
            >
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
    </div>
  );
}
