import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { AutumnProvider, useCustomer } from "autumn-js/react";
import { useEffect, useState } from "react";
import { ArrowRight, Settings, User } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import { ThemePreferenceMenuItems } from "@/client/components/ThemePreferenceMenuItems";
import { EchoSeoLogo } from "@/client/components/EchoSeoLogo";
import { captureClientEvent } from "@/client/lib/posthog";
import { getStoredRedditAttribution } from "@/client/lib/reddit-attribution";
import { signOutAndRedirect, useSession } from "@/lib/auth-client";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { getLocalizedErrorMessage } from "@/client/lib/error-messages";
import { getSubscribeRouteState } from "@/client/features/billing/route-state";
import { getCustomerPlanStatus } from "@/client/features/billing/plan-detection";
import { MANAGED_ACCESS_QUERY_KEY } from "@/client/features/billing/managed-access";
import { BASE_PLAN_PRICE_USD } from "@/client/features/billing/HostedBillingContentUtils";
import { normalizeAuthRedirect } from "@/lib/auth-redirect";
import { queryClient } from "@/client/tanstack-db";
import {
  AUTUMN_MANAGED_ACCESS_FEATURE_ID,
  AUTUMN_PAID_PLAN_ID,
} from "@/shared/billing";
import { captureRedditConversionEvent } from "@/serverFunctions/redditConversions";

const SUPPORT_EMAIL = "ventrarocket.work@gmail.com";

// Reuses billingPlans.plan.featureCredits ("Includes {amount} of Usage Credits
// each month") from billing.tsx's identical free-plan feature list — same
// fact, one id — with `amount` interpolated at render time below.
const PLAN_FEATURE_IDS = [
  "billingPlans.plan.featureCore",
  "billingPlans.plan.featureMcp",
  "billingPlans.plan.featureGsc",
  "billingPlans.plan.featureCredits",
] as const;

export const Route = createFileRoute("/_authenticated/subscribe")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { upgrade?: true; redirect?: string } => ({
    upgrade:
      search.upgrade === true || search.upgrade === "true" ? true : undefined,
    redirect:
      typeof search.redirect === "string"
        ? normalizeAuthRedirect(search.redirect)
        : undefined,
  }),
  component: SubscribePage,
});

function SubscribePage() {
  return (
    <AutumnProvider>
      <SubscribePageContent />
    </AutumnProvider>
  );
}

