import { env } from "cloudflare:workers";
import { getAgentByName } from "agents";
import type { AuthMode } from "@/lib/auth-mode";
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import {
  AuditTargetRepository,
  type AuditTarget,
} from "@/server/features/audit/repositories/AuditTargetRepository";
import {
  canManageTarget,
  resolveWorkspaceRole,
} from "@/server/features/audit/authz/workspace-role";
import {
  ReportSubscriptionRepository,
  type ReportSubscription,
} from "@/server/features/reports/ReportSubscriptionRepository";
import { AppError } from "@/server/lib/errors";
import { getOrigin } from "@/server/lib/audit/url-utils";

/**
 * Turning periodic reports on and off for an audit target.
 *
 * Owner/admin only, for the same reason IndexNow is: this makes the deployment
 * mail a third party on a schedule and spend crawl capacity every week without
 * anyone pressing a button. An editor who can launch a one-off audit should not
 * be able to commit the workspace to that.
 *
 * The subscription row and the Durable Object alarm are two separate pieces of
 * state, and the row is authoritative. Delivery reads `enabled` before every
 * send, so a failed arm/disarm can only cost a wasted crawl or a missed week —
 * never an email to someone who opted out.
 */

type ManageInput = {
  actorUserId: string;
  authMode: AuthMode;
  organizationId: string;
  projectId: string;
  auditId: string;
};

async function resolveManagedTarget(input: ManageInput): Promise<AuditTarget> {
  const role = await resolveWorkspaceRole({
    userId: input.actorUserId,
    organizationId: input.organizationId,
    authMode: input.authMode,
  });
  if (!canManageTarget(role)) {
    throw new AppError(
      "FORBIDDEN",
      "Only workspace owners and admins can manage periodic reports",
    );
  }

  const audit = await AuditRepository.getAuditForProject(
    input.auditId,
    input.projectId,
  );
  if (!audit) throw new AppError("NOT_FOUND");

  const target = await AuditTargetRepository.getByProjectAndOrigin(
    input.projectId,
    getOrigin(audit.startUrl),
  );
  if (!target) throw new AppError("NOT_FOUND");
  return target;
}

/** What the settings panel renders. Null means "never configured". */
type ReportSubscriptionView = {
  enabled: boolean;
  recipientEmail: string;
  locale: "en" | "vi";
  maxPages: number;
  lastSentAt: string | null;
} | null;

function toView(
  subscription: ReportSubscription | null,
): ReportSubscriptionView {
  if (!subscription) return null;
  return {
    enabled: subscription.enabled,
    recipientEmail: subscription.recipientEmail,
    locale: subscription.locale,
    maxPages: subscription.maxPages,
    lastSentAt: subscription.lastSentAt,
  };
}

async function get(input: ManageInput): Promise<ReportSubscriptionView> {
  const target = await resolveManagedTarget(input);
  return toView(await ReportSubscriptionRepository.getByTargetId(target.id));
}

/**
 * Create or update the subscription, then arm the weekly alarm.
 *
 * Arming is idempotent — the agent's cron schedule dedupes on callback plus
 * expression — so saving the address five times still leaves exactly one
 * weekly run.
 */
async function save(
  input: ManageInput & {
    ownerEmail: string;
    recipientEmail: string;
    locale: "en" | "vi";
    maxPages?: number;
  },
): Promise<ReportSubscriptionView> {
  const target = await resolveManagedTarget(input);
  const subscription = await ReportSubscriptionRepository.upsert({
    targetId: target.id,
    projectId: target.projectId,
    organizationId: target.organizationId,
    recipientEmail: input.recipientEmail,
    locale: input.locale,
    ownerUserId: input.actorUserId,
    ownerEmail: input.ownerEmail,
    maxPages: input.maxPages,
  });

  const agent = await getAgentByName(env.WEEKLY_REPORT, target.id);
  await agent.arm();

  return toView(subscription);
}

async function setEnabled(
  input: ManageInput & { enabled: boolean },
): Promise<ReportSubscriptionView> {
  const target = await resolveManagedTarget(input);
  const subscription = await ReportSubscriptionRepository.setEnabled(
    target.id,
    input.enabled,
  );
  if (!subscription) throw new AppError("NOT_FOUND");

  const agent = await getAgentByName(env.WEEKLY_REPORT, target.id);
  if (input.enabled) {
    await agent.arm();
  } else {
    await agent.disarm();
  }

  return toView(subscription);
}

export const ReportSubscriptionService = { get, save, setEnabled };
