/**
 * R2 object keys for a Deep report and its page capture.
 *
 * Deliberately dependency-free (no `cloudflare:workers`) so the retention
 * repository — and its test, which runs outside the Worker runtime — can derive
 * the same keys the store writes without importing the store itself. Same
 * reasoning as `deep-failure-messages.ts`.
 */

export function reportKey(id: string): string {
  return `deep-reports/${id}.json`;
}

/**
 * Derived from the report id rather than stored in D1: the screenshot is an
 * optional companion to a payload that already has a row, so a second column
 * (and its migration) would buy nothing. The retention sweep derives the same
 * key to purge the pair together — deleting a key that was never written is a
 * no-op in R2, so a report without a screenshot costs nothing.
 */
export function screenshotKey(id: string): string {
  return `deep-reports/${id}-screenshot`;
}
