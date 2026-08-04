/**
 * Serves the optional AI commentary shown beside an audit issue's cited fix.
 *
 * Every *expected* failure returns `{ available: false }` rather than throwing:
 * an unconfigured key, an empty credit balance, a rate limit, a model timeout
 * and a guardrail rejection are all the same outcome to the reader, because
 * the panel is an extra on top of deterministic, already-cited remediation
 * steps and "no commentary" is always a correct answer.
 *
 * What this does NOT promise is that it never throws. Requesting an audit that
 * belongs to another project raises `NOT_FOUND`, matching every other audit
 * read, and the infrastructure calls underneath (D1, R2, the rate-limit
 * Durable Object, the billing client) can fail like any other. The client
 * treats a rejected call as "no commentary" too, so the issue drawer survives
 * either way — but do not build a caller on the assumption of a total function.
 */
import { env } from "cloudflare:workers";
import { AuditRepository } from "@/server/features/audit/repositories/AuditRepository";
import { AuditIssueRepository } from "@/server/features/audit/repositories/AuditIssueRepository";
import { getIssueFixText } from "@/server/features/audit/issues/issue-fix-text";
import {
  generateExplanation,
  validateExplanation,
  type IssueExplanation,
} from "@/server/features/audit/issues/ai-explanation";
import {
  getCachedExplanation,
  putCachedExplanation,
} from "@/server/features/audit/issues/ai-explanation-cache";
import {
  assertUsageCreditsAvailable,
  trackUsageCreditSpend,
  type BillingCustomerContext,
} from "@/server/billing/subscription";
import { checkIpRateLimit } from "@/server/services/seo-check/rate-limit-do";
import {
  isHostedAccessOpen,
  isHostedServerAuthMode,
} from "@/server/lib/runtime-env";
import { AppError } from "@/server/lib/errors";
import { safeHttpUrl } from "@/lib/safe-url";
import type { Locale } from "@/server/lib/seo-rules";

/** How many URLs from the crawl the model is shown. */
const SAMPLE_SIZE = 10;

/**
 * Generations per organization per hour. The cache means a normal reader
 * generates once per rule and never again, so this only bites on deliberate
 * churn — every LLM endpoint in this codebase was previously unmetered by
 * anything except the credit balance.
 */
const EXPLANATION_RATE_LIMIT = 40;
const EXPLANATION_RATE_WINDOW_MS = 60 * 60 * 1000;

type ExplanationResult =
  | { available: false }
  | { available: true; explanation: IssueExplanation };

const UNAVAILABLE: ExplanationResult = { available: false };

