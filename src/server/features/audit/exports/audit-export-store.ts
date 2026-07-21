/**
 * Private R2 persistence for audit export artifacts. The object is never public;
 * it is only ever streamed back through the authorized download endpoint.
 */
import { env } from "cloudflare:workers";

export function auditExportKey(jobId: string): string {
  return `audit-exports/${jobId}.zip`;
}

/** Writes the ZIP and returns its key (persist R2 before the D1 `ready` commit). */
export async function putAuditExport(
  jobId: string,
  zip: Uint8Array,
): Promise<string> {
  const key = auditExportKey(jobId);
  await env.R2.put(key, zip, {
    httpMetadata: { contentType: "application/zip" },
  });
  return key;
}

/** Reads the stored artifact for streaming, or null if the object is gone. */
export async function getAuditExport(key: string) {
  return env.R2.get(key);
}

/** R2 rejects a delete carrying more keys than this. */
const R2_DELETE_LIMIT = 1000;

/**
 * Purges export artifacts by key (retention sweep), returning any key it could
 * not delete so the caller can log precisely what leaked. Chunked to stay under
 * R2's per-call key cap; a failed batch is caught, not thrown, so one bad call
 * cannot skip the rest — the caller still updates/deletes the D1 rows, after
 * which a missed key can never be derived again and the object is orphaned.
 */
export async function deleteAuditExports(keys: string[]): Promise<string[]> {
  const failed: string[] = [];
  for (let i = 0; i < keys.length; i += R2_DELETE_LIMIT) {
    const batch = keys.slice(i, i + R2_DELETE_LIMIT);
    try {
      await env.R2.delete(batch);
    } catch (error) {
      console.error(
        `audit-exports: R2 delete failed for ${batch.length} key(s)`,
        error,
      );
      failed.push(...batch);
    }
  }
  return failed;
}
