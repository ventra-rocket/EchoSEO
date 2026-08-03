import { useEffect, useState } from "react";
import { FREE_SEO_CHECK_CONFIG_PATH } from "@/shared/free-seo-check";

/**
 * How long the config fetch may hang before the page stops waiting on it. A
 * silently dropped connection used to keep the hook in its loading state
 * forever, and a submit queued behind that state could never be released.
 */
const CONFIG_TIMEOUT_MS = 10_000;

export type TurnstileSiteKeyState =
  | { status: "loading" }
  | { status: "ready"; siteKey: string }
  /** The server answered and has no site key configured for this deployment. */
  | { status: "unconfigured" }
  /**
   * The config request failed or timed out. Distinct from `unconfigured`: the
   * deployment may be configured fine — we just could not ask it — so the UI
   * must say "could not load", not "not configured".
   */
  | { status: "unavailable" };

/**
 * Loads the public Turnstile key from the running Worker instead of the build
 * environment. The key is intentionally public; the corresponding secret
 * never leaves the Worker.
 */
export function useTurnstileSiteKey(): TurnstileSiteKeyState {
  const [state, setState] = useState<TurnstileSiteKeyState>({
    status: "loading",
  });

  useEffect(() => {
    let active = true;

    // `AbortSignal.timeout` is 2022+ — on older browsers fall back to an
    // untimed fetch (the long-standing behavior) rather than throwing during
    // mount and blanking a public page that otherwise works. The global is
    // guarded too: `typeof AbortSignal.timeout` alone still evaluates the
    // member access and throws ReferenceError where `AbortSignal` itself is
    // missing.
    const signal =
      typeof AbortSignal !== "undefined" &&
      typeof AbortSignal.timeout === "function"
        ? AbortSignal.timeout(CONFIG_TIMEOUT_MS)
        : undefined;

    void fetch(FREE_SEO_CHECK_CONFIG_PATH, { signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Could not load public configuration");
        const data = await response.json<{ turnstileSiteKey?: unknown }>();
        return typeof data.turnstileSiteKey === "string"
          ? ({ status: "ready", siteKey: data.turnstileSiteKey } as const)
          : ({ status: "unconfigured" } as const);
      })
      .then((next) => {
        if (active) setState(next);
      })
      .catch(() => {
        if (active) setState({ status: "unavailable" });
      });

    return () => {
      active = false;
    };
  }, []);

  return state;
}
