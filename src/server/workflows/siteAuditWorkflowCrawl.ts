import type { WorkflowSleepDuration } from "cloudflare:workers";
import type { RobotsResult } from "@/server/lib/audit/discovery";
import type { StepPageResult } from "@/server/lib/audit/types";
import { isSameOrigin, normalizeUrl } from "@/server/lib/audit/url-utils";
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import { AuditProgressKV } from "@/server/lib/audit/progress-kv";
import { crawlPage } from "@/server/workflows/site-audit-workflow-helpers";
import { classifyPageStatus } from "@/shared/http-status";

const CRAWL_CONCURRENCY = 25;

/**
 * Politeness. Measured against a real Cloudflare-fronted site: 25 requests at a
 * time is fine for two batches, then the zone's rate limit trips and returns 429
 * for *every* request in the window — 100 of 100 in a probe — before recovering a
 * few seconds later. The old loop kept firing at full rate straight through that
 * window and recorded each refusal as one of the site's pages, which is how one
 * audit reported 1,894 broken pages on a healthy site.
 *
 * So the rate is adaptive rather than a lower fixed number: halve on a throttled
 * batch, hibernate, and climb back once the site is answering again. A fixed low
 * concurrency would slow every well-provisioned site down to protect the few.
 */
const MIN_CRAWL_CONCURRENCY = 3;
const THROTTLE_BACKOFF_BASE_SECONDS = 5;
const THROTTLE_BACKOFF_MAX_SECONDS = 60;
const CLEAN_BATCHES_BEFORE_SPEEDUP = 3;

/**
 * A throttled URL goes back on the queue instead of being recorded, because a
 * 429 is not a fact about the page. After this many refusals it is recorded as
 * throttled: the crawl has to terminate, and a page we could not read is worth
 * reporting as exactly that rather than dropping silently.
 */
const MAX_THROTTLE_ATTEMPTS = 3;

/**
 * The slice of `WorkflowStep` this phase uses — lets tests pass a plain fake,
 * the same way `deep-seo-check-workflow.ts` does.
 */
interface CrawlStep {
  do<T>(name: string, callback: () => Promise<T> | T): Promise<T>;
  sleep(name: string, duration: WorkflowSleepDuration): Promise<void>;
}

/**
 * Why a candidate link was not queued. `blocked` is the one worth counting: it
 * is a statement about the site ("this is closed to crawlers"), where the others
 * are statements about the crawl's own bookkeeping.
 */
function classifyCrawlLink(
  link: string,
  origin: string,
  robots: RobotsResult,
  visited: Set<string>,
  queued: Set<string>,
): "queue" | "blocked" | "skip" {
  if (!isSameOrigin(link, origin)) return "skip";
  if (!robots.isAllowed(link)) return "blocked";
  if (visited.has(link) || queued.has(link)) return "skip";
  return "queue";
}

/**
 * Separate refusals from pages.
 *
 * `retry` is the URLs worth asking for again; `pages` keeps the rest, including
 * refusals that ran out of attempts — those stay as throttled rows so the report
 * can say "we could not read this" instead of the crawl quietly shrinking.
 *
 * `retryAfterMs` is the longest wait any server in the batch asked for, or null
 * when none did (the usual case).
 */
function partitionThrottledBatch(
  crawledBatch: StepPageResult[],
  throttleAttempts: Map<string, number>,
): {
  pages: StepPageResult[];
  retry: string[];
  retryAfterMs: number | null;
  throttledCount: number;
} {
  const pages: StepPageResult[] = [];
  const retry: string[] = [];
  let retryAfterMs: number | null = null;
  let throttledCount = 0;

  for (const page of crawledBatch) {
    if (classifyPageStatus(page.statusCode) !== "throttled") {
      pages.push(page);
      continue;
    }

    throttledCount += 1;
    if (page.retryAfterMs != null) {
      retryAfterMs = Math.max(retryAfterMs ?? 0, page.retryAfterMs);
    }

    const attempts = (throttleAttempts.get(page.url) ?? 0) + 1;
    throttleAttempts.set(page.url, attempts);
    if (attempts < MAX_THROTTLE_ATTEMPTS) {
      retry.push(page.url);
    } else {
      pages.push(page);
    }
  }

  return { pages, retry, retryAfterMs, throttledCount };
}

/**
 * Exponential on how long the site has been refusing, because the common 429
 * carries no `Retry-After` at all. A header, when present, wins: the server knows
 * its own window better than our guess, and `parseRetryAfterMs` has already
 * clamped it to something sane.
 */
function throttleBackoffSeconds(
  consecutiveThrottledBatches: number,
  retryAfterMs: number | null,
): number {
  if (retryAfterMs != null) {
    return Math.max(1, Math.ceil(retryAfterMs / 1_000));
  }
  const seconds =
    THROTTLE_BACKOFF_BASE_SECONDS *
    2 ** Math.max(0, consecutiveThrottledBatches - 1);
  return Math.min(seconds, THROTTLE_BACKOFF_MAX_SECONDS);
}

