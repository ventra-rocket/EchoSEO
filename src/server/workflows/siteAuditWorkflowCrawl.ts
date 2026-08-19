import type { WorkflowSleepDuration } from "cloudflare:workers";
import type { RobotsResult } from "@/server/lib/audit/discovery";
import type { StepPageResult } from "@/server/lib/audit/types";
import { isSameOrigin, normalizeUrl } from "@/server/lib/audit/url-utils";
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import { AuditProgressKV } from "@/server/lib/audit/progress-kv";
import { crawlPage } from "@/server/workflows/site-audit-workflow-helpers";
import {
  classifyRefusal,
  congestionShare,
} from "@/server/lib/audit/crawl-retry";
import {
  afterCleanBatch,
  afterCongestedBatch,
  dispatchIntervalMs,
  initialCrawlRate,
} from "@/server/lib/audit/crawl-rate";

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
 * How long to wait after the site refuses a batch, before the crawl resumes at
 * its reduced rate. Sized to the measured recovery window: in a probe of
 * `kello.ventrarocket.vn`, wave 3 was refused and wave 4 five seconds later was
 * clean. Escalation is per *consecutive* refused batch — a site still refusing
 * after a backoff needs longer than one that recovered.
 */
const THROTTLE_BACKOFF_BASE_SECONDS = 5;
const THROTTLE_BACKOFF_MAX_SECONDS = 60;

/**
 * How much of a batch has to be refused before the crawl stops as well as slows.
 *
 * Hibernating exists to let a limiter's window drain, which only matters when we
 * filled that window. A single refusal in twenty-five is answered by the rate cut
 * alone: on a measured 5,000-page crawl 19 batches were refused, 18 of them
 * partially, and every one bought a 5 s pause — 1.6 minutes of deliberate idling
 * to recover from something the pacing had already corrected. A server that sent
 * `Retry-After` is obeyed whatever the share: it named a number.
 */
const BACKOFF_MIN_SHARE = 0.2;

/**
 * A refused URL goes back on the queue instead of being recorded, because a
 * refusal is not a fact about the page. After this many attempts it is recorded
 * with the status it kept returning: the crawl has to terminate, and a URL that
 * failed every time is a much stronger claim than one that failed once.
 */
const MAX_RETRY_ATTEMPTS = 3;

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

/**
 * Separate refusals from pages.
 *
 * `retry` is the URLs worth asking for again; `pages` keeps the rest, including
 * refusals that ran out of attempts — those stay as refused rows so the report can
 * say "we could not read this" instead of the crawl quietly shrinking. A URL that
 * failed every attempt is much stronger evidence than one that failed once, which
 * is the whole reason to retry before recording a finding against it.
 *
 * `retryAfterMs` is the longest wait any server in the batch asked for, or null
 * when none did (the usual case).
 */
function partitionRefusedBatch(
  crawledBatch: StepPageResult[],
  retryAttempts: Map<string, number>,
): {
  pages: StepPageResult[];
  retry: string[];
  retryAfterMs: number | null;
  throttled: number;
  unanswered: number;
} {
  const pages: StepPageResult[] = [];
  const retry: string[] = [];
  let retryAfterMs: number | null = null;
  let throttled = 0;
  let unanswered = 0;

  for (const page of crawledBatch) {
    const refusal = classifyRefusal(page.statusCode);
    if (refusal === null) {
      pages.push(page);
      continue;
    }

    if (refusal === "throttled") throttled += 1;
    else unanswered += 1;

    if (page.retryAfterMs != null) {
      retryAfterMs = Math.max(retryAfterMs ?? 0, page.retryAfterMs);
    }

    const attempts = (retryAttempts.get(page.url) ?? 0) + 1;
    retryAttempts.set(page.url, attempts);
    if (attempts < MAX_RETRY_ATTEMPTS) {
      retry.push(page.url);
    } else {
      pages.push(page);
    }
  }

  return { pages, retry, retryAfterMs, throttled, unanswered };
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
  let rate = initialCrawlRate(robots.crawlDelaySeconds);
  let throttleWaits = 0;
  let consecutiveThrottledBatches = 0;
  let pagesAtLastCpuBreak = 0;
  const retryAttempts = new Map<string, number>();
  // Pacing evidence. Since a partially refused batch no longer hibernates, the
  // Workflow trace no longer counts refusals — a crawl settling at half a site's
  // tolerance looks exactly like one settling on its ceiling. See issue #88.
  const pacing = {
    congestedBatches: 0,
    refusedRequests: 0,
    lowestRate: rate.rate,
    highestRate: rate.rate,
  };

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
    await persistCrawlProgress({
      step,
      crawlBatchIndex,
      auditId,
      workflowInstanceId,
      // The whole batch, refusals included: someone watching the live feed should
      // see them. That feed is how this whole class of defect was found.
      crawledBatch,
      pagesCrawled: allPages.length,
      visitedCount: visited.size,
      queueLength: queue.length,
      maxPages,
    });

    // Counts refusals we gave up on too: a row recorded as refused is still the
    // site telling us something. How much of the batch was refused is the whole
    // signal — one 429 in twenty-five is a site that occasionally says no, not a
    // site we are hammering. See `congestionShare`.
    const refusedShare = congestionShare({
      throttled,
      unanswered,
      batchSize: crawledBatch.length,
    });
    if (refusedShare > 0) {
      consecutiveThrottledBatches += 1;
      pacing.congestedBatches += 1;
      pacing.refusedRequests += Math.round(refusedShare * crawledBatch.length);
      rate = afterCongestedBatch(rate, refusedShare);
      if (refusedShare >= BACKOFF_MIN_SHARE || retryAfterMs != null) {
        throttleWaits += 1;
        await step.sleep(
          `throttle-backoff-${throttleWaits}`,
          `${throttleBackoffSeconds(consecutiveThrottledBatches, retryAfterMs)} seconds`,
        );
      }
    } else {
      consecutiveThrottledBatches = 0;
      rate = afterCleanBatch(rate);
    }
    pacing.lowestRate = Math.min(pacing.lowestRate, rate.rate);
    pacing.highestRate = Math.max(pacing.highestRate, rate.rate);

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
