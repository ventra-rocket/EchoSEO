import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import { routeAgentRequest } from "agents";
import { resolveUserContextFromHeaders } from "@/middleware/ensure-user/resolve";
import { ProjectRepository } from "@/server/features/projects/repositories/ProjectRepository";
import { RankTrackingRepository } from "@/server/features/rank-tracking/repositories/RankTrackingRepository";
import { beginRankCheckRun } from "@/server/features/rank-tracking/services/rankCheckRunGuards";
import {
  customerHasPaidPlan,
  getOrCreateOrganizationCustomer,
} from "@/server/billing/subscription";
import { isHostedServerAuthMode } from "@/server/lib/runtime-env";
import { getAuthMode, isHostedAuthMode } from "@/lib/auth-mode";
import {
  createOpenSeoOAuthProvider,
  type OpenSeoOAuthEnv,
} from "@/server/mcp/oauth-provider";
import { requestWithPublicOrigin } from "@/server/mcp/public-origin";
import { MCP_ROUTE } from "@/server/mcp/context";
import { handleSelfHostedOpenSeoMcpRequest } from "@/server/mcp/transport";
import {
  computeNextCheckAt,
  isScheduledRankTrackingInterval,
} from "@/shared/rank-tracking";
import {
  AUTUMN_WEBHOOK_PATH,
  handleAutumnWebhookRequest,
} from "@/server/billing/autumn-webhook";
import {
  FREE_SEO_CHECK_API_PATH,
  FREE_SEO_CHECK_CONFIRM_PATH,
  FREE_SEO_CHECK_DEEP_START_PATH,
  FREE_SEO_CHECK_REPORT_PATH,
  FREE_SEO_CHECK_SITE_SCREENSHOT_PATH,
  FREE_SEO_CHECK_REPORT_ROUTE_PREFIX,
} from "@/shared/free-seo-check";
import { handleFreeSeoCheckRequest } from "@/server/services/seo-check/api";
import { handleStartDeepCheckRequest } from "@/server/services/seo-check/deep-start";
import { handleConfirmDeepCheckRequest } from "@/server/services/seo-check/deep-confirm";
import { handleDeepReportRequest } from "@/server/services/seo-check/deep-report";
import { handleSiteScreenshotRequest } from "@/server/services/seo-check/site-screenshot";
import {
  FREE_CHECK_RETENTION_CRON,
  sweepFreeCheckRetention,
} from "@/server/services/seo-check/retention";
import {
  FREE_CHECK_REPORT_EMAIL_CRON,
  sweepReportReadyEmails,
} from "@/server/services/seo-check/report-ready-email";

const appFetch = createStartHandler(defaultStreamHandler);
const openSeoOAuthProvider = createOpenSeoOAuthProvider(appFetch);