type CrawlPhaseParams = {
  auditId: string;
  workflowInstanceId: string;
  origin: string;
  startUrl: string;
  maxPages: number;
  robots: RobotsResult;
  sitemapUrls: string[];
};

type CrawlPhaseResult = {
  pages: StepPageResult[];
  /**
   * Distinct same-origin URLs robots.txt refused, deduped across every place
   * they surfaced — one blocked page linked from forty others is one blocked
   * page, not forty. Rebuilt deterministically on replay because the matcher is
   * derived from a step-cached body (see `fetch-robots` in the phases file); if
   * robots were re-fetched mid-run this number would be meaningless.
   */
  blockedUrls: string[];
};

export async function runCrawlPhase(
  step: CrawlStep,
  params: CrawlPhaseParams,
): Promise<CrawlPhaseResult> {
  const {
    auditId,
    workflowInstanceId,
    origin,
    startUrl,
    maxPages,
    robots,
    sitemapUrls,
  } = params;
  const visited = new Set<string>();
  const queue: string[] = [];
  const queued = new Set<string>();
  const allPages: StepPageResult[] = [];
  const blocked = new Set<string>();

  seedCrawlQueue({
    startUrl,
    origin,
    robots,
    sitemapUrls,
    visited,
    queued,
    queue,
    blocked,
  });

  let crawlBatchIndex = 0;
  let concurrency = CRAWL_CONCURRENCY;
  let throttleWaits = 0;
  let consecutiveThrottledBatches = 0;
  let cleanBatches = 0;
  const throttleAttempts = new Map<string, number>();

  while (queue.length > 0 && allPages.length < maxPages) {
    const urlsToCrawl = selectNextCrawlBatch({
      queue,
      queued,
      visited,
      robots,
      remaining: maxPages - allPages.length,
      blocked,
      concurrency,
    });
    if (urlsToCrawl.length === 0) continue;

    crawlBatchIndex += 1;
    const crawledBatch = await runCrawlBatch(
      step,
      crawlBatchIndex,
      urlsToCrawl,
      origin,
    );

    // Split before anything counts the batch: a refused request is not a page,
    // and requeueing it must undo the `visited` mark `selectNextCrawlBatch` set
    // before the fetch, or the URL can never be tried again.
    const { pages, retry, retryAfterMs, throttledCount } =
      partitionThrottledBatch(crawledBatch, throttleAttempts);
    for (const url of retry) {
      visited.delete(url);
      queued.add(url);
      queue.unshift(url);
    }
    allPages.push(...pages);

    enqueueDiscoveredLinks({
      crawledBatch: pages,
      queue,
      queued,
      visited,
      origin,
      robots,
      blocked,
    });
    await persistCrawlProgress({
      step,
      crawlBatchIndex,
      auditId,
      workflowInstanceId,
      // The whole batch, refusals included: someone watching the live feed
      // should see the 429s. That feed is how this defect was found.
      crawledBatch,
      pagesCrawled: allPages.length,
      visitedCount: visited.size,
      queueLength: queue.length,
      maxPages,
    });

    // Counts refusals we gave up on too: a page recorded as throttled is still
    // the site telling us to slow down.
    if (throttledCount > 0) {
      consecutiveThrottledBatches += 1;
      cleanBatches = 0;
      concurrency = Math.max(
        MIN_CRAWL_CONCURRENCY,
        Math.floor(concurrency / 2),
      );
      throttleWaits += 1;
      await step.sleep(
        `throttle-backoff-${throttleWaits}`,
        `${throttleBackoffSeconds(consecutiveThrottledBatches, retryAfterMs)} seconds`,
      );
    } else {
      consecutiveThrottledBatches = 0;
      cleanBatches += 1;
      if (
        cleanBatches >= CLEAN_BATCHES_BEFORE_SPEEDUP &&
        concurrency < CRAWL_CONCURRENCY
      ) {
        concurrency = Math.min(CRAWL_CONCURRENCY, concurrency * 2);
        cleanBatches = 0;
      }
    }

    // CPU is charged per Workflow invocation, and a large crawl accumulates
    // parse cost across many batches within one, so hibernate briefly every few
    // batches: the resume is a fresh invocation with a fresh CPU budget, and
    // every completed crawl-batch step replays from cache (no page is
    // re-fetched or re-parsed).
    //
    // The budget this cadence has to fit inside is the Worker's per-invocation
    // CPU limit — 30s by default on Workers Paid, since `limits.cpu_ms` is
    // deliberately unset (see wrangler.jsonc for why). Five batches is 125
    // pages, so this branch has never run in production: the largest crawl to
    // date finished at 103 pages, inside a single invocation. Re-measure the
    // real per-page parse cost before trusting this cadence on a site large
    // enough to reach it.
    if (crawlBatchIndex % 5 === 0 && queue.length > 0) {
      await step.sleep(`cpu-budget-break-${crawlBatchIndex}`, "10 seconds");
    }
  }

  return { pages: allPages, blockedUrls: [...blocked] };
}

