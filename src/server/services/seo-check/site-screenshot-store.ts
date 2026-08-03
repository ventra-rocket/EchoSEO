/**
 * R2 persistence for the page captures and loading filmstrips shown on the
 * checker's results.
 *
 * Keyed by (domain, strategy), not by report id: a capture is a picture of a
 * site's homepage on a form factor, identical whether it was reached from the
 * anonymous Lite result or a shared Deep report, so both tiers share one
 * 24h-cached object per strategy rather than each storing its own. The bytes
 * hold no PII — a public homepage — so unlike the report payload they are not
 * tied to a lead's retention.
 *
 * Key shapes under the shared prefix:
 * - capture:   `site-screenshots/{domain}/{strategy}`
 * - filmstrip: `site-screenshots/{domain}/{strategy}.filmstrip.json`
 * Pre-strategy deployments wrote flat `site-screenshots/{domain}` objects;
 * those are never read anymore but still share the prefix, so the sweep below
 * ages them out with everything else.
 */
import { env } from "cloudflare:workers";
import type {
  PsiFilmstripFrame,
  PsiScreenshot,
  PsiStrategy,
} from "@/server/lib/psi/pagespeed";

const KEY_PREFIX = "site-screenshots/";

function screenshotKey(domain: string, strategy: PsiStrategy): string {
  return `${KEY_PREFIX}${domain.toLowerCase()}/${strategy}`;
}

function filmstripKey(domain: string, strategy: PsiStrategy): string {
  return `${screenshotKey(domain, strategy)}.filmstrip.json`;
}

export async function getSiteScreenshot(
  domain: string,
  strategy: PsiStrategy,
): Promise<R2ObjectBody | null> {
  return env.R2.get(screenshotKey(domain, strategy));
}

export async function putSiteScreenshot(
  domain: string,
  strategy: PsiStrategy,
  screenshot: PsiScreenshot,
): Promise<void> {
  await env.R2.put(screenshotKey(domain, strategy), screenshot.bytes, {
    httpMetadata: { contentType: screenshot.contentType },
  });
}

/** Bump when the bundle shape changes so a client can refuse what it cannot read. */
export const SITE_FILMSTRIP_VERSION = 1;

/** The JSON object stored at the filmstrip key and served verbatim to clients. */
interface SiteFilmstripBundle {
  version: typeof SITE_FILMSTRIP_VERSION;
  frames: PsiFilmstripFrame[];
  /** ISO timestamp of the render that produced the frames. */
  capturedAt: string;
}

export async function getSiteFilmstrip(
  domain: string,
  strategy: PsiStrategy,
): Promise<R2ObjectBody | null> {
  return env.R2.get(filmstripKey(domain, strategy));
}

export async function putSiteFilmstrip(
  domain: string,
  strategy: PsiStrategy,
  frames: PsiFilmstripFrame[],
): Promise<void> {
  const bundle: SiteFilmstripBundle = {
    version: SITE_FILMSTRIP_VERSION,
    frames,
    capturedAt: new Date().toISOString(),
  };
  await env.R2.put(filmstripKey(domain, strategy), JSON.stringify(bundle), {
    httpMetadata: { contentType: "application/json" },
  });
}

/**
 * Deletes visual artifacts whose R2 `uploaded` time is older than `cutoff`,
 * returning how many were purged. Domains still being checked keep re-rendering
 * (which overwrites and refreshes `uploaded`), so this only reaps artifacts for
 * domains nobody has looked at in a while — bounding storage without a
 * per-object TTL, which R2 does not offer.
 *
 * The list is by the shared prefix, so it covers captures, filmstrip bundles,
 * AND legacy flat pre-strategy keys alike — no artifact shape escapes it.
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
