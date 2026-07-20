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
} from "@/server/lib/psi/pagespeed";
import { crawlSite } from "@/server/services/seo-check/crawl";
import { buildDeepReport } from "@/server/services/seo-check/deep";
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

export async function runDeepSeoCheck(
  step: DeepCheckStep,
  params: DeepSeoCheckParams,
): Promise<void> {
  const { reportId, url } = params;

  try {
    await step.do("mark-running", () => markReportRunning(reportId));

    const psi = await step.do("pagespeed", async () => {
      const apiKey = await getRequiredEnvValue("GOOGLE_PSI_API_KEY");
      let raw: unknown;
      try {
        // Counted before the result: a spent PSI call is the cost to track,
        // whether or not it ends up yielding a usable report.
        recordCheckMetric("psi_call", { kind: "deep", reportId });
        raw = await fetchPageSpeed(url, apiKey);
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
    });

    // Crawl + build + persist in one step so the multi-page ParsedPage[] stays
    // transient and never becomes a durable step output (Workflows cap step
    // results at 1 MiB). Only the small shaped PSI result crosses step
    // boundaries; the DeepReport goes straight to R2, then D1 commits `done`.
    // Reports deduped onto this one read the result lazily via
    // canonical_report_id — no fan-out write here.
    await step.do("crawl-and-persist", async () => {
      const crawl = await crawlSite(url);
      const report = buildDeepReport({ requestedUrl: url, crawl, psi });
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
