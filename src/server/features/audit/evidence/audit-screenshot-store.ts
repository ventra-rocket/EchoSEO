/**
 * Private R2 persistence for audit evidence screenshots. The object is never
 * public; it is only ever streamed back through the authorized serve endpoint
 * (`/api/audit/screenshots/get?id=`).
 *
 * The key is derived from the URL digest, not the row id: two callers racing the
 * first capture of the same (audit, url) then write the SAME object, so the loser
 * cannot strand an orphan under a second key that no surviving row references
 * (retention is row-driven and would never reclaim it).
 */
import { env } from "cloudflare:workers";

export function auditScreenshotKey(auditId: string, urlDigest: string): string {
  return `audit-screenshots/${auditId}/${urlDigest}`;
}

/** Writes the image and returns its key (persist R2 before the D1 `ready` commit). */
export async function putAuditScreenshot(
  key: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  await env.R2.put(key, bytes, {
    httpMetadata: { contentType },
  });
}

/** Reads the stored image for streaming, or null if the object is gone. */
export async function getAuditScreenshotObject(key: string) {
  return env.R2.get(key);
}

/** R2 rejects a delete carrying more keys than this. */
const R2_DELETE_LIMIT = 1000;

/**
 * Purges screenshot objects by key (retention sweep), returning any key it could
 * not delete so the caller can log precisely what leaked. Chunked to stay under
 * R2's per-call key cap; a failed batch is caught, not thrown, so one bad call
 * cannot skip the rest — the caller still removes the D1 rows, after which a
 * missed key can never be derived again and the object is orphaned.
 */
export async function deleteAuditScreenshots(
  keys: string[],
): Promise<string[]> {
  const failed: string[] = [];
  for (let i = 0; i < keys.length; i += R2_DELETE_LIMIT) {
    const batch = keys.slice(i, i + R2_DELETE_LIMIT);
    try {
      await env.R2.delete(batch);
    } catch (error) {
      console.error(
        `audit-screenshots: R2 delete failed for ${batch.length} key(s)`,
        error,
      );
      failed.push(...batch);
    }
  }
  return failed;
}
