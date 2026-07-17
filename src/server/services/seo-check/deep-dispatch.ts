/**
 * Decides what happens to a confirmed Deep check report at the spend commit.
 *
 * Called by deep-confirm right after the CAS `confirming -> queued` win, so it
 * runs exactly once per report. Order: kill-switch -> `(domain, day)` dedupe ->
 * daily quotas -> enqueue. Only a report that wins the dedupe reservation and
 * passes the quotas actually runs a PSI + crawl audit; everything else resolves
 * to a terminal state without spending.
 */
import { isDeepCheckDisabled } from "./deep-check-config";
import { checkDeepCheckQuotas } from "./deep-check-quota";
import { reserveDomainDay, releaseDomainDay } from "./dedupe-repository";
import {
  attachReportToCanonical,
  markReportFailed,
  revertQueuedReportToConfirming,
} from "./seo-reports-repository";
import { enqueueDeepCheck } from "./deep-check-enqueue";
import { DEEP_DISABLED_MESSAGE as DISABLED_MESSAGE } from "./deep-failure-messages";

/** UTC calendar day, e.g. "2026-07-14". */
function utcDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

interface DeepDispatchInput {
  reportId: string;
  domain: string;
  url: string;
  emailNormalized: string;
}

export async function dispatchDeepCheck(
  input: DeepDispatchInput,
): Promise<void> {
  const { reportId, domain, url, emailNormalized } = input;

  const domainDay = `${domain}:${utcDay()}`;
  let reserved = false;
  try {
    if (await isDeepCheckDisabled()) {
      await markReportFailed(reportId, DISABLED_MESSAGE);
      return;
    }

    const reservation = await reserveDomainDay(domainDay, reportId);
    if (!reservation.won) {
      // Another same-domain audit already runs today — attach, don't re-audit.
      await attachReportToCanonical(reportId, reservation.canonicalReportId);
      return;
    }
    reserved = true;

    const quota = await checkDeepCheckQuotas({ emailNormalized, domain });
    if (!quota.allowed) {
      // Free the slot so a blocked canonical never poisons the (domain, day).
      await releaseDomainDay(domainDay, reportId);
      reserved = false;
      await markReportFailed(reportId, quota.message ?? DISABLED_MESSAGE);
      return;
    }

    await enqueueDeepCheck(reportId, url);
  } catch (error) {
    // Any failure after the CAS win (a D1/DO blip in reserve, attach, quota, or
    // enqueue) must not strand the report `queued` with no workflow behind it:
    // free the reservation if we still hold it and revert the CAS so a retried
    // confirm re-runs the whole dispatch. The revert is idempotent (a no-op once
    // `running`), and enqueue's own revert overlapping this is harmless.
    if (reserved) await releaseDomainDay(domainDay, reportId);
    await revertQueuedReportToConfirming(reportId);
    throw error;
  }
}
