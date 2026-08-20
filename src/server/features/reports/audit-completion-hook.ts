import { env } from "cloudflare:workers";
import { getAgentByName } from "agents";
import { AuditSnapshotRepository } from "@/server/features/audit/repositories/AuditSnapshotRepository";
import { ReportSubscriptionRepository } from "@/server/features/reports/ReportSubscriptionRepository";

/**
 * Tell a site's report agent that a crawl just finished.
 *
 * This is what makes "warn me immediately, do not wait for the weekly mail"
 * true for *every* crawl, not only the scheduled one — an owner who launches an
 * audit by hand and introduces a `noindex` should hear about it the same way.
 *
 * Two properties this must have, because it runs inside the audit Workflow:
 *
 * 1. **It can never fail the crawl.** A completed crawl whose notification
 *    broke is still a completed crawl. Everything is swallowed and logged.
 * 2. **It must not create a Durable Object for every target.** `getAgentByName`
 *    instantiates the agent, and most targets have no subscription, so the D1
 *    read comes first and the vast majority of crawls stop there.
 */
export async function notifyReportAgentOfCompletedAudit(
  auditId: string,
): Promise<void> {
  try {
    const snapshot = await AuditSnapshotRepository.getSnapshotForAudit(auditId);
    // No sealed snapshot means the crawl failed before finalize, so there is
    // nothing to compare and nothing worth mailing about.
    if (!snapshot) return;

    const subscription = await ReportSubscriptionRepository.getByTargetId(
      snapshot.targetId,
    );
    if (!subscription || !subscription.enabled) return;

    const agent = await getAgentByName(env.WEEKLY_REPORT, snapshot.targetId);
    await agent.onAuditCompleted(auditId);
  } catch (error) {
    console.error(
      `[weekly-report] failed to notify report agent for audit ${auditId}`,
      error,
    );
  }
}
