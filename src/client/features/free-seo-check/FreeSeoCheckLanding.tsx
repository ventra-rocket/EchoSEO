import { useState, type FormEvent } from "react";
import { Languages } from "lucide-react";
import {
  FREE_SEO_CHECK_API_PATH,
  FREE_SEO_CHECK_LANDING_PATH,
  FREE_SEO_CHECK_VI_LANDING_PATH,
  type FreeSeoCheckRequest,
} from "@/shared/free-seo-check";
import type { Locale } from "@/client/i18n/config";
import type { LiteReport } from "@/server/services/seo-check/types";
import { EchoSeoLogo } from "@/client/components/EchoSeoLogo";
import { TurnstileWidget } from "./TurnstileWidget";
import { LiteReportView } from "./LiteReportView";
import { ScanLog } from "./ScanLog";
import { LandingContent } from "./LandingContent";
import { SampleReportPreview } from "./SampleReportPreview";
import { LANDING_COPY } from "./landing-copy";

interface CheckResponse {
  report: LiteReport;
  cached: boolean;
  /** Whether the Deep tier is currently accepting requests (kill-switch off). */
  deepAvailable: boolean;
}

interface CheckErrorResponse {
  error: string;
}

/**
 * The public checker landing, rendered by both the English `/free-seo-check` and
 * the Vietnamese `/vi/kiem-tra-seo` routes. All user-facing text comes from
 * `LANDING_COPY[locale]`, chosen from the URL (not a cookie), so the server
 * renders the right language deterministically and the page is a valid hreflang
 * target. The interactive report views below take the same `locale`, and the
 * check request sends it so the server localizes the signal text too.
 */
export function FreeSeoCheckLanding({ locale }: { locale: Locale }) {
  const copy = LANDING_COPY[locale];
  const siteKey = import.meta.env.TURNSTILE_SITE_KEY;
  // The language switch is a plain full-page anchor, not a router Link: a
  // language change swaps URL, <head>, and hreflang identity, so a real
  // navigation is the correct (and simplest) behavior.
  const otherLocale: Locale = locale === "en" ? "vi" : "en";
  const otherLandingPath =
    otherLocale === "vi"
      ? FREE_SEO_CHECK_VI_LANDING_PATH
      : FREE_SEO_CHECK_LANDING_PATH;
  const [url, setUrl] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // The whole response, not just the report: the Deep tier's availability rides
  // along with it and both belong to the same check.
  const [result, setResult] = useState<CheckResponse | null>(null);
  // Bumping this remounts the Turnstile widget, which is the only way to get a
  // fresh token: the API verifies (and so consumes) the token before it does
  // anything else, so any rejected submit — an unreachable site, a typo'd URL —
  // burns it. Without the remount the retry button stays disabled until
  // Turnstile self-refreshes, and the visitor's obvious next move is dead.
  const [challengeAttempt, setChallengeAttempt] = useState(0);

  function failWith(message: string) {
    setErrorMessage(message);
    setStatus("error");
    setTurnstileToken(null);
    setChallengeAttempt((attempt) => attempt + 1);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!turnstileToken) return;

    setStatus("loading");
    setErrorMessage(null);
    setResult(null);

    try {
      const payload: FreeSeoCheckRequest = { url, turnstileToken, locale };
      const response = await fetch(FREE_SEO_CHECK_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body: CheckResponse | CheckErrorResponse = await response.json();

      if (!response.ok || "error" in body) {
        const code = "error" in body ? body.error : "INTERNAL_ERROR";
        failWith(copy.errors[code] ?? copy.errorDefault);
        return;
      }

      setResult(body);
      setStatus("done");
    } catch {
      failWith(copy.errorDefault);
    }
  }

  return (
    <div className="fsc-root h-full overflow-auto bg-base-200">
      <header className="border-b border-base-300 bg-base-100">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <EchoSeoLogo variant="lockup" className="text-base" />
          <a
            href={otherLandingPath}
            hrefLang={otherLocale}
            lang={otherLocale}
            aria-label={copy.languageSwitchAria}
            className="btn btn-ghost btn-sm gap-1.5 font-mono text-xs font-normal"
          >
            <Languages className="size-3.5" aria-hidden="true" />
            {copy.languageSwitchLabel}
          </a>
        </div>
      </header>

      <main className="fsc-hero-glow">
        <div className="mx-auto max-w-2xl space-y-8 px-4 py-10 sm:py-14">
          <section className="space-y-3 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
              {copy.heroEyebrow}
            </p>
            {/* One contiguous string on purpose: the SSR tripwire greps the raw
                HTML for it, and it is the exact-match keyword. The teal accent
                lives on the eyebrow, subtitle keyword, mark, and CTA instead. */}
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {copy.heroHeading}
            </h1>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-base-content/60">
              {copy.heroSubtitleBefore}
              <span className="font-medium text-primary">
                {copy.heroSubtitleAccent}
              </span>
              {copy.heroSubtitleAfter}
            </p>
          </section>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-box border border-base-300 bg-base-100 p-4 transition-colors focus-within:border-primary/40 sm:p-6"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="fsc-url"
                className="block font-mono text-xs uppercase tracking-widest text-base-content/60"
              >
                {copy.urlLabel}
              </label>
              <input
                id="fsc-url"
                type="text"
                inputMode="url"
                className="input input-bordered w-full font-mono"
                placeholder={copy.urlPlaceholder}
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                autoComplete="off"
                required
              />
            </div>

            {siteKey ? (
              <TurnstileWidget
                key={challengeAttempt}
                siteKey={siteKey}
                onToken={setTurnstileToken}
                onExpire={() => setTurnstileToken(null)}
                onLoadError={() => setErrorMessage(copy.turnstileLoadError)}
              />
            ) : (
              <div className="alert alert-warning text-sm" role="alert">
                {copy.turnstileUnconfigured}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={!turnstileToken || status === "loading"}
            >
              {status === "loading" ? (
                <>
                  <span
                    className="loading loading-spinner loading-sm"
                    aria-hidden="true"
                  />
                  {copy.submitLoading}
                </>
              ) : (
                copy.submitIdle
              )}
            </button>
          </form>

          <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 font-mono text-xs text-base-content/60">
            {copy.trustSignals.map((signal) => (
              <li key={signal} className="flex items-center gap-1.5">
                <span
                  className="size-1 rounded-full bg-primary"
                  aria-hidden="true"
                />
                {signal}
              </li>
            ))}
          </ul>

          {errorMessage ? (
            <div className="alert alert-error text-sm" role="alert">
              {errorMessage}
            </div>
          ) : null}

          {status === "loading" ? <ScanLog url={url} locale={locale} /> : null}
          {status === "done" && result ? (
            <LiteReportView
              report={result.report}
              deepAvailable={result.deepAvailable}
              locale={locale}
            />
          ) : null}

          {/* Once a real report is on screen the sample has done its job —
              showing two look-alike reports would invite confusion. */}
          {/* Hidden during a scan too, not just after one: the sample's large
              illustrative score sitting under the live scan log invites a
              skim-reader to take it for an early result. */}
          {result || status === "loading" ? null : (
            <SampleReportPreview copy={copy} />
          )}

          <LandingContent copy={copy} />
        </div>
      </main>
    </div>
  );
}
