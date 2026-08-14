import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Swords, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  addAuditCompetitor,
  listAuditCompetitors,
  removeAuditCompetitor,
} from "@/serverFunctions/audit";

const MAX_COMPETITORS = 3;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function hostOf(origin: string): string {
  try {
    return new URL(origin).host;
  } catch {
    return origin;
  }
}

/**
 * Declaring the competitors this site is measured against.
 *
 * Entered by hand on purpose. Working out who actually competes for a query
 * needs SERP data, which Google does not sell — so the alternative to a text
 * field is a third-party estimate presented as fact. The three domains a person
 * names are also the three a person will defend in a meeting.
 *
 * Gated by `access.canManage` at the call site, matching the server's
 * owner/admin check: each competitor added means crawling somebody else's site.
 */
export function CompetitorsCard({
  projectId,
  auditId,
}: {
  projectId: string;
  auditId: string;
}) {
  const queryClient = useQueryClient();
  const [domain, setDomain] = useState("");
  const [label, setLabel] = useState("");

  const queryKey = ["audit-competitors", projectId, auditId];
  const competitorsQuery = useQuery({
    queryKey,
    queryFn: () => listAuditCompetitors({ data: { projectId, auditId } }),
  });

  const competitors = competitorsQuery.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const add = useMutation({
    mutationFn: () =>
      addAuditCompetitor({
        data: {
          projectId,
          auditId,
          domain: domain.trim(),
          label: label.trim() || undefined,
        },
      }),
    onSuccess: (competitor) => {
      toast.success(`Now comparing against ${hostOf(competitor.origin)}.`);
      setDomain("");
      setLabel("");
      void invalidate();
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Could not add that competitor.")),
  });

  const remove = useMutation({
    mutationFn: (competitorId: string) =>
      removeAuditCompetitor({ data: { projectId, auditId, competitorId } }),
    onSuccess: () => {
      toast.success("Competitor removed.");
      void invalidate();
    },
    onError: (error) =>
      toast.error(errorMessage(error, "Could not remove that competitor.")),
  });

  const busy = add.isPending || remove.isPending;
  const isFull = competitors.length >= MAX_COMPETITORS;

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body gap-4">
        <div className="flex items-start gap-3">
          <Swords className="size-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h2 className="font-medium">Competitors</h2>
            <p className="text-sm text-base-content/70">
              Name up to {MAX_COMPETITORS} domains you compete with. Each of
              your pages is matched to theirs and scored against the same rules,
              so the comparison is page against page rather than domain against
              domain.
            </p>
          </div>
        </div>

        {competitorsQuery.isPending ? (
          <div className="flex items-center gap-2 text-sm text-base-content/60">
            <Loader2 className="size-4 animate-spin" />
            Loading competitors
          </div>
        ) : (
          <ul className="divide-y divide-base-300">
            {competitors.map((competitor) => (
              <li
                key={competitor.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {competitor.label ?? hostOf(competitor.origin)}
                  </p>
                  <p className="font-mono text-xs text-base-content/60 truncate">
                    {hostOf(competitor.origin)}
                  </p>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => remove.mutate(competitor.id)}
                  aria-label={`Remove ${hostOf(competitor.origin)}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {isFull ? (
          <p className="text-sm text-base-content/60">
            Three is the limit. Remove one to compare against a different domain
            — each competitor means crawling their pages, and a comparison
            against ten sites is one nobody reads.
          </p>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="input input-bordered flex-1"
              placeholder="competitor.com"
              value={domain}
              disabled={busy}
              onChange={(event) => setDomain(event.target.value)}
            />
            <input
              className="input input-bordered sm:w-48"
              placeholder="Name (optional)"
              value={label}
              disabled={busy}
              onChange={(event) => setLabel(event.target.value)}
            />
            <button
              className="btn btn-primary"
              disabled={busy || domain.trim().length === 0}
              onClick={() => add.mutate()}
            >
              {add.isPending && <Loader2 className="size-4 animate-spin" />}
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
