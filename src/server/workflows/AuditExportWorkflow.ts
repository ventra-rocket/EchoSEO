/**
 * Cloudflare Workflow that builds an audit issue export off the critical path.
 *
 * The whole artifact — CSV + JSON + manifest, zipped — is produced and written
 * to R2 inside a single step so the multi-megabyte buffer never becomes a
 * durable step output (Workflows cap those at 1 MiB). R2 is written before the
 * D1 `ready` commit, so a `ready` job always has a readable object. A missing
 * job or a build error marks the job `failed` with a generic message; the real
 * cause only goes to the log.
 */
import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import { z } from "zod";
import { strToU8, zipSync } from "fflate";
import { AuditExportRepository } from "@/server/features/audit/repositories/AuditExportRepository";
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import { AuditIssueRepository } from "@/server/features/audit/repositories/AuditIssueRepository";
import {
  buildIssuesExport,
  type ExportOccurrence,
} from "@/server/features/audit/exports/audit-export-build";
import { collectExportRows } from "@/server/features/audit/exports/audit-export-collect";
import { putAuditExport } from "@/server/features/audit/exports/audit-export-store";

const FAILURE_MESSAGE = "The export could not be generated.";

/** How long a generated artifact stays downloadable before the retention sweep. */
const EXPORT_RETENTION_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Occurrences pulled per page while assembling the export. */
const OCCURRENCE_PAGE_SIZE = 500;
/**
 * Hard ceiling on exported rows. Issue occurrences scale with pages × rules, so
 * a very large crawl is bounded rather than allowed to build an unbounded buffer
 * in one step. Hitting it sets `truncated` in the manifest — the export is
 * capped honestly, never silently short.
 */
const MAX_EXPORT_ROWS = 50_000;

interface AuditExportParams {
  jobId: string;
}

/** The slice of `WorkflowStep` this run uses — lets tests pass a plain fake. */
interface AuditExportStep {
  do<T>(name: string, callback: () => Promise<T> | T): Promise<T>;
}

// Only the known filter keys are read off stored JSON; anything else is ignored.
const storedFiltersSchema = z.object({
  issueGroup: z.string().min(1).optional(),
  severity: z.string().min(1).optional(),
  ruleId: z.string().min(1).optional(),
  urlContains: z.string().min(1).optional(),
});

type OccurrenceFilters = z.infer<typeof storedFiltersSchema>;

function parseFilters(filtersJson: string): OccurrenceFilters {
  let raw: unknown;
  try {
    raw = JSON.parse(filtersJson);
  } catch {
    return {};
  }
  const parsed = storedFiltersSchema.safeParse(raw);
  return parsed.success ? parsed.data : {};
}

/** Filters as a flat string map for the manifest (only the keys that are set). */
function filtersForManifest(
  filters: OccurrenceFilters,
): Record<string, string> {
  const entries = Object.entries(filters).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );
  return Object.fromEntries(entries);
}

export async function runAuditExport(
  step: AuditExportStep,
  params: AuditExportParams,
): Promise<void> {
  const { jobId } = params;

  try {
    await step.do("mark-processing", () =>
      AuditExportRepository.markProcessing(jobId),
    );

    // Build the CSV/JSON/manifest, zip, and store in one step: the ZIP buffer
    // stays transient and never crosses a step boundary (1 MiB cap). Only small
    // values are read back after.
    await step.do("build-and-store", async () => {
      const job = await AuditExportRepository.getJobById(jobId);
      if (!job) {
        // The row is gone (deleted mid-flight); nothing to build and a retry
        // can't recover it.
        throw new NonRetryableError(`Export job ${jobId} not found`);
      }

      const audit = await AuditRepository.getAuditForProject(
        job.auditId,
        job.projectId,
      );
      if (!audit) {
        throw new NonRetryableError(`Audit ${job.auditId} not found`);
      }
      const snapshot = await AuditRepository.getSnapshotForAudit(job.auditId);
      const filters = parseFilters(job.filtersJson);

      const { rows, truncated } = await collectExportRows({
        fetchPage: (limit, offset) =>
          AuditIssueRepository.listOccurrences({
            auditId: job.auditId,
            issueGroup: filters.issueGroup,
            severity: filters.severity,
            ruleId: filters.ruleId,
            urlContains: filters.urlContains,
            limit,
            offset,
          }),
        pageSize: OCCURRENCE_PAGE_SIZE,
        maxRows: MAX_EXPORT_ROWS,
      });
      const occurrences: ExportOccurrence[] = rows.map((row) => ({
        url: row.url,
        ruleId: row.ruleId,
        issueGroup: row.issueGroup,
        severity: row.severity,
        status: row.status,
        ruleVersion: row.ruleVersion,
        evidenceJson: row.evidenceJson,
      }));

      const built = buildIssuesExport({
        occurrences,
        auditId: job.auditId,
        startUrl: audit.startUrl,
        snapshotSealedAt: snapshot?.sealedAt ?? null,
        exportedAt: new Date().toISOString(),
        filters: filtersForManifest(filters),
        truncated,
      });

      const zip = zipSync({
        "issues.csv": strToU8(built.csv),
        "issues.json": strToU8(built.json),
        "manifest.json": strToU8(built.manifest),
      });

      const r2Key = await putAuditExport(jobId, zip);
      const now = new Date();
      await AuditExportRepository.markReady({
        jobId,
        r2Key,
        rowCount: built.manifestData.rowCount,
        sizeBytes: zip.length,
        readyAt: now.toISOString(),
        expiresAt: new Date(
          now.getTime() + EXPORT_RETENTION_DAYS * DAY_MS,
        ).toISOString(),
      });
    });
  } catch (error) {
    console.error(`Audit export ${jobId} failed:`, error);
    await step.do("mark-failed", () =>
      AuditExportRepository.markFailed(jobId, FAILURE_MESSAGE),
    );
    throw error;
  }
}

export class AuditExportWorkflow extends WorkflowEntrypoint<
  Env,
  AuditExportParams
> {
  async run(
    event: WorkflowEvent<AuditExportParams>,
    step: WorkflowStep,
  ): Promise<void> {
    await runAuditExport(step, event.payload);
  }
}