// Authorize an onboarding-chat connection in the Worker, before it reaches the
// Durable Object. The DO instance name is the projectId (set client-side); we
// resolve the session here and confirm the caller's org owns that project, so
// the DO can trust its `name`. Returning a Response rejects; void lets it through.
async function authorizeOnboardingChat(
  request: Request,
  projectId: string,
): Promise<Response | undefined> {
  let context;
  try {
    context = await resolveUserContextFromHeaders(request.headers);
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
  const project = await ProjectRepository.getProjectForOrganization(
    projectId,
    context.organizationId,
  );
  if (!project) {
    return new Response("Forbidden", { status: 403 });
  }
  // Ensure the org's Autumn customer exists (and gets its default onboarding-plan
  // credits) before the DO checks the balance — otherwise a brand-new org's first
  // message can hit a false "out of credits" gate. Hosted-only; self-hosted has
  // no Autumn.
  if (await isHostedServerAuthMode()) {
    await getOrCreateOrganizationCustomer(context);
  }
  return undefined;
}

// Route /agents/* to the onboarding chat DO. Auth happens here (both the WS
// upgrade and any HTTP message-history fetch), keeping it off the OAuth wrapper
// and TanStack route guard below.
async function routeOnboardingChatAgent(
  request: Request,
  env: Env,
): Promise<Response> {
  const response = await routeAgentRequest(request, env, {
    onBeforeConnect: (req, lobby) => authorizeOnboardingChat(req, lobby.name),
    onBeforeRequest: (req, lobby) => authorizeOnboardingChat(req, lobby.name),
  });
  return response ?? new Response("Not found", { status: 404 });
}

/**
 * Renders `/r/{id}` with the headers its bearer-capability link requires.
 *
 * The id in the URL is the only thing protecting the report, so
 * `Referrer-Policy: no-referrer` keeps it out of the `Referer` sent to the
 * Google citation links the report renders. `X-Robots-Tag: noindex` keeps a
 * link that gets pasted somewhere public out of search results, and unlike the
 * in-page `<meta>` it does not depend on the crawler executing the shell.
 */
async function fetchSharedReportPage(request: Request): Promise<Response> {
  const response = await appFetch(request);
  const headers = new Headers(response.headers);
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Robots-Tag", "noindex");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function fetch(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Response | Promise<Response> {
  const authMode = getAuthMode(env.AUTH_MODE);
  const publicRequest = requestWithPublicOrigin(request);
  const pathname = new URL(publicRequest.url).pathname;

  if (pathname.startsWith("/agents/")) {
    return routeOnboardingChatAgent(publicRequest, env);
  }

  // Public in every AUTH_MODE — bypasses the TanStack Start server-function
  // pipeline (and its global auth middleware) entirely. See
  // shared/free-seo-check.ts for why this can't be a createServerFn.
  if (pathname === FREE_SEO_CHECK_API_PATH) {
    return handleFreeSeoCheckRequest(publicRequest);
  }

  if (pathname === FREE_SEO_CHECK_DEEP_START_PATH) {
    return handleStartDeepCheckRequest(publicRequest);
  }

  if (pathname === FREE_SEO_CHECK_CONFIRM_PATH) {
    return handleConfirmDeepCheckRequest(publicRequest);
  }

  if (pathname === FREE_SEO_CHECK_REPORT_PATH) {
    return handleDeepReportRequest(publicRequest);
  }

  if (pathname === FREE_SEO_CHECK_SITE_SCREENSHOT_PATH) {
    return handleSiteScreenshotRequest(publicRequest);
  }

  // The shareable report page needs no session in any AUTH_MODE, so it renders
  // through appFetch directly here rather than falling through the auth
  // branches below — that also makes its headers deterministic per mode.
  if (pathname.startsWith(FREE_SEO_CHECK_REPORT_ROUTE_PREFIX)) {
    return fetchSharedReportPage(request);
  }

  if (isHostedAuthMode(authMode)) {
    if (pathname === AUTUMN_WEBHOOK_PATH) {
      return handleAutumnWebhookRequest(publicRequest);
    }

    return openSeoOAuthProvider.fetch(
      publicRequest,
      env as OpenSeoOAuthEnv,
      ctx,
    );
  }

  if (
    (authMode === "cloudflare_access" || authMode === "local_noauth") &&
    pathname === MCP_ROUTE
  ) {
    return handleSelfHostedOpenSeoMcpRequest(publicRequest, authMode, env, ctx);
  }

  return appFetch(request);
}

// Export Workflow classes as named exports
export { SiteAuditWorkflow } from "./server/workflows/SiteAuditWorkflow";
export { RankCheckWorkflow } from "./server/workflows/RankCheckWorkflow";
export { DeepSeoCheckWorkflow } from "./server/workflows/deep-seo-check-workflow";
export { AuditExportWorkflow } from "./server/workflows/AuditExportWorkflow";
// Durable Object class for the onboarding strategy chat (Agents SDK).
export { OnboardingChatAgent } from "./server/features/onboarding/OnboardingChatAgent";
// Durable Object class for the free SEO checker's per-IP rate limiter.
export { IpRateLimiterDO } from "./server/services/seo-check/rate-limit-do";

export default {
  fetch,
  async scheduled(
    controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext,
  ) {
    // Several schedules share this handler; the cron string is what separates
    // them. Each free-check sweep runs on its own cadence — retention daily,
    // report emails every 5 minutes — so neither inherits rank tracking's
    // 15-minute tick and the D1 work each does stays proportional to its job.
    if (controller.cron === FREE_CHECK_RETENTION_CRON) {
      await sweepFreeCheckRetention();
      return;
    }

    if (controller.cron === FREE_CHECK_REPORT_EMAIL_CRON) {
      await sweepReportReadyEmails();
      return;
    }

    const nowIso = new Date().toISOString();
    const dueConfigs =
      await RankTrackingRepository.getDueConfigsWithOrganization(nowIso);

    const isHosted = await isHostedServerAuthMode();

    for (const config of dueConfigs) {
      try {
        // Skip configs whose org doesn't have a paid plan
        if (isHosted && !(await customerHasPaidPlan(config.organizationId))) {
          console.log(
            `[cron] Skipping config ${config.id} (${config.domain}) — org ${config.organizationId} no longer has access`,
          );
          continue;
        }

        // Skip configs with no keywords before advancing the schedule
        const kwCount = await RankTrackingRepository.getKeywordCountForConfig(
          config.id,
        );
        if (kwCount === 0) {
          console.log(
            `[cron] Skipping config ${config.id} (${config.domain}) — no keywords`,
          );
          // Still advance schedule so this config doesn't stay due forever
          const skipInterval = isScheduledRankTrackingInterval(
            config.scheduleInterval,
          )
            ? config.scheduleInterval
            : null;
          if (skipInterval) {
            await RankTrackingRepository.updateConfig(
              config.id,
              config.projectId,
              {
                nextCheckAt: computeNextCheckAt(
                  skipInterval,
                  config.nextCheckAt,
                ),
              },
            );
          }
          continue;
        }

        // Advance nextCheckAt immediately to prevent retry storms if the run fails
        const interval = isScheduledRankTrackingInterval(
          config.scheduleInterval,
        )
          ? config.scheduleInterval
          : null;
        if (interval) {
          await RankTrackingRepository.updateConfig(
            config.id,
            config.projectId,
            {
              nextCheckAt: computeNextCheckAt(interval, config.nextCheckAt),
            },
          );
        }

        const result = await beginRankCheckRun({
          workflow: env.RANK_CHECK_WORKFLOW,
          config,
          projectId: config.projectId,
          billingCustomer: {
            userId: "system",
            userEmail: "system@echoseo.ventrarocket.vn",
            organizationId: config.organizationId,
            projectId: config.projectId,
          },
          keywordsTotal: kwCount,
          trigger: "scheduled",
          workflowStartErrorMessage: "Failed to start scheduled workflow",
        });

        if (!result.ok) {
          console.log(
            `[cron] Skipping config ${config.id} (${config.domain}) — run already active`,
          );
        } else {
          console.log(
            `[cron] Started scheduled rank check ${result.runId} for config ${config.id} (${config.domain})`,
          );
        }
      } catch (err) {
        console.error(
          `[cron] Error processing config ${config.id} (${config.domain}):`,
          err,
        );
      }
    }
  },
};
