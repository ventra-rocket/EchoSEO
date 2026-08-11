/**
 * Hosted Site Audit launch ceiling.
 *
 * Audit crawls spend operator-owned Worker CPU even when DataForSEO is BYO.
 * The existing per-user capacity guard limits concurrent stored work, not how
 * often an organization can create/delete/re-run audits, so a fixed-window
 * per-organization counter closes that churn path. Self-host deployments own
 * their compute and keep their existing unrestricted launch behavior.
 */
import { env } from "cloudflare:workers";
import type { AuthMode } from "@/lib/auth-mode";
import { AppError } from "@/server/lib/errors";
import { checkIpRateLimit } from "@/server/services/seo-check/rate-limit-do";

const AUDIT_LAUNCH_LIMIT = 10;
const AUDIT_LAUNCH_WINDOW_MS = 60 * 60 * 1000;

export async function assertAuditLaunchWithinThrottle(input: {
  authMode: AuthMode;
  organizationId: string;
}): Promise<void> {
  if (input.authMode !== "hosted") return;

  const decision = await checkIpRateLimit(
    env.RATE_LIMIT_DO,
    `audit-launch-org:${input.organizationId}`,
    {
      limit: AUDIT_LAUNCH_LIMIT,
      windowMs: AUDIT_LAUNCH_WINDOW_MS,
    },
  );

  if (!decision.allowed) {
    throw new AppError(
      "RATE_LIMITED",
      "Too many site audits started for this organization. Try again later.",
    );
  }
}
