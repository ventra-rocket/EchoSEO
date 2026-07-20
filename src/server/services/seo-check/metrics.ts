/**
 * Structured funnel metrics for the Free SEO Checker.
 *
 * Deliberately a console line, not a PostHog event: the anonymous tier has no
 * user or organization to key an event on, and — the launch requirement —
 * counting from the operator's OWN Worker logs (Cloudflare Workers Analytics /
 * Logpush) leaks nothing off a self-hosted deployment. Each line is one funnel
 * step, greppable by the `[metric]` prefix and its `event=` field.
 *
 * Fields are aggregate-only. Never put an email, a token, or any PII here — the
 * domain and coarse counters are the whole point. Values are joined as bare
 * `k=v` with no escaping, which is safe only because every value is a hostname,
 * a UUID, a number, or a boolean — keep it that way.
 *
 * Funnel gap to know when reading these: `deep_confirm` counts a confirmed
 * email that reached dispatch, but three dispatch outcomes settle a report
 * WITHOUT a `deep_done`/`deep_failed` — dedupe-attach (its canonical emits the
 * `deep_done`, not this report), quota-block, and the kill-switch. So
 * `deep_confirm - (deep_done + deep_failed)` is those three plus anything still
 * in flight, not lost checks; reconcile against D1 `seo_reports.status` if the
 * exact split matters.
 */
type CheckMetricEvent =
  | "lite_check"
  | "deep_start"
  | "deep_confirm"
  | "deep_done"
  | "deep_failed"
  | "psi_call";

export function recordCheckMetric(
  event: CheckMetricEvent,
  fields: Record<string, string | number | boolean> = {},
): void {
  const encoded = Object.entries(fields)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
  console.log(`[metric] event=${event}${encoded ? ` ${encoded}` : ""}`);
}
