import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Download, FileArchive, Loader2 } from "lucide-react";
import { getAuditAccess } from "@/serverFunctions/audit";
import {
  listAuditExports,
  requestAuditExport,
} from "@/serverFunctions/audit-exports";
import type { AuditExportJobView } from "@/server/features/audit/services/AuditExportService";
import type { IssueFilters } from "@/client/features/audit/issues/issue-filters";
import { getStandardErrorMessage } from "@/client/lib/error-messages";

/**
 * Request and download issue exports for an audit.
 *
 * An export bundles the current (filtered) issue view into a ZIP built
 * asynchronously by a Workflow and stored in private R2. The panel shows recent
 * jobs and a download link once a job is ready; the link addresses the artifact
 * by job id through the authorized endpoint, never an R2 URL. Only a caller who
 * can investigate sees the trigger.
 */
export function AuditExportPanel({
  auditId,
  projectId,
  filters,
}: {
  auditId: string;
  projectId: string;
  filters: IssueFilters;
}) {
  const queryClient = useQueryClient();
  const listKey = ["audit-exports", projectId, auditId];

  const access = useQuery({
    queryKey: ["audit-access", projectId],
    queryFn: () => getAuditAccess({ data: { projectId } }),
  });

  const jobs = useQuery({
    queryKey: listKey,
    queryFn: () => listAuditExports({ data: { projectId, auditId } }),
    // Poll only while a build is in flight AND still recent: a job wedged in
    // queued/processing (a terminated instance, a deploy mid-build) must not
    // make this tab poll forever. Stale non-ready jobs are reconciled by the
    // retention sweep in a later slice.
    refetchInterval: (query) =>
      (query.state.data ?? []).some(
        (job) =>
          (job.status === "queued" || job.status === "processing") &&
          isRecent(job.createdAt),
      )
        ? 3000
        : false,
  });

  const request = useMutation({
    mutationFn: () =>
      requestAuditExport({
        data: {
          projectId,
          auditId,
          issueGroup: filters.group,
          severity: filters.severity,
        },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listKey }),
  });

  if (!access.data?.canLaunch) return null;

  const list = jobs.data ?? [];

  return (
    <div className="rounded-lg border border-base-300 bg-base-200/40 p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <FileArchive className="size-4" />
          Export issues
          <span className="font-normal text-base-content/50">
            current view · CSV + JSON + manifest (ZIP)
          </span>
        </div>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          disabled={request.isPending}
          onClick={() => request.mutate()}
        >
          {request.isPending && (
            <span className="loading loading-spinner loading-xs" />
          )}
          Export
        </button>
      </div>

      {request.isError && (
        <div className="alert alert-error alert-sm">
          <AlertCircle className="size-4" />
          <span>
            {getStandardErrorMessage(
              request.error,
              "Could not start the export",
            )}
          </span>
        </div>
      )}

      {list.length > 0 && (
        <ul className="divide-y divide-base-300 text-sm">
          {list.map((job) => (
            <ExportRow key={job.id} job={job} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ExportRow({ job }: { job: AuditExportJobView }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="text-base-content/60 tabular-nums">
        {formatTime(job.createdAt)}
      </span>
      <StatusLabel job={job} />
      <span className="ml-auto">
        {job.downloadable ? (
          <a
            href={`/api/audit/exports/download?jobId=${encodeURIComponent(job.id)}`}
            className="btn btn-primary btn-xs"
          >
            <Download className="size-3.5" />
            Download
          </a>
        ) : null}
      </span>
    </li>
  );
}

function StatusLabel({ job }: { job: AuditExportJobView }) {
  if (job.status === "queued" || job.status === "processing") {
    return (
      <span className="flex items-center gap-1 text-base-content/70">
        <Loader2 className="size-3.5 animate-spin" />
        Building…
      </span>
    );
  }
  if (job.status === "failed") {
    return <span className="text-error">{job.errorMessage ?? "Failed"}</span>;
  }
  if (
    job.status === "expired" ||
    (job.status === "ready" && !job.downloadable)
  ) {
    return <span className="text-base-content/50">Expired</span>;
  }
  // ready + downloadable
  return (
    <span className="text-base-content/70 tabular-nums">
      {job.rowCount ?? 0} {job.rowCount === 1 ? "issue" : "issues"}
    </span>
  );
}

/** Stop polling a build that has been in flight longer than this. */
const ACTIVE_POLL_MAX_AGE_MS = 15 * 60 * 1000;

function isRecent(createdAt: string): boolean {
  // createdAt is D1's UTC `YYYY-MM-DD HH:MM:SS`; parse it as UTC to compare.
  const ms = Date.parse(`${createdAt.replace(" ", "T")}Z`);
  return Number.isFinite(ms) && Date.now() - ms < ACTIVE_POLL_MAX_AGE_MS;
}

function formatTime(iso: string): string {
  // createdAt may be a SQLite `YYYY-MM-DD HH:MM:SS` string; show the date + time
  // without assuming a timezone-suffixed ISO value.
  return iso.replace("T", " ").slice(0, 16);
}
