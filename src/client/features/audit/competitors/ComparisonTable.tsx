import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Loader2, Minus, Play, X } from "lucide-react";
import { toast } from "sonner";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import {
  getCompetitorComparison,
  runCompetitorComparison,
  setCompetitorPageUrl,
} from "@/serverFunctions/audit";

/**
 * Whether a typed URL sits on the competitor's own origin.
 *
 * The server enforces this too and is the authority. It is repeated here because
 * `toClientError` reduces every `AppError` to its code, so a server rejection
 * arrives as "Please check your input" — accurate and useless. The client knows
 * the origin, so it can name the actual problem before a round trip.
 */
function isOnOrigin(url: string, origin: string): boolean {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

function pathOf(url: string): string {
  try {
    const { pathname, search } = new URL(url);
    return `${pathname}${search}` === "/" ? "/" : `${pathname}${search}`;
  } catch {
    return url;
  }
}

/**
 * `pass` renders as a tick, `warn`/`fail` as a cross, and a rule that was never
 * measured on one side renders as a dash — never as a tick. A rule that did not
 * run and a rule that passed are different facts, and showing the first as the
 * second flatters whichever side was not measured.
 */
function Verdict({ status }: { status: string | null }) {
  if (status === null) {
    return (
      <span
        className="text-base-content/40"
        title="Not measured for this page"
        aria-label="Not measured"
      >
        <Minus className="size-4" />
      </span>
    );
  }
  if (status === "pass") {
    return (
      <span className="text-success" aria-label="Passes">
        <Check className="size-4" />
      </span>
    );
  }
  return (
    <span
      className="text-error"
      title={status === "warn" ? "Warning" : "Fails"}
      aria-label={status === "warn" ? "Warning" : "Fails"}
    >
      <X className="size-4" />
    </span>
  );
}

/**
 * Page-against-page comparison against the competitors declared for this site.
 *
 * Both columns come from the same rule engine over the same eleven on-page and
 * technical rules, which is the whole point: a table where each side was judged
 * by a different function would look identical and mean nothing.
 *
 * Core Web Vitals, cross-page and GEO rules are absent by design, and the card
 * says so rather than leaving a reader to assume they passed.
 */
export function ComparisonTable({
  projectId,
  auditId,
  canManage,
}: {
  projectId: string;
  auditId: string;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [draftUrl, setDraftUrl] = useState("");

  const queryKey = ["competitor-comparison", projectId, auditId];
  const comparisonQuery = useQuery({
    queryKey,
    queryFn: () => getCompetitorComparison({ data: { projectId, auditId } }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const run = useMutation({
    mutationFn: () => runCompetitorComparison({ data: { projectId, auditId } }),
    onSuccess: (result) => {
      toast.success(
        `Compared against ${result.competitors} competitor${result.competitors === 1 ? "" : "s"}.`,
      );
      void invalidate();
    },
    onError: (error) =>
      toast.error(
        getStandardErrorMessage(error, "Could not run the comparison."),
      ),
  });

  const savePair = useMutation({
    mutationFn: (input: {
      competitorId: string;
      pageId?: string;
      ourUrl?: string;
    }) =>
      setCompetitorPageUrl({
        data: {
          projectId,
          auditId,
          competitorId: input.competitorId,
          pageId: input.pageId ?? null,
          ourUrl: input.ourUrl ?? null,
          theirUrl: draftUrl.trim(),
        },
      }),
    onSuccess: () => {
      toast.success("Pairing saved. Run the comparison again to score it.");
      setEditing(null);
      setDraftUrl("");
      void invalidate();
    },
    onError: (error) =>
      toast.error(getStandardErrorMessage(error, "Could not save that URL.")),
  });

  const competitors = comparisonQuery.data ?? [];
  const busy = run.isPending || savePair.isPending;

  if (comparisonQuery.isPending) {
    return (
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body flex-row items-center gap-2 text-sm text-base-content/60">
          <Loader2 className="size-4 animate-spin" />
          Loading the comparison
        </div>
      </div>
    );
  }

  if (competitors.length === 0) return null;

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="font-medium">Page-by-page comparison</h2>
            <p className="text-sm text-base-content/70">
              Your pages and theirs, judged by the same eleven on-page and
              technical rules. Core Web Vitals, sitemap and orphan checks are
              not compared: ours come from a full crawl of your site, and
              running one against theirs is not something we do.
            </p>
          </div>
          {canManage && (
            <button
              className="btn btn-primary btn-sm shrink-0"
              disabled={busy}
              onClick={() => run.mutate()}
            >
              {run.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              Run comparison
            </button>
          )}
        </div>

        {competitors.map((competitor) => (
          <div key={competitor.competitorId} className="space-y-3">
            <div className="flex items-baseline gap-2">
              <h3 className="font-medium">{competitor.label}</h3>
              <span className="font-mono text-xs text-base-content/60">
                {new URL(competitor.origin).host}
              </span>
            </div>

            {competitor.pairs.length === 0 ? (
              <p className="text-sm text-base-content/60">
                No page pairs yet. Run the comparison to match your pages
                against theirs.
              </p>
            ) : (
              competitor.pairs.map((pair) => (
                <div
                  key={pair.pageId}
                  className="rounded-lg border border-base-300 p-3 space-y-2"
                >
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono text-sm">
                    <span className="truncate">{pathOf(pair.ourUrl)}</span>
                    <span className="text-base-content/40">vs</span>
                    <span className="truncate text-base-content/80">
                      {pathOf(pair.theirUrl)}
                    </span>
                    {pair.matchSource === "manual" ? (
                      <span className="badge badge-ghost badge-sm">
                        paired by hand
                      </span>
                    ) : (
                      pair.matchConfidence !== null && (
                        <span className="badge badge-ghost badge-sm">
                          match {Math.round(pair.matchConfidence * 100)}%
                        </span>
                      )
                    )}
                  </div>

                  {pair.failureReason && (
                    <p className="text-sm text-warning">{pair.failureReason}</p>
                  )}

                  {pair.rules === null ? (
                    <p className="text-sm text-base-content/60">
                      {pair.comparedAt
                        ? "Nothing was scored for this pair."
                        : "Not compared yet."}
                    </p>
                  ) : (
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Rule</th>
                          <th className="w-16 text-center">You</th>
                          <th className="w-16 text-center">Them</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {pair.rules.map((rule) => (
                          <tr key={rule.ruleId}>
                            <td className="font-mono text-xs">{rule.label}</td>
                            <td className="text-center">
                              <span className="inline-flex justify-center">
                                <Verdict status={rule.ours} />
                              </span>
                            </td>
                            <td className="text-center">
                              <span className="inline-flex justify-center">
                                <Verdict status={rule.theirs} />
                              </span>
                            </td>
                            <td className="text-xs">
                              {rule.weLose && (
                                <span className="text-error">behind</span>
                              )}
                              {rule.weWin && (
                                <span className="text-success">ahead</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {canManage &&
                    (editing === pair.pageId ? (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          className="input input-bordered input-sm flex-1 font-mono"
                          placeholder={`${competitor.origin}/their-page`}
                          value={draftUrl}
                          disabled={busy}
                          onChange={(event) => setDraftUrl(event.target.value)}
                        />
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={
                            busy ||
                            !isOnOrigin(draftUrl.trim(), competitor.origin)
                          }
                          title={
                            isOnOrigin(draftUrl.trim(), competitor.origin)
                              ? undefined
                              : `Must be a URL on ${new URL(competitor.origin).host}`
                          }
                          onClick={() =>
                            savePair.mutate({
                              competitorId: competitor.competitorId,
                              pageId: pair.pageId,
                            })
                          }
                        >
                          Save pairing
                        </button>
                        <button
                          className="btn btn-sm btn-ghost"
                          disabled={busy}
                          onClick={() => setEditing(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => {
                          setEditing(pair.pageId);
                          setDraftUrl(pair.theirUrl);
                        }}
                      >
                        Pair with a different page
                      </button>
                    ))}
                </div>
              ))
            )}

            {canManage && competitor.unpairedOurUrls.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-base-content/70">
                  {competitor.unpairedOurUrls.length} of your pages have no
                  counterpart on {new URL(competitor.origin).host} — pair one by
                  hand
                </summary>
                <div className="mt-2 space-y-2">
                  {competitor.unpairedOurUrls.map((ourUrl) => (
                    <div
                      key={ourUrl}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center"
                    >
                      <span className="font-mono text-xs sm:w-40 truncate">
                        {pathOf(ourUrl)}
                      </span>
                      {editing === ourUrl ? (
                        <>
                          <input
                            className="input input-bordered input-sm flex-1 font-mono"
                            placeholder={`${competitor.origin}/their-page`}
                            value={draftUrl}
                            disabled={busy}
                            onChange={(event) =>
                              setDraftUrl(event.target.value)
                            }
                          />
                          <button
                            className="btn btn-sm btn-primary"
                            disabled={
                              busy ||
                              !isOnOrigin(draftUrl.trim(), competitor.origin)
                            }
                            title={
                              isOnOrigin(draftUrl.trim(), competitor.origin)
                                ? undefined
                                : `Must be a URL on ${new URL(competitor.origin).host}`
                            }
                            onClick={() =>
                              savePair.mutate({
                                competitorId: competitor.competitorId,
                                ourUrl,
                              })
                            }
                          >
                            Save pairing
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => {
                            setEditing(ourUrl);
                            setDraftUrl(competitor.origin);
                          }}
                        >
                          Pair by hand
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
