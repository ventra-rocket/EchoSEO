import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Download, FileArchive, Loader2 } from "lucide-react";
import { useIntl } from "react-intl";
import { getAuditAccess } from "@/serverFunctions/audit";
import {
  listAuditExports,
  requestAuditExport,
} from "@/serverFunctions/audit-exports";
import type { AuditExportJobView } from "@/server/features/audit/services/AuditExportService";
import type { IssueFilters } from "@/client/features/audit/issues/issue-filters";
import {
  AUDIT_EXPORT_FORMATS,
  REPORT_LOCALES,
  type AuditExportFormat,
  type ReportLocale,
} from "@/shared/audit-export-format";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import type { MessageId } from "@/client/i18n/messages";

/** Export format labels — audit-export-specific, so they live beside the panel
 * rather than in `@/shared/audit-export-format`, which server code also reads. */
const FORMAT_LABEL_ID: Record<AuditExportFormat, MessageId> = {
  zip: "audit.exports.format.zip",
  pdf: "audit.exports.format.pdf",
  doc: "audit.exports.format.doc",
};

/** Report-language option labels. Endonyms — reuses the same ids the
 * top-bar LanguageSwitcher uses, so "English"/"Tiếng Việt" read identically
 * everywhere rather than drifting into a second translation. */
const REPORT_LOCALE_LABEL_ID: Record<ReportLocale, MessageId> = {
  en: "language.english",
  vi: "language.vietnamese",
};

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
  const intl = useIntl();
  const queryClient = useQueryClient();
  const listKey = ["audit-exports", projectId, auditId];
  // Report language. Only the rendered formats read it — the ZIP carries rule
  // ids, not prose — so the control sits beside the buttons that use it.
  const [reportLocale, setReportLocale] = useState<ReportLocale>("en");

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
    mutationFn: ({
      format,
      locale,
    }: {
      format: AuditExportFormat;
      locale: ReportLocale;
    }) =>
      requestAuditExport({
        data: {
          projectId,
          auditId,
          issueGroup: filters.group,
          severity: filters.severity,
          format,
          locale,
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
          {intl.formatMessage({ id: "audit.exports.heading" })}
          <span className="font-normal text-base-content/50">
            {intl.formatMessage({ id: "audit.exports.subheading" })}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="select select-bordered select-sm"
            aria-label={intl.formatMessage({
              id: "audit.exports.reportLanguageLabel",
            })}
            value={reportLocale}
            onChange={(event) => {
              // Narrow by lookup rather than assertion: the option values come
              // from this same list, so a miss means the markup drifted.
              const picked = REPORT_LOCALES.find(
                (option) => option === event.target.value,
              );
              if (picked) setReportLocale(picked);
            }}
          >
            {REPORT_LOCALES.map((option) => (
              <option key={option} value={option}>
                {intl.formatMessage({ id: REPORT_LOCALE_LABEL_ID[option] })}
              </option>
            ))}
          </select>
          {AUDIT_EXPORT_FORMATS.map((format) => (
            <button
              key={format}
              type="button"
              className="btn btn-outline btn-sm"
              disabled={request.isPending}
              onClick={() => request.mutate({ format, locale: reportLocale })}
            >
              {request.isPending && request.variables?.format === format && (
                <span className="loading loading-spinner loading-xs" />
              )}
              {intl.formatMessage({ id: FORMAT_LABEL_ID[format] })}
            </button>
          ))}
        </div>
      </div>

      {request.isError && (
        <div className="alert alert-error alert-sm">
          <AlertCircle className="size-4" />
          <span>
            {getStandardErrorMessage(
              request.error,
              intl.formatMessage({ id: "audit.exports.startError" }),
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
  const intl = useIntl();
  return (
    <li className="flex items-center gap-3 py-2">
      <span className="text-base-content/60 tabular-nums">
        {formatTime(job.createdAt)}
      </span>
      <span className="text-base-content/70">
        {intl.formatMessage({ id: FORMAT_LABEL_ID[job.format] })}
        {job.format === "zip"
          ? null
          : ` · ${intl.formatMessage({ id: REPORT_LOCALE_LABEL_ID[job.locale] })}`}
      </span>
      <StatusLabel job={job} />
      <span className="ml-auto">
        {job.downloadable ? (
          <a
            href={`/api/audit/exports/download?jobId=${encodeURIComponent(job.id)}`}
            className="btn btn-primary btn-xs"
          >
            <Download className="size-3.5" />
            {intl.formatMessage({ id: "audit.exports.download" })}
          </a>
        ) : null}
      </span>
    </li>
  );
}

function StatusLabel({ job }: { job: AuditExportJobView }) {
  const intl = useIntl();
  if (job.status === "queued" || job.status === "processing") {
    return (
      <span className="flex items-center gap-1 text-base-content/70">
        <Loader2 className="size-3.5 animate-spin" />
        {intl.formatMessage({ id: "audit.exports.status.building" })}
      </span>
    );
  }
  if (job.status === "failed") {
    return (
      <span className="text-error">
        {job.errorMessage ??
          intl.formatMessage({ id: "audit.exports.status.failedDefault" })}
      </span>
    );
  }
  if (
    job.status === "expired" ||
    (job.status === "ready" && !job.downloadable)
  ) {
    return (
      <span className="text-base-content/50">
        {intl.formatMessage({ id: "audit.exports.status.expired" })}
      </span>
    );
  }
  // ready + downloadable
  return (
    <span className="text-base-content/70 tabular-nums">
      {intl.formatMessage(
        { id: "audit.exports.status.issueCount" },
        { count: job.rowCount ?? 0 },
      )}
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
