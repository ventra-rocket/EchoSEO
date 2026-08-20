/**
 * KV-based live crawl progress.
 *
 * A 5,000-page crawl runs for minutes in a Workflow the browser cannot see, so
 * this is the one channel that can answer "is it working?". It carries two kinds
 * of evidence:
 *
 * - `entries` — the most recent pages the crawl fetched, newest first, WITH their
 *   status code. Failures are kept deliberately: a run that is 404ing its way
 *   through a site is working, and the user is the only one who can judge whether
 *   the result will be useful.
 * - `phase` — what the crawl is doing when no page has been fetched yet. Discovery
 *   on a large site takes tens of seconds during which a page-only feed is empty
 *   and indistinguishable from a hang.
 *
 * The KV entry auto-expires after 30 minutes — it is only needed while the audit
 * is running. Once finalized, we explicitly delete it.
 *
 * A shape change needs no migration: the value is ephemeral, and an entry that
 * fails validation is treated as absent rather than rendered as garbage.
 */
import { env } from "cloudflare:workers";
import { z } from "zod";
import { jsonCodec } from "@/shared/json";

const KV_PREFIX = "audit-progress:";
const TTL_SECONDS = 30 * 60; // 30 minutes
const MAX_ENTRIES = 300;

const crawledUrlEntrySchema = z.object({
  url: z.string(),
  statusCode: z.number(),
  title: z.string(),
  /** Unix timestamp ms when this page was crawled */
  crawledAt: z.number(),
});

/**
 * What the crawl is doing right now, for the stretches where no page has landed.
 * `discovery` counts are the sitemap read; `frontier` is the live queue, which is
 * what separates "slow" from "stalled".
 */
const crawlPhaseDetailSchema = z.object({
  stage: z.enum(["discovering", "crawling"]),
  /** Sitemap documents fetched so far, and how many of those failed. */
  sitemapDocsFetched: z.number().optional(),
  sitemapDocsFailed: z.number().optional(),
  /** Same-origin URLs the sitemaps advertised. */
  discoveredUrls: z.number().optional(),
  /** URLs already fetched, and URLs waiting in the queue. */
  visited: z.number().optional(),
  queued: z.number().optional(),
  /**
   * Live pacing, mirrored from the crawl loop so a running audit shows the rate
   * it settled at and how hard the site is pushing back — the same numbers the
   * finished audit keeps in D1. Optional so progress written before #88 (and by
   * the discovery stage, which has no rate yet) still parses.
   */
  offeredRate: z.number().optional(),
  refusedRequests: z.number().optional(),
  congestedBatches: z.number().optional(),
  updatedAt: z.number(),
});

const progressSchema = z.object({
  phase: crawlPhaseDetailSchema.nullable(),
  entries: z.array(crawledUrlEntrySchema),
});

type CrawledUrlEntry = z.infer<typeof crawledUrlEntrySchema>;
type CrawlPhaseDetail = z.infer<typeof crawlPhaseDetailSchema>;
type CrawlProgress = z.infer<typeof progressSchema>;

const progressCodec = jsonCodec(progressSchema);

const EMPTY_PROGRESS: CrawlProgress = { phase: null, entries: [] };

function parseProgress(json: string | null): CrawlProgress {
  if (!json) return EMPTY_PROGRESS;
  const parsed = progressCodec.safeParse(json);
  return parsed.success ? parsed.data : EMPTY_PROGRESS;
}

function key(auditId: string): string {
  return `${KV_PREFIX}${auditId}`;
}

async function read(auditId: string): Promise<CrawlProgress> {
  return parseProgress(await env.KV.get(key(auditId), "text"));
}

async function write(auditId: string, progress: CrawlProgress): Promise<void> {
  await env.KV.put(key(auditId), JSON.stringify(progress), {
    expirationTtl: TTL_SECONDS,
  });
}

/**
 * Append crawled entries in one KV write. New entries are prepended, the list is
 * capped, and the phase detail is refreshed from the same batch so the two can
 * never describe different moments.
 */
async function pushCrawledUrls(
  auditId: string,
  nextEntries: CrawledUrlEntry[],
  frontier?: {
    visited: number;
    queued: number;
    offeredRate?: number;
    refusedRequests?: number;
    congestedBatches?: number;
  },
): Promise<void> {
  if (nextEntries.length === 0 && !frontier) return;

  const current = await read(auditId);
  await write(auditId, {
    phase: frontier
      ? {
          ...current.phase,
          stage: "crawling",
          visited: frontier.visited,
          queued: frontier.queued,
          offeredRate: frontier.offeredRate,
          refusedRequests: frontier.refusedRequests,
          congestedBatches: frontier.congestedBatches,
          updatedAt: Date.now(),
        }
      : current.phase,
    entries: [...nextEntries, ...current.entries].slice(0, MAX_ENTRIES),
  });
}

/**
 * Record what discovery is doing. Separate from `pushCrawledUrls` because it runs
 * before any page exists, which is exactly the window this exists to cover.
 */
async function setPhase(
  auditId: string,
  phase: Omit<CrawlPhaseDetail, "updatedAt">,
): Promise<void> {
  const current = await read(auditId);
  await write(auditId, {
    phase: { ...phase, updatedAt: Date.now() },
    entries: current.entries,
  });
}

/** Live progress for a running audit. Entries are newest-first. */
async function getProgress(auditId: string): Promise<CrawlProgress> {
  return read(auditId);
}

/**
 * Delete the progress key (called after audit completes).
 */
async function clear(auditId: string): Promise<void> {
  await env.KV.delete(key(auditId));
}

export const AuditProgressKV = {
  pushCrawledUrls,
  setPhase,
  getProgress,
  clear,
} as const;
