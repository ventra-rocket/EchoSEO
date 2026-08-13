import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Modal } from "@/client/components/Modal";
import { GoogleGlyph } from "@/client/features/gsc/GoogleGlyph";
import { startGscLink } from "@/client/features/gsc/startGscLink";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import type {
  GscImportCandidate,
  GscImportRow,
} from "@/server/features/gsc/services/GscSiteImportService";
import { importGscSites, listGscImportCandidates } from "@/serverFunctions/gsc";

const BLOCK_LABEL: Record<NonNullable<GscImportCandidate["block"]>, string> = {
  already_imported: "Already imported",
  unverified: "Not verified for you",
  unsupported: "Cannot be crawled",
};

/**
 * Bulk import of Search Console properties, one project per property.
 *
 * Unselectable properties are listed with a reason rather than filtered out: a
 * user looking for a site they know they own needs to see it and learn why it is
 * greyed out, not conclude that we failed to read their Google account.
 *
 * There is no summary toast. The result is a per-row table, because "3 of 5
 * imported" is the answer to a question nobody asked — which two, and why, is.
 */
export function GscImportModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = React.useState<Record<string, true>>({});
  const [startAudits, setStartAudits] = React.useState(false);
  const [rows, setRows] = React.useState<GscImportRow[] | null>(null);

  const candidatesQuery = useQuery({
    queryKey: ["gscImportCandidates"],
    queryFn: () => listGscImportCandidates(),
  });
  const candidates = candidatesQuery.data?.candidates ?? [];
  const requiresReconnect = Boolean(candidatesQuery.data?.requiresReconnect);
  const importable = candidates.filter((candidate) => candidate.block === null);
  const selectedUrls = Object.keys(selected);

  const importMutation = useMutation({
    mutationFn: () =>
      importGscSites({ data: { siteUrls: selectedUrls, startAudits } }),
    onSuccess: async (result) => {
      if (result.requiresReconnect) {
        await queryClient.invalidateQueries({
          queryKey: ["gscImportCandidates"],
        });
        return;
      }
      setRows(result.rows);
      setSelected({});
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
        queryClient.invalidateQueries({ queryKey: ["gscImportCandidates"] }),
      ]);
    },
  });

  const busy = importMutation.isPending;

  if (rows) {
    return (
      <Modal
        maxWidth="max-w-2xl"
        onClose={onClose}
        labelledBy="gsc-import-title"
      >
        <ImportOutcome rows={rows} onClose={onClose} />
      </Modal>
    );
  }

  return (
    <Modal
      maxWidth="max-w-2xl"
      onClose={busy ? undefined : onClose}
      labelledBy="gsc-import-title"
    >
      <div className="space-y-4">
        <div>
          <h2
            id="gsc-import-title"
            className="flex items-center gap-2 text-lg font-semibold"
          >
            <GoogleGlyph className="size-4" />
            Import from Search Console
          </h2>
          <p className="mt-1 text-sm text-base-content/60">
            Each property becomes its own project, connected to that property —
            which is what lets its Search Console numbers, audits and reports be
            about one site.
          </p>
        </div>

        {candidatesQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-md" />
          </div>
        ) : requiresReconnect ? (
          <ReconnectPrompt />
        ) : candidatesQuery.isError ? (
          <p className="rounded-box border border-error/40 bg-error/10 px-4 py-3 text-sm">
            {getStandardErrorMessage(
              candidatesQuery.error,
              "Could not read your Search Console properties.",
            )}
          </p>
        ) : candidates.length === 0 ? (
          <p className="rounded-box border border-base-300 px-4 py-3 text-sm text-base-content/70">
            This Google account has no Search Console properties.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 text-sm">
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                disabled={busy || importable.length === 0}
                onClick={() =>
                  setSelected(
                    selectedUrls.length === importable.length
                      ? {}
                      : Object.fromEntries(
                          importable.map((candidate) => [
                            candidate.siteUrl,
                            true as const,
                          ]),
                        ),
                  )
                }
              >
                {selectedUrls.length === importable.length &&
                importable.length > 0
                  ? "Clear selection"
                  : `Select all ${importable.length}`}
              </button>
              <span className="text-xs text-base-content/60">
                {selectedUrls.length} selected
              </span>
            </div>

            <ul className="max-h-72 divide-y divide-base-300 overflow-y-auto rounded-box border border-base-300">
              {candidates.map((candidate) => (
                <CandidateRow
                  key={candidate.siteUrl}
                  candidate={candidate}
                  checked={Boolean(selected[candidate.siteUrl])}
                  disabled={busy}
                  onToggle={() =>
                    setSelected((current) => {
                      const next = { ...current };
                      if (next[candidate.siteUrl]) {
                        delete next[candidate.siteUrl];
                      } else {
                        next[candidate.siteUrl] = true;
                      }
                      return next;
                    })
                  }
                />
              ))}
            </ul>

            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm mt-0.5"
                checked={startAudits}
                disabled={busy}
                onChange={(event) => setStartAudits(event.target.checked)}
              />
              <span>
                Run a first crawl on each imported site
                <span className="block text-xs text-base-content/60">
                  Crawls start one at a time. Past the hourly launch limit the
                  remaining sites are still imported and say so.
                </span>
              </span>
            </label>

            {importMutation.isError ? (
              <p className="rounded-box border border-error/40 bg-error/10 px-4 py-3 text-sm">
                {getStandardErrorMessage(
                  importMutation.error,
                  "Could not import those properties.",
                )}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm gap-2"
                disabled={busy || selectedUrls.length === 0}
                onClick={() => importMutation.mutate()}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Import {selectedUrls.length || ""}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function CandidateRow({
  candidate,
  checked,
  disabled,
  onToggle,
}: {
  candidate: GscImportCandidate;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const blocked = candidate.block !== null;

  return (
    <li>
      <label
        className={`flex items-start gap-3 px-3 py-2.5 ${
          blocked ? "opacity-60" : "cursor-pointer hover:bg-base-200/40"
        }`}
      >
        <input
          type="checkbox"
          className="checkbox checkbox-sm mt-0.5"
          checked={checked}
          disabled={disabled || blocked}
          onChange={onToggle}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-sm">
            {candidate.siteUrl}
          </span>
          <span className="block text-xs text-base-content/60">
            {candidate.host ? (
              <>
                {candidate.kind === "domain"
                  ? "Domain property"
                  : "URL-prefix property"}{" "}
                · project {candidate.host}
                {candidate.droppedPath
                  ? ` · scoped to ${candidate.droppedPath}, crawls the whole site`
                  : null}
              </>
            ) : (
              "Not a site this app can crawl"
            )}
          </span>
        </span>
        {candidate.block ? (
          <span className="badge badge-ghost badge-sm shrink-0">
            {candidate.block === "already_imported" &&
            candidate.existingProjectName
              ? candidate.existingProjectName
              : BLOCK_LABEL[candidate.block]}
          </span>
        ) : null}
      </label>
    </li>
  );
}

function ImportOutcome({
  rows,
  onClose,
}: {
  rows: GscImportRow[];
  onClose: () => void;
}) {
  return (
    <div className="space-y-4">
      <h2 id="gsc-import-title" className="text-lg font-semibold">
        Import result
      </h2>

      <ul className="max-h-80 divide-y divide-base-300 overflow-y-auto rounded-box border border-base-300">
        {rows.map((row) => (
          <li key={row.siteUrl} className="flex items-start gap-3 px-3 py-2.5">
            {row.outcome === "created" ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
            ) : row.outcome === "failed" ? (
              <XCircle className="mt-0.5 size-4 shrink-0 text-error" />
            ) : (
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-base-300" />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-sm">
                {row.siteUrl}
              </span>
              <span className="block text-xs text-base-content/60">
                {row.outcome === "created"
                  ? `Project ${row.host} created`
                  : row.outcome === "skipped_duplicate"
                    ? "Already imported — left alone"
                    : (row.detail ?? "Could not be imported")}
                {row.outcome === "created" && row.detail
                  ? ` · ${row.detail}`
                  : null}
                {row.audit === "started" ? " · first crawl running" : null}
                {row.audit === "throttled"
                  ? " · crawl not started: hourly limit reached"
                  : null}
                {row.audit === "unavailable"
                  ? " · crawl not started for this workspace"
                  : null}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <div className="flex justify-end">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onClose}
        >
          Done
        </button>
      </div>
    </div>
  );
}

function ReconnectPrompt() {
  return (
    <div className="space-y-3 rounded-box border border-warning/40 bg-warning/10 px-4 py-3">
      <p className="text-sm">
        Your Google connection can no longer reach Search Console. Reconnect it
        and the property list comes back.
      </p>
      <button
        type="button"
        className="btn btn-sm gap-2"
        onClick={() => void startGscLink(window.location.href)}
      >
        <GoogleGlyph className="size-4" />
        Reconnect Google
      </button>
    </div>
  );
}
