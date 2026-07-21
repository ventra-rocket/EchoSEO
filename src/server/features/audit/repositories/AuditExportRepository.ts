/**
 * Data access for audit issue-export jobs. The row tracks the async lifecycle;
 * the artifact itself lives in private R2 under `r2Key`.
 */
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { auditExportJobs } from "@/db/schema";

export type AuditExportJob = typeof auditExportJobs.$inferSelect;

async function createJob(input: {
  id: string;
  auditId: string;
  projectId: string;
  organizationId: string;
  filtersJson: string;
  workflowInstanceId: string;
  createdByUserId: string;
}): Promise<void> {
  await db.insert(auditExportJobs).values({
    id: input.id,
    auditId: input.auditId,
    projectId: input.projectId,
    organizationId: input.organizationId,
    filtersJson: input.filtersJson,
    workflowInstanceId: input.workflowInstanceId,
    createdByUserId: input.createdByUserId,
    status: "queued",
  });
}

/** Unscoped: only the Workflow that owns this job id calls it. */
async function getJobById(jobId: string): Promise<AuditExportJob | null> {
  const row = await db.query.auditExportJobs.findFirst({
    where: eq(auditExportJobs.id, jobId),
  });
  return row ?? null;
}

/** Organization-scoped read for the authorized download endpoint. */
async function getJobForOrganization(
  jobId: string,
  organizationId: string,
): Promise<AuditExportJob | null> {
  const row = await db.query.auditExportJobs.findFirst({
    where: and(
      eq(auditExportJobs.id, jobId),
      eq(auditExportJobs.organizationId, organizationId),
    ),
  });
  return row ?? null;
}

/** True while an export for this audit is still queued or being built. */
async function hasActiveJobForAudit(auditId: string): Promise<boolean> {
  const row = await db.query.auditExportJobs.findFirst({
    columns: { id: true },
    where: and(
      eq(auditExportJobs.auditId, auditId),
      inArray(auditExportJobs.status, ["queued", "processing"]),
    ),
  });
  return row != null;
}

async function listJobsForAudit(
  auditId: string,
  projectId: string,
  limit: number,
): Promise<AuditExportJob[]> {
  return db
    .select()
    .from(auditExportJobs)
    .where(
      and(
        eq(auditExportJobs.auditId, auditId),
        eq(auditExportJobs.projectId, projectId),
      ),
    )
    .orderBy(desc(auditExportJobs.createdAt))
    .limit(limit);
}

async function markProcessing(jobId: string): Promise<void> {
  await db
    .update(auditExportJobs)
    .set({ status: "processing" })
    .where(eq(auditExportJobs.id, jobId));
}

async function markReady(input: {
  jobId: string;
  r2Key: string;
  rowCount: number;
  sizeBytes: number;
  readyAt: string;
  expiresAt: string;
}): Promise<void> {
  await db
    .update(auditExportJobs)
    .set({
      status: "ready",
      r2Key: input.r2Key,
      rowCount: input.rowCount,
      sizeBytes: input.sizeBytes,
      readyAt: input.readyAt,
      expiresAt: input.expiresAt,
      errorMessage: null,
    })
    .where(eq(auditExportJobs.id, input.jobId));
}

async function markFailed(jobId: string, message: string): Promise<void> {
  await db
    .update(auditExportJobs)
    .set({ status: "failed", errorMessage: message })
    .where(eq(auditExportJobs.id, jobId));
}

async function deleteJob(jobId: string): Promise<void> {
  await db.delete(auditExportJobs).where(eq(auditExportJobs.id, jobId));
}

export const AuditExportRepository = {
  createJob,
  getJobById,
  getJobForOrganization,
  hasActiveJobForAudit,
  listJobsForAudit,
  markProcessing,
  markReady,
  markFailed,
  deleteJob,
} as const;
