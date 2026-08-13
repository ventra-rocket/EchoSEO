import type { EnsuredUserContext } from "@/middleware/ensure-user/types";
import {
  AUTUMN_MANAGED_ACCESS_FEATURE_ID,
  AUTUMN_PAID_PLAN_FEATURE_ID,
  AUTUMN_SEO_DATA_BALANCE_FEATURE_ID,
  AUTUMN_SEO_DATA_CREDITS_PER_USD,
  AUTUMN_SEO_DATA_TOPUP_BALANCE_FEATURE_ID,
  SEO_DATA_COST_MARKUP,
  roundUsdForBilling,
} from "@/shared/billing";
import type { CreditFeature } from "@/shared/billing-credit-features";
import { autumn } from "@/server/billing/autumn";
import { captureServerEvent } from "@/server/lib/posthog";
import { AppError } from "@/server/lib/errors";
import {
  getOptionalEnvValue,
  isAutumnConfigured,
  isHostedAccessOpen,
} from "@/server/lib/runtime-env";

/**
 * Comma-separated org IDs granted core access while billing is deferred
 * (founder + invited early users). Mirrors the `deep-check-config` env pattern.
 * Unset/blank = no one (fail-closed).
 */
const CORE_ACCESS_ALLOWLIST_ENV = "CORE_ACCESS_ALLOWLIST";

export type BillingCustomerContext = Pick<
  EnsuredUserContext,
  "organizationId" | "userEmail" | "userId"
> & {
  projectId?: string;
};

export async function getOrCreateOrganizationCustomer(
  context: BillingCustomerContext,
) {
  const customer = await autumn.customers.getOrCreate({
    customerId: context.organizationId,
    email: context.userEmail,
  });

  if (!customer.id) {
    throw new AppError("INTERNAL_ERROR", "Failed to resolve billing customer");
  }

  return {
    ...customer,
    id: customer.id,
  };
}

// Billing FACT: does this org actually hold the paid-plan entitlement? When
// Autumn is not configured we degrade to `false` (with a traceable warn) rather
// than calling `autumn.check()` — which would throw on the missing secret and
// surface as a 500. A present-but-broken key still calls through and throws
// loudly (never swallowed to false), so a billing outage can't silently pass.
export async function customerHasPaidPlan(
  customerId: string,
): Promise<boolean> {
  if (!(await isAutumnConfigured())) {
    console.warn(
      `[billing] paid-plan denied: Autumn not configured (customer=${customerId})`,
    );
    return false;
  }

  const result = await autumn.check({
    customerId,
    featureId: AUTUMN_PAID_PLAN_FEATURE_ID,
  });

  return result.allowed;
}

// Billing FACT: does this org hold the managed-service entitlement? Same
// degrade-on-absent / throw-on-broken contract as {@link customerHasPaidPlan}.
export async function customerHasManagedAccess(
  customerId: string,
): Promise<boolean> {
  if (!(await isAutumnConfigured())) {
    console.warn(
      `[billing] managed-access denied: Autumn not configured (customer=${customerId})`,
    );
    return false;
  }

  const result = await autumn.check({
    customerId,
    featureId: AUTUMN_MANAGED_ACCESS_FEATURE_ID,
  });

  return result.allowed;
}

/**
 * Membership test against `CORE_ACCESS_ALLOWLIST`. Fail-closed: an unset, blank,
 * or malformed env grants no one; blank entries are dropped, never widened to
 * "everyone". This is a POLICY layer kept separate from the billing facts above
 * so the two access axes — access(billing) vs capability(data-provider) — stay
 * orthogonal.
 */
export async function isOrgAllowlisted(
  organizationId: string,
): Promise<boolean> {
  if (!organizationId) return false;
  const raw = await getOptionalEnvValue(CORE_ACCESS_ALLOWLIST_ENV);
  if (!raw) return false;
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .includes(organizationId);
}

/**
 * POLICY: may this org use MANAGED (Workers-compute) features like Site Audit?
 * Open access is on OR allowlisted (founder + invited, billing deferred) OR the
 * org actually holds the managed-access entitlement. Kept distinct from
 * {@link orgMayUsePaidFeatures} on purpose: the two gate on DIFFERENT Autumn
 * features, so collapsing them would silently downgrade one once billing is
 * configured.
 *
 * `HOSTED_ACCESS_OPEN` belongs HERE rather than at each call site. It already
 * meant "let people in while billing is deferred", but only one of the four
 * call sites checked it, so a signup that the flag was supposed to admit still
 * met PAYMENT_REQUIRED with nothing available to buy. Deciding it once is what
 * stops the next gate from forgetting.
 */
export async function orgMayUseManagedFeatures(
  organizationId: string,
): Promise<boolean> {
  if (await isHostedAccessOpen()) return true;
  if (await isOrgAllowlisted(organizationId)) return true;
  return customerHasManagedAccess(organizationId);
}

