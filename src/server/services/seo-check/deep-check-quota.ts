/**
 * Daily abuse quotas for the Free Deep SEO Check, enforced at the spend commit
 * (deep-confirm, after the CAS win). Reuses the per-IP rate-limit Durable Object
 * as a generic keyed fixed-window counter: a global ceiling guards the shared
 * PSI daily quota, and per-domain + per-email limits stop a single actor from
 * flooding.
 *
 * Fails closed — an over-count from a later enqueue failure only makes us
 * stricter, never more permissive.
 */
import { env } from "cloudflare:workers";
import { checkIpRateLimit } from "./rate-limit-do";
import { DEEP_CHECK_WINDOW_MS, getDeepCheckLimits } from "./deep-check-config";

interface QuotaDecision {
  allowed: boolean;
  message?: string;
}

/** Neutral wording — never reveals which limit (global/domain/email) tripped. */
const BLOCKED_MESSAGE =
  "Today's free deep-check limit has been reached. Please try again tomorrow.";

export async function checkDeepCheckQuotas(input: {
  emailNormalized: string;
  domain: string;
}): Promise<QuotaDecision> {
  const limits = await getDeepCheckLimits();

  // Order matters: the global ceiling guards the shared PSI quota first, then
  // the narrower per-actor limits. Each call increments only its own counter,
  // and a block short-circuits the rest.
  const gates: Array<{ key: string; limit: number }> = [
    { key: "deep-psi-global", limit: limits.psiDailyCeiling },
    { key: `deep-domain:${input.domain}`, limit: limits.perDomainDaily },
    { key: `deep-email:${input.emailNormalized}`, limit: limits.perEmailDaily },
  ];

  for (const gate of gates) {
    const decision = await checkIpRateLimit(env.RATE_LIMIT_DO, gate.key, {
      limit: gate.limit,
      windowMs: DEEP_CHECK_WINDOW_MS,
    });
    if (!decision.allowed) return { allowed: false, message: BLOCKED_MESSAGE };
  }
  return { allowed: true };
}
