/**
 * Terminal status for a finished rank-check run.
 *
 * Kept in its own module — free of Cloudflare Workers imports — because this one
 * decision carries the falsifiability of rank tracking's only success signal and
 * has to stay directly testable.
 */

/**
 * A run that checked nothing did not complete — it failed.
 *
 * "Zero `failed` runs over 24h" is the only falsifiable success signal rank
 * tracking has. If a run whose every keyword errored still stored 'completed',
 * a provider that is entirely dead would produce zero failed rows and that
 * signal could never fail — which is exactly what production did on 2026-08-12,
 * when four consecutive runs stored `completed` with `keywords_checked = 0`
 * while every DataForSEO call returned HTTP 403.
 *
 * A partial result is genuinely a completion carrying an error message, so only
 * the total-loss case flips. Both values are terminal, so either way the run
 * leaves 'pending'/'running' and releases the partial-index slot for the next
 * run.
 */
export function resolveRankCheckRunStatus(input: {
  keywordsChecked: number;
  keywordsTotal: number;
}): "completed" | "failed" {
  return input.keywordsChecked === 0 && input.keywordsTotal > 0
    ? "failed"
    : "completed";
}
