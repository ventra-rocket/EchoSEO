/**
 * Cloudflare Workflow for the free, email-gated Deep SEO check (Decision D).
 *
 * Each `step.do` output is durable, so a later step's retry reuses earlier
 * outputs — PSI is not re-called and the crawl is not repeated. A PSI *shaping*
 * failure (bad payload) is wrapped in NonRetryableError so a successful PSI call
 * is never retried. Persistence is R2-first, then the D1 `done` commit.
 */
import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import { getRequiredEnvValue } from "@/server/lib/runtime-env";
import {
  fetchPageSpeed,
  PsiRequestError,
  shapePsiResult,
  type PsiResult,
} from "@/server/lib/psi/pagespeed";
import { crawlSite } from "@/server/services/seo-check/crawl";
import { buildDeepReport } from "@/server/services/seo-check/deep";
import { extractGeoSignals } from "@/server/services/seo-check/geo-signals";
import { putDeepReport } from "@/server/services/seo-check/report-store";
import { recordCheckMetric } from "@/server/services/seo-check/metrics";
import { sendReportReadyEmail } from "@/server/services/seo-check/report-ready-email";
import {
  markReportDone,
  markReportFailed,
  markReportRunning,
} from "@/server/services/seo-check/seo-reports-repository";

/** Generic, user-facing failure text; the real cause only goes to the log. */
const FAILURE_MESSAGE = "The deep check could not be completed.";

interface DeepSeoCheckParams {
  reportId: string;
  url: string;
}

/** The slice of `WorkflowStep` this run uses — lets tests pass a plain fake. */
interface DeepCheckStep {
  do<T>(name: string, callback: () => Promise<T> | T): Promise<T>;
}

/**
 * One PSI call + shaping, with the retryability classification that must run
 * INSIDE a `step.do` callback: transient 429/5xx rethrow as-is so the Workflow
 * retries them on that step's own budget; a permanent 4xx or a shaping failure
 * becomes NonRetryableError because neither recovers on retry and each retry
 * would re-spend the daily PSI quota. Shared by both strategies so their
 * classification cannot drift; whether a failure that finally escapes the step
 * fails the report is the CALL SITE's decision, not this function's.
 */
async function fetchShapedPageSpeed(
  url: string,
  reportId: string,
  strategy: "mobile" | "desktop",
  metricKind: "deep" | "deep-desktop",
): Promise<PsiResult> {
  const apiKey = await getRequiredEnvValue("GOOGLE_PSI_API_KEY");
  let raw: unknown;
  try {
    // Counted before the result: a spent PSI call is the cost to track,
    // whether or not it ends up yielding a usable report.
    recordCheckMetric("psi_call", { kind: metricKind, reportId });
    raw = await fetchPageSpeed(url, apiKey, strategy);
  } catch (error) {
    // Retry transient 429/5xx; a permanent 4xx (bad URL / key) won't
    // recover and would keep spending the daily PSI quota — fail fast.
    if (
      error instanceof PsiRequestError &&
      error.status !== 429 &&
      error.status < 500
    ) {
      throw new NonRetryableError(`PSI rejected the URL: ${error.status}`);
    }
    throw error;
  }
  try {
    return shapePsiResult(raw);
  } catch (error) {
    // A malformed payload won't fix itself on retry — and retrying would
    // re-spend the PSI quota. Fail fast instead.
    throw new NonRetryableError(`PSI shaping failed: ${String(error)}`);
  }
}

export async function runDeepSeoCheck(
  step: DeepCheckStep,
  params: DeepSeoCheckParams,
): Promise<void> {
  const { reportId, url } = params;

  try {
    await step.do("mark-running", () => markReportRunning(reportId));

    const psi = await step.do("pagespeed", () =>
      fetchShapedPageSpeed(url, reportId, "mobile", "deep"),
    );

    // Desktop is a comparative display strategy, never scored — best-effort by
    // contract. Its own step keeps a separate retry budget, and only this CALL
    // SITE catches: whatever finally escapes the step — NonRetryableError, or
    // a transient failure with retries exhausted — degrades to a report with
    // no desktop tab. Catching inside the callback instead would kill retries
    // for transient 429/5xx; catching nothing would let a desktop failure fail
    // a report that used to succeed. The mobile step above stays fatal:
    // nothing here wraps it. Only the small shaped result crosses the step
    // boundary (never the raw PSI response), well under the 1 MiB cap.
    let desktopPsi: PsiResult | null = null;
    try {
      desktopPsi = await step.do("pagespeed-desktop", () =>
        fetchShapedPageSpeed(url, reportId, "desktop", "deep-desktop"),
      );
    } catch (error) {
      console.error(
        `Deep check ${reportId} desktop PSI failed; continuing without it:`,
        error,
      );
    }

    // Crawl + build + persist in one step so the multi-page ParsedPage[] stays
    // transient and never becomes a durable step output (Workflows cap step
    // results at 1 MiB). Only the small shaped PSI result crosses step
    // boundaries; the DeepReport goes straight to R2, then D1 commits `done`.
    // Reports deduped onto this one read the result lazily via
    // canonical_report_id — no fan-out write here.
    await step.do("crawl-and-persist", async () => {
      const crawl = await crawlSite(url);
      // GEO is off the critical path (decision C): extract it best-effort and
      // let a failure degrade to a report with no GEO section, never a failed
      // report. crawlSite guarantees a primary page or it would have thrown.
      const primary = crawl.pages[0];
      const geo = primary
        ? await extractGeoSignals(url, primary.page).catch((error: unknown) => {
            console.error(
              `Deep check ${reportId} GEO extraction failed:`,
              error,
            );
            return null;
          })
        : null;
      const report = buildDeepReport({
        requestedUrl: url,
        crawl,
        psi,
        geo,
        desktopPsi,
      });
      const r2Key = await putDeepReport(reportId, report);
      await markReportDone(reportId, r2Key);
      recordCheckMetric("deep_done", { reportId });
    });
  } catch (error) {
    console.error(`Deep check ${reportId} failed:`, error);
    // Record the failure as a delivered outcome (a dead row is worse than a
    // failed one). Keep the message generic — it is surfaced to anonymous
    // users in Phase 5; the real cause stays in the log above.
    // The "finished" email for a failed check is left to the cron sweep, which
    // picks up any terminal report: failures are rare, and the alternative is
    // duplicating the send on the one path that is already handling an error.
    await step.do("mark-failed", async () => {
      await markReportFailed(reportId, FAILURE_MESSAGE);
      // Inside the step so a workflow replay (which re-runs the run() body but
      // reuses committed step results) cannot double-count the failure.
      recordCheckMetric("deep_failed", { reportId });
    });
    throw error;
  }

  // Deliberately outside the try: the report is committed, and a mail problem
  // must not reach the failure path above and re-litigate a finished report. The
  // send swallows its own errors and hands the claim back for the sweep to
  // retry. Reports deduped onto this one are the sweep's job too — this route
  // only ever knows its own lead.
  await step.do("send-report-email", () => sendReportReadyEmail(reportId));
}

export class DeepSeoCheckWorkflow extends WorkflowEntrypoint<
  Env,
  DeepSeoCheckParams
> {
  async run(
    event: WorkflowEvent<DeepSeoCheckParams>,
    step: WorkflowStep,
  ): Promise<void> {
    await runDeepSeoCheck(step, event.payload);
  }
}
