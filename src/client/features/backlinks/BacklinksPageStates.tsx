import { ShieldAlert } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import { AccessGate } from "@/client/features/access-gate/AccessGate";
import { DataforseoKeyMissingState } from "@/client/features/access-gate/DataforseoKeyMissingState";

// EchoSEO's managed/hosted price for long-term backlinks access, quoted in
// the DataForSEO setup gate below.
const MANAGED_BACKLINKS_PRICE_USD = 10;

export function BacklinksSetupGate({
  errorMessage,
  isRefetching,
  onRetry,
}: {
  errorMessage: string | null;
  isRefetching: boolean;
  onRetry: () => void;
}) {
  const intl = useIntl();
  const priceDisplay = intl.formatNumber(MANAGED_BACKLINKS_PRICE_USD, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <AccessGate
      title={intl.formatMessage({ id: "backlinksOverview.gate.title" })}
      bodyText={
        <FormattedMessage
          id="backlinksOverview.gate.body"
          values={{ price: priceDisplay }}
        />
      }
      helperText={
        <FormattedMessage
          id="backlinksOverview.gate.helper"
          values={{ link: <InlineManagedOpenSeoLink /> }}
        />
      }
      buttonLabel={intl.formatMessage({
        id: "backlinksOverview.gate.confirmButton",
      })}
      refetchingLabel={intl.formatMessage({
        id: "backlinksOverview.gate.confirming",
      })}
      externalUrl="https://app.dataforseo.com/api-access-subscriptions"
      externalLabel={intl.formatMessage({
        id: "backlinksOverview.gate.externalLabel",
      })}
      errorMessage={errorMessage}
      isRefetching={isRefetching}
      onRetry={onRetry}
    />
  );
}

export function BacklinksLoadingState() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="card bg-base-100 border border-base-300">
            <div className="card-body gap-3 p-4">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-8 w-28" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="card bg-base-100 border border-base-300">
            <div className="card-body gap-3">
              <div className="skeleton h-4 w-32" />
              <div className="skeleton h-64 w-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="card bg-base-100 border border-base-300">
        <div className="card-body gap-3">
          <div className="skeleton h-8 w-60" />
          <div className="skeleton h-80 w-full" />
        </div>
      </div>
    </div>
  );
}

export function BacklinksErrorState({
  errorMessage,
  onRetry,
}: {
  errorMessage: string | null;
  onRetry: () => void;
}) {
  return (
    <section className="rounded-2xl border border-error/30 bg-error/5 p-6 space-y-3">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-error/10 p-2.5 text-error shrink-0">
          <ShieldAlert className="size-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">
            <FormattedMessage id="backlinksOverview.state.errorTitle" />
          </h2>
          <p className="text-sm text-base-content/70">
            {errorMessage ?? (
              <FormattedMessage id="backlinksOverview.state.errorFallback" />
            )}
          </p>
        </div>
      </div>
      <button className="btn btn-outline btn-sm" onClick={onRetry}>
        <FormattedMessage id="common.action.retry" />
      </button>
    </section>
  );
}

/**
 * What to show when the overview produced no data. A missing DataForSEO key is
 * not a failed request: the query was never sent, so `BacklinksErrorState`'s
 * Retry could only re-run nothing while the copy blamed a transient failure.
 */
export function BacklinksOverviewEmptyState({
  seoKeyMissing,
  errorMessage,
  onRetry,
}: {
  seoKeyMissing: boolean;
  errorMessage: string | null;
  onRetry: () => void;
}) {
  if (seoKeyMissing) {
    return <DataforseoKeyMissingState />;
  }

  return <BacklinksErrorState errorMessage={errorMessage} onRetry={onRetry} />;
}

function InlineManagedOpenSeoLink() {
  return (
    <a
      className="underline underline-offset-2 hover:text-base-content/70"
      href="https://echoseo.ventrarocket.vn/?utm_source=self_hosted_app&utm_medium=access_gate&utm_campaign=backlinks"
      target="_blank"
      rel="noreferrer"
    >
      <FormattedMessage id="backlinksOverview.gate.helperLink" />
    </a>
  );
}
