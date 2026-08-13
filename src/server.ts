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
  getOrCreateOrganizationCustomer,
  orgMayUsePaidFeatures,
} from "@/server/billing/subscription";
import { resolveDataforseoCredentials } from "@/server/lib/dataforseo/resolve-credentials";
import { resolveDataforseoCredentialAccess } from "@/server/lib/dataforseo/credential-access-policy";
import {
  isAutumnConfigured,
  isHostedServerAuthMode,
} from "@/server/lib/runtime-env";
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
  FREE_SEO_CHECK_CHECK_PATH,
  FREE_SEO_CHECK_CHECK_ROUTE_PREFIX,
  FREE_SEO_CHECK_CONFIG_PATH,
  FREE_SEO_CHECK_CONFIRM_PATH,
  FREE_SEO_CHECK_DEEP_START_PATH,
  FREE_SEO_CHECK_REPORT_PATH,
  FREE_SEO_CHECK_SITE_FILMSTRIP_PATH,
  FREE_SEO_CHECK_SITE_SCREENSHOT_PATH,
  FREE_SEO_CHECK_REPORT_ROUTE_PREFIX,
  publicUrl,
} from "@/shared/free-seo-check";
import { handleFreeSeoCheckRequest } from "@/server/services/seo-check/api";
import {
  buildCheckPageMetaTags,
  handleCheckReadRequest,
} from "@/server/services/seo-check/check-read";
import { escapeHtml } from "@/server/services/seo-check/output-encode";
import { handleFreeSeoCheckPublicConfigRequest } from "@/server/services/seo-check/public-config";
import { handleStartDeepCheckRequest } from "@/server/services/seo-check/deep-start";
import { handleConfirmDeepCheckRequest } from "@/server/services/seo-check/deep-confirm";
import { handleDeepReportRequest } from "@/server/services/seo-check/deep-report";
import {
  handleSiteFilmstripRequest,
  handleSiteScreenshotRequest,
} from "@/server/services/seo-check/site-screenshot";
import {
  FREE_CHECK_RETENTION_CRON,
  sweepFreeCheckRetention,
} from "@/server/services/seo-check/retention";
import { sweepAuditRetention } from "@/server/features/audit/retention";
import {
  FREE_CHECK_REPORT_EMAIL_CRON,
  sweepReportReadyEmails,
} from "@/server/services/seo-check/report-ready-email";
import { parseAssistantWorkspaceName } from "@/shared/assistant-workspace";

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
  // no Autumn. Guarded on Autumn being configured: with billing deferred this
  // call would throw on the missing secret, 500-ing the chat gateway; degrade
  // instead (the DO's own credit gate is likewise bypassed under open access).
  if ((await isHostedServerAuthMode()) && (await isAutumnConfigured())) {
    await getOrCreateOrganizationCustomer(context);
  }
  return undefined;
}

