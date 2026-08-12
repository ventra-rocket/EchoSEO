/**
 * What a finished rank-check run reports about itself: its terminal status, and
 * the reason behind it.
 *
 * Kept in its own module — free of Cloudflare Workers imports — because these
 * decisions carry the falsifiability of rank tracking's only success signal and
 * have to stay directly testable. `rankCheckPaths.ts`, where they are used,
 * reaches the database and so cannot be imported by a unit test at all.
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

/**
 * Why a swallowed rejection still has to yield its reason.
 *
 * A live batch skips per-call failures on purpose, so one bad keyword cannot
 * sink the rest of a run. Dropping the *reason* along with them was not
 * deliberate: a run whose every call was refused — no key configured, a 403 on
 * an account DataForSEO will not serve — reached finalization carrying nothing
 * but a count, and stored "N keyword(s) could not be checked". That names no
 * cause, keeps the provider's own explanation out of the run entirely, and
 * leaves every downstream provider-failure surface with nothing to recognise.
 */
export function firstRejectionMessage(
  outcomes: PromiseSettledResult<unknown>[],
): string | null {
  for (const outcome of outcomes) {
    if (outcome.status !== "rejected") continue;
    const reason: unknown = outcome.reason;
    return reason instanceof Error ? reason.message : String(reason);
  }
  return null;
}
