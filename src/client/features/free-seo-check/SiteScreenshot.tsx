import { useState } from "react";
import type { Locale } from "@/client/i18n/config";
import {
  siteScreenshotUrl,
  type SiteCaptureStrategy,
} from "@/shared/free-seo-check";
import { CHECK_RESULT_COPY } from "./check-result-copy";
import { Filmstrip } from "./Filmstrip";

/** Mobile listed first to match the tab copy ("Di động / Máy tính"); desktop
 * is still the DEFAULT tab below. */
const STRATEGIES: readonly SiteCaptureStrategy[] = ["mobile", "desktop"];

/**
 * The visual evidence for the checked page — the "we really loaded your site"
 * trust signal on the Lite result, the `/c/` share page, and the Deep report —
 * now a Di động/Máy tính tabbed panel: a per-strategy capture (browser-window
 * frame on desktop, phone frame on mobile) with the PSI-style loading
 * filmstrip underneath.
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

  return (
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label={tabs.ariaLabel}
        className="tabs tabs-box w-fit"
      >
        {STRATEGIES.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active === key}
            className={`tab ${active === key ? "tab-active" : ""}`}
            onClick={() => {
              setActive(key);
              // Once mounted, a strategy stays mounted: unmounting on switch
              // would drop the filmstrip state and re-fetch its bundle on
              // every toggle.
              setMounted((current) =>
                current[key] ? current : { ...current, [key]: true },
              );
            }}
          >
            {key === "mobile" ? tabs.mobileTab : tabs.desktopTab}
          </button>
        ))}
      </div>

      {STRATEGIES.map((key) =>
        mounted[key] ? (
          // `hidden`, not unmount: an unmounted <img> never loads, and the
          // warm-inactive case exists precisely to load the hidden tab.
          <div key={key} hidden={active !== key}>
            <StrategyCapture pageUrl={pageUrl} strategy={key} locale={locale} />
          </div>
        ) : null,
      )}
    </div>
  );
}

/**
 * One strategy's capture with its frame chrome, loading skeleton, failure
 * row, and — once the capture has actually decoded — its filmstrip. The
 * filmstrip mounts only on the capture's `onLoad` because the render stores
 * the filmstrip BEFORE the capture: by the time this image exists, so does
 * the bundle (Filmstrip.tsx handles the one cache-race exception).
 */
function StrategyCapture({
  pageUrl,
  strategy,
  locale,
}: {
  pageUrl: string;
  strategy: SiteCaptureStrategy;
  locale: Locale;
}) {
  const copy = CHECK_RESULT_COPY[locale].screenshot;
  const [status, setStatus] = useState<"loading" | "ready" | "failed">(
    "loading",
  );
  // Bumping remounts the <img>, which is what re-issues the request on retry.
  const [attempt, setAttempt] = useState(0);

  let host = pageUrl;
  try {
    host = new URL(pageUrl).hostname;
  } catch {
    // A malformed URL should never reach here (the report carries a normalized
    // finalUrl), but fall back to the raw string rather than throwing in render.
  }

  if (status === "failed") {
    return (
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
            onLoad={() => setStatus("ready")}
            onError={() => setStatus("failed")}
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

      {ready ? (
        <Filmstrip pageUrl={pageUrl} strategy={strategy} locale={locale} />
      ) : null}
    </div>
  );
}
