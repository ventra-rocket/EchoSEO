import type { WorkflowStep } from "cloudflare:workers";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import {
  discoverUrls,
  fetchRobotsTxtBody,
  parseRobotsTxt,
} from "@/server/lib/audit/discovery";
import {
  fetchAndStoreLighthouseResult,
  selectLighthouseSample,
} from "@/server/lib/audit/lighthouse";
import { getOrigin } from "@/server/lib/audit/url-utils";
import { buildLinkEdges } from "@/server/lib/audit/link-graph";
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import { AuditTargetRepository } from "@/server/features/audit/repositories/AuditTargetRepository";
import { AuditIssueService } from "@/server/features/audit/services/AuditIssueService";
import { notifyReportAgentOfCompletedAudit } from "@/server/features/reports/audit-completion-hook";
import { AuditProgressKV } from "@/server/lib/audit/progress-kv";
import type {
  AuditConfig,
  LighthouseResult,
  StepPageResult,
} from "@/server/lib/audit/types";
import { captureServerEvent } from "@/server/lib/posthog";
import { classifyPageStatus } from "@/shared/http-status";
import { runCrawlPhase } from "@/server/workflows/siteAuditWorkflowCrawl";

const LIGHTHOUSE_URL_BATCH_SIZE = 10;

function countLighthouseBatchResults(results: LighthouseResult[]): {
  completed: number;
  failed: number;
} {
  let completed = 0;
  let failed = 0;
  for (const result of results) {
    if (result.errorMessage) {
      failed += 1;
      continue;
    }
    completed += 1;
  }
  return { completed, failed };
}

type AuditPhasesParams = {
  auditId: string;
  workflowInstanceId: string;
  billingCustomer: BillingCustomerContext;
  projectId: string;
  startUrl: string;
  config: AuditConfig;
};

export async function runAuditPhases(
  step: WorkflowStep,
  params: AuditPhasesParams,
) {
  const {
    auditId,
    workflowInstanceId,
    billingCustomer,
    projectId,
    startUrl,
    config,
  } = params;
  const origin = getOrigin(startUrl);
  const maxPages = config.maxPages;

  const discovery = await runDiscoveryPhase(
    step,
    auditId,
    workflowInstanceId,
    origin,
    maxPages,
  );
  // Read exactly once per audit and never re-read on replay. A Workflow retry
  // that re-fetched robots.txt could get a different file and flip allow/deny
  // half way through a crawl, which would silently change which pages the audit
  // is even about — and make a "blocked by robots" counter a lie. Only the BODY
  // goes through the step, because `RobotsResult` carries a matcher closure that
  // a step return cannot serialize; the matcher is rebuilt from the cached text.
  const robots = parseRobotsTxt(
    await step.do("fetch-robots", () => fetchRobotsTxtBody(origin)),
  );
  const crawl = await runCrawlPhase(step, {
    auditId,
    workflowInstanceId,
    origin,
    startUrl,
    maxPages,
    robots,
    sitemapUrls: discovery.sitemapUrls,
  });
  const allPages = crawl.pages;
  const lighthouseResults = await runLighthousePhase(step, {
    auditId,
    workflowInstanceId,
    billingCustomer,
    projectId,
    startUrl,
    config,
    allPages,
  });
  await finalizeAudit({
    step,
    auditId,
    workflowInstanceId,
    billingCustomer,
    projectId,
    origin,
    config,
    allPages,
    blockedUrlCount: crawl.blockedUrls.length,
    lighthouseResults,
    sitemapUrls: discovery.sitemapUrls,
  });

  await materializeIssues(step, auditId, projectId, billingCustomer);

  // Runs after materialization so the agent compares issue sets that exist.
  // Its own step: the notification is best-effort inside, but wrapping it keeps
  // a replay of the phases from re-alerting on a crawl already announced.
  await step.do("notify-report-subscribers", async () => {
    await notifyReportAgentOfCompletedAudit(auditId);
  });
}

/**
 * Turn the sealed snapshot into issues. Deliberately its own step AFTER
 * finalize: the finalize body is the replay-sensitive one, and issue
 * materialization must never be the reason a completed crawl is marked failed.
 * A failure here leaves the snapshot intact for an explicit reprocess.
 */
