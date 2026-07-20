import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { getAuditIssueSummary } from "@/serverFunctions/audit-issues";
import { useLocale } from "@/client/i18n/I18nProvider";
import {
  compareSeverity,
  UNCOVERED_GROUPS_NOTE,
  type IssueFilters,
  type IssueFixText,
} from "@/client/features/audit/issues/issue-filters";
import { IssueGroupList } from "@/client/features/audit/issues/IssueGroupList";
import { IssueDetailDrawer } from "@/client/features/audit/issues/IssueDetailDrawer";

/**
 * How many times to re-ask before accepting that materialization is not coming.
 * At 4s apart this waits about two minutes — comfortably longer than the step
 * takes, and bounded so a genuinely failed audit does not poll a tab forever.
 */
const MATERIALIZATION_POLL_LIMIT = 30;

export interface SelectedRule {
  ruleId: string;
  label: string;
  urlCount: number;
  /**
   * Carried from the summary rather than read off the first occurrence: the
   * guidance must not disappear when the reader pages past the first page, and
   * a rule with no rows on the current page still has to explain itself.
   */
  fix: IssueFixText | null;
}

/**
 * All Issues: every rule the audit found a problem for, grouped, with the
 * affected URLs one click away.
 *
 * Three summary states are deliberately distinct. `materializedAt === null`
 * means issue analysis never ran (or died) for this crawl, which must never be
 * drawn as a clean result — the whole reason the timestamp is persisted. An
 * empty rollup list with a timestamp is a genuinely clean crawl. Anything else
 * is the grouped list.
 */
export function AllIssuesTab({
  auditId,
  projectId,
  filters,
  onFiltersChange,
}: {
  auditId: string;
  projectId: string;
  filters: IssueFilters;
  onFiltersChange: (filters: Partial<IssueFilters>) => void;
}) {
  const { locale } = useLocale();
  const [selectedRule, setSelectedRule] = useState<SelectedRule | null>(null);

  const summaryQuery = useQuery({
    queryKey: ["audit-issue-summary", projectId, auditId, locale],
    queryFn: () =>
      getAuditIssueSummary({ data: { projectId, auditId, locale } }),
    // Issue materialization is a workflow step that runs AFTER the audit is
    // marked completed, so an unanswered snapshot is the ordinary state for the
    // first seconds — exactly when someone watching the crawl opens this tab.
    // Poll until it resolves rather than leaving the app's 5-minute staleTime
    // to freeze a "didn't complete" message over a perfectly healthy audit.
    refetchInterval: (query) =>
      query.state.data?.materializedAt == null &&
      query.state.dataUpdateCount < MATERIALIZATION_POLL_LIMIT
        ? 4000
        : false,
    staleTime: 0,
  });

  if (summaryQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="loading loading-spinner loading-md" />
      </div>
    );
  }

  if (summaryQuery.isError || !summaryQuery.data) {
    return (
      <div className="alert alert-error">
        <AlertCircle className="size-5" />
        <span>We could not load the issues for this audit.</span>
      </div>
    );
  }

  const { materializedAt, rollups } = summaryQuery.data;

  if (materializedAt === null) {
    return <NotMaterializedState stillWaiting={summaryQuery.isFetching} />;
  }

  if (rollups.length === 0) {
    return <NoIssuesState />;
  }

  const sortedRollups = rollups.toSorted(
    (a, b) =>
      compareSeverity(a.severity, b.severity) || b.urlCount - a.urlCount,
  );

  return (
    <div className="space-y-4">
      <FirstCrawlNotice />

      <IssueGroupList
        rollups={sortedRollups}
        filters={filters}
        onFiltersChange={onFiltersChange}
        onSelectRule={setSelectedRule}
      />

      <p className="text-xs text-base-content/50">{UNCOVERED_GROUPS_NOTE}</p>

      {selectedRule && (
        <IssueDetailDrawer
          // Keyed by rule so opening a different issue remounts the drawer.
          // Without it the drawer keeps the previous rule's page number and
          // opens on page 3 of a list that may only have one page.
          key={selectedRule.ruleId}
          auditId={auditId}
          projectId={projectId}
          rule={selectedRule}
          onClose={() => setSelectedRule(null)}
        />
      )}
    </div>
  );
}

/**
 * Issue analysis runs after the crawl seals and is allowed to fail without
 * failing the audit, so an unanswered snapshot means either "still working" or
 * "gave up". Both report the same fact — we do not know yet — and neither is a
 * clean result. Only once polling has stopped is it fair to suggest a re-run.
 */
function NotMaterializedState({ stillWaiting }: { stillWaiting: boolean }) {
  return (
    <div className={stillWaiting ? "alert" : "alert alert-warning"}>
      {stillWaiting ? (
        <span className="loading loading-spinner loading-sm" />
      ) : (
        <AlertCircle className="size-5" />
      )}
      <div className="space-y-1">
        <p className="font-medium">
          {stillWaiting
            ? "Working out the issues for this crawl…"
            : "Issue analysis hasn't completed for this crawl."}
        </p>
        <p className="text-sm">
          {stillWaiting
            ? "The pages are crawled; the checks that turn them into a list of issues run just after. This updates on its own."
            : "The pages were crawled, but the checks that turn them into a list of issues did not finish. This is not a clean result — run the audit again to get one."}
        </p>
      </div>
    </div>
  );
}

function NoIssuesState() {
  return (
    <div className="space-y-4">
      <FirstCrawlNotice />
      <div className="alert alert-success">
        <CheckCircle2 className="size-5" />
        <div className="space-y-1">
          <p className="font-medium">No issues found.</p>
          <p className="text-sm">
            Every check this audit runs passed on every crawled page.
          </p>
        </div>
      </div>
      <p className="text-xs text-base-content/50">{UNCOVERED_GROUPS_NOTE}</p>
    </div>
  );
}

/**
 * There is exactly one crawl to report on, so there is nothing to compare
 * against. Saying so is better than showing change counters that would have to
 * be invented; real new/resolved counts arrive with audit history.
 */
function FirstCrawlNotice() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-base-300 bg-base-200/40 px-3 py-2 text-sm text-base-content/70">
      <Info className="size-4 shrink-0 mt-0.5" />
      <span>
        Findings from this crawl only. Comparing against a previous crawl —
        what's new, what's fixed — needs a second audit of this site.
      </span>
    </div>
  );
}
