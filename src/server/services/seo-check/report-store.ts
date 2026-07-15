/**
 * R2 persistence for Deep SEO report payloads.
 *
 * The full `DeepReport` lives in R2 (not D1) — D1 only holds the row metadata
 * and the `r2Key`. The Workflow writes R2 first, then commits the D1 `done`
 * row, so a `done` report is guaranteed to have a readable payload.
 */
import { env } from "cloudflare:workers";
import { deepReportSchema, type DeepReport } from "./deep-types";

function reportKey(id: string): string {
  return `deep-reports/${id}.json`;
}

/** Writes the payload and returns its R2 key (persist R2 before the D1 commit). */
export async function putDeepReport(
  id: string,
  report: DeepReport,
): Promise<string> {
  const key = reportKey(id);
  await env.R2.put(key, JSON.stringify(report), {
    httpMetadata: { contentType: "application/json" },
  });
  return key;
}

/**
 * Reads a persisted payload back. Returns null when the object is missing or
 * unreadable — a `done` row should always have one (R2 is written before the D1
 * commit), so null means the store drifted and the caller degrades rather than
 * throwing a 500 at an anonymous reader.
 *
 * The payload is re-validated on read: it may have been written by an older
 * deploy whose shape no longer matches `DeepReport`.
 */
export async function getDeepReport(id: string): Promise<DeepReport | null> {
  const object = await env.R2.get(reportKey(id));
  if (!object) return null;

  let body: unknown;
  try {
    body = await object.json();
  } catch (error) {
    // A truncated or corrupted object would otherwise throw straight through
    // the handler as a 500 — the one outcome this null contract exists to avoid.
    console.error(`free-seo-check: report ${id} payload is unreadable`, error);
    return null;
  }

  const parsed = deepReportSchema.safeParse(body);
  if (!parsed.success) {
    console.error(`free-seo-check: report ${id} failed schema validation`);
    return null;
  }
  return parsed.data;
}

/** Purges payloads by key (retention sweep). R2 accepts up to 1000 per call. */
export async function deleteDeepReports(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await env.R2.delete(keys);
}