async function materializeIssues(
  step: WorkflowStep,
  auditId: string,
  projectId: string,
  billingCustomer: BillingCustomerContext,
) {
  await step.do("materialize-issues", async () => {
    try {
      await AuditIssueService.materializeForAudit({ auditId, projectId });
    } catch (error) {
      console.error(
        `Failed to materialize issues for audit ${auditId}:`,
        error,
      );
      // Swallowing keeps a completed crawl from being marked failed, but a
      // silent swallow would make a broken materializer look like a clean site,
      // so the failure is reported. The snapshot's issuesMaterializedAt stays
      // null, which readers must surface as "not materialized".
      await captureServerEvent({
        distinctId: billingCustomer.userId,
        event: "site_audit:issues_materialize_failed",
        organizationId: billingCustomer.organizationId,
        properties: { project_id: projectId, audit_id: auditId },
      });
    }
  });
}

async function runDiscoveryPhase(
  step: WorkflowStep,
  auditId: string,
  workflowInstanceId: string,
  origin: string,
  maxPages: number,
) {
  return step.do("discover-urls", async () => {
    const result = await discoverUrls(origin, maxPages);
    await AuditRepository.updateAuditProgress(auditId, workflowInstanceId, {
      pagesTotal: Math.min(result.urls.length + 1, maxPages),
      currentPhase: "crawling",
    });
    return { sitemapUrls: result.urls };
  });
}

type LighthousePhaseParams = {
  auditId: string;
  workflowInstanceId: string;
  billingCustomer: BillingCustomerContext;
  projectId: string;
  startUrl: string;
  config: AuditConfig;
  allPages: StepPageResult[];
};

async function runLighthousePhase(
  step: WorkflowStep,
  params: LighthousePhaseParams,
): Promise<LighthouseResult[]> {
  const {
    auditId,
    workflowInstanceId,
    billingCustomer,
    projectId,
    startUrl,
    config,
    allPages,
  } = params;
  if (config.lighthouseStrategy === "none") return [];

  const lighthouseWork = await selectLighthousePages({
    step,
    auditId,
    workflowInstanceId,
    allPages,
    startUrl,
    strategy: config.lighthouseStrategy,
  });

  const lighthouseResults: LighthouseResult[] = [];
  let completedChecks = 0;
  let failedChecks = 0;
  let lighthouseBatchIndex = 0;

  for (let i = 0; i < lighthouseWork.length; i += LIGHTHOUSE_URL_BATCH_SIZE) {
    const batch = lighthouseWork.slice(i, i + LIGHTHOUSE_URL_BATCH_SIZE);
    lighthouseBatchIndex += 1;
    const lighthouseBatchResults = await runLighthouseBatch({
      step,
      lighthouseBatchIndex,
      batch,
      billingCustomer,
      projectId,
      auditId,
    });

    lighthouseResults.push(...lighthouseBatchResults);
    const counts = countLighthouseBatchResults(lighthouseBatchResults);
    failedChecks += counts.failed;
    completedChecks += counts.completed;
    await step.do(
      `lighthouse-progress-batch-${lighthouseBatchIndex}`,
      async () => {
        await AuditRepository.updateAuditProgress(auditId, workflowInstanceId, {
          lighthouseCompleted: completedChecks,
          lighthouseFailed: failedChecks,
        });
      },
    );
  }

  return lighthouseResults;
}

async function selectLighthousePages(params: {
  step: WorkflowStep;
  auditId: string;
  workflowInstanceId: string;
  allPages: StepPageResult[];
  startUrl: string;
  strategy: AuditConfig["lighthouseStrategy"];
}) {
  const { step, auditId, workflowInstanceId, allPages, startUrl, strategy } =
    params;
  return step.do("select-lighthouse-sample", async () => {
    const sample = selectLighthouseSample(allPages, startUrl, strategy);
    const selectedUrls = new Set(sample);

    await AuditRepository.updateAuditProgress(auditId, workflowInstanceId, {
      currentPhase: "lighthouse",
      lighthouseTotal: sample.length * 2,
      lighthouseCompleted: 0,
      lighthouseFailed: 0,
    });
    return allPages.flatMap((page) =>
      selectedUrls.has(page.url) ? [{ url: page.url, pageId: page.id }] : [],
    );
  });
}

async function runLighthouseBatch(params: {
  step: WorkflowStep;
  lighthouseBatchIndex: number;
  batch: Array<{ url: string; pageId: string }>;
  billingCustomer: BillingCustomerContext;
  projectId: string;
  auditId: string;
}) {
  const {
    step,
    lighthouseBatchIndex,
    batch,
    billingCustomer,
    projectId,
    auditId,
  } = params;
  return step.do(`lighthouse-batch-${lighthouseBatchIndex}`, async () => {
    const perUrlResults = await Promise.all(
      batch.map(async ({ url, pageId }) => {
        const [mobileResult, desktopResult] = await Promise.all([
          fetchAndStoreLighthouseResult({
            url,
            pageId,
            strategy: "mobile",
            billingCustomer,
            projectId,
            auditId,
          }),
          fetchAndStoreLighthouseResult({
            url,
            pageId,
            strategy: "desktop",
            billingCustomer,
            projectId,
            auditId,
          }),
        ]);
        return [mobileResult, desktopResult];
      }),
    );

    return perUrlResults.flat();
  });
}

