import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormattedMessage, type IntlShape, useIntl } from "react-intl";
import { AlertCircle, Camera, Loader2 } from "lucide-react";
import {
  captureAuditScreenshot,
  getAuditScreenshot,
} from "@/serverFunctions/audit-screenshots";
import { getAuditAccess } from "@/serverFunctions/audit";
import { getLocalizedErrorMessage } from "@/client/lib/error-messages";

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
  const intl = useIntl();
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
        <FormattedMessage id="audit.issues.screenshot.loading" />
      </div>
    );
  }

  if (state.isError || !state.data) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-error">
        <AlertCircle className="size-3.5" />
        <FormattedMessage id="audit.issues.screenshot.loadError" />
      </div>
    );
  }

  const data = state.data;

  if (data.status === "ready") {
    return (
      <figure className="space-y-1.5 py-2">
        <img
          src={`/api/audit/screenshot/get?id=${encodeURIComponent(data.screenshotId)}`}
          alt={intl.formatMessage(
            { id: "audit.issues.screenshot.alt" },
            { url },
          )}
          loading="lazy"
          className="max-h-[520px] w-auto max-w-full rounded border border-base-300"
        />
        <figcaption className="text-xs text-base-content/50">
          <FormattedMessage
            id="audit.issues.screenshot.caption"
            values={{ date: formatCapturedAt(intl, data.capturedAt) }}
          />
        </figcaption>
      </figure>
    );
  }

  if (data.status === "unavailable") {
    return (
      <p className="py-3 text-xs text-base-content/50">
        <FormattedMessage id="audit.issues.screenshot.unavailable" />
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
          <FormattedMessage id="audit.issues.screenshot.renderFailed" />
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
          <FormattedMessage
            id={
              failed
                ? "audit.issues.screenshot.tryAgain"
                : "audit.issues.screenshot.captureEvidence"
            }
          />
        </button>
      ) : (
        <p className="text-xs text-base-content/50">
          <FormattedMessage
            id={
              failed
                ? "audit.issues.screenshot.noneCaptured"
                : "audit.issues.screenshot.notCapturedYet"
            }
          />
        </p>
      )}

      {capture.isError && (
        <p className="flex items-center gap-1.5 text-xs text-error">
          <AlertCircle className="size-3.5" />
          {getLocalizedErrorMessage(
            intl,
            capture.error,
            intl.formatMessage({
              id: "audit.issues.screenshot.captureFailedDefault",
            }),
          )}
        </p>
      )}
    </div>
  );
}

function formatCapturedAt(intl: IntlShape, iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return intl.formatDate(ms, { dateStyle: "medium", timeStyle: "short" });
}
