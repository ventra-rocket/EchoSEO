/**
 * R2 persistence for the shareable Lite check snapshot (`/c/{id}`).
 *
 * Keyed by an unguessable UUID minted per check — every check gets its own
 * frozen copy, even when the report content came from the 24h domain cache, so
 * "every check → one URL" holds and a link always shows exactly what its
 * visitor saw. R2-only, no D1 row: nothing here is lead-coupled, and the whole
 * lifecycle is "write once, read until the 30-day sweep deletes it".
 *
 * The report is stored canonical-English (localization happens at read time in
 * check-read.ts, the same seam api.ts uses), embedded as its own JSON string
 * and decoded through `liteReportCodec` — the exact validator the KV cache
 * uses — so the snapshot cannot drift from the report contract.
 */
import { env } from "cloudflare:workers";
import { z } from "zod";
import { jsonCodec } from "@/shared/json";
import type { Locale } from "@/server/lib/seo-rules";
import { liteReportCodec, type LiteReport } from "./types";

const KEY_PREFIX = "lite-checks/";

/**
 * Bumped when the envelope shape changes incompatibly. Old snapshots then fail
 * validation and 404 rather than rendering garbage — acceptable for a 30-day
 * artifact, unlike the Deep report whose links live in inboxes.
 */
const SNAPSHOT_VERSION = 1;

const snapshotEnvelopeSchema = z.object({
  version: z.literal(SNAPSHOT_VERSION),
  locale: z.enum(["en", "vi"]),
  createdAt: z.string(),
  /** The canonical-EN LiteReport as its own JSON string — see module doc. */
  report: z.string(),
});

const snapshotEnvelopeCodec = jsonCodec(snapshotEnvelopeSchema);

export interface LiteCheckSnapshot {
  report: LiteReport;
  locale: Locale;
  createdAt: string;
}

function snapshotKey(checkId: string): string {
  return `${KEY_PREFIX}${checkId}.json`;
}

export async function putLiteCheckSnapshot(
  checkId: string,
  report: LiteReport,
  locale: Locale,
  createdAt: string = new Date().toISOString(),
): Promise<void> {
  const envelope = {
    version: SNAPSHOT_VERSION,
    locale,
    createdAt,
    report: JSON.stringify(report),
  };
  await env.R2.put(snapshotKey(checkId), JSON.stringify(envelope), {
    httpMetadata: { contentType: "application/json" },
  });
}

/**
 * Returns null for a missing OR corrupt object — the read handler maps both to
 * the same flat 404, so a snapshot that fails validation is indistinguishable
 * from one that never existed.
 */
export async function getLiteCheckSnapshot(
  checkId: string,
): Promise<LiteCheckSnapshot | null> {
  const object = await env.R2.get(snapshotKey(checkId));
  if (!object) return null;

  const envelope = snapshotEnvelopeCodec.safeParse(await object.text());
  if (!envelope.success) return null;

  const report = liteReportCodec.safeParse(envelope.data.report);
  if (!report.success) return null;

  return {
    report: report.data,
    locale: envelope.data.locale,
    createdAt: envelope.data.createdAt,
  };
}

/**
 * Deletes snapshots whose R2 `uploaded` time is older than `cutoff`, returning
 * how many were purged. Snapshots are write-once (never overwritten), so
 * `uploaded` is exactly the check's own age — pattern and reasoning as
 * `sweepStaleSiteScreenshots`, which bounds storage without a per-object TTL.
 */
export async function sweepStaleLiteChecks(
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