/**
 * The four numbers a crawl summary is judged on.
 *
 * `blocked` and `noindex` are kept apart on purpose. Ahrefs shows one "Blocked"
 * box, but the two have different owners and different fixes: robots.txt is one
 * file the site controls, while `noindex` is per-page markup. Collapsing them
 * would tell a reader to go look in the wrong place. A card is free to show the
 * sum.
 */
type CrawlSummary = {
  redirected: number;
  broken: number;
  blocked: number;
  noindex: number;
};

function summarizeCrawl(
  allPages: StepPageResult[],
  blockedUrlCount: number,
): CrawlSummary {
  let redirected = 0;
  let broken = 0;
  let noindex = 0;
  for (const page of allPages) {
    if (page.redirectUrl !== null) redirected += 1;
    // Shared with the results table's status filter, so the summary and the
    // table it links to can never disagree about what "broken" means.
    if (classifyPageStatus(page.statusCode) === "error") broken += 1;
    // Only a page that was actually read can be said to carry a noindex; a
    // failed fetch has `isIndexable: false` as a placeholder, not a finding.
    if (page.isHtml && !page.isIndexable) noindex += 1;
  }
  return { redirected, broken, blocked: blockedUrlCount, noindex };
}

async function finalizeAudit(args: {
  step: WorkflowStep;
  auditId: string;
  workflowInstanceId: string;
  billingCustomer: BillingCustomerContext;
  projectId: string;
  origin: string;
  config: AuditConfig;
  allPages: StepPageResult[];
  blockedUrlCount: number;
  lighthouseResults: LighthouseResult[];
  sitemapUrls: string[];
}) {
  const {
    step,
    auditId,
    workflowInstanceId,
    billingCustomer,
    projectId,
    origin,
    config,
    allPages,
    blockedUrlCount,
    lighthouseResults,
    sitemapUrls,
  } = args;
  const summary = summarizeCrawl(allPages, blockedUrlCount);

  await step.do("finalize", async () => {
    await AuditRepository.updateAuditProgress(auditId, workflowInstanceId, {
      currentPhase: "finalizing",
    });
    const linkEdges = buildLinkEdges(allPages);
    await AuditRepository.batchWriteResults(
      auditId,
      allPages,
      lighthouseResults,
      new Set(sitemapUrls),
    );
    await AuditRepository.batchWriteLinkEdges(auditId, linkEdges);
    await AuditRepository.completeAudit(auditId, workflowInstanceId, {
      pagesCrawled: allPages.length,
      pagesTotal: allPages.length,
    });
    await sealAuditSnapshot({
      auditId,
      projectId,
      origin,
      pagesCrawled: allPages.length,
      edgeCount: linkEdges.length,
      lighthouseCount: lighthouseResults.length,
      summary,
    });
    await captureServerEvent({
      distinctId: billingCustomer.userId,
      event: "site_audit:complete",
      organizationId: billingCustomer.organizationId,
      properties: {
        project_id: projectId,
        status: "completed",
        pages_crawled: allPages.length,
        pages_total: allPages.length,
        run_lighthouse: config.lighthouseStrategy !== "none",
      },
    });
    await AuditProgressKV.clear(auditId);
  });
}

/**
 * Seal the completed crawl as an immutable snapshot. The target is looked up by
 * (project, origin); it is created when the audit is launched, so a missing row
 * means the project is being torn down and there is no baseline worth keeping.
 */
async function sealAuditSnapshot(input: {
  auditId: string;
  projectId: string;
  origin: string;
  pagesCrawled: number;
  edgeCount: number;
  lighthouseCount: number;
  summary: CrawlSummary;
}) {
  const target = await AuditTargetRepository.getByProjectAndOrigin(
    input.projectId,
    input.origin,
  );

  if (!target) {
    console.warn(
      `No audit target for ${input.auditId} (${input.origin}); snapshot not sealed`,
    );
    return;
  }

  await AuditRepository.sealSnapshot({
    auditId: input.auditId,
    projectId: input.projectId,
    targetId: target.id,
    pagesCrawled: input.pagesCrawled,
    edgeCount: input.edgeCount,
    lighthouseCount: input.lighthouseCount,
    pagesRedirected: input.summary.redirected,
    pagesBroken: input.summary.broken,
    pagesBlocked: input.summary.blocked,
    pagesNoindex: input.summary.noindex,
  });
}
