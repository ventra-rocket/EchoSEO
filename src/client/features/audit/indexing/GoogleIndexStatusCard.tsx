import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink, Loader2, Search } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import { getAuditIndexStatus, inspectAuditUrl } from "@/serverFunctions/audit";

/**
 * Google index-status for an audit's pages plus honest Search Console deep links.
 * Everything here is read-only: inspection reports Google's current verdict, and
 * indexing/sitemap changes are manual Search Console actions reached by link —
 * there is no "submit to Google" button, because the grant is read-only and that
 * would misrepresent what happens. The inspect control is shown only to roles
 * that may investigate (`canInspect`); the context is readable by any member.
 */
export function GoogleIndexStatusCard({
  projectId,
  auditId,
  canInspect,
}: {
  projectId: string;
  auditId: string;
  canInspect: boolean;
}) {
  const contextQuery = useQuery({
    queryKey: ["audit-index-status", projectId, auditId],
    queryFn: () => getAuditIndexStatus({ data: { projectId, auditId } }),
  });

  const context = contextQuery.data;
  if (!context) return null;

  return (
    <div className="card border border-base-300 bg-base-100">
      <div className="card-body gap-3 p-4">
        <div>
          <h2 className="font-medium">
            <FormattedMessage id="audit.indexing.heading" />
          </h2>
          <p className="text-xs text-base-content/60">
            <FormattedMessage id="audit.indexing.description" />
          </p>
        </div>

        {context.state === "not_connected" && (
          <p className="text-sm text-base-content/60">
            <FormattedMessage id="audit.indexing.notConnected" />
          </p>
        )}

        {context.state === "property_mismatch" && (
          <p className="text-sm text-base-content/60">
            <FormattedMessage
              id="audit.indexing.propertyMismatch"
              values={{
                property: context.property,
                mono: (chunks) => <span className="font-mono">{chunks}</span>,
              }}
            />
          </p>
        )}

        {context.state === "ready" && (
          <ReadyBody
            projectId={projectId}
            auditId={auditId}
            canInspect={canInspect}
            property={context.property}
            sitemapsDeepLink={context.sitemapsDeepLink}
            startUrl={context.startUrl}
            missingFromSitemapCount={context.missingFromSitemapCount}
          />
        )}
      </div>
    </div>
  );
}

function ReadyBody({
  projectId,
  auditId,
  canInspect,
  property,
  sitemapsDeepLink,
  startUrl,
  missingFromSitemapCount,
}: {
  projectId: string;
  auditId: string;
  canInspect: boolean;
  property: string;
  sitemapsDeepLink: string;
  startUrl: string;
  missingFromSitemapCount: number;
}) {
  const intl = useIntl();
  const [url, setUrl] = useState(startUrl);

  const inspect = useMutation({
    mutationFn: (target: string) =>
      inspectAuditUrl({ data: { projectId, auditId, url: target } }),
  });

  const result = inspect.data;

  return (
    <div className="space-y-3">
      <p className="text-xs text-base-content/60">
        <FormattedMessage
          id="audit.indexing.propertyLabel"
          values={{
            property,
            mono: (chunks) => <span className="font-mono">{chunks}</span>,
          }}
        />
      </p>

      {canInspect && (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = url.trim();
            if (trimmed) inspect.mutate(trimmed);
          }}
        >
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.currentTarget.value)}
            className="input input-bordered input-sm flex-1"
            aria-label={intl.formatMessage({
              id: "audit.indexing.urlInputLabel",
            })}
          />
          <button
            type="submit"
            className="btn btn-sm btn-primary gap-2"
            disabled={inspect.isPending}
          >
            {inspect.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
            <FormattedMessage id="audit.indexing.checkButton" />
          </button>
        </form>
      )}

      {inspect.isError && (
        <p className="text-xs text-error">
          <FormattedMessage id="audit.indexing.inspectError" />
        </p>
      )}

      {result && <InspectionResult result={result} />}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <a
          className="link link-primary inline-flex items-center gap-1"
          href={sitemapsDeepLink}
          target="_blank"
          rel="noreferrer"
        >
          <FormattedMessage id="audit.indexing.manageSitemaps" />
          <ExternalLink className="size-3.5" />
        </a>
        {missingFromSitemapCount > 0 && (
          <span className="text-xs text-base-content/60">
            <FormattedMessage
              id="audit.indexing.missingFromSitemap"
              values={{ count: missingFromSitemapCount }}
            />
          </span>
        )}
      </div>
    </div>
  );
}

function InspectionResult({
  result,
}: {
  result: Awaited<ReturnType<typeof inspectAuditUrl>>;
}) {
  const intl = useIntl();

  if (result.state === "invalid_url") {
    return (
      <p className="text-xs text-warning">
        <FormattedMessage id="audit.indexing.invalidUrl" />
      </p>
    );
  }
  if (result.state === "not_connected") {
    return (
      <p className="text-xs text-warning">
        <FormattedMessage id="audit.indexing.inspectNotConnected" />
      </p>
    );
  }
  if (result.state === "property_mismatch") {
    return (
      <p className="text-xs text-warning">
        <FormattedMessage id="audit.indexing.inspectPropertyMismatch" />
      </p>
    );
  }
  if (result.state === "inspect_failed") {
    return (
      <p className="text-xs text-warning">
        <FormattedMessage id="audit.indexing.inspectFailed" />
      </p>
    );
  }

  const { inspection } = result;
  return (
    <div className="rounded border border-base-300 bg-base-200/40 p-3 text-sm">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <Row
          label={intl.formatMessage({ id: "audit.indexing.rowCoverage" })}
          value={inspection.coverageState}
        />
        <Row
          label={intl.formatMessage({ id: "audit.indexing.rowVerdict" })}
          value={inspection.verdict}
        />
        <Row
          label={intl.formatMessage({ id: "audit.indexing.rowIndexing" })}
          value={inspection.indexingState}
        />
        <Row
          label={intl.formatMessage({ id: "audit.indexing.rowLastCrawl" })}
          value={inspection.lastCrawlTime}
        />
      </dl>
      {inspection.inspectionResultLink && (
        <a
          className="link link-primary mt-2 inline-flex items-center gap-1 text-xs"
          href={inspection.inspectionResultLink}
          target="_blank"
          rel="noreferrer"
        >
          <FormattedMessage id="audit.indexing.openInSearchConsole" />
          <ExternalLink className="size-3.5" />
        </a>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <>
      <dt className="text-base-content/60">{label}</dt>
      <dd className="truncate" title={value ?? undefined}>
        {value ?? "—"}
      </dd>
    </>
  );
}
