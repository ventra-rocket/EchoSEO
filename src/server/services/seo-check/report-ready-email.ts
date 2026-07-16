/**
 * Delivery of the "your deep check is finished" email, by two routes.
 *
 * The Workflow calls `sendReportReadyEmail` for its own report the moment the
 * payload lands — the common case, where the mail is immediate. The cron sweep
 * catches everything that route cannot see: reports deduped onto a canonical
 * (their lead consented, but the canonical's Workflow does not know they exist),
 * chains more than one hop deep, and reports whose send was lost to a crash.
 *
 * Both routes go through the same `email_sent_at` compare-and-swap, so they may
 * run concurrently and exactly one of them sends. Correctness never depends on
 * which arrives first.
 */
import {
  getFreeCheckPublicOrigin,
  getRetentionWindows,
} from "./deep-check-config";
import { getEmailSender, type EmailSender } from "./email/sender";
import { EmailSendError } from "./email/email-send-error";
import { sendDeepReportReady } from "./email/deep-report-ready";
import { resolveCanonicalRoot } from "./report-view";
import {
  findReportEmailTarget,
  findReportsAwaitingEmail,
  releaseReportEmailClaim,
  tryClaimReportEmail,
  type ReportEmailTarget,
} from "./seo-reports-repository";
import { FREE_SEO_CHECK_REPORT_ROUTE_PREFIX } from "@/shared/free-seo-check";

/** Cron cadence for the sweep; must match the entry in wrangler.jsonc. */
export const FREE_CHECK_REPORT_EMAIL_CRON = "*/5 * * * *";

/**
 * Reports per sweep run. The sweep is idempotent and runs every few minutes, so
 * a backlog drains rather than risking a run that exceeds its limits and so
 * delivers nothing at all.
 */
const MAX_REPORTS_PER_SWEEP = 100;

interface DeliveryContext {
  sender: EmailSender;
  origin: string;
  retentionDays: number;
}

/** Null when this deployment cannot build a report link, so it must not mail one. */
async function loadDeliveryContext(): Promise<DeliveryContext | null> {
  const [origin, sender, { reportRetentionDays }] = await Promise.all([
    getFreeCheckPublicOrigin(),
    getEmailSender(),
    getRetentionWindows(),
  ]);

  if (!origin) {
    console.error(
      "free-seo-check: FREE_CHECK_PUBLIC_ORIGIN is unset — cannot link to a report, skipping delivery",
    );
    return null;
  }

  return { sender, origin, retentionDays: reportRetentionDays };
}

type DeliveryOutcome =
  /** The mail was handed to the provider. */
  | "sent"
  /** Nothing to do: not finished yet, or another route got there first. */
  | "skipped"
  /** Failed; the claim is back and the next sweep will try again. */
  | "deferred"
  /** Failed for a reason every other message shares — stop, don't grind. */
  | "blocked";

/**
 * A D1 blip or a bug is nobody's deployment-wide verdict, so it only defers this
 * one message. Guessing the other way would stop a whole sweep over a fluke.
 */
function isDeploymentWide(error: unknown): boolean {
  return error instanceof EmailSendError && error.deploymentWide;
}

async function deliver(
  target: ReportEmailTarget,
  context: DeliveryContext,
): Promise<DeliveryOutcome> {
  const { report, email } = target;

  // A follower's own status stays `queued` forever, so only the root can say
  // whether there is anything to announce. A null root means a broken chain: the
  // report page reports that as failed, and a finished-with-a-failure is still a
  // finished outcome the visitor is owed.
  const root = await resolveCanonicalRoot(report);
  if (root && root.status !== "done" && root.status !== "failed") {
    return "skipped";
  }

  if (!(await tryClaimReportEmail(report.id))) return "skipped";

  try {
    await sendDeepReportReady(context.sender, {
      to: email,
      reportId: report.id,
      // The visitor's own id, not the root's — `/r/{id}` resolves the chain, and
      // this is the link they were promised.
      reportUrl: new URL(
        `${FREE_SEO_CHECK_REPORT_ROUTE_PREFIX}${report.id}`,
        context.origin,
      ).toString(),
      targetUrl: report.url,
      retentionDays: context.retentionDays,
    });
    return "sent";
  } catch (error) {
    // Never rethrow: the caller is either a Workflow that has already produced
    // the report (failing it now would discard finished work over a mail
    // problem) or a sweep with other reports to deliver.
    console.error(
      `free-seo-check: report ${report.id} finished-email send failed`,
      error,
    );

    // Always hand the claim back, whatever went wrong. There is no such thing
    // here as a message that can never be delivered: Resend has no per-recipient
    // rejection, so every failure is our key, our sender domain, our payload, or
    // a blip — all of which someone can fix, after which this visitor should
    // still get the report they asked for. Keeping the claim to retire the row
    // would trade a loud, self-healing outage for silent permanent mail loss,
    // and `email_sent_at` cannot tell "sent" from "given up on" afterwards.
    await releaseReportEmailClaim(report.id);
    return isDeploymentWide(error) ? "blocked" : "deferred";
  }
}

/** The Workflow's immediate route, for the report it just finished. */
export async function sendReportReadyEmail(reportId: string): Promise<void> {
  const context = await loadDeliveryContext();
  if (!context) return;

  const target = await findReportEmailTarget(reportId);
  // Not owed mail: unconfirmed lead, or another route already claimed it.
  if (!target) return;

  await deliver(target, context);
}

/** The cron route: followers, chains, and anything the immediate route lost. */
export async function sweepReportReadyEmails(): Promise<void> {
  const context = await loadDeliveryContext();
  if (!context) return;

  const targets = await findReportsAwaitingEmail(MAX_REPORTS_PER_SWEEP);

  let sent = 0;
  let blocked = false;
  for (const target of targets) {
    const outcome = await deliver(target, context);
    if (outcome === "sent") sent += 1;
    // A revoked key or an unverified sender domain fails identically for every
    // remaining row, so stop at the first one: one doomed call per run instead
    // of a hundred. Nothing is lost by stopping — every row keeps its claim
    // free and is still owed its mail once the fault is fixed.
    if (outcome === "blocked") {
      blocked = true;
      break;
    }
  }

  // Logged even when nothing was sent: this is the only evidence the cron fired,
  // and a sweep that has silently stopped looks exactly like one with no work.
  console.log(
    `[cron] free-seo-check report emails: sent ${sent} of ${targets.length} candidate(s)${
      blocked ? " — stopped early, delivery is misconfigured (see above)" : ""
    }`,
  );
}
