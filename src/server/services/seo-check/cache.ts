/**
 * 24h per-domain cache for the anonymous Lite check.
 *
 * Keyed by domain (not full URL) — the goal is anti-abuse (don't re-crawl
 * the same site repeatedly within a day), not per-page caching.
 */
import { env } from "cloudflare:workers";
import { liteReportCodec, type LiteReport } from "./types";

const KV_PREFIX = "free-seo-check:lite:";
const TTL_SECONDS = 24 * 60 * 60;

function cacheKey(domain: string): string {
  return `${KV_PREFIX}${domain.toLowerCase()}`;
}

export async function getCachedLiteReport(
  domain: string,
): Promise<LiteReport | null> {
  const raw = await env.KV.get(cacheKey(domain), "text");
  if (!raw) return null;

  const parsed = liteReportCodec.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function putCachedLiteReport(
  domain: string,
  report: LiteReport,
): Promise<void> {
  await env.KV.put(cacheKey(domain), JSON.stringify(report), {
    expirationTtl: TTL_SECONDS,
  });
}
