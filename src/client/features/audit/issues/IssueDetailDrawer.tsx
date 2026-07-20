import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { AlertCircle, ExternalLink, X } from "lucide-react";
import { listAuditIssues } from "@/serverFunctions/audit-issues";
import {
  ISSUES_PAGE_SIZE,
  totalPageCount,
  toOffset,
  type IssueFixText,
} from "@/client/features/audit/issues/issue-filters";
import { IssueEvidenceTable } from "@/client/features/audit/issues/IssueEvidenceTable";
import type { SelectedRule } from "@/client/features/audit/issues/AllIssuesTab";

/**
 * One rule's affected URLs plus its remediation guidance.
 *
 * The fix steps, the quote and the source link all come from the rule catalog
 * via the server — this panel never writes advice of its own, so what a reader
 * acts on stays traceable to the Google documentation the rule cites.
 *
 * Paging is server-side: a large crawl can produce far more occurrences than
 * belong in a browser.
 */
export function IssueDetailDrawer({
  auditId,
  projectId,
  rule,
  onClose,
}: {
  auditId: string;
  projectId: string;
  rule: SelectedRule;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);

  // A panel that covers the screen has to be dismissible from the keyboard,
  // not only by finding the backdrop.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const query = useQuery({
    queryKey: [
      "audit-issue-occurrences",
      projectId,
      auditId,
      rule.ruleId,
      page,
    ],
    queryFn: () =>
      listAuditIssues({
        data: {
          projectId,
          auditId,
          ruleId: rule.ruleId,
          limit: ISSUES_PAGE_SIZE,
          offset: toOffset(page),
        },
      }),
    placeholderData: keepPreviousData,
  });

  const occurrences = query.data?.occurrences ?? [];
  // `total` falls back to the summary's count so the header does not flash "0
  // affected URLs" while the first page is still loading.
  const total = query.data?.total ?? rule.urlCount;
  const pageCount = totalPageCount(total);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={rule.label}
    >
      <button
        type="button"
        aria-label="Close issue details"
        className="flex-1 bg-black/40"
        onClick={onClose}
      />

      <aside className="w-full max-w-3xl overflow-y-auto bg-base-100 shadow-xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-base-300 bg-base-100 px-4 py-3">
          <div className="space-y-0.5">
            <h3 className="font-medium">{rule.label}</h3>
            <p className="text-sm text-base-content/60">
              {total.toLocaleString()} affected {total === 1 ? "URL" : "URLs"}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="space-y-4 p-4">
          {rule.fix && <RemediationPanel fix={rule.fix} />}

          {query.isError ? (
            <div className="alert alert-error">
              <AlertCircle className="size-5" />
              <span>We could not load the affected URLs.</span>
            </div>
          ) : query.isLoading ? (
            <div className="flex justify-center py-10">
              <span className="loading loading-spinner loading-md" />
            </div>
          ) : (
            <>
              <IssueEvidenceTable occurrences={occurrences} />
              {pageCount > 1 && (
                <Pagination
                  page={page}
                  pageCount={pageCount}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function RemediationPanel({ fix }: { fix: IssueFixText }) {
  return (
    <section className="space-y-3 rounded-lg border border-base-300 bg-base-200/40 p-4">
      <p className="text-sm">{fix.problem}</p>

      <div>
        <h4 className="mb-1 text-sm font-medium">How to fix it</h4>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {fix.fixSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <blockquote className="border-l-2 border-base-content/20 pl-3 text-sm italic text-base-content/70">
        &ldquo;{fix.guideQuote}&rdquo;
      </blockquote>

      <div className="flex flex-wrap items-center gap-3 text-xs text-base-content/60">
        <a
          href={fix.googleSourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="link link-primary inline-flex items-center gap-1"
        >
          Google documentation
          <ExternalLink className="size-3" />
        </a>
        <span>Source last checked {fix.lastReviewedDate}</span>
        {/* Some rules have no translation yet. Saying so beats letting English
            text pass as the reader's language. */}
        {!fix.localized && <span>(guidance shown in English)</span>}
      </div>
    </section>
  );
}

function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-base-content/60">
        Page {page} of {pageCount}
      </span>
      <div className="join">
        <button
          type="button"
          className="btn btn-sm join-item"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn btn-sm join-item"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
