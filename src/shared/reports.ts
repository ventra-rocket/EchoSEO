/**
 * Shared identities for the periodic report feature.
 *
 * Kept in `shared/` because three very different callers need the same strings:
 * the Worker's raw `fetch()` dispatch, the email builder that has to print an
 * absolute unsubscribe URL, and the client toggle.
 */

/**
 * Public unsubscribe endpoint — a raw Worker route, not a `createServerFn`.
 *
 * Every server function runs through the global auth middleware, which requires
 * a session in every AUTH_MODE. An unsubscribe link is followed from a mail
 * client by someone who may never have signed in (the recipient does not have
 * to be a workspace member), and RFC 8058 one-click unsubscribe is a bare POST
 * from the mail provider's infrastructure with no cookies at all. So this is
 * dispatched in server.ts before the auth pipeline, like the free checker's
 * confirm route.
 *
 * GET renders a small confirmation page; POST performs the unsubscribe. Both
 * carry the token in the query string, because RFC 8058 forbids relying on the
 * request body.
 */
export const REPORT_UNSUBSCRIBE_PATH = "/api/reports/unsubscribe";

/**
 * When the weekly report goes out: Monday 01:00 UTC = 08:00 Vietnam time.
 *
 * The Agents SDK evaluates cron with `cron-schedule` and passes no timezone
 * (`parseCronExpression(cron).getNextDate()`), so the expression is read in the
 * runtime's local zone — which on Workers is always UTC. Do not "correct" this
 * to 08:00 expecting local time.
 *
 * This is a Durable Object schedule, not a `triggers.crons` entry. The Worker's
 * `scheduled()` handler falls through to rank tracking for any cron string it
 * does not recognise, so a fourth global cron would silently run the wrong job;
 * a per-target agent alarm avoids that class of bug entirely and does not have
 * to scan D1 for due rows.
 */
export const WEEKLY_REPORT_CRON = "0 1 * * 1";

/**
 * URL prefix `routeAgentRequest` would map onto the `WEEKLY_REPORT` binding.
 * Nothing should ever reach the agent over HTTP — it is driven by alarms and by
 * direct RPC from server functions — so server.ts rejects this prefix
 * explicitly rather than letting it fall into the onboarding chat's authorizer.
 */
export const WEEKLY_REPORT_AGENT_ROUTE_PREFIX = "/agents/weekly-report/";

/** Absolute one-click unsubscribe link for a subscription's token. */
export function buildUnsubscribeUrl(origin: string, token: string): string {
  return `${origin}${REPORT_UNSUBSCRIBE_PATH}?token=${encodeURIComponent(token)}`;
}
