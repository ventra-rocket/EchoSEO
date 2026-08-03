/**
 * The one shared fetch of a strategy's visual bundle (filmstrip frames + lab
 * scores/CWV). Lifted out of Filmstrip so the filmstrip AND the lab panel
 * feed from a single GET per strategy — the endpoint shares the capture's
 * per-IP read budget, and two consumers polling it separately would spend
 * that budget twice for the same bytes.
 *
 * Fetch policy (unchanged from the filmstrip's original, plus one addition):
 * - capture `onLoad` is the trigger — the render stores the bundle BEFORE the
 *   capture, so by the time the image exists, so does the bundle. One fetch;
 *   one silent retry after 3s on a 404 (the cache-hit-racing-a-fresh-render
 *   case); NEVER a retry on 429/other-4xx/5xx — hammering the shared read
 *   budget from here would starve the capture itself.
 * - capture `onError` triggers ONE attempt, no retry: the server stores
 *   scores even when PSI returned no screenshot, and exactly when the image
 *   is broken the free scores must not be invisible.
 * Each trigger kind runs at most once per (pageUrl, strategy); a bundle that
 * never materializes settles as absent — no error UI, no spinner.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  siteFilmstripUrl,
  type SiteCaptureStrategy,
} from "@/shared/free-seo-check";
import {
  parseVisualBundle,
  type FilmstripFrame,
  type VisualLabData,
} from "./filmstrip-bundle";

const RETRY_404_DELAY_MS = 3000;

interface VisualBundleState {
  frames: FilmstripFrame[] | null;
  lab: VisualLabData | null;
  /** True once no further fetch is pending — the consumer's cue to swap a
   * skeleton for either the data or an intentional absent state. */
  settled: boolean;
}

interface RunFlags {
  loadRan: boolean;
  errorRan: boolean;
  alive: boolean;
  retryTimer: ReturnType<typeof setTimeout> | undefined;
}

export function useVisualBundle(
  pageUrl: string,
  strategy: SiteCaptureStrategy,
): VisualBundleState & {
  /** Call from the capture `<img>`'s onLoad. */
  onCaptureLoaded: () => void;
  /** Call from the capture `<img>`'s onError. */
  onCaptureFailed: () => void;
} {
  const [state, setState] = useState<VisualBundleState>({
    frames: null,
    lab: null,
    settled: false,
  });
  const runs = useRef<RunFlags>({
    loadRan: false,
    errorRan: false,
    alive: true,
    retryTimer: undefined,
  });

  useEffect(() => {
    const flags = runs.current;
    flags.loadRan = false;
    flags.errorRan = false;
    flags.alive = true;
    setState({ frames: null, lab: null, settled: false });
    return () => {
      flags.alive = false;
      if (flags.retryTimer !== undefined) clearTimeout(flags.retryTimer);
    };
  }, [pageUrl, strategy]);

  // One network attempt. "missing" (404) lets the load trigger schedule its
  // single retry; anything else is final for this attempt.
  const fetchOnce = useCallback(async (): Promise<
    "ok" | "missing" | "final"
  > => {
    try {
      const response = await fetch(siteFilmstripUrl(pageUrl, strategy));
      if (!runs.current.alive) return "final";
      if (response.status === 404) return "missing";
      if (!response.ok) return "final";
      const body: unknown = await response.json();
      if (!runs.current.alive) return "final";
      const parsed = parseVisualBundle(body);
      setState({ ...parsed, settled: true });
      return "ok";
    } catch {
      // Network failure or a non-JSON body — same silent absence as a 404.
      return "final";
    }
  }, [pageUrl, strategy]);

  const settle = useCallback(() => {
    setState((current) =>
      current.settled ? current : { ...current, settled: true },
    );
  }, []);

  const onCaptureLoaded = useCallback(() => {
    const flags = runs.current;
    if (flags.loadRan) return;
    flags.loadRan = true;
    void fetchOnce().then((first) => {
      if (first !== "missing") {
        if (first !== "ok") settle();
        return;
      }
      if (!flags.alive) return;
      flags.retryTimer = setTimeout(() => {
        void fetchOnce().then((second) => {
          if (second !== "ok") settle();
        });
      }, RETRY_404_DELAY_MS);
    });
  }, [fetchOnce, settle]);

  const onCaptureFailed = useCallback(() => {
    const flags = runs.current;
    if (flags.errorRan || flags.loadRan) return;
    flags.errorRan = true;
    void fetchOnce().then((result) => {
      if (result !== "ok") settle();
    });
  }, [fetchOnce, settle]);

  return { ...state, onCaptureLoaded, onCaptureFailed };
}
