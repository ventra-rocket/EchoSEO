import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  FREE_SEO_CHECK_API_PATH,
  type FreeSeoCheckRequest,
} from "@/shared/free-seo-check";
import type {
  LiteReport,
  SignalCategory,
  SignalStatus,
} from "@/server/services/seo-check/types";
import { TurnstileWidget } from "@/client/features/free-seo-check/TurnstileWidget";

export const Route = createFileRoute("/free-seo-check")({
  head: () => ({
    meta: [
      { title: "Free SEO Checker — EchoSEO" },
      {
        name: "description",
        content:
          "Check any page's on-page SEO instantly and free — title, meta, headings, and technical basics, no signup required.",
      },
    ],
  }),
  component: FreeSeoCheckPage,
});

const CATEGORY_LABELS: Record<SignalCategory, string> = {
  meta: "Meta",
  structure: "Page Structure",
  server: "Server",
};

const STATUS_BADGE_CLASS: Record<SignalStatus, string> = {
  pass: "badge badge-success",
  warn: "badge badge-warning",
  fail: "badge badge-error",
};

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
  const [report, setReport] = useState<LiteReport | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!turnstileToken) return;

    setStatus("loading");
    setErrorMessage(null);
    setReport(null);

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
        setErrorMessage(ERROR_MESSAGES[code] ?? DEFAULT_ERROR_MESSAGE);
        setStatus("error");
        return;
      }

      setReport(body.report);
      setStatus("done");
    } catch {
      setErrorMessage(DEFAULT_ERROR_MESSAGE);
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Free SEO Checker</h1>
        <p className="text-base-content/60">
          Instant on-page SEO check — title, meta, headings, and technical
          basics. No signup required.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder="example.com"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          autoComplete="off"
          required
        />

        {siteKey ? (
          <TurnstileWidget
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
          <p className="text-sm text-warning">
            Turnstile is not configured for this deployment yet.
          </p>
        )}

        <button
          type="submit"
          className="btn btn-soft w-full"
          disabled={!turnstileToken || status === "loading"}
        >
          {status === "loading" ? "Checking..." : "Check my site"}
        </button>
      </form>

      {errorMessage ? (
        <p className="text-sm text-error">{errorMessage}</p>
      ) : null}

      {report ? <LiteReportView report={report} /> : null}
    </div>
  );
}

function LiteReportView({ report }: { report: LiteReport }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl font-bold">{report.overallScore}</div>
        <p className="text-base-content/60">Overall on-page score</p>
        <p className="mt-1 break-all text-xs text-base-content/40">
          Results for {report.finalUrl}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        {report.categoryScores.map((category) => (
          <div key={category.category} className="rounded-box border p-4">
            <div className="text-2xl font-semibold">{category.score}</div>
            <div className="text-sm text-base-content/60">
              {CATEGORY_LABELS[category.category]}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {report.signals.map((signal) => (
          <div
            key={signal.id}
            className="flex items-center justify-between gap-4 rounded-box border px-4 py-2"
          >
            <span className="text-sm">{signal.label}</span>
            <span className={STATUS_BADGE_CLASS[signal.status]}>
              {signal.status}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-box border border-primary/30 bg-primary/5 p-4 text-center text-sm">
        Want Core Web Vitals too? The Deep report adds{" "}
        {report.deepTeaser.coreWebVitalsMetricCount} Core Web Vitals metrics
        plus a full site crawl — free, delivered to your inbox.
      </div>
    </div>
  );
}
