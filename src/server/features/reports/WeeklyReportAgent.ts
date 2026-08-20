import { Agent } from "agents";
import { getAuthMode } from "@/lib/auth-mode";
import { AuditSnapshotRepository } from "@/server/features/audit/repositories/AuditSnapshotRepository";
import { AuditTargetRepository } from "@/server/features/audit/repositories/AuditTargetRepository";
import { AuditService } from "@/server/features/audit/services/AuditService";
import {
  ReportSendRepository,
  ReportSubscriptionRepository,
} from "@/server/features/reports/ReportSubscriptionRepository";
import { buildWeeklyPeriod } from "@/server/features/reports/report-window";
import type { ReportPeriod } from "@/server/features/reports/report-types";
import {
  deliverCriticalAlert,
  deliverWeeklyReport,
} from "@/server/features/reports/WeeklyReportService";
import { WEEKLY_REPORT_CRON } from "@/shared/reports";

/**
 * Per-site scheduler for the periodic report. One instance per
 * `audit_targets.id`; the instance name *is* the target id.
 *
 * Why a Durable Object alarm instead of a fourth `triggers.crons` entry:
 *
 * - The Worker's `scheduled()` handler routes by cron string and **falls
 *   through to rank tracking** for anything it does not recognise, so adding a
 *   global cron is one forgotten `if` away from running the wrong job.
 * - A global cron has to scan D1 for due rows on every tick. A per-target alarm
 *   costs nothing until the moment it fires.
 * - The agent is single-threaded per target, so two overlapping runs for one
 *   site cannot interleave. The D1 claim in `report_sends` still exists, and is
 *   still load-bearing: it survives the agent being recreated and it is what
 *   makes a manual re-run safe.
 *
 * The agent never blocks waiting for a crawl. It launches the audit, then
 * re-schedules itself to check on it, so a 40-minute crawl does not need the
 * Durable Object to stay resident.
 */

/** How often the agent looks in on a crawl it launched. */
const POLL_INTERVAL_SECONDS = 120;
/**
 * Give up waiting after roughly 90 minutes and mail whatever the last completed
 * crawl says. A report that arrives with slightly stale technical data beats a
 * week with no report at all, and the email states which crawl it describes.
 */
const MAX_POLL_ATTEMPTS = 45;

type PendingRun = {
  /** Claim row in `report_sends` this run owns. */
  sendId: string;
  /**
   * The window this run claimed. Carried rather than recomputed at delivery
   * time: the claim and the mail must describe the same seven days even though
   * up to ninety minutes of crawling separates them.
   */
  period: ReportPeriod;
  /** Crawl launched for this run; null when the launch itself failed. */
  auditId: string | null;
};

type WeeklyReportAgentState = {
  pending: PendingRun | null;
};

type PollPayload = {
  sendId: string;
  auditId: string;
  attempt: number;
};

export class WeeklyReportAgent extends Agent<
  Cloudflare.Env,
  WeeklyReportAgentState
