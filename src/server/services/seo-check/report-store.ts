/**
 * R2 persistence for Deep SEO report payloads.
 *
 * The full `DeepReport` lives in R2 (not D1) — D1 only holds the row metadata
 * and the `r2Key`. The Workflow writes R2 first, then commits the D1 `done`
 * row, so a `done` report is guaranteed to have a readable payload.
 */
import { env } from "cloudflare:workers";
import type { DeepReport } from "./deep-types";

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
