/**
 * R2 persistence for Deep SEO report payloads.
 *
 * The full `DeepReport` lives in R2 (not D1) — D1 only holds the row metadata
 * and the `r2Key`. The Workflow writes R2 first, then commits the D1 `done`
 * row, so a `done` report is guaranteed to have a readable payload.
 */
import { env } from "cloudflare:workers";
import type { PsiScreenshot } from "@/server/lib/psi/pagespeed";
import { deepReportSchema, type DeepReport } from "./deep-types";
import { reportKey, screenshotKey } from "./report-keys";

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

/**
 * Stores the page capture beside its report. Failures are the caller's to
 * swallow: a missing screenshot degrades the report, it does not invalidate it.
 */
export async function putReportScreenshot(
  id: string,
  screenshot: PsiScreenshot,
): Promise<void> {
  await env.R2.put(screenshotKey(id), screenshot.bytes, {
    httpMetadata: { contentType: screenshot.contentType },
  });
}

/** Reads a stored capture back for the public image endpoint. */
export async function getReportScreenshot(
  id: string,
): Promise<R2ObjectBody | null> {
  return env.R2.get(screenshotKey(id));
}

/** R2 rejects a delete carrying more keys than this. */
const R2_DELETE_LIMIT = 1000;

/**
 * Purges payloads by key (retention sweep), returning any key it could not
 * delete so the caller can log precisely what leaked.
 *
 * Chunked because the sweep can hand over more than one call's worth: it takes
 * up to 500 expired plus 500 abandoned leads, and each report contributes both
 * a payload key and a derived screenshot key. A batch is caught rather than
 * thrown so one bad call cannot skip the rest — the caller deletes the D1 rows
 * either way, after which a missed key can never be derived again and the
 * object is orphaned for good.
 */
export async function deleteDeepReports(keys: string[]): Promise<string[]> {
  const failed: string[] = [];
  for (let i = 0; i < keys.length; i += R2_DELETE_LIMIT) {
    const batch = keys.slice(i, i + R2_DELETE_LIMIT);
    try {
      await env.R2.delete(batch);
    } catch (error) {
      console.error(
        `free-seo-check: R2 delete failed for ${batch.length} key(s)`,
        error,
      );
      failed.push(...batch);
    }
  }
  return failed;
}
