import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Send, ShieldCheck, ShieldQuestion } from "lucide-react";
import { toast } from "sonner";
import {
  getIndexNowStatus,
  setupIndexNow,
  submitIndexNow,
  verifyIndexNowKey,
} from "@/serverFunctions/audit";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

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
      toast.error(errorMessage(error, "Could not set up IndexNow.")),
  });

  const verify = useMutation({
    mutationFn: () => verifyIndexNowKey({ data: { projectId, auditId } }),
    onSuccess: (result) => {
      setVerified(result.verified);
      if (result.verified) toast.success("IndexNow key file verified.");
      else toast.error("Key file is not reachable at the host yet.");
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Verification failed.")),
  });

  const submit = useMutation({
    mutationFn: () => submitIndexNow({ data: { projectId, auditId } }),
    onSuccess: (result) => {
      if (result.outcome === "not_verified") {
        toast.error(
          "Place the IndexNow key file at your host and verify it before submitting.",
        );
        return;
      }
      if (result.submittedCount === 0) {
        toast.info("No indexable URLs to submit for this audit.");
      } else if (result.status === "succeeded") {
        toast.success(`Submitted ${result.submittedCount} URLs to IndexNow.`);
      } else {
        toast.error(`IndexNow returned ${result.httpStatus ?? "an error"}.`);
      }
      void invalidate();
    },
    onError: (error) => toast.error(errorMessage(error, "Submission failed.")),
  });

  const data = statusQuery.data;
  if (!data) return null;

  return (
    <div className="card border border-base-300 bg-base-100">
      <div className="card-body gap-3 p-4">
        <div>
          <h2 className="font-medium">IndexNow</h2>
          <p className="text-xs text-base-content/60">
            Notify participating engines (Bing, Yandex, and others — not Google)
            that your indexable pages changed. A receipt means accepted, not
            indexed.
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
            Set up IndexNow
          </button>
        ) : (
          <>
            <div className="space-y-1 text-sm">
              <p className="text-xs text-base-content/60">
                Host this file at your domain root, then verify:
              </p>
              <code
                className="block truncate rounded bg-base-200 px-2 py-1 text-xs"
                title={data.keyLocation ?? ""}
              >
                {data.keyLocation}
              </code>
              <p className="text-xs text-base-content/60">File contents:</p>
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
                Check verification
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
                Submit {data.submittableCount} URLs
              </button>
            </div>

            {verified === false && (
              <p className="text-xs text-warning">
                Key file not reachable yet — place it at the host and re-check.
              </p>
            )}

            {data.recentActions.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-base-content/60">
                  Recent submissions
                </p>
                <ul className="divide-y divide-base-300 rounded border border-base-300 text-xs">
                  {data.recentActions.map((action) => (
                    <li
                      key={action.id}
                      className="flex items-center justify-between gap-2 px-2 py-1"
                    >
                      <span className="text-base-content/70">
                        {new Date(action.createdAt).toLocaleString()}
                      </span>
                      <span>{action.submittedCount} URLs</span>
                      <span
                        className={
                          action.status === "succeeded"
                            ? "text-success"
                            : "text-error"
                        }
                      >
                        {action.status}
                      </span>
                    </li>
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
