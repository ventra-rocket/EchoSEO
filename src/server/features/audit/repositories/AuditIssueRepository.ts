/**
 * Data access for materialized audit issues. Listing and counting stay in SQL:
 * a large crawl produces far more occurrences than any page should ship to the
 * client.
 */
import { and, asc, count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditIssueOccurrences, auditIssueRollups } from "@/db/schema";
import type { OccurrenceInput } from "@/server/features/audit/issues/materialize";

const DB_BATCH_SIZE = 100;
type BatchStatement = Parameters<typeof db.batch>[0][number];

async function executeInBatches<T>(
  items: T[],
  buildStatement: (item: T) => BatchStatement,
) {
  for (let i = 0; i < items.length; i += DB_BATCH_SIZE) {
    const chunk = items.slice(i, i + DB_BATCH_SIZE).map(buildStatement);
    const [first, ...rest] = chunk;
    if (!first) continue;
    await db.batch([first, ...rest]);
  }
}

interface RollupInput {
  ruleId: string;
  issueGroup: string;
  severity: string;
  urlCount: number;
}

/**
 * Replace an audit's materialized issues. Delete-then-insert keeps a retry and
 * an explicit reprocess (after a rules upgrade) on the same code path, and
 * converges on the same result either way.
 */
async function replaceIssuesForAudit(input: {
  auditId: string;
  projectId: string;
  occurrences: OccurrenceInput[];
  rollups: RollupInput[];
}) {
  await db
    .delete(auditIssueOccurrences)
    .where(eq(auditIssueOccurrences.auditId, input.auditId));
  await db
    .delete(auditIssueRollups)
    .where(eq(auditIssueRollups.auditId, input.auditId));

  await executeInBatches(input.occurrences, (occurrence) =>
    db.insert(auditIssueOccurrences).values({
      id: crypto.randomUUID(),
      auditId: input.auditId,
      projectId: input.projectId,
      pageId: occurrence.pageId,
      ruleId: occurrence.ruleId,
      ruleVersion: occurrence.ruleVersion,
      issueGroup: occurrence.issueGroup,
      severity: occurrence.severity,
      status: occurrence.status,
      url: occurrence.url,
      evidenceJson: occurrence.evidence
        ? JSON.stringify(occurrence.evidence)
        : null,
    }),
  );

  await executeInBatches(input.rollups, (rollup) =>
    db.insert(auditIssueRollups).values({
      id: crypto.randomUUID(),
      auditId: input.auditId,
      ruleId: rollup.ruleId,
      issueGroup: rollup.issueGroup,
      severity: rollup.severity,
      urlCount: rollup.urlCount,
    }),
  );
}

async function getRollupsForAudit(auditId: string) {
  return db
    .select()
    .from(auditIssueRollups)
    .where(eq(auditIssueRollups.auditId, auditId))
    .orderBy(asc(auditIssueRollups.issueGroup), asc(auditIssueRollups.ruleId));
}

/**
 * `%` and `_` are LIKE wildcards, and `_` is common in real URLs. Escaping them
 * keeps a search for `my_page` from also matching `myXpage`.
 */
function toLikePattern(search: string): string {
  const escaped = search.replace(/[\\%_]/g, (character) => `\\${character}`);
  return `%${escaped}%`;
}

function buildOccurrenceFilter(input: {
  auditId: string;
  issueGroup?: string;
  severity?: string;
  ruleId?: string;
  urlContains?: string;
}) {
  return and(
    eq(auditIssueOccurrences.auditId, input.auditId),
    input.issueGroup
      ? eq(auditIssueOccurrences.issueGroup, input.issueGroup)
      : undefined,
    input.severity
      ? eq(auditIssueOccurrences.severity, input.severity)
      : undefined,
    input.ruleId ? eq(auditIssueOccurrences.ruleId, input.ruleId) : undefined,
    input.urlContains
      ? sql`${auditIssueOccurrences.url} LIKE ${toLikePattern(input.urlContains)} ESCAPE '\\'`
      : undefined,
  );
}

async function listOccurrences(input: {
  auditId: string;
  issueGroup?: string;
  severity?: string;
  ruleId?: string;
  urlContains?: string;
  limit: number;
  offset: number;
}) {
  return db
    .select()
    .from(auditIssueOccurrences)
    .where(buildOccurrenceFilter(input))
    .orderBy(asc(auditIssueOccurrences.url), asc(auditIssueOccurrences.ruleId))
    .limit(input.limit)
    .offset(input.offset);
}

async function countOccurrences(input: {
  auditId: string;
  issueGroup?: string;
  severity?: string;
  ruleId?: string;
  urlContains?: string;
}) {
  const [row] = await db
    .select({ value: count() })
    .from(auditIssueOccurrences)
    .where(buildOccurrenceFilter(input));

  return row?.value ?? 0;
}

export const AuditIssueRepository = {
  replaceIssuesForAudit,
  getRollupsForAudit,
  listOccurrences,
  countOccurrences,
} as const;
