import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormattedMessage, useIntl } from "react-intl";
import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { getLocalizedErrorMessage } from "@/client/lib/error-messages";
import {
  getCompetitorComparison,
  runCompetitorComparison,
  setCompetitorPageUrl,
} from "@/serverFunctions/audit";
import {
  CompetitorPairCard,
  UnpairedUrlRow,
} from "@/client/features/audit/competitors/ComparisonTableRows";

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
  const intl = useIntl();
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
        intl.formatMessage(
          { id: "audit.competitors.table.compareToastSuccess" },
          { count: result.competitors },
        ),
      );
      void invalidate();
    },
    onError: (error) =>
      toast.error(
        getLocalizedErrorMessage(
          intl,
          error,
          intl.formatMessage({
            id: "audit.competitors.table.compareErrorDefault",
          }),
        ),
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
      toast.success(
        intl.formatMessage({ id: "audit.competitors.table.pairingSaved" }),
      );
      setEditing(null);
      setDraftUrl("");
      void invalidate();
    },
    onError: (error) =>
      toast.error(
        getLocalizedErrorMessage(
          intl,
          error,
          intl.formatMessage({
            id: "audit.competitors.table.saveUrlErrorDefault",
          }),
        ),
      ),
  });

  const competitors = comparisonQuery.data ?? [];
  const busy = run.isPending || savePair.isPending;

  if (comparisonQuery.isPending) {
    return (
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body flex-row items-center gap-2 text-sm text-base-content/60">
          <Loader2 className="size-4 animate-spin" />
          <FormattedMessage id="audit.competitors.table.loading" />
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
            <h2 className="font-medium">
              <FormattedMessage id="audit.competitors.table.title" />
            </h2>
            <p className="text-sm text-base-content/70">
              <FormattedMessage id="audit.competitors.table.description" />
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
              <FormattedMessage id="audit.competitors.table.runComparison" />
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
                <FormattedMessage id="audit.competitors.table.noPagePairs" />
              </p>
            ) : (
              competitor.pairs.map((pair) => (
                <CompetitorPairCard
                  key={pair.pageId}
                  competitor={competitor}
                  pair={pair}
                  canManage={canManage}
                  editing={editing}
                  draftUrl={draftUrl}
                  busy={busy}
                  onDraftUrlChange={setDraftUrl}
                  onStartEditing={() => {
                    setEditing(pair.pageId);
                    setDraftUrl(pair.theirUrl);
                  }}
                  onCancelEditing={() => setEditing(null)}
                  onSave={() =>
                    savePair.mutate({
                      competitorId: competitor.competitorId,
                      pageId: pair.pageId,
                    })
                  }
                />
              ))
            )}

            {canManage && competitor.unpairedOurUrls.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-base-content/70">
                  <FormattedMessage
                    id="audit.competitors.table.unpairedSummary"
                    values={{
                      count: competitor.unpairedOurUrls.length,
                      host: new URL(competitor.origin).host,
                    }}
                  />
                </summary>
                <div className="mt-2 space-y-2">
                  {competitor.unpairedOurUrls.map((ourUrl) => (
                    <UnpairedUrlRow
                      key={ourUrl}
                      competitor={competitor}
                      ourUrl={ourUrl}
                      editing={editing}
                      draftUrl={draftUrl}
                      busy={busy}
                      onDraftUrlChange={setDraftUrl}
                      onStartEditing={() => {
                        setEditing(ourUrl);
                        setDraftUrl(competitor.origin);
                      }}
                      onSave={() =>
                        savePair.mutate({
                          competitorId: competitor.competitorId,
                          ourUrl,
                        })
                      }
                    />
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
