/**
 * Data access for competitor page pairs and their last comparison.
 *
 * Writes are scoped by `competitorId` as well as row id, so an id from another
 * workspace changes nothing rather than mutating a row the caller never had
 * access to.
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { auditCompetitorPages } from "@/db/audit.schema";

export type AuditCompetitorPage = typeof auditCompetitorPages.$inferSelect;

/** D1 rejects a statement over 100 bound parameters (AuditRetentionRepository.ts:12-16). */
const MAX_BOUND_PARAMS = 90;

async function listByCompetitors(
  competitorIds: string[],
): Promise<AuditCompetitorPage[]> {
  if (competitorIds.length === 0) return [];
  const rows: AuditCompetitorPage[] = [];
  for (let i = 0; i < competitorIds.length; i += MAX_BOUND_PARAMS) {
    const chunk = competitorIds.slice(i, i + MAX_BOUND_PARAMS);
    rows.push(
      ...(await db
        .select()
        .from(auditCompetitorPages)
        .where(inArray(auditCompetitorPages.competitorId, chunk))
        .orderBy(asc(auditCompetitorPages.ourUrl))),
    );
  }
  return rows;
}

/**
 * Store a pairing, leaving any stored comparison intact.
 *
 * A re-run re-derives the same pairs, and overwriting the result here would
 * throw away the previous measurement before the new one exists — a crash
 * mid-run would leave the operator with neither. `matchSource` and
 * `matchConfidence` are also left alone on conflict: a human who pasted a URL
 * outranks the matcher, and re-running discovery must not quietly revert them.
 */
async function upsertPairing(input: {
  competitorId: string;
  targetId: string;
  ourUrl: string;
  theirUrl: string;
  matchConfidence: number;
}): Promise<void> {
  await db
    .insert(auditCompetitorPages)
    .values({
      id: crypto.randomUUID(),
      competitorId: input.competitorId,
      targetId: input.targetId,
      ourUrl: input.ourUrl,
      theirUrl: input.theirUrl,
      matchSource: "auto",
      matchConfidence: input.matchConfidence,
    })
    .onConflictDoNothing({
      target: [auditCompetitorPages.competitorId, auditCompetitorPages.ourUrl],
    });
}

/**
 * Create or repoint a pairing a person chose, for one of our pages that the
 * matcher produced nothing for.
 *
 * Distinct from `upsertPairing`, which must not overwrite: this one is a
 * deliberate human decision, so on conflict it replaces the URL and clears the
 * stored comparison — the previous verdicts describe a different page.
 */
async function upsertManualPairing(input: {
  competitorId: string;
  targetId: string;
  ourUrl: string;
  theirUrl: string;
}): Promise<void> {
  await db
    .insert(auditCompetitorPages)
    .values({
      id: crypto.randomUUID(),
      competitorId: input.competitorId,
      targetId: input.targetId,
      ourUrl: input.ourUrl,
      theirUrl: input.theirUrl,
      matchSource: "manual",
      matchConfidence: null,
    })
    .onConflictDoUpdate({
      target: [auditCompetitorPages.competitorId, auditCompetitorPages.ourUrl],
      set: {
        theirUrl: input.theirUrl,
        matchSource: "manual",
        matchConfidence: null,
        theirIssuesJson: null,
        theirStatusCode: null,
        theirTitle: null,
        failureReason: null,
        comparedAt: null,
        lastRunAuditId: null,
      },
    });
}

/**
 * Replace the competitor URL for a pair with one a person chose.
 *
 * Clears `matchConfidence` and the stored comparison together: the previous
 * result describes a different page, and leaving it beside a new URL would
 * present last run's verdicts as this pair's.
 */
async function setManualUrl(input: {
  competitorId: string;
  pageId: string;
  theirUrl: string;
}): Promise<void> {
  await db
    .update(auditCompetitorPages)
    .set({
      theirUrl: input.theirUrl,
      matchSource: "manual",
      matchConfidence: null,
      theirIssuesJson: null,
      theirStatusCode: null,
      theirTitle: null,
      failureReason: null,
      comparedAt: null,
      lastRunAuditId: null,
    })
    .where(
      and(
        eq(auditCompetitorPages.id, input.pageId),
        eq(auditCompetitorPages.competitorId, input.competitorId),
      ),
    );
}

/** Store one comparison outcome — verdicts, or the reason there are none. */
async function recordComparison(input: {
  pageId: string;
  auditId: string;
  theirIssuesJson: string | null;
  theirStatusCode: number | null;
  theirTitle: string | null;
  failureReason: string | null;
}): Promise<void> {
  await db
    .update(auditCompetitorPages)
    .set({
      lastRunAuditId: input.auditId,
      theirIssuesJson: input.theirIssuesJson,
      theirStatusCode: input.theirStatusCode,
      theirTitle: input.theirTitle,
      failureReason: input.failureReason,
      comparedAt: new Date().toISOString(),
    })
    .where(eq(auditCompetitorPages.id, input.pageId));
}

export const CompetitorPageRepository = {
  listByCompetitors,
  upsertPairing,
  upsertManualPairing,
  setManualUrl,
  recordComparison,
} as const;
