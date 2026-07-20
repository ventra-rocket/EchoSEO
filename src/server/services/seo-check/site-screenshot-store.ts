/**
 * R2 persistence for the page captures shown on the checker's results.
 *
 * Keyed by domain, not by report id: a capture is a picture of a site's
 * homepage, identical whether it was reached from the anonymous Lite result or
 * a shared Deep report, so both tiers share one 24h-cached object rather than
 * each storing its own. The bytes hold no PII — a public homepage — so unlike
 * the report payload they are not tied to a lead's retention.
 */
import { env } from "cloudflare:workers";
import type { PsiScreenshot } from "@/server/lib/psi/pagespeed";

const KEY_PREFIX = "site-screenshots/";

function screenshotKey(domain: string): string {
  return `${KEY_PREFIX}${domain.toLowerCase()}`;
}

export async function getSiteScreenshot(
  domain: string,
): Promise<R2ObjectBody | null> {
  return env.R2.get(screenshotKey(domain));
}

export async function putSiteScreenshot(
  domain: string,
  screenshot: PsiScreenshot,
): Promise<void> {
  await env.R2.put(screenshotKey(domain), screenshot.bytes, {
    httpMetadata: { contentType: screenshot.contentType },
  });
}

/**
 * Deletes captures whose R2 `uploaded` time is older than `cutoff`, returning
 * how many were purged. Domains still being checked keep re-rendering (which
 * overwrites and refreshes `uploaded`), so this only reaps captures for domains
 * nobody has looked at in a while — bounding storage without a per-object TTL,
 * which R2 does not offer.
 */
export async function sweepStaleSiteScreenshots(
  cutoff: Date,
  limit = 1000,
): Promise<number> {
  let purged = 0;
  let cursor: string | undefined;

  do {
    const listing = await env.R2.list({ prefix: KEY_PREFIX, cursor });
    const stale = listing.objects
      .filter((object) => object.uploaded < cutoff)
      .map((object) => object.key);

    for (let i = 0; i < stale.length; i += limit) {
      const batch = stale.slice(i, i + limit);
      await env.R2.delete(batch);
      purged += batch.length;
    }

    cursor = listing.truncated ? listing.cursor : undefined;
  } while (cursor);

  return purged;
}