function SubscribePageContent() {
  const intl = useIntl();
  const navigate = useNavigate();
  const { upgrade: isUpgradeFlow, redirect } = Route.useSearch();
  const { data: session } = useSession();
  const [isAttaching, setIsAttaching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkoutCompleted =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("checkout") === "success";

  const hasSession = Boolean(session?.user?.id);
  const customerQuery = useCustomer({
    queryOptions: {
      enabled: hasSession,
    },
  });

  // Read managed access from the already-loaded Autumn customer (local, no API
  // call) instead of a separate server round-trip. Self-hosted has no Autumn
  // customer, so mirror the server's "always granted" behavior there.
  const hasManagedAccess = isHostedClientAuthMode()
    ? customerQuery.check({ featureId: AUTUMN_MANAGED_ACCESS_FEATURE_ID })
        .allowed
    : true;

  const planStatus = getCustomerPlanStatus(customerQuery.data);
  const subscribeRouteState = getSubscribeRouteState({
    hasSession,
    isCustomerLoading: customerQuery.isLoading,
    isCustomerError: customerQuery.isError,
    hasManagedAccess,
    planStatus,
    isUpgradeFlow: isUpgradeFlow === true,
    checkoutCompleted,
  });

  // Autumn can lag Stripe by a few seconds after checkout; poll until the
  // subscription shows up so the just-paid user isn't shown the paywall again.
  const isFinalizing = subscribeRouteState === "finalizing";
  useEffect(() => {
    if (!isFinalizing) return;
    const interval = setInterval(() => {
      void customerQuery.refetch();
    }, 2000);
    return () => clearInterval(interval);
  }, [customerQuery, isFinalizing]);

  useEffect(() => {
    if (subscribeRouteState === "redirectToApp") {
      // The app layouts gate on this query; make sure they see fresh access
      // state instead of a cached "no access" that would bounce back here.
      void queryClient.invalidateQueries({
        queryKey: MANAGED_ACCESS_QUERY_KEY,
      });
      const destination = redirect ?? "/";
      const [destinationPath, destinationQuery] = destination.split("?");
      const destinationSearch = destinationQuery
        ? Object.fromEntries(new URLSearchParams(destinationQuery))
        : undefined;
      const goToApp = () =>
        void navigate({
          to: destinationPath,
          search: destinationSearch,
          replace: true,
        });
      if (checkoutCompleted) {
        captureClientEvent("billing:checkout_success");
        const attribution = getStoredRedditAttribution();
        if (attribution) {
          void captureRedditConversionEvent({
            data: { attribution, eventType: "PURCHASE" },
          }).finally(goToApp);
          return;
        }
      }
      goToApp();
    }
  }, [checkoutCompleted, navigate, redirect, subscribeRouteState]);

  useEffect(() => {
    if (subscribeRouteState === "showPaywall" && !isUpgradeFlow) {
      captureClientEvent("billing:paywall_viewed");
    }
  }, [isUpgradeFlow, subscribeRouteState]);

  if (
    subscribeRouteState === "loading" ||
    subscribeRouteState === "redirectToApp"
  ) {
    return null;
  }

  if (subscribeRouteState === "finalizing") {
    return (
      <div className="w-full max-w-xs space-y-4 text-center">
        <EchoSeoLogo className="mx-auto size-10" />
        <h1 className="text-xl font-semibold">
          <FormattedMessage id="billingPlans.finalizing.title" />
        </h1>
        <span className="loading loading-spinner loading-md" />
        <p className="text-sm text-base-content/60">
          <FormattedMessage id="billingPlans.finalizing.hint" />
        </p>
        <p className="text-xs text-base-content/50">
          <FormattedMessage
            id="billingPlans.finalizing.supportPrompt"
            values={{
              email: SUPPORT_EMAIL,
              link: (chunks) => (
                <a className="link" href={`mailto:${SUPPORT_EMAIL}`}>
                  {chunks}
                </a>
              ),
            }}
          />
        </p>
      </div>
    );
  }

  if (subscribeRouteState === "error") {
    return (
      <div className="w-full max-w-xs space-y-4">
        <div className="text-center space-y-3">
          <EchoSeoLogo className="mx-auto size-10" />
          <h1 className="text-xl font-semibold">
            <FormattedMessage id="billingPlans.error.title" />
          </h1>
        </div>

        <p className="text-sm text-center text-base-content/70">
          {getLocalizedErrorMessage(
            intl,
            customerQuery.error,
            intl.formatMessage({
              id: "billingPlans.subscribe.error.verifyFailed",
            }),
          )}
        </p>

        <button
          type="button"
          className="btn btn-soft w-full"
          onClick={() => {
            void customerQuery.refetch();
          }}
        >
          <FormattedMessage id="common.action.retry" />
        </button>
      </div>
    );
  }

  async function handleSubscribe() {
    setError(null);
    setIsAttaching(true);

    try {
      captureClientEvent("billing:checkout_start");
      const successUrl = new URL(window.location.href);
      successUrl.searchParams.set("checkout", "success");
      await customerQuery.attach({
        planId: AUTUMN_PAID_PLAN_ID,
        redirectMode: "always",
        successUrl: successUrl.toString(),
      });
    } catch (err) {
      setError(
        getLocalizedErrorMessage(
          intl,
          err,
          intl.formatMessage({ id: "billingPlans.checkout.startError" }),
        ),
      );
      setIsAttaching(false);
    }
  }

  const firstName = session?.user?.name?.split(" ")[0] || "";
  // Whole-dollar price, matching billing.tsx's identical convention for this
  // exact "$10/month" fact.
  const priceDisplay = intl.formatNumber(BASE_PLAN_PRICE_USD, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <div className="w-full max-w-sm space-y-6">
      <SubscribePageAccountMenu email={session?.user?.email} />

      <div className="text-center space-y-3">
        <EchoSeoLogo className="mx-auto size-10" />
        <h1 className="text-xl font-semibold">
          {isUpgradeFlow ? (
            <FormattedMessage id="billingPlans.subscribe.upgradeTitle" />
          ) : firstName ? (
            <FormattedMessage
              id="billingPlans.subscribe.welcomeNamed"
              values={{ firstName }}
            />
          ) : (
            <FormattedMessage id="billingPlans.subscribe.welcome" />
          )}
        </h1>
        <p className="text-sm text-base-content/60">
          <FormattedMessage id="billingPlans.subscribe.tagline" />
        </p>
      </div>

      <div className="rounded-lg border border-base-300 p-5 space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-semibold">
            <FormattedMessage id="billingPlans.plan.base" />
          </span>
          <span className="text-lg font-semibold tabular-nums">
            <FormattedMessage
              id="billingPlans.plan.priceLabel"
              values={{ amount: priceDisplay }}
            />
          </span>
        </div>

        <ul className="space-y-2">
          {PLAN_FEATURE_IDS.map((id) => (
            <li key={id} className="flex gap-2.5 text-sm text-base-content/70">
              <span className="text-base-content/40 mt-[2px] shrink-0">
                &mdash;
              </span>
              <FormattedMessage id={id} values={{ amount: priceDisplay }} />
            </li>
          ))}
        </ul>

        {error ? <p className="text-sm text-error">{error}</p> : null}

        <button
          className="btn btn-soft w-full"
          disabled={isAttaching}
          onClick={() => void handleSubscribe()}
        >
          <FormattedMessage
            id={
              isAttaching
                ? "billingPlans.subscribe.redirecting"
                : "billingPlans.subscribe.subscribeButton"
            }
          />
        </button>

        <p className="text-center text-xs text-base-content/50">
          <FormattedMessage
            id="billingPlans.subscribe.guaranteeSentence"
            values={{
              tooltip: (chunks) => (
                <span
                  className="tooltip before:max-w-60 before:whitespace-normal"
                  data-tip={intl.formatMessage(
                    { id: "billingPlans.subscribe.guaranteeTooltip" },
                    { email: SUPPORT_EMAIL },
                  )}
                >
                  <span className="cursor-help underline decoration-dotted">
                    {chunks}
                  </span>
                </span>
              ),
            }}
          />
        </p>
      </div>

      <div className="text-center space-y-2">
        <p className="text-sm text-base-content/60">
          <FormattedMessage
            id="billingPlans.subscribe.questionsPrompt"
            values={{
              email: SUPPORT_EMAIL,
              link: (chunks) => (
                <a className="link" href={`mailto:${SUPPORT_EMAIL}`}>
                  {chunks}
                </a>
              ),
            }}
          />
        </p>
        {isUpgradeFlow ? (
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-base-content/70 hover:text-base-content transition-colors"
            onClick={() => void navigate({ to: "/", replace: true })}
          >
            <ArrowRight className="size-3.5 rotate-180" />
            <FormattedMessage id="billingPlans.subscribe.backToApp" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SubscribePageAccountMenu({ email }: { email: string | undefined }) {
  const intl = useIntl();
  if (!email) return null;

  const handleSignOut = () => signOutAndRedirect();

  return (
    <div className="fixed top-4 right-4">
      <div className="dropdown dropdown-end">
        <button
          type="button"
          tabIndex={0}
          className="btn btn-ghost btn-circle"
          aria-label={intl.formatMessage({
            id: "billingPlans.accountMenu.openAria",
          })}
        >
          <User className="h-5 w-5" />
        </button>
        <ul
          tabIndex={0}
          className="dropdown-content z-20 menu mt-3 min-w-56 rounded-box border border-base-300 bg-base-100 p-2 shadow-lg"
        >
          <li className="menu-title max-w-full">
            <span className="truncate text-base-content" data-ph-mask>
              {email}
            </span>
          </li>
          <li>
            <Link to="/settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <FormattedMessage id="billingPlans.accountMenu.settingsLink" />
            </Link>
          </li>
          <ThemePreferenceMenuItems />
          <li>
            <button
              type="button"
              className="text-error"
              onClick={handleSignOut}
            >
              <FormattedMessage id="billingPlans.accountMenu.signOut" />
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
