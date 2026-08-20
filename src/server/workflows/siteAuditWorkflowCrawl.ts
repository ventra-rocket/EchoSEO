import type { WorkflowSleepDuration } from "cloudflare:workers";
import type { RobotsResult } from "@/server/lib/audit/discovery";
import type { StepPageResult } from "@/server/lib/audit/types";
import { isSameOrigin, normalizeUrl } from "@/server/lib/audit/url-utils";
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import { AuditProgressKV } from "@/server/lib/audit/progress-kv";
import { crawlPage } from "@/server/workflows/site-audit-workflow-helpers";
import {
  congestionShare,
  partitionRefusedBatch,
  throttleBackoffSeconds,
} from "@/server/lib/audit/crawl-retry";
import {
  afterCleanBatch,
  afterCongestedBatch,
  dispatchIntervalMs,
  initialCrawlRate,
  type CrawlRateSeed,
} from "@/server/lib/audit/crawl-rate";
import {
  type CrawlPacingSummary,
  foldBatchPacing,
  initialPacing,
  pacingSummary,
} from "@/server/lib/audit/crawl-pacing";

/**
 * How many URLs one crawl-batch step schedules. Not a concurrency: the batch is
 * a scheduling window whose requests are spaced by the current offered rate, so
 * the number in flight is whatever that rate and the site's latency imply.
 *
 * It stays at 25 because the step count is a hard constraint — a Workflow
 * instance is capped at 1,024 steps and a 5,000-page crawl already spends ~645
 * of them. Smaller batches would pace just as well and run out of steps.
 */
const CRAWL_BATCH_SIZE = 25;

/**
 * How much of a batch has to be refused before the crawl stops as well as slows.
 *
 * Hibernating exists to let a limiter's window drain, which only matters when we
 * filled it. A single refusal in twenty-five is answered by the rate cut alone —
 * pausing for it is 1.6 minutes of idling on a 5,000-page crawl to recover from
 * something the pacing already corrected. A server that sent `Retry-After` is
 * obeyed whatever the share: it named a number.
 */
const BACKOFF_MIN_SHARE = 0.2;
/**
 * Pages between CPU-budget hibernations, derived from the measured cost rather
 * than guessed at. `analyzeHtml` takes 6.0 ms on a real 118 KB product page (50
 * runs), so 500 pages is about 3 s of parse CPU against the 30 s per-invocation
 * budget — an order of magnitude of headroom for serialisation and everything
 * else in a batch.
 *
 * It was every 5 batches, which is 125 pages, or 0.75 s of parse: 40 sleeps of 10 s
 * on a 5,000-page crawl, 6.7 minutes of a 47-minute run spent deliberately idle to
 * protect a budget that was never close. Counted in pages, not batches, because a
 * batch can be cut short by the page cap or an emptying frontier.
 */
const PAGES_PER_CPU_BREAK = 500;

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

type CrawlPhaseParams = {
  auditId: string;
  workflowInstanceId: string;
  origin: string;
  startUrl: string;
  maxPages: number;
  robots: RobotsResult;
  sitemapUrls: string[];
  /**
   * What the last finished crawl of this target measured about the site's rate
   * limit, or null when it has never finished one. Read once, outside the loop,
   * so the crawl opens at a measured rate instead of rediscovering it. See #91.
   */
  seed: CrawlRateSeed | null;
  /**
   * How the crawl spaces requests inside a batch. Injected so a test can read
   * the pacing it asked for instead of waiting through it; production passes
   * nothing and gets a real timer.
   *
   * Not `step.sleep`: a Workflow sleep is a durable checkpoint, and one per
   * request would spend the instance's step budget on politeness.
   */
  waitMs?: (ms: number) => Promise<void>;
};

