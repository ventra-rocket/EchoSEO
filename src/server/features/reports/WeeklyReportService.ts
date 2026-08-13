import { getEmailSender, type EmailSender } from "@/server/email/sender";
import { EmailSendError } from "@/server/email/email-send-error";
import type { AuditTarget } from "@/server/features/audit/repositories/AuditTargetRepository";
import {
  ReportSendRepository,
  ReportSubscriptionRepository,
  type ReportSubscription,
} from "@/server/features/reports/ReportSubscriptionRepository";
import {
  buildWeeklyIssueReport,
  newCriticalIssues,
} from "@/server/features/reports/report-issues";
import type {
  ReportPeriod,
  WeeklyReportData,
} from "@/server/features/reports/report-types";
import {
  buildCriticalAlertEmail,
  buildWeeklyReportEmail,
} from "@/server/features/reports/weekly-report-email";
import { gatherWeeklySearchSignals } from "@/server/features/gsc/weeklySearchPerformance";
import { getAppPublicOrigin } from "@/server/lib/public-origin";
import { buildUnsubscribeUrl } from "@/shared/reports";

/**
 * Assembling and delivering a periodic report.
 *
 * Everything here is callable outside a Durable Object so the delivery
 * decisions stay unit-testable; `WeeklyReportAgent` supplies only the schedule
 * and the crawl.
 */

/**
 * Mirrors the free checker's delivery vocabulary so both mail paths report
 * outcomes the same way. `blocked` means the whole deployment's mail is
 * failing (revoked key, hard rate limit) and a caller looping over several
 * subscriptions should stop rather than burn the rest of the batch.
 */
type ReportDeliveryOutcome = "sent" | "skipped" | "deferred" | "blocked";

type DeliveryContext = {
  sender: EmailSender;
  origin: string;
};

/**
 * Resolve what every send needs. A null origin is fatal on purpose: the report
 * is mostly links, and a mail whose links go nowhere is worse than a missing
 * mail — it also burns the recipient's trust in the address.
 */
async function loadDeliveryContext(): Promise<DeliveryContext | null> {
  const [sender, origin] = await Promise.all([
    getEmailSender(),
    getAppPublicOrigin(),
  ]);
  if (!origin) {
    console.error(
      "[weekly-report] no APP_PUBLIC_ORIGIN or FREE_CHECK_PUBLIC_ORIGIN — refusing to send mail with unresolvable links",
    );
    return null;
  }
  return { sender, origin };
}

/**
 * Gather both halves of the report. The two reads are independent: Search
 * Console being unreachable must not cost the recipient the technical section,
 * which is the part they cannot get anywhere else.
 */
async function assembleWeeklyReport(input: {
  subscription: ReportSubscription;
  target: AuditTarget;
  period: ReportPeriod;
  origin: string;
  /** Report on this crawl; defaults to the newest sealed snapshot. */
  auditId?: string;
}): Promise<WeeklyReportData> {
  const { subscription, target, period, origin } = input;
  const locale = subscription.locale;

  const [issues, search] = await Promise.all([
    buildWeeklyIssueReport({
      targetId: target.id,
      locale,
      auditId: input.auditId,
    }),
    gatherWeeklySearchSignals({ projectId: subscription.projectId, period }),
  ]);

  return {
    locale,
    siteLabel: new URL(target.origin).host,
    period,
    issues,
    search,
    reportUrl: `${origin}/p/${subscription.projectId}/audit/issues`,
    unsubscribeUrl: buildUnsubscribeUrl(origin, subscription.unsubscribeToken),
  };
}

/**
 * Send the weekly mail for an already-claimed period.
 *
 * The caller owns the claim (see `ReportSendRepository.tryClaim`) and is
 * responsible for releasing it on anything other than `sent`. Splitting it that
 * way keeps the claim's lifetime visible at the call site instead of hidden
 * two layers down.
 */
export async function deliverWeeklyReport(input: {
  subscription: ReportSubscription;
  target: AuditTarget;
  period: ReportPeriod;
  sendId: string;
  auditId?: string;
}): Promise<ReportDeliveryOutcome> {
  const context = await loadDeliveryContext();
  if (!context) return "deferred";

  try {
    const data = await assembleWeeklyReport({
      subscription: input.subscription,
      target: input.target,
      period: input.period,
      origin: context.origin,
      auditId: input.auditId,
    });
    await context.sender.send(
      buildWeeklyReportEmail({
        to: input.subscription.recipientEmail,
        subscriptionId: input.subscription.id,
        data,
      }),
    );
    const sentAt = new Date().toISOString();
    await ReportSendRepository.markSent(input.sendId, sentAt);
    await ReportSubscriptionRepository.recordSent(
      input.subscription.id,
      sentAt,
    );
    return "sent";
  } catch (error) {
    console.error(
      `[weekly-report] delivery failed for target ${input.target.id} period ${input.period.key}`,
      error,
    );
    return error instanceof EmailSendError && error.deploymentWide
      ? "blocked"
      : "deferred";
  }
}

/**
 * Send the immediate critical-issue alert for one crawl.
 *
 * Two gates sit in front of it, both enforced here so no caller can forget
 * them: at most one alert per subscription per day, and one alert per crawl.
 * Without the daily cap a site mid-migration would mail its owner on every
 * re-crawl until they stopped reading the address entirely.
 */
export const ALERT_THROTTLE_MS = 24 * 60 * 60 * 1000;

export async function deliverCriticalAlert(input: {
  subscription: ReportSubscription;
  target: AuditTarget;
  auditId: string;
  now?: Date;
}): Promise<ReportDeliveryOutcome> {
  const { subscription, target, auditId } = input;
  const now = input.now ?? new Date();

  const report = await buildWeeklyIssueReport({
    targetId: target.id,
    locale: subscription.locale,
    auditId,
  });
  const criticals = newCriticalIssues(report);
  if (criticals.length === 0) return "skipped";

  const recentAlerts = await ReportSendRepository.countSentSince(
    subscription.id,
    "alert",
    new Date(now.getTime() - ALERT_THROTTLE_MS).toISOString(),
  );
  if (recentAlerts > 0) {
    console.info(
      `[weekly-report] suppressed alert for target ${target.id}: already alerted within ${ALERT_THROTTLE_MS}ms`,
    );
    return "skipped";
  }

  // The crawl id is the period key, so a workflow replay that re-notifies the
  // agent cannot produce a second alert for the same crawl.
  const claim = await ReportSendRepository.tryClaim({
    subscriptionId: subscription.id,
    kind: "alert",
    periodKey: auditId,
  });
  if (!claim) return "skipped";

  const context = await loadDeliveryContext();
  if (!context) {
    await ReportSendRepository.release(claim.id);
    return "deferred";
  }

  try {
    await context.sender.send(
      buildCriticalAlertEmail({
        to: subscription.recipientEmail,
        subscriptionId: subscription.id,
        auditId,
        locale: subscription.locale,
        siteLabel: new URL(target.origin).host,
        issues: criticals,
        reportUrl: `${context.origin}/p/${subscription.projectId}/audit/issues`,
        unsubscribeUrl: buildUnsubscribeUrl(
          context.origin,
          subscription.unsubscribeToken,
        ),
      }),
    );
    await ReportSendRepository.markSent(claim.id, new Date().toISOString());
    return "sent";
  } catch (error) {
    console.error(
      `[weekly-report] alert delivery failed for target ${target.id} audit ${auditId}`,
      error,
    );
    await ReportSendRepository.release(claim.id);
    return error instanceof EmailSendError && error.deploymentWide
      ? "blocked"
      : "deferred";
  }
}
