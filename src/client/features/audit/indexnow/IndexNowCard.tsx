import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Send, ShieldCheck, ShieldQuestion } from "lucide-react";
import { toast } from "sonner";
import { useIntl, type IntlShape } from "react-intl";
import {
  getIndexNowStatus,
  setupIndexNow,
  submitIndexNow,
  verifyIndexNowKey,
} from "@/serverFunctions/audit";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

const ACTION_STATUS_LABEL_ID = {
  succeeded: "audit.indexnow.action.succeeded",
  failed: "audit.indexnow.action.failed",
} as const;

/**
 * Owner/admin IndexNow surface for an audit's target: generate a key, host the
 * key file, verify it, and submit the audit's indexable URLs. IndexNow reaches
 * participating engines (Bing, Yandex, …) — not Google — and a receipt is
 * acceptance, not indexing. Gated by `access.canManage` at the call site.
 */
export function IndexNowCard({
  projectId,
  auditId,
}: {
  projectId: string;
  auditId: string;
}) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [verified, setVerified] = useState<boolean | null>(null);

  const statusQuery = useQuery({
    queryKey: ["indexnow-status", projectId, auditId],
    queryFn: () => getIndexNowStatus({ data: { projectId, auditId } }),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["indexnow-status", projectId, auditId],
    });

  const setup = useMutation({
    mutationFn: () => setupIndexNow({ data: { projectId, auditId } }),
    onSuccess: () => {
      void invalidate();
    },
    onError: (error) =>
      toast.error(
        errorMessage(
          error,
          intl.formatMessage({ id: "audit.indexnow.setupError" }),
        ),
      ),
  });

  const verify = useMutation({
    mutationFn: () => verifyIndexNowKey({ data: { projectId, auditId } }),
    onSuccess: (result) => {
      setVerified(result.verified);
      if (result.verified) {
        toast.success(
          intl.formatMessage({ id: "audit.indexnow.verifiedToast" }),
        );
      } else {
        toast.error(
          intl.formatMessage({ id: "audit.indexnow.notReachableToast" }),
        );
      }
    },
    onError: (error) =>
      toast.error(
        errorMessage(
          error,
          intl.formatMessage({ id: "audit.indexnow.verificationFailedError" }),
        ),
      ),
  });

  const submit = useMutation({
    mutationFn: () => submitIndexNow({ data: { projectId, auditId } }),
    onSuccess: (result) => {
      if (result.outcome === "not_verified") {
        toast.error(
          intl.formatMessage({ id: "audit.indexnow.notVerifiedToast" }),
        );
        return;
      }
      if (result.submittedCount === 0) {
        toast.info(intl.formatMessage({ id: "audit.indexnow.noUrlsToast" }));
      } else if (result.status === "succeeded") {
        toast.success(
          intl.formatMessage(
            { id: "audit.indexnow.submittedToast" },
            { count: result.submittedCount },
          ),
        );
      } else {
        toast.error(
          intl.formatMessage(
            { id: "audit.indexnow.returnedError" },
            {
              status:
                result.httpStatus != null
                  ? intl.formatNumber(result.httpStatus)
                  : intl.formatMessage({ id: "audit.indexnow.genericError" }),
            },
          ),
        );
      }
      void invalidate();
    },
    onError: (error) =>
      toast.error(
        errorMessage(
          error,
          intl.formatMessage({ id: "audit.indexnow.submissionFailedError" }),
        ),
      ),
  });

  const data = statusQuery.data;
  if (!data) return null;

  return (
    <div className="card border border-base-300 bg-base-100">
      <div className="card-body gap-3 p-4">
        <div>
          <h2 className="font-medium">
            {intl.formatMessage({ id: "audit.indexnow.heading" })}
          </h2>
          <p className="text-xs text-base-content/60">
            {intl.formatMessage({ id: "audit.indexnow.description" })}
          </p>
        </div>

        {!data.key ? (
          <button
            type="button"
            className="btn btn-sm btn-primary w-fit gap-2"
            disabled={setup.isPending}
            onClick={() => setup.mutate()}
          >
            {setup.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            {intl.formatMessage({ id: "audit.indexnow.setupButton" })}
          </button>
        ) : (
          <>
            <div className="space-y-1 text-sm">
              <p className="text-xs text-base-content/60">
                {intl.formatMessage({
                  id: "audit.indexnow.hostFileInstructions",
                })}
              </p>
              <code
                className="block truncate rounded bg-base-200 px-2 py-1 text-xs"
                title={data.keyLocation ?? ""}
              >
                {data.keyLocation}
              </code>
              <p className="text-xs text-base-content/60">
                {intl.formatMessage({
                  id: "audit.indexnow.fileContentsLabel",
                })}
              </p>
              <code className="block truncate rounded bg-base-200 px-2 py-1 text-xs">
                {data.key}
              </code>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline gap-2"
                disabled={verify.isPending}
                onClick={() => verify.mutate()}
              >
                {verify.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : verified ? (
                  <ShieldCheck className="size-4 text-success" />
                ) : (
                  <ShieldQuestion className="size-4" />
                )}
                {intl.formatMessage({
                  id: "audit.indexnow.checkVerificationButton",
                })}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary gap-2"
                disabled={submit.isPending || data.submittableCount === 0}
                onClick={() => submit.mutate()}
              >
                {submit.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {intl.formatMessage(
                  { id: "audit.indexnow.submitButton" },
                  { count: data.submittableCount },
                )}
              </button>
            </div>

            {verified === false && (
              <p className="text-xs text-warning">
                {intl.formatMessage({
                  id: "audit.indexnow.notReachableNotice",
                })}
              </p>
            )}

            {data.recentActions.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-base-content/60">
                  {intl.formatMessage({
                    id: "audit.indexnow.recentSubmissionsHeading",
                  })}
                </p>
                <ul className="divide-y divide-base-300 rounded border border-base-300 text-xs">
                  {data.recentActions.map((action) => (
                    <ActionRow key={action.id} action={action} intl={intl} />
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ActionRow({
  action,
  intl,
}: {
  action: {
    id: string;
    createdAt: string;
    submittedCount: number;
    status: "succeeded" | "failed";
  };
  intl: IntlShape;
}) {
  return (
    <li className="flex items-center justify-between gap-2 px-2 py-1">
      <span className="text-base-content/70">
        {intl.formatDate(action.createdAt, {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </span>
      <span>
        {intl.formatMessage(
          { id: "audit.indexnow.actionSubmittedCount" },
          { count: action.submittedCount },
        )}
      </span>
      <span
        className={
          action.status === "succeeded" ? "text-success" : "text-error"
        }
      >
        {intl.formatMessage({ id: ACTION_STATUS_LABEL_ID[action.status] })}
      </span>
    </li>
  );
}
