import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import {
  getAuditPageChanges,
  getComparableSnapshots,
} from "@/serverFunctions/audit-issues";
import { BaselineSelector } from "@/client/features/audit/history/BaselineSelector";
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
        <Summary comparison={changes} />
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
                    {describeFieldChange(field)}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}

      {changes.truncated && (
        <p className="text-xs text-base-content/50">
          Showing the first {changes.changes.length} changed pages of{" "}
          {changes.totals.changedUrls.toLocaleString()}.
        </p>
      )}
    </div>
  );
}

function Summary({
  comparison,
}: {
  comparison: Extract<PageChangesComparison, { state: "comparable" }>;
}) {
  const { totals, window } = comparison;
  const highlights: string[] = [];
  if (totals.removedFromSitemap > 0) {
    highlights.push(`${totals.removedFromSitemap} removed from sitemap`);
  }
  if (totals.becameNoindex > 0) {
    highlights.push(`${totals.becameNoindex} became noindex`);
  }
  if (totals.statusChanged > 0) {
    highlights.push(`${totals.statusChanged} status changed`);
  }

  return (
    <div className="space-y-0.5">
      <p className="text-sm font-medium">
        {totals.changedUrls === 0
          ? "No page facts changed since the last crawl."
          : `${totals.changedUrls.toLocaleString()} ${
              totals.changedUrls === 1 ? "page" : "pages"
            } changed since ${crawlDate(window.from)}.`}
      </p>
      {highlights.length > 0 && (
        <p className="text-xs text-base-content/60">
          {highlights.join(" · ")} · Source: crawl
        </p>
      )}
    </div>
  );
}

function describeFieldChange(change: PageFieldChange): string {
  switch (change.kind) {
    case "removed-from-sitemap":
      return "Removed from sitemap";
    case "became-noindex":
      return "Became noindex";
    case "became-indexable":
      return "Became indexable";
    case "added":
      return `${fieldLabel(change.field)} added`;
    case "removed":
      return `${fieldLabel(change.field)} removed`;
    case "changed":
      return `${fieldLabel(change.field)} changed`;
    case "increased":
    case "decreased":
      return `${fieldLabel(change.field)} ${change.from} → ${change.to}`;
    default:
      return fieldLabel(change.field);
  }
}

/**
 * Human labels for the compared fields. The count fields say "H1 count" and
 * "word count" on purpose: the crawl stores counts, not the H1 text or the page
 * body, so calling them "H1" or "content" would claim a change it cannot see.
 */
function fieldLabel(field: PageFieldChange["field"]): string {
  switch (field) {
    case "title":
      return "Title";
    case "metaDescription":
      return "Meta description";
    case "canonicalUrl":
      return "Canonical";
    case "statusCode":
      return "Status";
    case "h1Count":
      return "H1 count";
    case "wordCount":
      return "Word count";
    case "isIndexable":
      return "Indexable";
    case "inSitemap":
      return "Sitemap";
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

function crawlDate(raw: string): string {
  return raw.slice(0, 10);
}
