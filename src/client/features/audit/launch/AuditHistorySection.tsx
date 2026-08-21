import { Link } from "@tanstack/react-router";
import { MoreHorizontal, ScanSearch, Trash2 } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import type { getAuditHistory } from "@/serverFunctions/audit";
import {
  parseAuditTimestamp,
  StatusBadge,
} from "@/client/features/audit/shared";

export function AuditHistorySection({
  projectId,
  history,
  isLoading,
  onDelete,
  canDelete,
}: {
  projectId: string;
  history: Awaited<ReturnType<typeof getAuditHistory>>;
  isLoading: boolean;
  onDelete: (auditId: string) => void;
  canDelete: boolean;
}) {
  const intl = useIntl();
  if (history.length === 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center text-base-content/40 space-y-3">
          <ScanSearch className="size-12 mx-auto opacity-30" />
          <p className="text-lg font-medium">
            <FormattedMessage id="audit.chrome.history.empty" />
          </p>
        </div>
      </div>
    );
  }

  if (history.length === 0) return null;

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body gap-3">
        <h2 className="card-title text-base">
          <FormattedMessage id="audit.chrome.history.title" />
        </h2>
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>
                  <FormattedMessage id="audit.chrome.history.columnDate" />
                </th>
                <th>
                  <FormattedMessage id="audit.chrome.history.columnUrl" />
                </th>
                <th>
                  <FormattedMessage id="audit.chrome.history.columnStatus" />
                </th>
                <th>
                  <FormattedMessage id="audit.chrome.history.columnPages" />
                </th>
                <th>
                  <FormattedMessage id="audit.chrome.history.columnLighthouse" />
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {history.map((audit) => (
                <tr key={audit.id} className="hover group">
                  <td className="text-xs text-base-content/70">
                    {intl.formatDate(parseAuditTimestamp(audit.startedAt), {
                      dateStyle: "medium",
                    })}
                  </td>
                  <td className="max-w-[220px] truncate">{audit.startUrl}</td>
                  <td>
                    <StatusBadge status={audit.status} />
                  </td>
                  {/* `pagesTotal` is the requested ceiling until the crawl
                      replaces it, so a run that fetched nothing used to
                      advertise 5,000 pages. Report what was crawled; while it
                      runs, show it against the current estimate. */}
                  <td>
                    {audit.status === "running"
                      ? `${audit.pagesCrawled} / ${audit.pagesTotal}`
                      : audit.pagesCrawled}
                  </td>
                  <td>
                    {audit.ranLighthouse ? (
                      <span className="badge badge-ghost badge-xs">
                        <FormattedMessage id="audit.chrome.history.yes" />
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <HistoryActions
                      projectId={projectId}
                      auditId={audit.id}
                      onDelete={onDelete}
                      canDelete={canDelete}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function HistoryActions({
  projectId,
  auditId,
  onDelete,
  canDelete,
}: {
  projectId: string;
  auditId: string;
  onDelete: (auditId: string) => void;
  canDelete: boolean;
}) {
  const intl = useIntl();
  return (
    <div className="flex items-center justify-end gap-2 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
      <Link
        to="/p/$projectId/audit"
        params={{ projectId }}
        search={{ auditId, tab: "pages" }}
        className="btn btn-primary btn-xs"
      >
        <FormattedMessage id="audit.chrome.history.view" />
      </Link>
      {/* Read-only members keep the View link but get no action the server
          would reject. */}
      <div className={`dropdown dropdown-end ${canDelete ? "" : "hidden"}`}>
        <div
          tabIndex={0}
          role="button"
          className="btn btn-ghost btn-xs btn-square"
          aria-label={intl.formatMessage({
            id: "audit.chrome.history.actionsLabel",
          })}
        >
          <MoreHorizontal className="size-3.5" />
        </div>
        <ul
          tabIndex={0}
          className="dropdown-content z-10 menu p-2 shadow-lg bg-base-100 border border-base-300 rounded-box w-40"
        >
          <li>
            <button
              className="text-error"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(auditId);
              }}
            >
              <Trash2 className="size-3.5" />
              <FormattedMessage id="audit.chrome.history.delete" />
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
