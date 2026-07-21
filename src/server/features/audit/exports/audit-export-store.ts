/**
 * Private R2 persistence for audit export artifacts. The object is never public;
 * it is only ever streamed back through the authorized download endpoint.
 */
import { env } from "cloudflare:workers";

function auditExportKey(jobId: string): string {
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
