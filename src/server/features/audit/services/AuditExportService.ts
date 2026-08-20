/**
 * Requesting, tracking and authorizing audit issue exports.
 *
 * Requesting an export is a mutation gated on the investigate role (it queues
 * our own compute, not a paid provider). Reading status and resolving a download
 * are project/organization-scoped reads. The heavy artifact never appears here —
 * only its lifecycle — and `r2Key` never leaves the server: the client addresses
 * a download by job id through the authorized endpoint.
 */
import { env } from "cloudflare:workers";
import type { AuthMode } from "@/lib/auth-mode";
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import { AuditSnapshotRepository } from "@/server/features/audit/repositories/AuditSnapshotRepository";
import {
  AuditExportRepository,
  type AuditExportJob,
} from "@/server/features/audit/repositories/AuditExportRepository";
import {
  canInvestigate,
  resolveWorkspaceRole,
} from "@/server/features/audit/authz/workspace-role";
import { AppError } from "@/server/lib/errors";

interface ExportFilters {
  issueGroup?: string;
  severity?: string;
  ruleId?: string;
  urlContains?: string;
}

export interface AuditExportJobView {
  id: string;
  status: AuditExportJob["status"];
  rowCount: number | null;
  sizeBytes: number | null;
  createdAt: string;
  readyAt: string | null;
  expiresAt: string | null;
  errorMessage: string | null;
  /** True only while the artifact is downloadable (ready and not expired). */
  downloadable: boolean;
}

/** Keep only the filter keys that are set, so the manifest states them exactly. */
function cleanFilters(filters: ExportFilters): Record<string, string> {
  const entries = Object.entries(filters).filter(
    (entry): entry is [string, string] =>
      typeof entry[1] === "string" && entry[1].length > 0,
  );
  return Object.fromEntries(entries);
}

function isExpired(job: AuditExportJob, now: Date): boolean {
  return job.expiresAt != null && now.toISOString() > job.expiresAt;
}

function toView(job: AuditExportJob, now: Date): AuditExportJobView {
  return {
    id: job.id,
    status: job.status,
    rowCount: job.rowCount,
    sizeBytes: job.sizeBytes,
    createdAt: job.createdAt,
    readyAt: job.readyAt,
    expiresAt: job.expiresAt,
    errorMessage: job.errorMessage,
    downloadable: job.status === "ready" && !isExpired(job, now),
  };
}

async function requestExport(input: {
  projectId: string;
  auditId: string;
  actorUserId: string;
  organizationId: string;
  authMode: AuthMode;
  filters: ExportFilters;
}): Promise<{ jobId: string }> {
  const role = await resolveWorkspaceRole({
    userId: input.actorUserId,
    organizationId: input.organizationId,
    authMode: input.authMode,
  });
  if (!canInvestigate(role)) {
    throw new AppError(
      "FORBIDDEN",
      "You cannot export audit issues in this workspace",
    );
  }

  const audit = await AuditRepository.getAuditForProject(
    input.auditId,
    input.projectId,
  );
  if (!audit) throw new AppError("NOT_FOUND");

  // Refuse until the crawl's issues are materialized: exporting before then (or
  // while a re-materialization has cleared the flag) would produce a `ready`
  // artifact of zero or partial rows stamped as authoritative.
  const snapshot = await AuditSnapshotRepository.getSnapshotForAudit(
    input.auditId,
  );
  if (!snapshot || snapshot.issuesMaterializedAt == null) {
    throw new AppError(
      "CONFLICT",
      "Issues are still being analyzed for this audit; try the export again shortly",
    );
  }

  // One export at a time per audit: a repeated trigger must not fan out into
  // several concurrent full-crawl builds, each writing a large object with no
  // sweep yet to reclaim it.
  if (await AuditExportRepository.hasActiveJobForAudit(input.auditId)) {
    throw new AppError(
      "CONFLICT",
      "An export for this audit is already being prepared",
    );
  }

  const jobId = crypto.randomUUID();
  await AuditExportRepository.createJob({
    id: jobId,
    auditId: input.auditId,
    projectId: input.projectId,
    organizationId: input.organizationId,
    filtersJson: JSON.stringify(cleanFilters(input.filters)),
    workflowInstanceId: jobId,
    createdByUserId: input.actorUserId,
  });

  try {
    await env.AUDIT_EXPORT_WORKFLOW.create({ id: jobId, params: { jobId } });
  } catch (error) {
    // The row was written but the async builder never started; drop it so a
    // permanently-queued job does not linger.
    await AuditExportRepository.deleteJob(jobId);
    throw error;
  }

  return { jobId };
}

async function listExports(input: {
  projectId: string;
  auditId: string;
}): Promise<AuditExportJobView[]> {
  const jobs = await AuditExportRepository.listJobsForAudit(
    input.auditId,
    input.projectId,
    20,
  );
  const now = new Date();
  return jobs.map((job) => toView(job, now));
}

interface ResolvedDownload {
  r2Key: string;
  auditId: string;
}

/**
 * The download endpoint's authorization + state check. Returns the R2 key only
 * when the caller's organization owns the job and the artifact is still
 * downloadable; every other case returns null so the route answers 404 without
 * disclosing why.
 */
async function resolveDownload(input: {
  organizationId: string;
  jobId: string;
}): Promise<ResolvedDownload | null> {
  const job = await AuditExportRepository.getJobForOrganization(
    input.jobId,
    input.organizationId,
  );
  if (!job || job.status !== "ready" || !job.r2Key) return null;
  if (isExpired(job, new Date())) return null;
  return { r2Key: job.r2Key, auditId: job.auditId };
}

export const AuditExportService = {
  requestExport,
  listExports,
  resolveDownload,
} as const;
