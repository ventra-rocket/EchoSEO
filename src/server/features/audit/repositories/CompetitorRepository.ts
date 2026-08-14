/**
 * Data access for competitor domains declared against an audit target.
 *
 * Every write is scoped by `targetId` as well as by row id. A caller that passes
 * a competitor id belonging to another workspace's target therefore changes
 * nothing instead of mutating a row it was never allowed to see — the scope is
 * part of the statement, not a check the caller is trusted to have done.
 */
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditCompetitors } from "@/db/audit.schema";

export type AuditCompetitor = typeof auditCompetitors.$inferSelect;

async function listByTarget(targetId: string): Promise<AuditCompetitor[]> {
  return db
    .select()
    .from(auditCompetitors)
    .where(eq(auditCompetitors.targetId, targetId))
    .orderBy(asc(auditCompetitors.createdAt));
}

async function getByTargetAndOrigin(
  targetId: string,
  origin: string,
): Promise<AuditCompetitor | null> {
  const row = await db.query.auditCompetitors.findFirst({
    where: and(
      eq(auditCompetitors.targetId, targetId),
      eq(auditCompetitors.origin, origin),
    ),
  });
  return row ?? null;
}

/**
 * Insert a competitor, or return the existing row for the same (target, origin).
 *
 * Re-adding a domain someone already added is an ordinary thing for a shared
 * workspace to do, so the unique index absorbs it rather than surfacing a
 * conflict the user cannot act on. The insert is not the source of truth for the
 * returned row: after `onConflictDoNothing` we re-read, so both the winner and
 * the loser of a race get the row that actually exists.
 */
async function add(input: {
  projectId: string;
  targetId: string;
  origin: string;
  label: string | null;
  source: "manual" | "auto";
}): Promise<AuditCompetitor> {
  await db
    .insert(auditCompetitors)
    .values({
      id: crypto.randomUUID(),
      projectId: input.projectId,
      targetId: input.targetId,
      origin: input.origin,
      label: input.label,
      source: input.source,
    })
    .onConflictDoNothing({
      target: [auditCompetitors.targetId, auditCompetitors.origin],
    });

  const row = await getByTargetAndOrigin(input.targetId, input.origin);
  if (!row) {
    throw new Error("Failed to add audit competitor");
  }
  return row;
}

/** Delete a competitor and, by cascade, every page pair measured against it. */
async function remove(targetId: string, competitorId: string): Promise<void> {
  await db
    .delete(auditCompetitors)
    .where(
      and(
        eq(auditCompetitors.id, competitorId),
        eq(auditCompetitors.targetId, targetId),
      ),
    );
}

export const CompetitorRepository = {
  listByTarget,
  getByTargetAndOrigin,
  add,
  remove,
} as const;