function seedCrawlQueue({
  startUrl,
  origin,
  robots,
  sitemapUrls,
  visited,
  queued,
  queue,
  blocked,
}: {
  startUrl: string;
  origin: string;
  robots: RobotsResult;
  sitemapUrls: string[];
  visited: Set<string>;
  queued: Set<string>;
  queue: string[];
  blocked: Set<string>;
}) {
  const normalizedStart = normalizeUrl(startUrl) ?? startUrl;
  if (isSameOrigin(normalizedStart, origin)) {
    if (robots.isAllowed(normalizedStart)) {
      queue.push(normalizedStart);
      queued.add(normalizedStart);
    } else {
      // The site's own start URL being disallowed is the most consequential
      // blocked page there is, so it counts like any other.
      blocked.add(normalizedStart);
    }
  }

  for (const sitemapUrl of sitemapUrls) {
    const normalized = normalizeUrl(sitemapUrl);
    if (!normalized) continue;
    const verdict = classifyCrawlLink(
      normalized,
      origin,
      robots,
      visited,
      queued,
    );
    if (verdict === "blocked") {
      // A URL the site itself advertises in its sitemap and then disallows in
      // robots.txt is a contradiction worth surfacing, not a silent skip.
      blocked.add(normalized);
      continue;
    }
    if (verdict !== "queue") continue;
    queue.push(normalized);
    queued.add(normalized);
  }
}

function selectNextCrawlBatch(params: {
  queue: string[];
  queued: Set<string>;
  visited: Set<string>;
  robots: RobotsResult;
  remaining: number;
  blocked: Set<string>;
  /** The current adaptive rate — see `MIN_CRAWL_CONCURRENCY`. */
  concurrency: number;
}) {
  const { queue, queued, visited, robots, remaining, blocked, concurrency } =
    params;
  const batchSize = Math.min(concurrency, remaining);
  const urlsToCrawl: string[] = [];

  while (queue.length > 0 && urlsToCrawl.length < batchSize) {
    const url = queue.shift()!;
    queued.delete(url);
    if (visited.has(url)) continue;
    // Re-checked here as well as at queue time: a URL can be queued before its
    // robots verdict is known in a replay-rebuilt queue, and this is the last
    // gate before a fetch.
    if (!robots.isAllowed(url)) {
      blocked.add(url);
      continue;
    }
    visited.add(url);
    urlsToCrawl.push(url);
  }

  return urlsToCrawl;
}

async function runCrawlBatch(
  step: CrawlStep,
  crawlBatchIndex: number,
  urlsToCrawl: string[],
  origin: string,
): Promise<StepPageResult[]> {
  return step.do(`crawl-batch-${crawlBatchIndex}`, async () => {
    const settled = await Promise.allSettled(
      urlsToCrawl.map((url) => crawlPage(url, origin)),
    );
    return settled.flatMap((result) => {
      if (result.status === "fulfilled" && result.value) {
        return [result.value];
      }
      return [];
    });
  });
}

function enqueueDiscoveredLinks(params: {
  crawledBatch: StepPageResult[];
  queue: string[];
  queued: Set<string>;
  visited: Set<string>;
  origin: string;
  robots: RobotsResult;
  blocked: Set<string>;
}) {
  const { crawledBatch, queue, queued, visited, origin, robots, blocked } =
    params;
  for (const pageResult of crawledBatch) {
    for (const link of pageResult.internalLinks) {
      const verdict = classifyCrawlLink(link, origin, robots, visited, queued);
      if (verdict === "blocked") {
        // A Set, so a page linked from forty others counts once. The old
        // `shouldQueueCrawlLink` collapsed this case into "not queued" and the
        // number was unrecoverable.
        blocked.add(link);
        continue;
      }
      if (verdict !== "queue") continue;
      queue.push(link);
      queued.add(link);
    }
  }
}

async function persistCrawlProgress(params: {
  step: CrawlStep;
  crawlBatchIndex: number;
  auditId: string;
  workflowInstanceId: string;
  crawledBatch: StepPageResult[];
  pagesCrawled: number;
  visitedCount: number;
  queueLength: number;
  maxPages: number;
}) {
  const {
    step,
    crawlBatchIndex,
    auditId,
    workflowInstanceId,
    crawledBatch,
    pagesCrawled,
    visitedCount,
    queueLength,
    maxPages,
  } = params;
  await step.do(`kv-progress-batch-${crawlBatchIndex}`, async () => {
    await AuditProgressKV.pushCrawledUrls(
      auditId,
      crawledBatch.map((pageResult) => ({
        url: pageResult.url,
        statusCode: pageResult.statusCode,
        title: pageResult.title,
        crawledAt: Date.now(),
      })),
      // Queue depth is what separates "slow site" from "stalled crawl" for
      // someone watching a progress bar that has not moved.
      { visited: visitedCount, queued: queueLength },
    );
  });

  await step.do(`progress-batch-${crawlBatchIndex}`, async () => {
    await AuditRepository.updateAuditProgress(auditId, workflowInstanceId, {
      pagesCrawled,
      pagesTotal: Math.min(visitedCount + queueLength, maxPages),
    });
  });
}
