import { createFileRoute, notFound } from "@tanstack/react-router";
import { AutumnProvider, useCustomer } from "autumn-js/react";
import { useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useSession } from "@/lib/auth-client";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { getLocalizedErrorMessage } from "@/client/lib/error-messages";
import { getStoredRedditAttribution } from "@/client/lib/reddit-attribution";
import { BillingUsageChart } from "@/client/features/billing/BillingUsageChart";
import { BillingFeatureBreakdown } from "@/client/features/billing/BillingFeatureBreakdown";
import {
  formatBillingAmounts,
  parseTopUpAmount,
} from "@/client/features/billing/HostedBillingContentUtils";
import { getBillingRouteState } from "@/client/features/billing/route-state";
import { getCustomerPlanStatus } from "@/client/features/billing/plan-detection";
import {
  AUTUMN_PAID_PLAN_ID,
  AUTUMN_SEO_DATA_BALANCE_FEATURE_ID,
  LOW_CREDITS_THRESHOLD_USD,
  AUTUMN_SEO_DATA_CREDITS_PER_USD,
  AUTUMN_SEO_DATA_TOP_UP_PLAN_ID,
  AUTUMN_SEO_DATA_TOPUP_BALANCE_FEATURE_ID,
  autumnSeoDataCreditsToUsd,
} from "@/shared/billing";
import { captureRedditConversionEvent } from "@/serverFunctions/redditConversions";

export const Route = createFileRoute("/_app/billing")({
  beforeLoad: () => {
    if (!isHostedClientAuthMode()) {
      throw notFound();
    }
  },
  component: BillingPage,
});

function BillingPage() {
  return (
    <AutumnProvider>
      <BillingPageContent />
    </AutumnProvider>
  );
}

/**
 * The two whole-page states the billing route can render instead of the plan
 * surface. Extracted so `BillingPageContent` stays under the per-function line
 * ceiling after localization — each is a real state a reader can land on, not a
 * fragment split off to satisfy a linter.
 */
function BillingLoadError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  const intl = useIntl();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-4 py-10 md:p-6 md:py-12">
      <h1 className="text-xl font-semibold">
        <FormattedMessage id="billingPlans.error.title" />
      </h1>
      <p className="text-sm text-base-content/70">
        {getLocalizedErrorMessage(
          intl,
          error,
          intl.formatMessage({ id: "billingPlans.error.loadFailed" }),
        )}
      </p>
      <button type="button" className="btn btn-soft btn-sm" onClick={onRetry}>
        <FormattedMessage id="common.action.retry" />
      </button>
    </div>
  );
}

function BillingRedirecting() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-base-content/50">
        <FormattedMessage id="billingPlans.pending.redirectingStripe" />
      </p>
    </div>
  );
}

