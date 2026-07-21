import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Camera, Loader2 } from "lucide-react";
import {
  captureAuditScreenshot,
  getAuditScreenshot,
} from "@/serverFunctions/audit-screenshots";
import { getAuditAccess } from "@/serverFunctions/audit";
import { getStandardErrorMessage } from "@/client/lib/error-messages";

/**
 * On-demand evidence screenshot for one affected URL.
 *
 * The image is a full-page render fetched from Google PageSpeed when a caller
 * who can investigate asks for it, cached per (audit, url) so a re-view spends
 * nothing. It is corroborating evidence, not a crawl fact, and is labelled with
 * its source and capture time. A URL that is not a crawled HTML page of this
 * audit has no capture and says so — never a fabricated placeholder.
 *
 * The image is addressed by id through the authorized endpoint, never an R2 URL;
 * it renders only for a caller whose organization owns the capture.
 */
export function IssueEvidenceScreenshot({
  auditId,
  projectId,
  url,
}: {
  auditId: string;
  projectId: string;
  url: string;
}) {
  const queryClient = useQueryClient();
  const stateKey = ["audit-screenshot", projectId, auditId, url];

  const access = useQuery({
    queryKey: ["audit-access", projectId],
    queryFn: () => getAuditAccess({ data: { projectId } }),
  });
  const canCapture = access.data?.canLaunch === true;

  const state = useQuery({
    queryKey: stateKey,
    queryFn: () => getAuditScreenshot({ data: { projectId, auditId, url } }),
  });

  const capture = useMutation({
    mutationFn: () =>
      captureAuditScreenshot({ data: { projectId, auditId, url } }),
    onSuccess: (result) => queryClient.setQueryData(stateKey, result),
  });

  if (state.isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-base-content/60">
        <Loader2 className="size-3.5 animate-spin" />
        Loading evidence…
      </div>
    );
  }

  if (state.isError || !state.data) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-error">
        <AlertCircle className="size-3.5" />
        We could not load the evidence for this URL.
      </div>
    );
  }

  const data = state.data;

  if (data.status === "ready") {
    return (
      <figure className="space-y-1.5 py-2">
        <img
          src={`/api/audit/screenshot/get?id=${encodeURIComponent(data.screenshotId)}`}
          alt={`Rendered capture of ${url}`}
          loading="lazy"
          className="max-h-[520px] w-auto max-w-full rounded border border-base-300"
        />
        <figcaption className="text-xs text-base-content/50">
          Rendered from the live page via PageSpeed · captured{" "}
          {formatCapturedAt(data.capturedAt)}
        </figcaption>
      </figure>
    );
  }

  if (data.status === "unavailable") {
    return (
      <p className="py-3 text-xs text-base-content/50">
        No page capture is available for this URL — it was not crawled as an
        HTML page in this audit.
      </p>
    );
  }

  // capturable or failed: offer a capture (or retry) to callers who can, and
  // state the situation plainly to those who cannot.
  const failed = data.status === "failed";

  return (
    <div className="space-y-2 py-2">
      {failed && (
        <p className="text-xs text-base-content/60">
          We could not render this page the last time it was tried.
        </p>
      )}

      {canCapture ? (
        <button
          type="button"
          className="btn btn-outline btn-xs"
          disabled={capture.isPending}
          onClick={() => capture.mutate()}
        >
          {capture.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Camera className="size-3.5" />
          )}
          {failed ? "Try again" : "Capture evidence"}
        </button>
      ) : (
        <p className="text-xs text-base-content/50">
          {failed
            ? "No evidence could be captured for this URL."
            : "No evidence has been captured for this URL yet."}
        </p>
      )}

      {capture.isError && (
        <p className="flex items-center gap-1.5 text-xs text-error">
          <AlertCircle className="size-3.5" />
          {getStandardErrorMessage(capture.error, "Could not capture evidence")}
        </p>
      )}
    </div>
  );
}

function formatCapturedAt(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Date(ms).toLocaleString();
}
