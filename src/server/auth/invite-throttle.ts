/**
 * Per-workspace invite rate limit (hosted only).
 *
 * Better Auth's `invitationLimit` only caps *pending* invitations — an
 * owner/admin can cancel a pending invite and re-invite to free the slot
 * indefinitely, and every invite sends one email to an arbitrary address
 * (spam / phishing / joe-job vector). This throttles invite *creation* instead,
 * reusing the generic fixed-window rate-limit Durable Object as a keyed counter
 * (the same pattern as the deep-check daily quotas).
 *
 * Three gates in order: a per-org ceiling caps the total volume one workspace
 * can emit; a narrower per-(org, email) gate stops one address being dossed from
 * a single workspace; and a global per-email gate caps invites to one address
 * across ALL workspaces, so the anti-doss protection survives an attacker who
 * spins up many workspaces (hosted auto-creates one per signup). Fails open — a
 * rate-limiter outage must not block a legitimate invite; the counter itself
 * already fails closed on over-count.
 *
 * The hosted gate + the APIError live in the `beforeCreateInvitation` hook
 * (assertInviteWithinThrottle); this module only counts.
 */
import { env } from "cloudflare:workers";
import { checkIpRateLimit } from "@/server/services/seo-check/rate-limit-do";
import { getOptionalEnvValue } from "@/server/lib/runtime-env";

/**
 * Fixed-window span for the invite caps (the rate-limit DO is fixed-window, so a
 * burst straddling a window edge can admit up to ~2x the cap — an accepted
 * characteristic, not a rolling window).
 */
const INVITE_THROTTLE_WINDOW_MS = 60 * 60 * 1000;

const DEFAULT_PER_ORG_HOURLY = 20;
const DEFAULT_PER_EMAIL_HOURLY = 3;
const DEFAULT_GLOBAL_EMAIL_HOURLY = 6;

interface InviteThrottleLimits {
  perOrgHourly: number;
  perEmailHourly: number;
  globalEmailHourly: number;
}

async function readPositiveInt(
  name: string,
  fallback: number,
): Promise<number> {
  // A missing, non-numeric, or non-positive value (including `0`) falls back to
  // the default — an override cannot *disable* the cap, only retune it.
  const raw = await getOptionalEnvValue(name);
  if (raw == null) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

/** Env-overridable so an operator can retune the caps without a deploy. */
async function getInviteThrottleLimits(): Promise<InviteThrottleLimits> {
  const [perOrgHourly, perEmailHourly, globalEmailHourly] = await Promise.all([
    readPositiveInt("INVITE_THROTTLE_PER_ORG_HOURLY", DEFAULT_PER_ORG_HOURLY),
    readPositiveInt(
      "INVITE_THROTTLE_PER_EMAIL_HOURLY",
      DEFAULT_PER_EMAIL_HOURLY,
    ),
    readPositiveInt(
      "INVITE_THROTTLE_GLOBAL_EMAIL_HOURLY",
      DEFAULT_GLOBAL_EMAIL_HOURLY,
    ),
  ]);
  return { perOrgHourly, perEmailHourly, globalEmailHourly };
}

export async function checkInviteThrottle(input: {
  organizationId: string;
  emailNormalized: string;
}): Promise<{ allowed: boolean }> {
  const limits = await getInviteThrottleLimits();

  // Order matters: the per-org ceiling caps total blast radius first, then the
  // per-(org, email) gate, then the cross-org global per-email gate. Each call
  // increments only its own counter and a block short-circuits the rest — a
  // blocked attempt sends no email, so not counting it against later gates is
  // correct.
  const gates: Array<{ key: string; limit: number }> = [
    { key: `invite-org:${input.organizationId}`, limit: limits.perOrgHourly },
    {
      key: `invite-org-email:${input.organizationId}:${input.emailNormalized}`,
      limit: limits.perEmailHourly,
    },
    {
      key: `invite-email:${input.emailNormalized}`,
      limit: limits.globalEmailHourly,
    },
  ];

  try {
    for (const gate of gates) {
      const decision = await checkIpRateLimit(env.RATE_LIMIT_DO, gate.key, {
        limit: gate.limit,
        windowMs: INVITE_THROTTLE_WINDOW_MS,
      });
      if (!decision.allowed) return { allowed: false };
    }
  } catch (error) {
    // Fail open: a rate-limiter outage must not block a legitimate invite.
    // Logged under a stable, greppable token (+ org id, no PII) so an operator
    // can alert on fail-open frequency instead of a generic error line.
    console.error(
      `[invite-throttle] fail_open org=${input.organizationId}`,
      error,
    );
    return { allowed: true };
  }

  return { allowed: true };
}
