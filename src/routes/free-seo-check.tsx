import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  FREE_SEO_CHECK_API_PATH,
  FREE_SEO_CHECK_LANDING_PATH,
  publicUrl,
  type FreeSeoCheckRequest,
} from "@/shared/free-seo-check";
import type { LiteReport } from "@/server/services/seo-check/types";
import { TurnstileWidget } from "@/client/features/free-seo-check/TurnstileWidget";
import { LiteReportView } from "@/client/features/free-seo-check/LiteReportView";
import { ScanLog } from "@/client/features/free-seo-check/ScanLog";
import { LandingContent } from "@/client/features/free-seo-check/LandingContent";
import { landingStructuredDataScripts } from "@/client/features/free-seo-check/landing-structured-data";

const PAGE_TITLE = "Free SEO Checker — EchoSEO";
const PAGE_DESCRIPTION =
  "Check any page's on-page SEO instantly and free — title, meta, headings, and technical basics, no signup required.";
const CANONICAL_URL = publicUrl(FREE_SEO_CHECK_LANDING_PATH);

export const Route = createFileRoute("/free-seo-check")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      // Open Graph + Twitter so a shared link renders a real card, not a bare URL.
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "EchoSEO" },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:url", content: CANONICAL_URL },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: PAGE_TITLE },
      { name: "twitter:description", content: PAGE_DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: CANONICAL_URL }],
    scripts: landingStructuredDataScripts(),
  }),
  component: FreeSeoCheckPage,
});

const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: "Enter a valid URL to check.",
  CRAWL_TARGET_BLOCKED: "That URL can't be checked.",
  FORBIDDEN: "Verification failed — please retry the checkbox above.",
  RATE_LIMITED: "You've hit the free-check limit for now — try again later.",
  UPSTREAM_UNAVAILABLE:
    "We couldn't reach that site. Check the URL and try again.",
};
const DEFAULT_ERROR_MESSAGE = "Something went wrong — please try again.";

interface CheckResponse {
  report: LiteReport;
  cached: boolean;
  /** Whether the Deep tier is currently accepting requests (kill-switch off). */
  deepAvailable: boolean;
}

interface CheckErrorResponse {
  error: string;
}

function FreeSeoCheckPage() {
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
        failWith(ERROR_MESSAGES[code] ?? DEFAULT_ERROR_MESSAGE);
        return;
      }

      setResult(body);
      setStatus("done");
    } catch {
      failWith(DEFAULT_ERROR_MESSAGE);
    }
  }

  return (
    <div className="fsc-root h-full overflow-auto bg-base-200">
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-10 sm:py-14">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Free SEO Checker
          </h1>
          <p className="mx-auto max-w-md text-sm text-base-content/60">
            Instant on-page SEO check — title, meta, headings, and technical
            basics. No signup required.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-box border border-base-300 bg-base-100 p-4 sm:p-6"
        >
          <label htmlFor="fsc-url" className="sr-only">
            Website URL
          </label>
          <input
            id="fsc-url"
            type="text"
            inputMode="url"
            className="input input-bordered w-full font-mono"
            placeholder="example.com"
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
              onLoadError={() =>
                setErrorMessage(
                  "Couldn't load verification — please refresh the page.",
                )
              }
            />
          ) : (
            <div className="alert alert-warning text-sm" role="alert">
              Turnstile is not configured for this deployment yet.
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
                Checking…
              </>
            ) : (
              "Check my site"
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

        <LandingContent />
      </div>
    </div>
  );
}
