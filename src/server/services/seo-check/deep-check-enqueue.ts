/**
 * Enqueues the Deep audit Cloudflare Workflow for a confirmed report.
 *
 * Called once per report by the confirm handler, right after the CAS that moved
 * the report `confirming` -> `queued`. If `create` fails, we compensate by
 * reverting the report to `confirming` so a retried confirm re-runs the CAS and
 * re-enqueues — rather than leaving it `queued` with no workflow behind it. The
 * revert is a no-op once the workflow has already reached `running`, so a lost
 * `create` response (instance actually started) never gets clobbered.
 */
import { env } from "cloudflare:workers";
import { revertQueuedReportToConfirming } from "./seo-reports-repository";

export async function enqueueDeepCheck(
  reportId: string,
  url: string,
): Promise<void> {
  try {
    await env.DEEP_SEO_CHECK_WORKFLOW.create({
      id: reportId,
      params: { reportId, url },
    });
  } catch (error) {
    // Compensate, but never let a failing revert swallow the root cause: if the
    // revert also throws, the report stays `queued` and this logs why, while the
    // original create error is what surfaces to the confirm caller.
    try {
      await revertQueuedReportToConfirming(reportId);
    } catch (revertError) {
      console.error(
        `free-seo-check: revert after enqueue failure left report ${reportId} queued:`,
        revertError,
      );
    }
    throw error;
  }
}
