/**
 * Data access for the privileged indexation action log (audit_actions). Every
 * IndexNow submission is recorded here so an operator can trace who submitted
 * what, when, and with what result.
 */
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditActions } from "@/db/schema";

interface RecordActionInput {
  projectId: string;
  organizationId: string;
  targetId: string;
  auditId: string | null;
  actorUserId: string;
  type: "indexnow_submit";
  provider: string;
  status: "succeeded" | "failed";
  submittedCount: number;
  detail: Record<string, unknown> | null;
}

async function recordAction(input: RecordActionInput): Promise<void> {
  await db.insert(auditActions).values({
    id: crypto.randomUUID(),
    projectId: input.projectId,
    organizationId: input.organizationId,
    targetId: input.targetId,
    auditId: input.auditId,
    actorUserId: input.actorUserId,
    type: input.type,
    provider: input.provider,
    status: input.status,
    submittedCount: input.submittedCount,
    detailJson: input.detail ? JSON.stringify(input.detail) : null,
    // Written app-side as ISO so the log sorts lexicographically and renders in
    // one timezone-explicit format, rather than SQLite's space-separated UTC.
    createdAt: new Date().toISOString(),
  });
}

const RECENT_LIMIT = 20;

async function listRecentForTarget(targetId: string) {
  return db
    .select({
      id: auditActions.id,
      type: auditActions.type,
      provider: auditActions.provider,
      status: auditActions.status,
      submittedCount: auditActions.submittedCount,
      createdAt: auditActions.createdAt,
    })
    .from(auditActions)
    .where(eq(auditActions.targetId, targetId))
    .orderBy(desc(auditActions.createdAt))
    .limit(RECENT_LIMIT);
}

export const AuditActionRepository = {
  recordAction,
  listRecentForTarget,
} as const;