> {
  initialState: WeeklyReportAgentState = { pending: null };

  /**
   * Arm the weekly cadence. Safe to call on every subscription save: cron
   * schedules are idempotent on (callback, expression, payload), so repeated
   * calls return the existing schedule instead of stacking duplicates.
   */
  async arm(): Promise<void> {
    await this.schedule(WEEKLY_REPORT_CRON, "runWeeklyScan");
  }

  /**
   * Stop the cadence and abandon any in-flight run. The claim is released so a
   * re-subscribe in the same week is not silently deduped against a period that
   * will now never be mailed.
   */
  async disarm(): Promise<void> {
    for (const schedule of await this.listSchedules()) {
      await this.cancelSchedule(schedule.id);
    }
    const pending = this.state.pending;
    if (pending) {
      await ReportSendRepository.release(pending.sendId);
      this.setState({ pending: null });
    }
  }

  /** Cron callback: claim the period, launch a crawl, then watch for it. */
  async runWeeklyScan(): Promise<void> {
    const subscription = await ReportSubscriptionRepository.getByTargetId(
      this.name,
    );
    if (!subscription || !subscription.enabled) {
      // The owner turned reports off (or the target is gone) while the alarm
      // was pending. Cancel rather than wake up every week forever.
      await this.disarm();
      return;
    }

    const period = buildWeeklyPeriod(new Date());
    const claim = await ReportSendRepository.tryClaim({
      subscriptionId: subscription.id,
      kind: "weekly",
      periodKey: period.key,
    });
    if (!claim) {
      console.info(
        `[weekly-report] period ${period.key} already claimed for target ${this.name}`,
      );
      return;
    }

    const target = await AuditTargetRepository.getById(this.name);
    if (!target) {
      await ReportSendRepository.release(claim.id);
      console.error(`[weekly-report] target ${this.name} no longer exists`);
      return;
    }

    let auditId: string | null = null;
    try {
      // The scheduled crawl runs under the authority of whoever switched
      // reports on. A synthetic "system" user would resolve to `viewer` in
      // hosted mode and be refused outright.
      const launched = await AuditService.startAudit({
        actorUserId: subscription.ownerUserId,
        authMode: getAuthMode(this.env.AUTH_MODE),
        billingCustomer: {
          userId: subscription.ownerUserId,
          userEmail: subscription.ownerEmail,
          organizationId: subscription.organizationId,
          projectId: subscription.projectId,
        },
        projectId: subscription.projectId,
        startUrl: target.origin,
        maxPages: subscription.maxPages,
      });
      auditId = launched.auditId;
      await ReportSendRepository.attachAudit(claim.id, auditId);
    } catch (error) {
      // A refused launch (throttled, over capacity, verification gate) must not
      // cost the recipient their report. The mail still goes out describing the
      // most recent completed crawl, which is honest about its own date.
      console.error(
        `[weekly-report] scheduled crawl could not start for target ${this.name}`,
        error,
      );
    }

    this.setState({
      pending: { sendId: claim.id, period, auditId },
    });

    if (!auditId) {
      await this.finishPendingRun(undefined);
      return;
    }
    await this.schedule(POLL_INTERVAL_SECONDS, "pollScan", {
      sendId: claim.id,
      auditId,
      attempt: 1,
    });
  }

  /** Delayed callback: has the crawl produced something worth reporting yet? */
  async pollScan(payload: PollPayload): Promise<void> {
    const pending = this.state.pending;
    // A newer run (or a disarm) superseded this poll; let it die quietly.
    if (!pending || pending.sendId !== payload.sendId) return;

    const snapshot = await AuditSnapshotRepository.getSnapshotForAudit(
      payload.auditId,
    );
    // Issues are materialized in a step that deliberately swallows its own
    // failures, so a sealed snapshot alone does not mean there is anything to
    // compare — wait for the materialization marker too.
    if (snapshot?.issuesMaterializedAt) {
      await this.finishPendingRun(payload.auditId);
      return;
    }

    if (payload.attempt >= MAX_POLL_ATTEMPTS) {
      console.warn(
        `[weekly-report] crawl ${payload.auditId} did not finish in time; reporting on the previous snapshot`,
      );
      // Deliberately not `payload.auditId`. That crawl has not sealed, so
      // reporting on it finds no snapshot, mails "no crawl to report on", and
      // then stamps the claim — locking the whole ISO week out of a retry.
      // Passing nothing falls back to the newest sealed snapshot, which is the
      // previous crawl, and is what the warning above promises.
      await this.finishPendingRun(undefined);
      return;
    }
    await this.schedule(POLL_INTERVAL_SECONDS, "pollScan", {
      ...payload,
      attempt: payload.attempt + 1,
    });
  }

  /**
   * A crawl finished for this target — scheduled or launched by hand.
   *
   * Two jobs. If it is the crawl this week's report was waiting for, send the
   * report now instead of waiting for the next poll. Otherwise consider an
   * out-of-band alert, which is the only way a critical regression introduced
   * on a Tuesday gets noticed before Monday.
   */
  async onAuditCompleted(auditId: string): Promise<void> {
    const pending = this.state.pending;
    if (pending?.auditId === auditId) {
      // The weekly mail leads with the criticals and says so in its subject, so
      // firing an alert about the same crawl would just be a duplicate.
      await this.finishPendingRun(auditId);
      return;
    }

    const subscription = await ReportSubscriptionRepository.getByTargetId(
      this.name,
    );
    if (!subscription || !subscription.enabled) return;
    const target = await AuditTargetRepository.getById(this.name);
    if (!target) return;

    await deliverCriticalAlert({ subscription, target, auditId });
  }

  /**
   * Send the report for the claimed period and clear the claim.
   *
   * `reportOnAuditId` names the crawl to describe, and every caller states it
   * explicitly: the crawl it just watched seal, or `undefined` for "whatever
   * sealed most recently" when this run has no usable crawl of its own.
   *
   * On anything but success the claim row is released, so the period stays open
   * for a retry instead of being permanently marked as handled by a send that
   * never happened.
   */
  private async finishPendingRun(
    reportOnAuditId: string | undefined,
  ): Promise<void> {
    const pending = this.state.pending;
    if (!pending) return;

    const subscription = await ReportSubscriptionRepository.getByTargetId(
      this.name,
    );
    const target = await AuditTargetRepository.getById(this.name);
    if (!subscription || !subscription.enabled || !target) {
      await ReportSendRepository.release(pending.sendId);
      this.setState({ pending: null });
      return;
    }

    const outcome = await deliverWeeklyReport({
      subscription,
      target,
      period: pending.period,
      sendId: pending.sendId,
      auditId: reportOnAuditId,
    });
    if (outcome !== "sent") {
      await ReportSendRepository.release(pending.sendId);
    }
    this.setState({ pending: null });
  }
}
