/**
 * R2 persistence for the sitemap URL set a crawl discovered.
 *
 * **Why this is not a Workflow step return.** It used to be. A step's output is
 * capped at 1 MiB, and `discoverUrls` collects up to 50,000 URLs so that
 * `inSitemap` can be judged for every crawled page. A site with 41,505 sitemap
 * URLs serialised past that cap, so `discover-urls` failed, retried six times,
 * and the audit died before fetching a single page — while the UI blamed the
 * site's firewall. The set now travels through R2 and only its size crosses the
 * step boundary.
 *
 * **Why not truncate instead.** The set is not a crawl budget. Every page the
 * crawl visits is checked against it (`buildSitemapMembership`), and that answer
 * drives the `audit-missing-from-sitemap` issue and the "removed from sitemap"
 * page-change. Keeping a partial set would turn a large sitemap into a page of
 * false warnings, which is worse than a slow crawl.
 *
 * **Absence is honest.** A missing object reads as "no sitemap evidence" rather
 * than "listed in no sitemap": every page then gets `inSitemap: false`, which is
 * exactly the state the cross-page rule and the page-change diff already
 * self-suppress on, so a lost object cannot manufacture warnings.
 *
 * Written once per audit inside the discovery step, so a replay re-reads the same
 * bytes instead of re-crawling sitemaps. Deleted when the audit is deleted or
 * ages out of retention.
 */
import { env } from "cloudflare:workers";
import { z } from "zod";
import { jsonCodec } from "@/shared/json";

const KEY_PREFIX = "audit-discovery/";

/** Bumped when the envelope shape changes incompatibly. */
const ENVELOPE_VERSION = 1;

const envelopeSchema = z.object({
  version: z.literal(ENVELOPE_VERSION),
  /** Same-origin page URLs found across every sitemap document that parsed. */
  urls: z.array(z.string()),
});

const envelopeCodec = jsonCodec(envelopeSchema);

export function discoveredUrlsKey(auditId: string): string {
  return `${KEY_PREFIX}${auditId}.json`;
}

export async function putDiscoveredUrls(
  auditId: string,
  urls: readonly string[],
): Promise<{ key: string; count: number }> {
  const key = discoveredUrlsKey(auditId);
  const envelope: z.infer<typeof envelopeSchema> = {
    version: ENVELOPE_VERSION,
    urls: [...urls],
  };
  await env.R2.put(key, JSON.stringify(envelope), {
    httpMetadata: { contentType: "application/json" },
  });
  return { key, count: urls.length };
}

/**
 * The discovered set, or null when no object exists or it cannot be validated.
 * Null is "we have no sitemap evidence", never "the sitemap was empty" — callers
 * must not convert it to an empty set without preserving that distinction.
 */
export async function getDiscoveredUrls(
  auditId: string,
): Promise<string[] | null> {
  const object = await env.R2.get(discoveredUrlsKey(auditId));
  if (!object) return null;

  const parsed = envelopeCodec.safeParse(await object.text());
  if (!parsed.success) {
    console.error(
      `audit-discovery: unreadable envelope for audit ${auditId}, treating as no sitemap evidence`,
    );
    return null;
  }
  return parsed.data.urls;
}

/** R2 rejects a delete carrying more keys than this. */
const MAX_DELETE_KEYS = 1000;

/**
 * Best-effort delete. Returns the keys that survived, for the caller to log:
 * retention removes the D1 rows regardless, since keeping them would retain the
 * very data the sweep exists to remove.
 */
export async function deleteDiscoveredUrls(
  auditIds: readonly string[],
): Promise<string[]> {
  const failed: string[] = [];
  for (let i = 0; i < auditIds.length; i += MAX_DELETE_KEYS) {
    const batch = auditIds
      .slice(i, i + MAX_DELETE_KEYS)
      .map((auditId) => discoveredUrlsKey(auditId));
    try {
      await env.R2.delete(batch);
    } catch (error) {
      console.error(
        `audit-discovery: R2 delete failed for ${batch.length} key(s)`,
        error,
      );
      failed.push(...batch);
    }
  }
  return failed;
}