async function explainIssue(input: {
  auditId: string;
  projectId: string;
  ruleId: string;
  locale: Locale;
  billingCustomer: BillingCustomerContext;
}): Promise<ExplanationResult> {
  const audit = await AuditRepository.getAuditForProject(
    input.auditId,
    input.projectId,
  );
  if (!audit) throw new AppError("NOT_FOUND");

  const fix = getIssueFixText(input.ruleId, input.locale);
  if (!fix) return UNAVAILABLE;

  const occurrences = await AuditIssueRepository.listOccurrences({
    auditId: input.auditId,
    ruleId: input.ruleId,
    limit: SAMPLE_SIZE,
    offset: 0,
  });
  // Nothing to explain, and no rule version to key a cache entry on.
  if (occurrences.length === 0) return UNAVAILABLE;

  const cacheKey = {
    organizationId: input.billingCustomer.organizationId,
    auditId: input.auditId,
    ruleId: input.ruleId,
    ruleVersion: occurrences[0].ruleVersion,
    locale: input.locale,
  };

  // Re-run the guardrails on the way out of the cache, not just on the way in.
  // Entries outlive deploys, so tightening the validator has to retroactively
  // suppress anything already stored that would now be rejected — otherwise a
  // fabricated citation written under an older, weaker check keeps being
  // served for months.
  const cached = await getCachedExplanation(cacheKey);
  if (cached) {
    const stillValid = validateExplanation(cached, input.ruleId);
    if (stillValid) return { available: true, explanation: stillValid };
  }

  const total = await AuditIssueRepository.countOccurrences({
    auditId: input.auditId,
    ruleId: input.ruleId,
  });

  // Everything below this point can spend money, so the gates go here rather
  // than at the top — a cache hit must never consume quota.
  const hosted = await isHostedServerAuthMode();
  // Open-access mode has no billing provider: the operator funds the LLM
  // directly, so skip the credit gate and the spend metering (both would hit an
  // unconfigured Autumn) while keeping the abuse rate limit.
  const billingActive = hosted && !(await isHostedAccessOpen());
  let monthlyRemaining = 0;
  if (hosted) {
    const rateLimit = await checkIpRateLimit(
      env.RATE_LIMIT_DO,
      `issue-explainer:${input.billingCustomer.organizationId}`,
      { limit: EXPLANATION_RATE_LIMIT, windowMs: EXPLANATION_RATE_WINDOW_MS },
    );
    if (!rateLimit.allowed) return UNAVAILABLE;

    if (billingActive) {
      try {
        ({ monthlyRemaining } = await assertUsageCreditsAvailable(
          input.billingCustomer.organizationId,
        ));
      } catch {
        // Out of credits reads the same as unconfigured: the panel is absent
        // and the cited fix steps are untouched. No upsell in a technical
        // screen.
        return UNAVAILABLE;
      }
    }
  }

  const generated = await generateExplanation({
    ruleId: input.ruleId,
    severity: occurrences[0].severity,
    label: fix.label,
    problem: fix.problem,
    fixSteps: fix.fixSteps,
    affectedUrlCount: total,
    pagesCrawled: audit.pagesCrawled,
    samples: occurrences.map((occurrence) => ({
      // Only the part of the URL that says which page this is. The full URL
      // adds nothing the model needs and more third-party text than necessary.
      url: toPathForPrompt(occurrence.url),
      evidence: parseEvidenceForPrompt(occurrence.evidenceJson),
    })),
    locale: input.locale,
  });

  if (!generated) return UNAVAILABLE;

  if (billingActive) {
    if (generated.costUsd > 0) {
      await trackUsageCreditSpend({
        customer: input.billingCustomer,
        customerId: input.billingCustomer.organizationId,
        creditFeature: "issue_explainer",
        costUsd: generated.costUsd,
        monthlyRemaining,
        properties: { provider: "openrouter", ruleId: input.ruleId },
      });
    } else {
      // Cost is read out of the provider's response metadata, so a shape
      // change upstream would meter every generation at zero and hand out
      // paid-for model calls silently. Free is not a normal outcome here —
      // say so rather than let it look like success.
      console.warn(
        `[audit-explainer] generated with no reported cost for rule ${input.ruleId}; metering may be broken`,
      );
    }
  }

  // Caching is an optimization, not part of the answer. A failed write must
  // not throw away an explanation the customer has already been billed for —
  // that would lose the content *and* charge again on the next attempt.
  try {
    await putCachedExplanation(cacheKey, generated.explanation);
  } catch (error) {
    console.error("[audit-explainer] failed to cache explanation:", error);
  }

  return { available: true, explanation: generated.explanation };
}

/**
 * The path of a crawled URL, or the raw string when it is not an http(s) URL
 * (the crawler stores whatever a page pointed at). Either way the caller
 * neutralizes it before it reaches the prompt.
 */
function toPathForPrompt(url: string): string {
  if (!safeHttpUrl(url)) return url;
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function parseEvidenceForPrompt(
  evidenceJson: string | null,
): Array<{ key: string; value: string }> {
  if (!evidenceJson) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(evidenceJson);
  } catch {
    return [];
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return [];
  }

  return Object.entries(parsed).flatMap(([key, value]) =>
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
      ? [{ key, value: String(value) }]
      : [],
  );
}

export const AuditExplanationService = { explainIssue } as const;
