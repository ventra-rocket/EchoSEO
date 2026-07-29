import { useEffect, useState, type FormEvent } from "react";
import { Languages } from "lucide-react";
import {
  FREE_SEO_CHECK_API_PATH,
  FREE_SEO_CHECK_LANDING_PATH,
  FREE_SEO_CHECK_VI_LANDING_PATH,
  type FreeSeoCheckRequest,
} from "@/shared/free-seo-check";
import type { Locale } from "@/client/i18n/config";
import {
  LEGAL_PRIVACY_PATH_BY_LOCALE,
  LEGAL_TERMS_PATH_BY_LOCALE,
} from "@/shared/legal";
// One source for what the legal documents are called, shared with the pages
// themselves so the footer and the page headings cannot drift apart.
import { LEGAL_CHROME_COPY } from "@/client/features/legal/legal-chrome-copy";
import type { LiteReport } from "@/server/services/seo-check/types";
import { EchoSeoLogo } from "@/client/components/EchoSeoLogo";
import { TurnstileWidget } from "./TurnstileWidget";
import { LiteReportView } from "./LiteReportView";
import { ScanLog } from "./ScanLog";
import { LandingContent } from "./LandingContent";
import { SampleReportPreview } from "./SampleReportPreview";
import { LANDING_COPY } from "./landing-copy";
import { useTurnstileSiteKey } from "./use-turnstile-site-key";

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
  const siteKey = useTurnstileSiteKey();
  // The language switch is a plain full-page anchor, not a router Link: a
  // language change swaps URL, <head>, and hreflang identity, so a real
  // navigation is the correct (and simplest) behavior.
  const otherLocale: Locale = locale === "en" ? "vi" : "en";
  const landingPath =
    locale === "vi"
      ? FREE_SEO_CHECK_VI_LANDING_PATH
      : FREE_SEO_CHECK_LANDING_PATH;
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
  /** A submit made before the bot check produced a token — held, not dropped. */
  const [submitQueued, setSubmitQueued] = useState(false);

  function failWith(message: string) {
    setErrorMessage(message);
    setStatus("error");
    setTurnstileToken(null);
    setSubmitQueued(false);
    setChallengeAttempt((attempt) => attempt + 1);
  }

  async function runCheck(token: string) {
    setStatus("loading");
    setErrorMessage(null);
    setResult(null);

    try {
      const payload: FreeSeoCheckRequest = {
        url,
        turnstileToken: token,
        locale,
      };
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

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (status === "loading" || submitQueued) return;
    // No token yet means the bot check has not finished, not that the visitor
    // did anything wrong. Hold the intent and run it the moment the token
    // lands, rather than dropping the click and leaving the page inert.
    if (!turnstileToken) {
      setSubmitQueued(true);
      return;
    }
    void runCheck(turnstileToken);
  }

  useEffect(() => {
    if (!submitQueued || !turnstileToken) return;
    setSubmitQueued(false);
    void runCheck(turnstileToken);
    // `runCheck` is redefined every render; depending on it would re-fire this.
    // The queue is keyed by the two values that actually gate the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitQueued, turnstileToken]);

  return (
    <div className="fsc-root h-full overflow-auto bg-base-200">
      <header className="border-b border-base-300 bg-base-100">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          {/* The mark is the expected way home. It was previously inert, which
              is one of the strongest "unfinished scaffold" tells a page can
              give. This landing IS the public home — `/` is the authenticated
              app and would put a stranger at a sign-in wall. */}
          <a href={landingPath} aria-label={copy.footerHomeAria}>
            <EchoSeoLogo variant="lockup" className="text-base" />
          </a>
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
                locale={locale}
                onToken={setTurnstileToken}
                onExpire={() => setTurnstileToken(null)}
                onLoadError={() => setErrorMessage(copy.turnstileLoadError)}
              />
            ) : siteKey === null ? (
              <div className="alert alert-warning text-sm" role="alert">
                {copy.turnstileUnconfigured}
              </div>
            ) : (
              <div className="flex justify-center" role="status">
                <span className="loading loading-spinner loading-sm" />
              </div>
            )}

            {/* Never `disabled`. A grey dead button is the page's only action
                at first paint, and when the challenge fails to render it stays
                dead with nothing said. `aria-disabled` announces the busy state
                without blocking the click that queues the check. */}
            <button
              type="submit"
              className="btn btn-primary w-full"
              aria-disabled={status === "loading" || submitQueued}
            >
              {status === "loading" || submitQueued ? (
                <>
                  <span
                    className="loading loading-spinner loading-sm"
                    aria-hidden="true"
                  />
                  {status === "loading"
                    ? copy.submitLoading
                    : copy.submitVerifying}
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

      {/* The page had exactly one link on it — the language switch. No footer,
          no legal links, and no statement of what EchoSEO is beyond this single
          tool. A visitor who liked the checker had nowhere to go, which is an
          expensive thing for the surface the whole distribution strategy points
          at. No repository link yet: the repo is private, and a link that 404s
          would cost more credibility than the missing link does. */}
      <footer className="border-t border-base-300 bg-base-100">
        <div className="mx-auto max-w-2xl space-y-3 px-4 py-8 text-sm text-base-content/60">
          <p className="leading-relaxed">{copy.footerProductLine}</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <a
              href={LEGAL_TERMS_PATH_BY_LOCALE[locale]}
              className="underline underline-offset-2 hover:text-base-content"
            >
              {LEGAL_CHROME_COPY[locale].termsLinkLabel}
            </a>
            <a
              href={LEGAL_PRIVACY_PATH_BY_LOCALE[locale]}
              className="underline underline-offset-2 hover:text-base-content"
            >
              {LEGAL_CHROME_COPY[locale].privacyLinkLabel}
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
