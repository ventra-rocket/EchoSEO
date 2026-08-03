import { useId, useRef, useState } from "react";
import type { Locale } from "@/client/i18n/config";
import {
  siteScreenshotUrl,
  type SiteCaptureStrategy,
} from "@/shared/free-seo-check";
import { CHECK_RESULT_COPY } from "./check-result-copy";
import { Filmstrip } from "./Filmstrip";
import { LabPanel } from "./LabPanel";
import { useVisualBundle } from "./use-visual-bundle";

/** Mobile listed first to match the tab copy ("Di động / Máy tính"); desktop
 * is still the DEFAULT tab below. */
const STRATEGIES: readonly SiteCaptureStrategy[] = ["mobile", "desktop"];

/**
 * The visual evidence for the checked page — the "we really loaded your site"
 * trust signal on the Lite result, the `/c/` share page, and the Deep report —
 * a Di động/Máy tính tabbed panel: a per-strategy capture (browser-window
 * frame on desktop, phone frame on mobile) with the PSI-style loading
 * filmstrip underneath, and (on the free tiers) the lab panel of Lighthouse
 * scores + lab CWV from the same render's bundle.
 *
 * The capture comes from a live PSI render measured at ~25s on a cold domain,
 * so each tab paints a skeleton that says what is coming, and a capture that
 * never arrives collapses to a one-line row with a retry rather than a broken
 * image. Which strategies' `<img>`s are mounted — and so which renders are
 * requested at all — is the quota-relevant decision; see
 * `warmInactiveStrategy`.
 */
export function SiteScreenshot({
  pageUrl,
  locale,
  warmInactiveStrategy = false,
  showLabPanel = false,
}: {
  pageUrl: string;
  locale: Locale;
  /**
   * True mounts BOTH strategies' capture `<img>`s eagerly — those two GETs
   * are the result page's pre-warm, so the tab switch never waits on a cold
   * render. Default false: a share-page viewer mounts only the active tab,
   * the other on first tab click, because a forwarded link must not spend
   * two render-ceiling slots per visit.
   */
  warmInactiveStrategy?: boolean;
  /**
   * True renders the free lab panel (Lighthouse scores + lab CWV) under each
   * strategy's capture. Default false: the Deep report renders this component
   * too, and its own StrategyLabPanel already carries the exact-URL,
   * field-preferring numbers — a second, homepage-lab panel there would state
   * the same categories twice with different values.
   */
  showLabPanel?: boolean;
}) {
  const tabs = CHECK_RESULT_COPY[locale].strategyTabs;
  // Desktop by default, deterministically: this component server-renders on
  // public routes, so the initial tab must not come from viewport/matchMedia
  // — the hydration pass would disagree with the server about which tab is
  // selected.
  const [active, setActive] = useState<SiteCaptureStrategy>("desktop");
  const [mounted, setMounted] = useState<Record<SiteCaptureStrategy, boolean>>(
    () => ({ desktop: true, mobile: warmInactiveStrategy }),
  );
  const idBase = useId();
  const tabRefs = useRef<
    Partial<Record<SiteCaptureStrategy, HTMLButtonElement | null>>
  >({});

  const tabId = (key: SiteCaptureStrategy) => `${idBase}-tab-${key}`;
  const panelId = (key: SiteCaptureStrategy) => `${idBase}-panel-${key}`;

  const selectTab = (key: SiteCaptureStrategy) => {
    setActive(key);
    // Once mounted, a strategy stays mounted: unmounting on switch would drop
    // the bundle state and re-fetch it on every toggle.
    setMounted((current) =>
      current[key] ? current : { ...current, [key]: true },
    );
  };

  // Roving tabindex per the APG tabs pattern: arrows move focus AND selection
  // (selection follows focus — two tabs, cheap panels, no async cost beyond
  // what mounting already pays).
  const onTablistKeyDown = (event: React.KeyboardEvent) => {
    const index = STRATEGIES.indexOf(active);
    let next: number | null = null;
    if (event.key === "ArrowRight") next = (index + 1) % STRATEGIES.length;
    else if (event.key === "ArrowLeft")
      next = (index - 1 + STRATEGIES.length) % STRATEGIES.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = STRATEGIES.length - 1;
    if (next === null) return;
    event.preventDefault();
    const key = STRATEGIES[next];
    selectTab(key);
    tabRefs.current[key]?.focus();
  };

  return (
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label={tabs.ariaLabel}
        className="tabs tabs-box w-fit"
        onKeyDown={onTablistKeyDown}
      >
        {STRATEGIES.map((key) => (
          <button
            key={key}
            ref={(element) => {
              tabRefs.current[key] = element;
            }}
            type="button"
            role="tab"
            id={tabId(key)}
            aria-selected={active === key}
            aria-controls={panelId(key)}
            tabIndex={active === key ? 0 : -1}
            className={`tab ${active === key ? "tab-active" : ""}`}
            onClick={() => selectTab(key)}
          >
            {key === "mobile" ? tabs.mobileTab : tabs.desktopTab}
          </button>
        ))}
      </div>

      {STRATEGIES.map((key) =>
        mounted[key] ? (
          // `hidden`, not unmount: an unmounted <img> never loads, and the
          // warm-inactive case exists precisely to load the hidden tab.
          <div
            key={key}
            role="tabpanel"
            id={panelId(key)}
            aria-labelledby={tabId(key)}
            tabIndex={0}
            hidden={active !== key}
          >
            <StrategyCapture
              pageUrl={pageUrl}
              strategy={key}
              locale={locale}
              showLabPanel={showLabPanel}
            />
          </div>
        ) : null,
      )}
    </div>
  );
}