export type CrawlPhaseResult = {
  pages: StepPageResult[];
  /**
   * Distinct same-origin URLs robots.txt refused, deduped across every place
   * they surfaced — one blocked page linked from forty others is one blocked
   * page, not forty. Rebuilt deterministically on replay because the matcher is
   * derived from a step-cached body (see `fetch-robots` in the phases file); if
   * robots were re-fetched mid-run this number would be meaningless.
   */
  blockedUrls: string[];
  /**
   * What the site's rate limit cost this crawl, for the finished-audit record.
   * The same numbers rode the live KV feed while it ran; this is the copy that
   * survives after the progress key is cleared. See issue #88.
   */
  pacing: CrawlPacingSummary | null;
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
    seed,
    waitMs = realWaitMs,
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
  let rate = initialCrawlRate(robots.crawlDelaySeconds, seed);
  let throttleWaits = 0;
  let consecutiveThrottledBatches = 0;
  let pagesAtLastCpuBreak = 0;
  const retryAttempts = new Map<string, number>();
  // Pacing evidence. Since a partially refused batch no longer hibernates, the
  // Workflow trace no longer counts refusals — a crawl settling at half a site's
  // tolerance looks exactly like one settling on its ceiling. See issue #88.
  let pacing = initialPacing(rate.rate);

  while (queue.length > 0 && allPages.length < maxPages) {
    const urlsToCrawl = selectNextCrawlBatch({
      queue,
      queued,
      visited,
      robots,
      remaining: maxPages - allPages.length,
      blocked,
    });
    if (urlsToCrawl.length === 0) continue;

    crawlBatchIndex += 1;
    const crawledBatch = await runCrawlBatch({
      step,
      crawlBatchIndex,
      urlsToCrawl,
      origin,
      rate: rate.rate,
      waitMs,
    });

    // Split before anything counts the batch: a refused request is not a page,
    // and requeueing it must undo the `visited` mark `selectNextCrawlBatch` set
    // before the fetch, or the URL can never be tried again.
    const { pages, retry, retryAfterMs, throttled, unanswered } =
      partitionRefusedBatch(crawledBatch, retryAttempts);
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
    // Fold this batch into the pacing counters before the write below, so the
    // live feed and the backoff both see the current batch. A refused row
    // counts even when we gave up on it: it is still the site saying no. How
    // much of the batch was refused is the whole signal — one 429 in
    // twenty-five is a site that occasionally says no, not one we are hammering.
    const refusedShare = congestionShare({
      throttled,
      unanswered,
      batchSize: crawledBatch.length,
    });
    let shouldBackoff = false;
    if (refusedShare > 0) {
      consecutiveThrottledBatches += 1;
      rate = afterCongestedBatch(rate, refusedShare);
      shouldBackoff = refusedShare >= BACKOFF_MIN_SHARE || retryAfterMs != null;
    } else {
      consecutiveThrottledBatches = 0;
      rate = afterCleanBatch(rate);
    }
    pacing = foldBatchPacing(pacing, {
      refusedShare,
      batchSize: crawledBatch.length,
      rate: rate.rate,
    });

    await persistCrawlProgress({
      step,
      crawlBatchIndex,
      auditId,
      workflowInstanceId,
      // The whole batch, refusals included: someone watching the live feed
      // should see them. That feed is how this whole class of defect was found.
      crawledBatch,
      pagesCrawled: allPages.length,
      visitedCount: visited.size,
      queueLength: queue.length,
      maxPages,
      // The pacing the finished audit will keep in D1, shown live while it runs.
      offeredRate: rate.rate,
      refusedRequests: pacing.refusedRequests,
      congestedBatches: pacing.congestedBatches,
    });

    // A partial refusal only slows the rate (above); a batch refused past the
    // floor, or an explicit Retry-After, is the one worth hibernating over.
    if (shouldBackoff) {
      throttleWaits += 1;
      await step.sleep(
        `throttle-backoff-${throttleWaits}`,
        `${throttleBackoffSeconds(consecutiveThrottledBatches, retryAfterMs)} seconds`,
      );
    }

    // CPU is charged per Workflow invocation, and a large crawl accumulates parse
    // cost across many batches within one, so hibernate periodically: the resume
    // is a fresh invocation with a fresh CPU budget, and every completed
    // crawl-batch step replays from cache (no page is re-fetched or re-parsed).
    //
    // The budget this cadence fits inside is the Worker's per-invocation CPU limit
    // — 30s by default on Workers Paid, since `limits.cpu_ms` is deliberately
    // unset (see wrangler.jsonc for why). See `PAGES_PER_CPU_BREAK` for the
    // measurement behind the number.
    if (
      allPages.length - pagesAtLastCpuBreak >= PAGES_PER_CPU_BREAK &&
      queue.length > 0
    ) {
      pagesAtLastCpuBreak = allPages.length;
      await step.sleep(`cpu-budget-break-${crawlBatchIndex}`, "10 seconds");
    }
  }

  // One line per crawl, in the log the workflow already writes to: the rate this
  // site was measured to allow, and what it cost to find out.
  console.info(
    `crawl-pacing ${JSON.stringify({
      auditId,
      pages: allPages.length,
      batches: crawlBatchIndex,
      settledRate: Number(rate.rate.toFixed(2)),
      lowestRate: Number(pacing.lowestRate.toFixed(2)),
      highestRate: Number(pacing.highestRate.toFixed(2)),
      congestedBatches: pacing.congestedBatches,
      refusedRequests: pacing.refusedRequests,
      hibernations: throttleWaits,
    })}`,
  );

  return {
    pages: allPages,
    blockedUrls: [...blocked],
    // A run that dispatched no batch measured nothing, and `rate` is still
    // exactly the seed it opened with. Recording that as this crawl's settled
    // rate would launder a seed forward as if the site had answered for it.
    pacing: crawlBatchIndex > 0 ? pacingSummary(pacing, rate.rate) : null,
  };
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
}) {
  const { queue, queued, visited, robots, remaining, blocked } = params;
  const batchSize = Math.min(CRAWL_BATCH_SIZE, remaining);
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

/**
 * One batch: `CRAWL_BATCH_SIZE` requests dispatched at the current offered rate.
 *
 * The spacing is the whole control law made real. Firing the batch at once — what
 * this used to do — offers an unbounded instantaneous rate however small the
 * batch is, and a burst is exactly what a per-second limiter refuses: a measured
 * crawl averaged 1.88 req/s against a site that gives 3-4 and still collected 36
 * refusals, because the average was made of bursts and idle waits.
 *
 * Each request waits its own offset from the start of the batch rather than
 * chaining sleeps, so a slow response cannot push every later request back and
 * turn the crawl serial.
 */
async function runCrawlBatch(params: {
  step: CrawlStep;
  crawlBatchIndex: number;
  urlsToCrawl: string[];
  origin: string;
  /** Offered requests per second for this batch. */
  rate: number;
  waitMs: (ms: number) => Promise<void>;
}): Promise<StepPageResult[]> {
  const { step, crawlBatchIndex, urlsToCrawl, origin, rate, waitMs } = params;
  const intervalMs = dispatchIntervalMs(rate);
  return step.do(`crawl-batch-${crawlBatchIndex}`, async () => {
    const settled = await Promise.allSettled(
      urlsToCrawl.map(async (url, index) => {
        if (index > 0) await waitMs(index * intervalMs);
        return crawlPage(url, origin);
      }),
    );
    return settled.flatMap((result) => {
      if (result.status === "fulfilled" && result.value) {
        return [result.value];
      }
      return [];
    });
  });
}

/**
 * Real wall-clock spacing. `step.sleep` would spend a durable step per request,
 * and the project's `lib` target is ES2023, so no `Promise.withResolvers` — the
 * same executor form the other delays in this codebase use.
 */
function realWaitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  offeredRate: number;
  refusedRequests: number;
  congestedBatches: number;
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
    offeredRate,
    refusedRequests,
    congestedBatches,
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
      {
        visited: visitedCount,
        queued: queueLength,
        offeredRate,
        refusedRequests,
        congestedBatches,
      },
    );
  });

  await step.do(`progress-batch-${crawlBatchIndex}`, async () => {
    await AuditRepository.updateAuditProgress(auditId, workflowInstanceId, {
      pagesCrawled,
      pagesTotal: Math.min(visitedCount + queueLength, maxPages),
    });
  });
}