function BillingPageContent() {
  const intl = useIntl();
  const { data: session, isPending: isSessionPending } = useSession();
  const [topUpAmount, setTopUpAmount] = useState("20");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customerQuery = useCustomer({
    queryOptions: {
      enabled: Boolean(session?.user?.id),
    },
  });

  const planStatus = getCustomerPlanStatus(customerQuery.data);
  const isFreePlan = planStatus === "free";
  const billingRouteState = getBillingRouteState({
    hasSession: Boolean(session?.user?.id),
    isSessionPending,
    isCustomerLoading: customerQuery.isLoading,
    isCustomerError: customerQuery.isError,
  });

  const monthlyRemaining = autumnSeoDataCreditsToUsd(
    customerQuery.data?.balances?.[AUTUMN_SEO_DATA_BALANCE_FEATURE_ID]
      ?.remaining ?? 0,
  );
  const topUpRemaining = autumnSeoDataCreditsToUsd(
    customerQuery.data?.balances?.[AUTUMN_SEO_DATA_TOPUP_BALANCE_FEATURE_ID]
      ?.remaining ?? 0,
  );
  const totalRemaining = monthlyRemaining + topUpRemaining;

  const { isValid: isValidTopUp, parsed: parsedTopUpAmount } =
    parseTopUpAmount(topUpAmount);
  const checkoutCompleted =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("checkout") === "success";

  useEffect(() => {
    if (!checkoutCompleted || billingRouteState !== "ready") return;

    const attribution = getStoredRedditAttribution();
    if (!attribution) return;

    void captureRedditConversionEvent({
      data: { attribution, eventType: "PURCHASE" },
    });
  }, [billingRouteState, checkoutCompleted]);

  if (billingRouteState === "loading") {
    return null;
  }

  if (billingRouteState === "error") {
    return (
      <BillingLoadError
        error={customerQuery.error}
        onRetry={() => {
          void customerQuery.refetch();
        }}
      />
    );
  }

  async function runAction(
    callback: () => Promise<unknown>,
    fallbackMessage: string,
  ) {
    setError(null);
    setIsPending(true);
    try {
      await callback();
      await customerQuery.refetch();
    } catch (err) {
      setError(getLocalizedErrorMessage(intl, err, fallbackMessage));
    } finally {
      setIsPending(false);
    }
  }

  if (isPending) {
    return <BillingRedirecting />;
  }

  const {
    priceDisplay,
    totalRemainingDisplay,
    monthlyRemainingDisplay,
    topUpRemainingDisplay,
    topUpPrefix,
    topUpSuffix,
    topUpMinDisplay,
    topUpMaxDisplay,
  } = formatBillingAmounts(intl, {
    totalRemaining,
    monthlyRemaining,
    topUpRemaining,
  });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 p-4 py-10 md:p-6 md:py-12">
      <h1 className="text-xl font-semibold">
        <FormattedMessage id="billingPlans.page.title" />
      </h1>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Subscription card */}
        <div className="flex flex-col justify-between rounded-lg border border-base-300 bg-base-100 p-4 gap-4">
          <div>
            <div className="text-2xl font-semibold tabular-nums">
              <FormattedMessage
                id="billingPlans.credits.remaining"
                values={{ amount: totalRemainingDisplay }}
              />
            </div>
            {!isFreePlan ? (
              <div className="mt-1 flex gap-3 text-xs text-base-content/50">
                <span className="tabular-nums">
                  <FormattedMessage
                    id="billingPlans.credits.monthlyAmount"
                    values={{ amount: monthlyRemainingDisplay }}
                  />
                </span>
                <span>&middot;</span>
                <span className="tabular-nums">
                  <FormattedMessage
                    id="billingPlans.credits.topupAmount"
                    values={{ amount: topUpRemainingDisplay }}
                  />
                </span>
              </div>
            ) : null}
            {totalRemaining <= 0 ? (
              <p className="mt-2 text-xs text-error">
                <FormattedMessage
                  id={
                    isFreePlan
                      ? "billingPlans.credits.outOfCreditsFree"
                      : "billingPlans.credits.outOfCreditsPaid"
                  }
                />
              </p>
            ) : totalRemaining < LOW_CREDITS_THRESHOLD_USD ? (
              <p className="mt-2 text-xs text-amber-600">
                <FormattedMessage
                  id={
                    isFreePlan
                      ? "billingPlans.credits.lowFree"
                      : "billingPlans.credits.lowPaid"
                  }
                  values={{ amount: priceDisplay }}
                />
              </p>
            ) : null}
          </div>

          <div className="text-sm">
            <span className="font-medium">
              <FormattedMessage id="billingPlans.plan.label" />
            </span>{" "}
            <span className="text-base-content/50">
              <FormattedMessage
                id={
                  isFreePlan
                    ? "billingPlans.plan.free"
                    : "billingPlans.plan.base"
                }
              />
            </span>
          </div>

          {isFreePlan ? (
            <div className="space-y-3 border-t border-base-300 pt-3">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm font-medium">
                  <FormattedMessage id="billingPlans.plan.base" />
                </span>
                <span className="text-sm font-medium tabular-nums">
                  <FormattedMessage
                    id="billingPlans.plan.priceLabel"
                    values={{ amount: priceDisplay }}
                  />
                </span>
              </div>
              <ul className="space-y-1.5">
                {(
                  [
                    "billingPlans.plan.featureAllAccess",
                    "billingPlans.plan.featureCredits",
                  ] as const
                ).map((id) => (
                  <li
                    key={id}
                    className="flex gap-2 text-xs text-base-content/60"
                  >
                    <span className="text-base-content/30 mt-[1px] shrink-0">
                      &mdash;
                    </span>
                    <FormattedMessage
                      id={id}
                      values={{ amount: priceDisplay }}
                    />
                  </li>
                ))}
              </ul>
              <button
                className="btn btn-soft btn-sm w-full"
                disabled={isPending}
                onClick={() =>
                  void runAction(
                    () =>
                      customerQuery.attach({
                        planId: AUTUMN_PAID_PLAN_ID,
                        redirectMode: "always",
                        successUrl: `${window.location.origin}${window.location.pathname}?checkout=success`,
                      }),
                    intl.formatMessage({
                      id: "billingPlans.checkout.startError",
                    }),
                  )
                }
              >
                <FormattedMessage id="billingPlans.plan.upgradeButton" />
              </button>
            </div>
          ) : (
            <button
              className="btn btn-soft btn-sm w-full"
              disabled={isPending}
              onClick={() =>
                void runAction(
                  () =>
                    customerQuery.openCustomerPortal({
                      returnUrl: window.location.href,
                    }),
                  intl.formatMessage({ id: "billingPlans.portal.openError" }),
                )
              }
            >
              <FormattedMessage id="billingPlans.plan.manageButton" />
            </button>
          )}
        </div>

        {/* Buy credits card — paid plan only */}
        {!isFreePlan ? (
          <div className="rounded-lg border border-base-300 bg-base-100 p-4 space-y-3">
            <div>
              <span className="font-semibold">
                <FormattedMessage id="billingPlans.topup.title" />
              </span>
              <p className="mt-1 text-sm text-base-content/60">
                <FormattedMessage id="billingPlans.topup.description" />
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2">
                {topUpPrefix ? (
                  <span className="text-sm text-base-content/60">
                    {topUpPrefix}
                  </span>
                ) : null}
                <input
                  type="number"
                  min={10}
                  max={99}
                  step={1}
                  inputMode="numeric"
                  className="input input-bordered input-sm w-full"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                />
                {topUpSuffix ? (
                  <span className="text-sm text-base-content/60">
                    {topUpSuffix}
                  </span>
                ) : null}
              </div>
              {topUpAmount.trim() !== "" && !isValidTopUp ? (
                <p className="mt-1 text-xs text-error">
                  <FormattedMessage
                    id="billingPlans.topup.rangeHint"
                    values={{ min: topUpMinDisplay, max: topUpMaxDisplay }}
                  />
                </p>
              ) : null}
            </div>

            <button
              className="btn btn-soft btn-sm w-full"
              disabled={isPending || !isValidTopUp}
              onClick={() =>
                void runAction(
                  () =>
                    customerQuery.attach({
                      planId: AUTUMN_SEO_DATA_TOP_UP_PLAN_ID,
                      redirectMode: "always",
                      successUrl: window.location.href,
                      featureQuantities: [
                        {
                          featureId: AUTUMN_SEO_DATA_TOPUP_BALANCE_FEATURE_ID,
                          quantity: Math.round(
                            parsedTopUpAmount * AUTUMN_SEO_DATA_CREDITS_PER_USD,
                          ),
                        },
                      ],
                    }),
                  intl.formatMessage({
                    id: "billingPlans.checkout.startError",
                  }),
                )
              }
            >
              <FormattedMessage id="billingPlans.topup.buyButton" />
            </button>
          </div>
        ) : null}
      </div>

      {/* Usage chart */}
      <BillingUsageChart />

      {/* Per-feature usage breakdown */}
      <BillingFeatureBreakdown />

      {error ? <p className="text-sm text-error">{error}</p> : null}

      <p className="text-xs text-base-content/40">
        <FormattedMessage id="billingPlans.footer.poweredByStripe" />
      </p>
    </div>
  );
}