/**
 * One strategy's capture with its frame chrome, loading skeleton, failure
 * row, and — from the shared bundle fetch — its filmstrip and lab panel. The
 * bundle fetch fires on the capture's `onLoad` (the render stores the bundle
 * BEFORE the capture, so by the time this image exists, so does the bundle)
 * and once, without retry, on `onError` — when PSI returned no screenshot the
 * scores must still appear. Policy details live in `use-visual-bundle.ts`.
 */
function StrategyCapture({
  pageUrl,
  strategy,
  locale,
  showLabPanel,
}: {
  pageUrl: string;
  strategy: SiteCaptureStrategy;
  locale: Locale;
  showLabPanel: boolean;
}) {
  const copy = CHECK_RESULT_COPY[locale].screenshot;
  const [status, setStatus] = useState<"loading" | "ready" | "failed">(
    "loading",
  );
  // Bumping remounts the <img>, which is what re-issues the request on retry.
  const [attempt, setAttempt] = useState(0);
  const { frames, lab, settled, onCaptureLoaded, onCaptureFailed } =
    useVisualBundle(pageUrl, strategy);

  let host = pageUrl;
  try {
    host = new URL(pageUrl).hostname;
  } catch {
    // A malformed URL should never reach here (the report carries a normalized
    // finalUrl), but fall back to the raw string rather than throwing in render.
  }

  if (status === "failed") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-box border border-base-300 bg-base-100 px-4 py-3">
          <span className="min-w-0 truncate text-sm text-base-content/60">
            {copy.label} — {copy.unavailable.toLowerCase()}
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-xs shrink-0"
            onClick={() => {
              setStatus("loading");
              setAttempt((current) => current + 1);
            }}
          >
            {copy.retry}
          </button>
        </div>
        {/* The capture failing is exactly when the scores must not vanish
            with it — the bundle may exist even though the image does not. */}
        {showLabPanel ? (
          <LabPanel lab={lab} settled={settled} locale={locale} />
        ) : null}
      </div>
    );
  }

  const ready = status === "ready";
  const phone = strategy === "mobile";

  // One stable tree for both states — the <img> must never change parents,
  // or the loading→ready flip would remount it and re-issue a request the
  // capture service just spent ~25s serving.
  return (
    <div className="space-y-3">
      <figure
        className={
          ready
            ? phone
              ? "mx-auto w-full max-w-[270px] overflow-hidden rounded-[1.75rem] border border-base-300 bg-base-100 shadow-sm"
              : "overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-sm"
            : phone
              ? "mx-auto w-full max-w-[270px]"
              : "mx-auto w-full max-w-xl"
        }
      >
        {ready ? (
          phone ? (
            // Phone chrome: just the speaker slot — a 412px-wide capture
            // reads as a phone once it sits inside a phone-shaped bezel.
            <div
              className="flex items-center justify-center border-b border-base-300 bg-base-200/60 py-2"
              aria-hidden="true"
            >
              <span className="h-1.5 w-14 rounded-full bg-base-300" />
            </div>
          ) : (
            // Browser chrome: three dots and an address pill. Pure decoration —
            // the real signal is the capture below, but the frame makes it read
            // as a window onto the site rather than a bare image.
            <div className="flex items-center gap-2 border-b border-base-300 bg-base-200/60 px-3 py-2">
              <span className="flex gap-1.5" aria-hidden="true">
                <span className="size-2.5 rounded-full bg-base-300" />
                <span className="size-2.5 rounded-full bg-base-300" />
                <span className="size-2.5 rounded-full bg-base-300" />
              </span>
              <span className="mx-auto max-w-[75%] truncate rounded-full bg-base-100 px-3 py-0.5 font-mono text-xs text-base-content/60">
                {host}
              </span>
            </div>
          )
        ) : null}

        <div
          className={
            ready
              ? `relative bg-base-200 ${phone ? "aspect-[9/16]" : "aspect-[16/10]"}`
              : `relative overflow-hidden border border-base-300 bg-base-200 ${
                  phone
                    ? "aspect-[9/16] rounded-[1.75rem]"
                    : "aspect-video rounded-box"
                }`
          }
        >
          {ready ? null : (
            <>
              <div
                className="absolute inset-0 animate-pulse bg-base-300"
                aria-hidden="true"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-4 text-center">
                <span className="font-mono text-[11px] uppercase tracking-widest text-base-content/60">
                  {copy.label}
                </span>
                <span className="text-xs text-base-content/50">
                  {copy.loadingHint}
                </span>
              </div>
            </>
          )}
          <img
            key={attempt}
            src={siteScreenshotUrl(pageUrl, strategy)}
            alt={copy.alt(host)}
            // Intrinsic dimensions at each frame's ratio so the browser can
            // reserve space; the classes below still control rendered size.
            width={phone ? 412 : 1600}
            height={phone ? 733 : 1000}
            decoding="async"
            onLoad={() => {
              setStatus("ready");
              onCaptureLoaded();
            }}
            onError={() => {
              setStatus("failed");
              onCaptureFailed();
            }}
            // `object-top`: show the hero the visitor lands on, not the middle
            // of a page that can run thousands of pixels tall. Kept mounted
            // (invisible) while loading — an unmounted <img> never loads.
            className={
              ready
                ? "size-full object-cover object-top"
                : "absolute inset-0 size-full opacity-0"
            }
          />
        </div>

        {ready ? (
          <figcaption className="border-t border-base-300 px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-base-content/60">
            {copy.label}
          </figcaption>
        ) : null}
      </figure>

      {ready && frames ? <Filmstrip frames={frames} locale={locale} /> : null}

      {showLabPanel ? (
        <LabPanel lab={lab} settled={settled} locale={locale} />
      ) : null}
    </div>
  );
}
