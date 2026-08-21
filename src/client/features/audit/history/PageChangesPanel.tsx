import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useIntl, type IntlShape } from "react-intl";
import {
  getAuditPageChanges,
  getComparableSnapshots,
} from "@/serverFunctions/audit-issues";
import { BaselineSelector } from "@/client/features/audit/history/BaselineSelector";
import { parseAuditTimestamp } from "@/client/features/audit/shared";
import type {
  PageChangesComparison,
  ComparableSnapshot,
} from "@/server/features/audit/services/AuditComparisonService";
import type { PageFieldChange } from "@/server/features/audit/history/page-changes";

/**
 * "What changed on these pages since a baseline crawl", shown above the Pages
 * table. Reports only facts the crawl actually stores: title/meta text,
 * H1/word COUNTS (never the text — the crawl keeps no H1 or body content),
 * status, canonical, indexability, and sitemap membership. Every value is
 * crawl-derived and labelled so.
 *
 * Only URLs present in both crawls are compared; a page missing from the newer
 * crawl is not called "removed" (it may have hit the crawl cap), and a new URL
 * is not called "added".
 */
export function PageChangesPanel({
  auditId,
  projectId,
}: {
  auditId: string;
  projectId: string;
}) {
  const intl = useIntl();
  // undefined = auto-pick the most recent prior sealed crawl.
  const [baselineAuditId, setBaselineAuditId] = useState<string | undefined>(
    undefined,
  );

  const snapshotsQuery = useQuery({
    queryKey: ["audit-comparable-snapshots", projectId, auditId],
    queryFn: () => getComparableSnapshots({ data: { projectId, auditId } }),
  });

  const changesQuery = useQuery({
    queryKey: [
      "audit-page-changes",
      projectId,
      auditId,
      baselineAuditId ?? "auto",
    ],
    queryFn: () =>
      getAuditPageChanges({ data: { projectId, auditId, baselineAuditId } }),
    // Keep the previous result visible while switching baseline so the panel
    // does not blank and drop the selector mid-change. The selector only offers
    // valid priors, so a deterministic NOT_FOUND is not worth retrying.
    placeholderData: keepPreviousData,
    retry: false,
  });

  const changes = changesQuery.data;
  // Nothing to show until there is a prior crawl to compare against. Loading and
  // the single-snapshot state both render nothing, keeping the Pages tab clean.
  if (!changes || changes.state !== "comparable") return null;

  const snapshots: ComparableSnapshot[] = snapshotsQuery.data ?? [];

  return (
    <div className="rounded-lg border border-base-300 bg-base-200/40 p-3 space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <Summary comparison={changes} intl={intl} />
        <BaselineSelector
          snapshots={snapshots}
          value={baselineAuditId}
          onChange={setBaselineAuditId}
          // Page facts are sealed regardless of issue materialization, so any
          // earlier crawl is a valid baseline here.
          requireMaterialized={false}
        />
      </div>

      {changes.changes.length > 0 && (
        <ul className="divide-y divide-base-300 rounded-md border border-base-300 bg-base-100">
          {changes.changes.map((change) => (
            <li
              key={change.url}
              className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:gap-3"
            >
              <span className="flex min-w-0 items-center gap-1 text-sm">
                <span className="truncate">{change.url}</span>
                {change.safeUrl && (
                  <a
                    href={change.safeUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="shrink-0 text-base-content/40 hover:text-base-content"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </span>
              <span className="flex flex-wrap gap-1 sm:ml-auto">
                {change.fields.map((field, index) => (
                  <span
                    key={`${field.field}-${index}`}
                    className={`badge badge-sm ${badgeClass(field)}`}
                  >
                    {describeFieldChange(field, intl)}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}

      {changes.truncated && (
        <p className="text-xs text-base-content/50">
          {intl.formatMessage(
            { id: "audit.history.pageChanges.truncated" },
            {
              shown: changes.changes.length,
              total: intl.formatNumber(changes.totals.changedUrls),
            },
          )}
        </p>
      )}
    </div>
  );
}

function Summary({
  comparison,
  intl,
}: {
  comparison: Extract<PageChangesComparison, { state: "comparable" }>;
  intl: IntlShape;
}) {
  const { totals, window } = comparison;
  const highlights: string[] = [];
  if (totals.removedFromSitemap > 0) {
    highlights.push(
      intl.formatMessage(
        { id: "audit.history.pageChanges.highlightRemovedFromSitemap" },
        { count: totals.removedFromSitemap },
      ),
    );
  }
  if (totals.becameNoindex > 0) {
    highlights.push(
      intl.formatMessage(
        { id: "audit.history.pageChanges.highlightBecameNoindex" },
        { count: totals.becameNoindex },
      ),
    );
  }
  if (totals.statusChanged > 0) {
    highlights.push(
      intl.formatMessage(
        { id: "audit.history.pageChanges.highlightStatusChanged" },
        { count: totals.statusChanged },
      ),
    );
  }

  return (
    <div className="space-y-0.5">
      <p className="text-sm font-medium">
        {totals.changedUrls === 0
          ? intl.formatMessage({ id: "audit.history.pageChanges.summaryNone" })
          : intl.formatMessage(
              { id: "audit.history.pageChanges.summaryChanged" },
              {
                count: totals.changedUrls,
                date: intl.formatDate(parseAuditTimestamp(window.from), {
                  dateStyle: "medium",
                }),
              },
            )}
      </p>
      {highlights.length > 0 && (
        <p className="text-xs text-base-content/60">
          {highlights.join(" · ")} ·{" "}
          {intl.formatMessage({ id: "audit.history.sourceCrawl" })}
        </p>
      )}
    </div>
  );
}

function describeFieldChange(change: PageFieldChange, intl: IntlShape): string {
  switch (change.kind) {
    case "removed-from-sitemap":
      return intl.formatMessage({
        id: "audit.history.pageChanges.field.removedFromSitemap",
      });
    case "became-noindex":
      return intl.formatMessage({
        id: "audit.history.pageChanges.field.becameNoindex",
      });
    case "became-indexable":
      return intl.formatMessage({
        id: "audit.history.pageChanges.field.becameIndexable",
      });
    case "added":
      return intl.formatMessage(
        { id: "audit.history.pageChanges.field.added" },
        { field: fieldLabel(change.field, intl) },
      );
    case "removed":
      return intl.formatMessage(
        { id: "audit.history.pageChanges.field.removed" },
        { field: fieldLabel(change.field, intl) },
      );
    case "changed":
      return intl.formatMessage(
        { id: "audit.history.pageChanges.field.changed" },
        { field: fieldLabel(change.field, intl) },
      );
    case "increased":
    case "decreased":
      return intl.formatMessage(
        { id: "audit.history.pageChanges.field.rangeChange" },
        {
          field: fieldLabel(change.field, intl),
          from: change.from,
          to: change.to,
        },
      );
    default:
      return fieldLabel(change.field, intl);
  }
}

/**
 * Human labels for the compared fields. The count fields say "H1 count" and
 * "word count" on purpose: the crawl stores counts, not the H1 text or the page
 * body, so calling them "H1" or "content" would claim a change it cannot see.
 */
function fieldLabel(field: PageFieldChange["field"], intl: IntlShape): string {
  switch (field) {
    case "title":
      return intl.formatMessage({
        id: "audit.history.pageChanges.fieldLabel.title",
      });
    case "metaDescription":
      return intl.formatMessage({
        id: "audit.history.pageChanges.fieldLabel.metaDescription",
      });
    case "canonicalUrl":
      return intl.formatMessage({
        id: "audit.history.pageChanges.fieldLabel.canonicalUrl",
      });
    case "statusCode":
      return intl.formatMessage({
        id: "audit.history.pageChanges.fieldLabel.statusCode",
      });
    case "h1Count":
      return intl.formatMessage({
        id: "audit.history.pageChanges.fieldLabel.h1Count",
      });
    case "wordCount":
      return intl.formatMessage({
        id: "audit.history.pageChanges.fieldLabel.wordCount",
      });
    case "isIndexable":
      return intl.formatMessage({
        id: "audit.history.pageChanges.fieldLabel.isIndexable",
      });
    case "inSitemap":
      return intl.formatMessage({
        id: "audit.history.pageChanges.fieldLabel.inSitemap",
      });
    default:
      return field;
  }
}

function badgeClass(change: PageFieldChange): string {
  if (
    change.kind === "removed-from-sitemap" ||
    change.kind === "became-noindex"
  ) {
    return "badge-warning";
  }
  if (change.field === "statusCode") return "badge-warning";
  return "badge-ghost";
}
