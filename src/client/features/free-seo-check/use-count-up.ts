import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./use-reduced-motion";

/**
 * Animates a number from 0 to `target` with an ease-out curve over `durationMs`.
 * Returns `target` immediately when the user prefers reduced motion. Drives both
 * the gauge ring sweep and the numeric readout so they stay in sync.
 */
export function useCountUp(target: number, durationMs = 900): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, durationMs, reduced]);

  return value;
}
