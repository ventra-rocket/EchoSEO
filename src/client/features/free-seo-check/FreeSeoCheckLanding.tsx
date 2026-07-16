import { useState, type FormEvent } from "react";
import {
  FREE_SEO_CHECK_API_PATH,
  type FreeSeoCheckRequest,
} from "@/shared/free-seo-check";
import type { Locale } from "@/client/i18n/config";
import type { LiteReport } from "@/server/services/seo-check/types";
import { TurnstileWidget } from "./TurnstileWidget";
import { LiteReportView } from "./LiteReportView";
import { ScanLog } from "./ScanLog";
import { LandingContent } from "./LandingContent";
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
 * target. The interactive report views below are not yet localized — they render
 * only after a check runs and are not indexed content.
 */
export function FreeSeoCheckLanding({ locale }: { locale: Locale }) {
  const copy = LANDING_COPY[locale];
  const siteKey = import.meta.env.TURNSTILE_SITE_KEY;
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
      const payload: FreeSeoCheckRequest = { url, turnstileToken };
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
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-10 sm:py-14">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {copy.heroHeading}
          </h1>
          <p className="mx-auto max-w-md text-sm text-base-content/60">
            {copy.heroSubtitle}
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-box border border-base-300 bg-base-100 p-4 sm:p-6"
        >
          <label htmlFor="fsc-url" className="sr-only">
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

        {errorMessage ? (
          <div className="alert alert-error text-sm" role="alert">
            {errorMessage}
          </div>
        ) : null}

        {status === "loading" ? <ScanLog url={url} /> : null}
        {status === "done" && result ? (
          <LiteReportView
            report={result.report}
            deepAvailable={result.deepAvailable}
          />
        ) : null}

        <LandingContent copy={copy} />
      </div>
    </div>
  );
}
