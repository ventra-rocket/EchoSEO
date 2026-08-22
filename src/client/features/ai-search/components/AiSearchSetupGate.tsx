import { FormattedMessage, useIntl } from "react-intl";
import { AccessGate } from "@/client/features/access-gate/AccessGate";

// EchoSEO's managed/hosted price for long-term LLM Mentions access, quoted in
// the DataForSEO setup gate below.
const MANAGED_AI_SEARCH_PRICE_USD = 10;

export function AiSearchSetupGate({
  errorMessage,
  isRefetching,
  onRetry,
}: {
  errorMessage: string | null;
  isRefetching: boolean;
  onRetry: () => void;
}) {
  const intl = useIntl();
  const priceDisplay = intl.formatNumber(MANAGED_AI_SEARCH_PRICE_USD, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <AccessGate
      title={intl.formatMessage({ id: "aiPromptExplorer.setupGate.title" })}
      bodyText={
        <FormattedMessage
          id="aiPromptExplorer.setupGate.body"
          values={{ price: priceDisplay }}
        />
      }
      helperText={
        <FormattedMessage
          id="aiPromptExplorer.setupGate.helper"
          values={{ link: <InlineManagedOpenSeoLink /> }}
        />
      }
      buttonLabel={intl.formatMessage({
        id: "aiPromptExplorer.setupGate.confirmButton",
      })}
      refetchingLabel={intl.formatMessage({
        id: "aiPromptExplorer.setupGate.confirming",
      })}
      externalUrl="https://app.dataforseo.com/api-access-subscriptions"
      externalLabel={intl.formatMessage({
        id: "aiPromptExplorer.setupGate.externalLabel",
      })}
      errorMessage={errorMessage}
      isRefetching={isRefetching}
      onRetry={onRetry}
    />
  );
}

function InlineManagedOpenSeoLink() {
  return (
    <a
      className="underline underline-offset-2 hover:text-base-content/70"
      href="https://echoseo.ventrarocket.vn/?utm_source=self_hosted_app&utm_medium=access_gate&utm_campaign=llm_mentions"
      target="_blank"
      rel="noreferrer"
    >
      <FormattedMessage id="aiPromptExplorer.setupGate.helperLink" />
    </a>
  );
}
