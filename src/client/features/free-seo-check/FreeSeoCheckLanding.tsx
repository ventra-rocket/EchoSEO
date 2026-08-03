import { useEffect, useRef, useState, type FormEvent } from "react";
import { Languages } from "lucide-react";
import {
  checkPagePath,
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
import { ChallengeField } from "./ChallengeField";
import { LiteReportView } from "./LiteReportView";
import { ScanLog } from "./ScanLog";
import { LandingContent } from "./LandingContent";
import { SampleReportPreview } from "./SampleReportPreview";
import { LANDING_COPY, type LandingCopy } from "./landing-copy";
import { ShareLinkRow } from "./ShareLinkRow";
import { useTurnstileSiteKey } from "./use-turnstile-site-key";
import { isValidCheckUrl } from "./validate-check-url";

interface CheckResponse {
  report: LiteReport;
  cached: boolean;
  /** Whether the Deep tier is currently accepting requests (kill-switch off). */
  deepAvailable: boolean;
  /**
   * The shareable `/c/{id}` snapshot minted for this check — null when the
   * snapshot write failed, in which case the report still renders and only the
   * share URL is missing.
   */
  checkId: string | null;
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
  const challenge = useTurnstileSiteKey();
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
  /** Client-side format error under the URL field — see validate-check-url.ts. */
  const [urlError, setUrlError] = useState<string | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const reportHeadingRef = useRef<HTMLHeadingElement>(null);
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
  /**
   * The mounted widget failed to load or render, so it can never mint a token
   * again. Remembered rather than acted on: remounting right inside
   * `onLoadError` would loop forever when the script is blocked outright, so
   * the remount waits for the visitor's next submit.
   */
  const [challengeFailed, setChallengeFailed] = useState(false);
  /** A submit made before the bot check produced a token — held, not dropped. */
  const [submitQueued, setSubmitQueued] = useState(false);

  /**
   * A Turnstile token is single use, so it is spent once a check comes back —
   * whether the check succeeded or failed. Both outcomes have to renew it.
   *
   * Only the failure path used to. A visitor whose first check WORKED kept the
   * spent token in state, so their second check replayed it: siteverify
   * answered `timeout-or-duplicate`, the page said "Verification failed —
   * please retry the checkbox above", and the checkbox beside it read
   * "Success!". Nothing about that is retryable by the visitor, and the first
   * check working is what made the second one fail.
   */
  function renewChallenge() {
    setTurnstileToken(null);
    setChallengeAttempt((attempt) => attempt + 1);
  }

  function failWith(message: string) {
    setErrorMessage(message);
    setStatus("error");
    setSubmitQueued(false);
    renewChallenge();
  }

  async function runCheck(token: string) {
    setStatus("loading");
    setErrorMessage(null);
    setResult(null);

    try {
      const payload: FreeSeoCheckRequest = {
        url: url.trim(),
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
      // PSI-style: the address bar becomes the share URL, refresh-safe, with
      // no reload and no router navigation (the landing keeps rendering; a
      // refresh lands on the /c/ route and the frozen snapshot). Skipped when
      // the snapshot write failed — a URL that 404s is worse than none.
      if (body.checkId) {
        window.history.replaceState(null, "", checkPagePath(body.checkId));
      }
      renewChallenge();
    } catch {
      failWith(copy.errorDefault);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (status === "loading" || submitQueued) return;
    // Reject unfetchable input before anything touches the challenge: the API
    // verifies (and so consumes) the Turnstile token before it validates the
    // URL, so submitting a typo used to burn the token on a doomed request
    // and answer with "we couldn't reach that site".
    if (!isValidCheckUrl(url)) {
      setUrlError(copy.urlInvalid);
      urlInputRef.current?.focus();
      return;
    }
    setUrlError(null);
    // No token yet means the bot check has not finished, not that the visitor
    // did anything wrong. Hold the intent and run it the moment the token
    // lands, rather than dropping the click and leaving the page inert.
    if (!turnstileToken) {
      // A widget that failed to load is not "still finishing" — queueing
      // behind it would spin forever. The submit is the visitor's retry:
      // remount the challenge so the queued intent waits on one that can
      // actually deliver, and if it fails again `onLoadError` re-releases
      // the queue with the same actionable error.
      if (challengeFailed) {
        setChallengeFailed(false);
        setErrorMessage(null);
        renewChallenge();
      }
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

  // A challenge that can never produce the token a queued submit is waiting
  // for — no key configured, or the config fetch failed/timed out — must
  // release the queue instead of leaving the button "starting". The two
  // terminal states carry different messages: "unconfigured" is a fact about
  // the deployment, "unavailable" only means the config could not be loaded.
  useEffect(() => {
    if (
      challenge.status === "loading" ||
      challenge.status === "ready" ||
      !submitQueued
    )
      return;
    setSubmitQueued(false);
    setErrorMessage(
      challenge.status === "unconfigured"
        ? copy.turnstileUnconfigured
        : copy.turnstileLoadError,
    );
  }, [
    challenge.status,
    submitQueued,
    copy.turnstileUnconfigured,
    copy.turnstileLoadError,
  ]);

  // After a successful check, move the reader to the report: without this the
  // page stayed at scroll 0 showing the same form and marketing copy, and the
  // result sat ~2,000px down — indistinguishable from "nothing happened".
  // Keyed on `result`, which only ever transitions null → report as the direct
  // consequence of a user-initiated scan, so SSR, hydration, and unrelated
  // re-renders can never steal focus.
  useEffect(() => {
    if (!result) return;
    const heading = reportHeadingRef.current;
    if (!heading) return;
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }, [result]);

  return (
    <div className="fsc-root relative h-full overflow-auto bg-base-200">
      {/* The keyboard user's first tab stop. Visually hidden until focused;
          every visual style lives under `focus:` so the sr-only clip rules
          have nothing to fight. */}
      <a
        href="#fsc-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-content focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-primary"
      >
        {copy.skipToContent}
      </a>
      {/* Chrome runs at 5xl — the same width the result view breaks out to —
          so the logo does not float a quarter of the way in from the edge
          under a full-width border on wide screens. Only the reading column
          (hero, form, editorial) stays at 2xl. */}
      <header className="border-b border-base-300 bg-base-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
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

      <main id="fsc-main" tabIndex={-1} className="fsc-hero-glow outline-none">
        <div className="mx-auto max-w-2xl space-y-8 px-4 pt-10 sm:pt-14">
          <section className="space-y-3 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
              {copy.heroEyebrow}
            </p>
            {/* One contiguous string on purpose: the SSR tripwire greps the raw
                HTML for it, and it is the exact-match keyword. The teal accent
                lives on the eyebrow, subtitle keyword, mark, and CTA instead.
                `text-balance` (not an NBSP, which would change the string) keeps
                the Vietnamese heading from breaking inside "miễn phí" at 390. */}
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              {copy.heroHeading}
            </h1>
            <p className="mx-auto max-w-lg text-base leading-relaxed text-base-content/60">
              {copy.heroSubtitleBefore}
              <span className="font-medium text-primary">
                {copy.heroSubtitleAccent}
              </span>
              {copy.heroSubtitleAfter}
            </p>
          </section>

          <form
            onSubmit={handleSubmit}
            className="overflow-hidden rounded-box border border-base-300 bg-base-100 transition-colors focus-within:border-primary/40"
          >
            <div className="space-y-4 p-4 sm:p-6">
              <div className="space-y-1.5">
                <label
                  htmlFor="fsc-url"
                  className="block font-mono text-xs uppercase tracking-widest text-base-content/60"
                >
                  {copy.urlLabel}
                </label>
                <input
                  ref={urlInputRef}
                  id="fsc-url"
                  // `text` + inputMode, not type="url": native url validation
                  // rejects the schemeless "example.com" this checker is built
                  // to accept. The format check is validate-check-url.ts.
                  type="text"
                  name="url"
                  inputMode="url"
                  className="input input-bordered w-full font-mono"
                  placeholder={copy.urlPlaceholder}
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    if (urlError) setUrlError(null);
                  }}
                  autoComplete="off"
                  required
                  aria-invalid={urlError ? true : undefined}
                  aria-describedby={urlError ? "fsc-url-error" : undefined}
                />
                {urlError ? (
                  <p
                    id="fsc-url-error"
                    role="alert"
                    className="text-sm text-error"
                  >
                    {urlError}
                  </p>
                ) : null}
              </div>

              <ChallengeField
                copy={copy}
                locale={locale}
                challenge={challenge}
                challengeAttempt={challengeAttempt}
                onToken={(token) => {
                  // The render-timeout can call a widget failed and the
                  // widget still paint late — a token supersedes that.
                  setChallengeFailed(false);
                  setTurnstileToken(token);
                }}
                onExpire={() => setTurnstileToken(null)}
                onLoadError={() => {
                  // A challenge that failed to load can never mint a token,
                  // so a queued submit would spin forever — release it, and
                  // remember the failure so the next submit remounts the
                  // widget instead of queueing behind one that is already
                  // dead.
                  setChallengeFailed(true);
                  setSubmitQueued(false);
                  setErrorMessage(copy.turnstileLoadError);
                }}
              />

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
                    {/* Dots, not the spinner: at this size the spinner's thin
                        arc frame reads as a stray comma beside the label. */}
                    <span
                      className="loading loading-dots loading-sm"
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
            </div>

            {/* Trust facts live in the card's footer as a hairline spec grid —
                part of the form's data surface, not a centered bullet strip
                wrapping 3+1 below it. The gap-px-over-base-300 trick draws the
                internal dividers. */}
            <ul className="grid grid-cols-2 gap-px border-t border-base-300 bg-base-300 font-mono text-xs text-base-content/70">
              {copy.trustSignals.map((signal) => (
                <li
                  key={signal}
                  className="grid place-items-center bg-base-100 px-3 py-2 text-center leading-snug"
                >
                  {signal}
                </li>
              ))}
            </ul>
          </form>

          {errorMessage ? (
            <div className="alert alert-error text-sm" role="alert">
              {errorMessage}
            </div>
          ) : null}

          {status === "loading" ? <ScanLog url={url} locale={locale} /> : null}
        </div>

        {/* The result renders directly under the form — DOM order and screen
            order both — and breaks out of the prose column: a findings list
            wants a table's width and a score rail beside it, which 672px
            cannot carry. It used to render after the editorial content, some
            2,000px down, where a successful scan was indistinguishable from
            "nothing happened". The section is labelled by a real H2 (the page
            H1 → report H2 → subsection H3 outline), which is also the focus
            target after a successful scan. */}
        {status === "done" && result ? (
          <section
            aria-labelledby="fsc-report-heading"
            className="mx-auto max-w-5xl px-4 pb-14 pt-8"
          >
            <h2
              ref={reportHeadingRef}
              id="fsc-report-heading"
              tabIndex={-1}
              className="scroll-mt-6 text-xl font-semibold tracking-tight outline-none sm:text-2xl"
            >
              {copy.reportHeading}
            </h2>
            {/* Keyed by the check id so a second check resets the copied
                state instead of inheriting the previous confirmation. */}
            {result.checkId ? (
              <ShareLinkRow
                key={result.checkId}
                checkId={result.checkId}
                locale={locale}
              />
            ) : null}
            <div className="mt-4">
              <LiteReportView
                report={result.report}
                deepAvailable={result.deepAvailable}
                locale={locale}
              />
            </div>
          </section>
        ) : (
          /* The sample and editorial content carry the initial landing (and
             its SSR/SEO weight), but once a real report exists they would sit
             between the reader and their result — a look-alike sample report
             is actively confusing next to a real one — so the whole block
             yields to the report. It returns when the state resets. */
          <div className="mx-auto max-w-2xl space-y-8 px-4 pb-10 pt-8 sm:pb-14">
            {/* Hidden during a scan too, not just after one: the sample's
                large illustrative score sitting under the live scan log
                invites a skim-reader to take it for an early result. */}
            {status === "loading" ? null : <SampleReportPreview copy={copy} />}

            <LandingContent copy={copy} />
          </div>
        )}
      </main>

      <LandingFooter locale={locale} copy={copy} />
    </div>
  );
}

/**
 * The page had exactly one link on it — the language switch. No footer, no
 * legal links, and no statement of what EchoSEO is beyond this single tool. A
 * visitor who liked the checker had nowhere to go, which is an expensive thing
 * for the surface the whole distribution strategy points at. No repository
 * link yet: the repo is private, and a link that 404s would cost more
 * credibility than the missing link does.
 */
function LandingFooter({
  locale,
  copy,
}: {
  locale: Locale;
  copy: LandingCopy;
}) {
  return (
    <footer className="border-t border-base-300 bg-base-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-base-content/60 sm:flex-row sm:items-center sm:justify-between">
        <p className="leading-relaxed sm:max-w-xl">{copy.footerProductLine}</p>
        <p className="flex shrink-0 flex-wrap gap-x-4 gap-y-1">
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
  );
}
