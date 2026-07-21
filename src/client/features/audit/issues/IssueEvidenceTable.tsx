import { Fragment, useState } from "react";
import { Camera, ExternalLink } from "lucide-react";
import { extractPathname } from "@/client/features/audit/shared";
import { IssueEvidenceScreenshot } from "@/client/features/audit/issues/IssueEvidenceScreenshot";

interface IssueOccurrence {
  id: string;
  url: string;
  /** Null when the crawled URL is not a plain http(s) URL and must not be linked. */
  safeUrl: string | null;
  status: string;
  evidence: Array<{ key: string; value: string }>;
}

/**
 * Affected URLs for one rule, with the evidence that rule recorded and — for a
 * linkable http(s) URL — an on-demand full-page capture one click away.
 *
 * Everything here came off a third-party website. It is rendered as JSX text
 * children, which React escapes — never through `dangerouslySetInnerHTML`. The
 * URL is only linked (and only offered a capture) when the server resolved it to
 * an http(s) URL: a crawled `javascript:` URL is shown as text so it cannot
 * execute from an authenticated session.
 */
export function IssueEvidenceTable({
  auditId,
  projectId,
  occurrences,
}: {
  auditId: string;
  projectId: string;
  occurrences: IssueOccurrence[];
}) {
  // One capture panel open at a time — the query behind it is lazy, so a row's
  // evidence is only fetched (and only ever captured) when its panel is opened.
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>URL</th>
            <th className="w-24">Status</th>
            <th>Evidence</th>
            <th className="w-12" />
          </tr>
        </thead>
        <tbody>
          {occurrences.map((occurrence) => {
            const expanded = expandedId === occurrence.id;
            return (
              <Fragment key={occurrence.id}>
                <tr>
                  <td className="max-w-[280px]">
                    <UrlCell
                      url={occurrence.url}
                      safeUrl={occurrence.safeUrl}
                    />
                  </td>
                  <td>
                    <span
                      className={`badge badge-sm ${
                        occurrence.status === "fail"
                          ? "badge-error"
                          : "badge-warning"
                      }`}
                    >
                      {occurrence.status}
                    </span>
                  </td>
                  <td className="max-w-[360px]">
                    <EvidenceCell evidence={occurrence.evidence} />
                  </td>
                  <td>
                    {occurrence.safeUrl && (
                      <button
                        type="button"
                        className={`btn btn-ghost btn-xs btn-square ${
                          expanded ? "text-primary" : ""
                        }`}
                        aria-label={
                          expanded ? "Hide evidence" : "Show evidence capture"
                        }
                        aria-expanded={expanded}
                        onClick={() =>
                          setExpandedId(expanded ? null : occurrence.id)
                        }
                      >
                        <Camera className="size-4" />
                      </button>
                    )}
                  </td>
                </tr>
                {expanded && (
                  <tr>
                    <td colSpan={4} className="bg-base-200/40">
                      <IssueEvidenceScreenshot
                        auditId={auditId}
                        projectId={projectId}
                        url={occurrence.url}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function UrlCell({ url, safeUrl }: { url: string; safeUrl: string | null }) {
  if (!safeUrl) {
    return (
      <span className="font-mono text-xs break-all text-base-content/60">
        {url}
      </span>
    );
  }

  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="link link-primary inline-flex items-center gap-1 text-xs"
      title={url}
    >
      <span className="truncate">{extractPathname(url)}</span>
      <ExternalLink className="size-3 shrink-0" />
    </a>
  );
}

function EvidenceCell({
  evidence,
}: {
  evidence: Array<{ key: string; value: string }>;
}) {
  if (evidence.length === 0) {
    return <span className="text-xs text-base-content/40">&mdash;</span>;
  }

  return (
    <dl className="space-y-0.5 text-xs">
      {evidence.map((field) => (
        <div key={field.key} className="flex gap-1.5">
          <dt className="text-base-content/50 shrink-0">{field.key}:</dt>
          <dd className="break-all">{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}
