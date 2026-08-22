import { Link } from "@tanstack/react-router";
import { AutumnProvider, useCustomer } from "autumn-js/react";
import { FormattedMessage } from "react-intl";
import { useSession } from "@/lib/auth-client";
import { getCustomerPlanStatus } from "@/client/features/billing/plan-detection";
import {
  AUTUMN_SEO_DATA_BALANCE_FEATURE_ID,
  AUTUMN_SEO_DATA_TOPUP_BALANCE_FEATURE_ID,
  BILLING_ROUTE,
  LOW_CREDITS_THRESHOLD_USD,
  SUBSCRIBE_ROUTE,
  autumnSeoDataCreditsToUsd,
} from "@/shared/billing";

export function FreePlanBanner() {
  return (
    <AutumnProvider>
      <FreePlanBannerContent />
    </AutumnProvider>
  );
}

function FreePlanBannerContent() {
  const { data: session } = useSession();
  const customerQuery = useCustomer({
    queryOptions: {
      enabled: Boolean(session?.user?.id),
    },
  });

  if (customerQuery.isLoading || !customerQuery.data) {
    return null;
  }

  const planStatus = getCustomerPlanStatus(customerQuery.data);
  const isFreePlan = planStatus === "free";

  const monthlyRemaining = autumnSeoDataCreditsToUsd(
    customerQuery.data.balances?.[AUTUMN_SEO_DATA_BALANCE_FEATURE_ID]
      ?.remaining ?? 0,
  );
  const topUpRemaining = autumnSeoDataCreditsToUsd(
    customerQuery.data.balances?.[AUTUMN_SEO_DATA_TOPUP_BALANCE_FEATURE_ID]
      ?.remaining ?? 0,
  );
  const totalRemaining = monthlyRemaining + topUpRemaining;

  const isOutOfCredits = totalRemaining <= 0;
  const isLowCredits =
    !isOutOfCredits && totalRemaining < LOW_CREDITS_THRESHOLD_USD;

  const creditsActionLink = isFreePlan ? (
    <Link
      to={SUBSCRIBE_ROUTE}
      search={{ upgrade: true }}
      className="link link-primary font-medium"
    >
      <FormattedMessage id="billingPlans.subscribe.upgradeTitle" />
    </Link>
  ) : (
    <Link to={BILLING_ROUTE} className="link link-primary font-medium">
      <FormattedMessage id="billingPlans.freeBanner.buyMoreCreditsLink" />
    </Link>
  );

  if (isOutOfCredits) {
    return (
      <BannerShell variant="error">
        <FormattedMessage
          id="billingPlans.freeBanner.outOfCredits"
          values={{ link: creditsActionLink }}
        />
      </BannerShell>
    );
  }

  if (isLowCredits) {
    return (
      <BannerShell variant="warning">
        <FormattedMessage
          id="billingPlans.freeBanner.lowCredits"
          values={{ link: creditsActionLink }}
        />
      </BannerShell>
    );
  }

  if (isFreePlan) {
    return (
      <BannerShell variant="info">
        <FormattedMessage
          id="billingPlans.freeBanner.enjoying"
          values={{
            upgradeLink: (chunks) => (
              <Link
                to={SUBSCRIBE_ROUTE}
                search={{ upgrade: true }}
                className="link link-primary font-medium"
              >
                {chunks}
              </Link>
            ),
            supportLink: (chunks) => (
              <Link to="/support" className="link link-primary font-medium">
                {chunks}
              </Link>
            ),
          }}
        />
      </BannerShell>
    );
  }

  return null;
}

function BannerShell({
  variant,
  children,
}: {
  variant: "info" | "warning" | "error";
  children: React.ReactNode;
}) {
  const alertClass =
    variant === "error"
      ? "alert-error"
      : variant === "warning"
        ? "alert-warning"
        : "alert-info";

  return (
    <div className="shrink-0 px-4 py-2.5 md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className={`alert text-sm ${alertClass}`}>
          <span>{children}</span>
        </div>
      </div>
    </div>
  );
}