async function authorizeAssistantWorkspace(
  request: Request,
  name: string,
): Promise<Response | undefined> {
  const identity = parseAssistantWorkspaceName(name);
  if (!identity) {
    return new Response("Invalid assistant workspace", { status: 400 });
  }

  let context;
  try {
    context = await resolveUserContextFromHeaders(request.headers);
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
  if (context.userId !== identity.userId) {
    return new Response("Forbidden", { status: 403 });
  }
  const project = await ProjectRepository.getProjectForOrganization(
    identity.projectId,
    context.organizationId,
  );
  return project ? undefined : new Response("Forbidden", { status: 403 });
}

// Route /agents/* to the onboarding chat DO. Auth happens here (both the WS
// upgrade and any HTTP message-history fetch), keeping it off the OAuth wrapper
// and TanStack route guard below.
async function routeOnboardingChatAgent(
  request: Request,
  env: Env,
): Promise<Response> {
  const response = await routeAgentRequest(request, env, {
    onBeforeConnect: (req, lobby) =>
      new URL(req.url).pathname.startsWith("/agents/assistant-workspace/")
        ? authorizeAssistantWorkspace(req, lobby.name)
        : authorizeOnboardingChat(req, lobby.name),
    onBeforeRequest: (req, lobby) =>
      new URL(req.url).pathname.startsWith("/agents/assistant-workspace/")
        ? authorizeAssistantWorkspace(req, lobby.name)
        : authorizeOnboardingChat(req, lobby.name),
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

/**
 * Renders `/c/{id}` — the shareable Lite check page — with the same
 * bearer-capability headers as `/r/` plus server-injected OG tags.
 *
 * The OG tags are injected here with HTMLRewriter rather than emitted by a
 * route loader, because a `/c/$id` loader has no server-safe way to reach the
 * snapshot: the route file is client-bundled (so it cannot import
 * `cloudflare:workers` to read R2), every `createServerFn` passes the global
 * auth middleware (which requires a session in every AUTH_MODE — the reason
 * all free-check endpoints are raw Worker routes), and a Worker cannot
 * subrequest its own custom domain to call the public read endpoint during
 * SSR. Injection reads the snapshot once, directly from R2, and appends the
 * tags into the SSR'd `<head>`; a missing/corrupt snapshot skips injection and
 * the shell renders its own error state.
 */
async function fetchSharedCheckPage(request: Request): Promise<Response> {
  const response = await appFetch(request);
  const headers = new Headers(response.headers);
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Robots-Tag", "noindex");
  const wrapped = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });

  // Everything after the prefix is the candidate id; buildCheckPageMetaTags
  // re-guards it against the UUID shape before touching R2.
  const checkId = new URL(request.url).pathname.slice(
    FREE_SEO_CHECK_CHECK_ROUTE_PREFIX.length,
  );

  let tags;
  try {
    tags = await buildCheckPageMetaTags(checkId, publicUrl);
  } catch (error) {
    // The card is decoration on top of a working page — never let a transient
    // R2 failure take the page down with it.
    console.error("free-seo-check: share OG injection failed", error);
    return wrapped;
  }
  if (!tags || !headers.get("content-type")?.includes("text/html")) {
    return wrapped;
  }

  const metaHtml = tags
    .map(
      (tag) =>
        `<meta ${tag.attr}="${escapeHtml(tag.key)}" content="${escapeHtml(tag.content)}">`,
    )
    .join("");
  return new HTMLRewriter()
    .on("head", {
      element(element) {
        element.append(metaHtml, { html: true });
      },
    })
    .transform(wrapped);
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

  if (pathname === FREE_SEO_CHECK_CONFIG_PATH) {
    return handleFreeSeoCheckPublicConfigRequest(publicRequest, env);
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

  if (pathname === FREE_SEO_CHECK_CHECK_PATH) {
    return handleCheckReadRequest(publicRequest);
  }

  if (pathname === FREE_SEO_CHECK_SITE_SCREENSHOT_PATH) {
    return handleSiteScreenshotRequest(publicRequest);
  }

  // Read-only companion to the capture route: serves the stored filmstrip
  // bundle or 404s, and never renders — see handleSiteFilmstripRequest.
  if (pathname === FREE_SEO_CHECK_SITE_FILMSTRIP_PATH) {
    return handleSiteFilmstripRequest(publicRequest);
  }

  // The shareable report page needs no session in any AUTH_MODE, so it renders
  // through appFetch directly here rather than falling through the auth
  // branches below — that also makes its headers deterministic per mode.
  if (pathname.startsWith(FREE_SEO_CHECK_REPORT_ROUTE_PREFIX)) {
    return fetchSharedReportPage(request);
  }

  if (pathname.startsWith(FREE_SEO_CHECK_CHECK_ROUTE_PREFIX)) {
    return fetchSharedCheckPage(request);
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
export { AssistantWorkspaceAgent } from "./server/features/assistant-workspace/AssistantWorkspaceAgent";
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
      // Two independent daily sweeps share this schedule. Each is caught on its
      // own: a failure in one must not skip the other, since both delete data
      // past its retention deadline.
      try {
        await sweepFreeCheckRetention();
      } catch (error) {
        console.error("[cron] free-check retention sweep failed", error);
      }
      try {
        await sweepAuditRetention();
      } catch (error) {
        console.error("[cron] audit retention sweep failed", error);
      }
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
        // Advance nextCheckAt so a config never stays "due forever" — used on
        // every skip path AND before starting a run (retry-storm guard).
        const interval = isScheduledRankTrackingInterval(
          config.scheduleInterval,
        )
          ? config.scheduleInterval
          : null;
        const advanceSchedule = () =>
          interval
            ? RankTrackingRepository.updateConfig(config.id, config.projectId, {
                nextCheckAt: computeNextCheckAt(interval, config.nextCheckAt),
              })
            : Promise.resolve();

        // Access gate: allowlisted (founder + invited) or a paid plan. With
        // billing deferred this degrades to a clean SKIP, never a failed run.
        if (isHosted && !(await orgMayUsePaidFeatures(config.organizationId))) {
          console.log(
            `[cron] Skipping config ${config.id} (${config.domain}) — org ${config.organizationId} has no core access`,
          );
          await advanceSchedule();
          continue;
        }

        // Key gate: a scheduled run with no DataForSEO key would start the
        // workflow then fail at the credential seam (DATAFORSEO_KEY_MISSING).
        // Skip before spending a run so scheduled runs never show `failed` just
        // because the org hasn't connected a key.
        const credentials = await resolveDataforseoCredentials(
          config.organizationId,
        );
        if (
          (await resolveDataforseoCredentialAccess(credentials)) ===
          "unavailable"
        ) {
          console.log(
            `[cron] Skipping config ${config.id} (${config.domain}) — no DataForSEO key for org ${config.organizationId}`,
          );
          await advanceSchedule();
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
          await advanceSchedule();
          continue;
        }

        // Advance nextCheckAt immediately to prevent retry storms if the run fails
        await advanceSchedule();

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
