import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FormattedMessage } from "react-intl";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import {
  getAuditIssueComparison,
  getAuditIssueSummary,
  getComparableSnapshots,
} from "@/serverFunctions/audit-issues";
import { useLocale } from "@/client/i18n/I18nProvider";
import {
  compareSeverity,
  type IssueFilters,
  type IssueFixText,
} from "@/client/features/audit/issues/issue-filters";
import { IssueGroupList } from "@/client/features/audit/issues/IssueGroupList";
import { IssueDetailDrawer } from "@/client/features/audit/issues/IssueDetailDrawer";
import { ComparisonBar } from "@/client/features/audit/history/ComparisonBar";
import { BaselineSelector } from "@/client/features/audit/history/BaselineSelector";
import { AuditExportPanel } from "@/client/features/audit/exports/AuditExportPanel";

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
 * affected URLs one click away, and — once a second crawl exists — what changed
 * since a chosen baseline.
 *
 * Three summary states are deliberately distinct. `materializedAt === null`
 * means issue analysis never ran (or died) for this crawl, which must never be
 * drawn as a clean result — the whole reason the timestamp is persisted. An
 * empty rollup list with a timestamp is a genuinely clean crawl. Anything else
 * is the grouped list. The comparison bar layers a further distinction on top:
 * first-crawl vs not-yet-comparable vs a real delta.
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
  // undefined = let the server auto-pick the most recent comparable prior crawl.
  const [baselineAuditId, setBaselineAuditId] = useState<string | undefined>(
    undefined,
  );

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

  const isMaterialized = summaryQuery.data?.materializedAt != null;

  // Both comparison reads wait for materialization: before it, there is nothing
  // to diff and the summary is still polling. They degrade independently of the
  // issue list — a failed comparison just hides the bar, never the issues.
  const comparisonQuery = useQuery({
    queryKey: [
      "audit-issue-comparison",
      projectId,
      auditId,
      baselineAuditId ?? "auto",
      locale,
    ],
    queryFn: () =>
      getAuditIssueComparison({
        data: { projectId, auditId, baselineAuditId, locale },
      }),
    enabled: isMaterialized,
  });

  const snapshotsQuery = useQuery({
    queryKey: ["audit-comparable-snapshots", projectId, auditId],
    queryFn: () => getComparableSnapshots({ data: { projectId, auditId } }),
    enabled: isMaterialized,
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
        <span>
          <FormattedMessage id="audit.issues.loadError" />
        </span>
      </div>
    );
  }

  const { materializedAt, rollups } = summaryQuery.data;

  if (materializedAt === null) {
    return <NotMaterializedState stillWaiting={summaryQuery.isFetching} />;
  }

  const comparison = comparisonQuery.data;
  const snapshots = snapshotsQuery.data ?? [];
  const deltaByRule =
    comparison?.state === "comparable" ? comparison.byRule : undefined;

  const sortedRollups = rollups.toSorted(
    (a, b) =>
      compareSeverity(a.severity, b.severity) || b.urlCount - a.urlCount,
  );

  return (
    <div className="space-y-4">
      {/* Renders nothing until a valid earlier crawl exists to compare against. */}
      <BaselineSelector
        snapshots={snapshots}
        value={baselineAuditId}
        onChange={setBaselineAuditId}
      />

      <ComparisonBar
        comparison={comparison}
        isLoading={comparisonQuery.isFetching}
        isError={comparisonQuery.isError}
      />

      {rollups.length === 0 ? (
        <div className="alert alert-success">
          <CheckCircle2 className="size-5" />
          <div className="space-y-1">
            <p className="font-medium">
              <FormattedMessage id="audit.issues.none.title" />
            </p>
            <p className="text-sm">
              <FormattedMessage id="audit.issues.none.body" />
            </p>
          </div>
        </div>
      ) : (
        <>
          <AuditExportPanel
            auditId={auditId}
            projectId={projectId}
            filters={filters}
          />
          <IssueGroupList
            rollups={sortedRollups}
            deltaByRule={deltaByRule}
            filters={filters}
            onFiltersChange={onFiltersChange}
            onSelectRule={setSelectedRule}
          />
        </>
      )}

      <p className="text-xs text-base-content/50">
        <FormattedMessage id="audit.issues.uncoveredNote" />
      </p>

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
          <FormattedMessage
            id={
              stillWaiting
                ? "audit.issues.notMaterialized.waitingTitle"
                : "audit.issues.notMaterialized.failedTitle"
            }
          />
        </p>
        <p className="text-sm">
          <FormattedMessage
            id={
              stillWaiting
                ? "audit.issues.notMaterialized.waitingBody"
                : "audit.issues.notMaterialized.failedBody"
            }
          />
        </p>
      </div>
    </div>
  );
}
