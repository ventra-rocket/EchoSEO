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
 * The (rule, url) keys of an audit's issues, plus the group/severity a resolved
 * rule needs to describe itself. Deliberately excludes evidence and timestamps:
 * a snapshot comparison diffs two of these key sets and never renders a row, so
 * shipping the heavy columns would only inflate the read.
 *
 * **Unbounded on purpose — do not add a limit here.** Every other read that
 * scales with a crawl is paged or capped (`listOccurrences`, the export's 50,000
 * ceiling, the link-graph aggregates), and two of them had to be fixed on 14/08
 * for loading too much at once. This one is different in kind: the callers compute
 * a set difference, so a partial key set does not produce a smaller answer, it
 * produces a WRONG one — every key past the cutoff would read as "resolved since
 * the baseline". That is precisely the lie `AuditComparisonService`'s
 * materialization gate exists to refuse.
 *
 * What keeps it safe is a real ceiling plus a loud failure, not a limit clause:
 * occurrences are bounded by pages × rules (5,000 × 11 ≈ 55,000 worst case, and
 * the largest real crawl holds 8,047), the comparison runs in a request where a
 * failure is visible, and the weekly report returns `deferred` so the send is
 * retried rather than silently skipped.
 *
 * If it ever does need to scale, the answer is to compute the difference in SQL
 * between the two audits' key sets — never to truncate the input.
 */
async function getOccurrenceKeysForAudit(auditId: string) {
  return db
    .select({
      ruleId: auditIssueOccurrences.ruleId,
      url: auditIssueOccurrences.url,
      issueGroup: auditIssueOccurrences.issueGroup,
      severity: auditIssueOccurrences.severity,
    })
    .from(auditIssueOccurrences)
    .where(eq(auditIssueOccurrences.auditId, auditId));
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
  getOccurrenceKeysForAudit,
  listOccurrences,
  countOccurrences,
} as const;
