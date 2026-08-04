import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { env } from "cloudflare:workers";
import { AuditIssueService } from "@/server/features/audit/services/AuditIssueService";
import { AuditService } from "@/server/features/audit/services/AuditService";
import { GscService } from "@/server/features/gsc/services/GscService";
import { hasSelfHostedGscConfig } from "@/server/features/gsc/oauth-config";
import { ProjectService } from "@/server/features/projects/services/ProjectService";
import { RankTrackingRepository } from "@/server/features/rank-tracking/repositories/RankTrackingRepository";
import { OrganizationSeoCredentialRepository } from "@/server/features/seo-credentials/OrganizationSeoCredentialRepository";
import { isHostedServerAuthMode } from "@/server/lib/runtime-env";
import {
  buildCommandCenterActions,
  type CommandCenterAudit,
  type CommandCenterRankTracker,
} from "@/shared/command-center";
import { requireProjectContext } from "@/serverFunctions/middleware";

const inputSchema = z.object({ projectId: z.string().min(1) });

type Source<T> = { data: T; error: null } | { data: null; error: string };
type AuditHistoryEntry = {
  id: string;
  startUrl: string;
  status: string;
  pagesCrawled: number;
  pagesTotal: number;
  startedAt: string;
  completedAt: string | null;
};

async function readSource<T>(work: () => Promise<T>): Promise<Source<T>> {
  try {
    return { data: await work(), error: null };
  } catch {
    // The dashboard must remain useful if one integration is temporarily
    // unavailable. The surface labels this honestly rather than showing a
    // misleading zero or failing the whole project home page.
    return { data: null, error: "Unavailable right now" };
  }
}

function mapAudit(audit: AuditHistoryEntry | null): CommandCenterAudit | null {
  return audit
    ? {
        id: audit.id,
        startUrl: audit.startUrl,
        status: audit.status,
        pagesCrawled: audit.pagesCrawled,
        pagesTotal: audit.pagesTotal,
        startedAt: audit.startedAt,
        completedAt: audit.completedAt,
      }
    : null;
}

export const getProjectCommandCenter = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ context }) => {
    const project = await ProjectService.getProjectForOrganization(
      context.organizationId,
      context.projectId,
    );

    const [gsc, audits, rankTrackers, orgSeoKey] = await Promise.all([
      readSource(async () => {
        const [connection, currentUserHasGrant, hosted, configured] =
          await Promise.all([
            GscService.getConnection(context.projectId),
            GscService.userHasGrant(context.userId),
            isHostedServerAuthMode(),
            hasSelfHostedGscConfig(),
          ]);
        return {
          connected: Boolean(connection),
          currentUserHasGrant,
          googleOAuthConfigured: hosted || configured,
          siteUrl: connection?.siteUrl ?? null,
        };
      }),
      readSource(() => AuditService.getCommandCenterAudits(context.projectId)),
      readSource(() =>
        RankTrackingRepository.getConfigSummaries(context.projectId),
      ),
      // A transient credential-store read must not break the whole home page;
      // fall back to global-env detection below when it fails.
      OrganizationSeoCredentialRepository.getEncrypted(
        context.organizationId,
      ).catch(() => null),
    ]);

    const latestAudit = audits.data?.latest ?? null;
    const latestCompletedAudit = audits.data?.latestCompleted ?? null;
    const issues = latestCompletedAudit
      ? await readSource(() =>
          AuditIssueService.getIssueSummary(
            latestCompletedAudit.id,
            context.projectId,
          ),
        )
      : { data: null, error: null };

    const criticalIssueCount =
      issues.data?.rollups.filter((issue) => issue.severity === "critical")
        .length ?? 0;
    const highIssueCount =
      issues.data?.rollups.filter((issue) => issue.severity === "high")
        .length ?? 0;

    const mappedAudit = mapAudit(latestAudit);
    const mappedCompletedAudit = mapAudit(latestCompletedAudit);
    const mappedTrackers: CommandCenterRankTracker[] =
      rankTrackers.data?.map((tracker) => ({
        id: tracker.id,
        domain: tracker.domain,
        keywordCount: tracker.keywordCount,
        lastRunStatus: tracker.lastRunStatus,
        lastRunCompletedAt: tracker.lastRunCompletedAt,
      })) ?? [];

    return {
      project,
      readiness: {
        dataForSeoConfigured:
          orgSeoKey != null || Boolean(env.DATAFORSEO_API_KEY?.trim()),
        gsc: gsc.data,
      },
      audit: {
        latest: mappedAudit,
        latestCompleted: mappedCompletedAudit,
        criticalIssueCount,
        highIssueCount,
        issuesMaterializedAt: issues.data?.materializedAt ?? null,
      },
      rankTracking: mappedTrackers,
      sources: {
        gscError: gsc.error,
        auditError: audits.error,
        rankTrackingError: rankTrackers.error,
        issueError: issues.error,
      },
      nextActions: buildCommandCenterActions({
        domain: project.domain,
        gscConnected: gsc.data?.connected ?? false,
        gscKnown: gsc.error === null,
        latestAudit: mappedAudit,
        auditKnown: audits.error === null,
        criticalIssueCount,
        highIssueCount,
        rankTrackers: mappedTrackers,
        rankTrackingKnown: rankTrackers.error === null,
      }),
    };
  });