/**
 * POLICY: may this org use PAID DataForSEO-fanout features (AI Visibility, rank
 * checks)? Open access is on OR allowlisted OR holds the paid-plan entitlement.
 * See {@link orgMayUseManagedFeatures} for why the two policies stay separate,
 * and for why the flag is read here rather than at the call sites.
 *
 * Opening this axis does not open the wallet, because it is not the axis that
 * spends: fetching data still requires a spend-authorized provider credential.
 * The shared DataForSEO credential policy rejects an operator global key while
 * hosted open-access bypasses billing, so an org without its own key gets the
 * "configure a key" path rather than an operator bill. That separation between
 * access (billing) and capability (data provider) is exactly what makes it safe
 * to answer this question generously — keep them orthogonal.
 */
export async function orgMayUsePaidFeatures(
  organizationId: string,
): Promise<boolean> {
  if (await isHostedAccessOpen()) return true;
  if (await isOrgAllowlisted(organizationId)) return true;
  return customerHasPaidPlan(organizationId);
}

// Remaining shared usage credits — the monthly `usage_credits` balance plus the
// rolled-over `topup_credits` balance. Both DataForSEO and LLM spend draw from
// these (the `seo_data_usage` and `llm_usage` features both map into them).
export async function getUsageCreditsRemaining(customerId: string): Promise<{
  monthlyRemaining: number;
  topupRemaining: number;
}> {
  const [monthlyCheck, topupCheck] = await Promise.all([
    autumn.check({ customerId, featureId: AUTUMN_SEO_DATA_BALANCE_FEATURE_ID }),
    autumn.check({
      customerId,
      featureId: AUTUMN_SEO_DATA_TOPUP_BALANCE_FEATURE_ID,
    }),
  ]);

  return {
    monthlyRemaining: monthlyCheck.balance?.remaining ?? 0,
    topupRemaining: topupCheck.balance?.remaining ?? 0,
  };
}

/**
 * Throws INSUFFICIENT_CREDITS when the org has no usage/topup credits left.
 * Returns the monthly remaining so a caller can split spend monthly-first.
 */
export async function assertUsageCreditsAvailable(
  customerId: string,
): Promise<{ monthlyRemaining: number }> {
  const { monthlyRemaining, topupRemaining } =
    await getUsageCreditsRemaining(customerId);

  if (monthlyRemaining + topupRemaining <= 0) {
    throw new AppError("INSUFFICIENT_CREDITS");
  }

  return { monthlyRemaining };
}

/**
 * Deducts a USD provider cost from the org's shared usage-credit pool: applies
 * the platform markup, converts to credits, spends monthly `usage_credits`
 * first then `topup_credits`, and emits the usage:credits_consume event. Both
 * DataForSEO and onboarding-LLM spend route through here, so they draw from the
 * one pool. Pass `monthlyRemaining` from the balance check that gated the call.
 */
export async function trackUsageCreditSpend(args: {
  customer: BillingCustomerContext;
  customerId: string;
  creditFeature: CreditFeature;
  costUsd: number;
  monthlyRemaining: number;
  properties?: Record<string, unknown>;
}): Promise<void> {
  const totalCostUsd = roundUsdForBilling(args.costUsd * SEO_DATA_COST_MARKUP);
  const totalCostCredits = Math.ceil(
    totalCostUsd * AUTUMN_SEO_DATA_CREDITS_PER_USD,
  );
  if (totalCostCredits <= 0) return;

  const monthlyDeduct = Math.min(args.monthlyRemaining, totalCostCredits);
  const topupDeduct = totalCostCredits - monthlyDeduct;

  const properties = {
    currency: "USD",
    creditFeature: args.creditFeature,
    totalCostUsd,
    totalCostCredits,
    ...args.properties,
  };

  if (monthlyDeduct > 0) {
    await autumn.track({
      customerId: args.customerId,
      featureId: AUTUMN_SEO_DATA_BALANCE_FEATURE_ID,
      value: monthlyDeduct,
      properties: {
        ...properties,
        balanceFeatureId: AUTUMN_SEO_DATA_BALANCE_FEATURE_ID,
      },
    });
  }

  if (topupDeduct > 0) {
    await autumn.track({
      customerId: args.customerId,
      featureId: AUTUMN_SEO_DATA_TOPUP_BALANCE_FEATURE_ID,
      value: topupDeduct,
      properties: {
        ...properties,
        balanceFeatureId: AUTUMN_SEO_DATA_TOPUP_BALANCE_FEATURE_ID,
      },
    });
  }

  await captureServerEvent({
    distinctId: args.customer.userId,
    event: "usage:credits_consume",
    organizationId: args.customer.organizationId,
    properties: {
      project_id: args.customer.projectId,
      credit_feature: args.creditFeature,
      monthly_credits: monthlyDeduct,
      topup_credits: topupDeduct,
      total_credits: totalCostCredits,
      cost_usd: totalCostUsd,
    },
  });
}
