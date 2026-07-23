import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink, Loader2, Search } from "lucide-react";
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
          <h2 className="font-medium">Google Search Console</h2>
          <p className="text-xs text-base-content/60">
            Check how Google sees your pages. Inspection is read-only —
            requesting indexing or submitting a sitemap happens in Search
            Console.
          </p>
        </div>

        {context.state === "not_connected" && (
          <p className="text-sm text-base-content/60">
            Connect Google Search Console for this project to check index
            status.
          </p>
        )}

        {context.state === "property_mismatch" && (
          <p className="text-sm text-base-content/60">
            The connected property (
            <span className="font-mono">{context.property}</span>) does not
            cover this site, so its index data can't be shown here.
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
  const [url, setUrl] = useState(startUrl);

  const inspect = useMutation({
    mutationFn: (target: string) =>
      inspectAuditUrl({ data: { projectId, auditId, url: target } }),
  });

  const result = inspect.data;

  return (
    <div className="space-y-3">
      <p className="text-xs text-base-content/60">
        Property: <span className="font-mono">{property}</span>
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
            aria-label="URL to inspect"
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
            Check index status
          </button>
        </form>
      )}

      {inspect.isError && (
        <p className="text-xs text-error">
          Could not inspect this URL. Try again shortly.
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
          Manage sitemaps in Search Console
          <ExternalLink className="size-3.5" />
        </a>
        {missingFromSitemapCount > 0 && (
          <span className="text-xs text-base-content/60">
            {missingFromSitemapCount} crawled pages are missing from your
            sitemap (see All Issues).
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
  if (result.state === "invalid_url") {
    return (
      <p className="text-xs text-warning">
        Enter a URL on this site to inspect it.
      </p>
    );
  }
  if (result.state === "not_connected") {
    return (
      <p className="text-xs text-warning">
        Search Console access was lost — reconnect to inspect URLs.
      </p>
    );
  }
  if (result.state === "property_mismatch") {
    return (
      <p className="text-xs text-warning">
        The connected property no longer covers this site.
      </p>
    );
  }
  if (result.state === "inspect_failed") {
    return (
      <p className="text-xs text-warning">
        Google couldn't inspect this URL right now — it may be rate-limited or
        the property's access changed. Try again shortly.
      </p>
    );
  }

  const { inspection } = result;
  return (
    <div className="rounded border border-base-300 bg-base-200/40 p-3 text-sm">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <Row label="Coverage" value={inspection.coverageState} />
        <Row label="Verdict" value={inspection.verdict} />
        <Row label="Indexing" value={inspection.indexingState} />
        <Row label="Last crawl" value={inspection.lastCrawlTime} />
      </dl>
      {inspection.inspectionResultLink && (
        <a
          className="link link-primary mt-2 inline-flex items-center gap-1 text-xs"
          href={inspection.inspectionResultLink}
          target="_blank"
          rel="noreferrer"
        >
          Open in Search Console
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
