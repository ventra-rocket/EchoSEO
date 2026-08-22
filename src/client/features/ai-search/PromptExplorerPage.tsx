import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Columns3,
  SearchCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import { explorePrompt } from "@/serverFunctions/ai-search";
import {
  HostedPlanGate,
  type HostedPlanGateState,
} from "@/client/features/billing/HostedPlanGate";
import { getLocalizedErrorMessage } from "@/client/lib/error-messages";
import type { MessageId } from "@/client/i18n/messages";
import { PromptExplorerForm } from "@/client/features/ai-search/components/PromptExplorerForm";
import { PromptExplorerResults } from "@/client/features/ai-search/components/PromptExplorerResults";
import { PromptExplorerLoadingState } from "@/client/features/ai-search/components/PromptExplorerLoadingState";
import { PromptExplorerHistorySection } from "@/client/features/ai-search/components/PromptExplorerHistorySection";
import { AiSearchPaidPlanGate } from "@/client/features/ai-search/components/AiSearchPaidPlanGate";
import { AiSearchSetupGate } from "@/client/features/ai-search/components/AiSearchSetupGate";
import { AccessGateLoadingState } from "@/client/features/access-gate/AccessGate";
import { useSeoApiKeyStatus } from "@/client/features/access-gate/useSeoApiKeyStatus";
import { useAiSearchAccess } from "@/client/features/ai-search/useAiSearchAccess";
import { usePromptExplorerSearchHistory } from "@/client/hooks/usePromptExplorerSearchHistory";
import {
  PROMPT_EXPLORER_MAX_PROMPT_LENGTH,
  type PromptExplorerModel,
  type WebSearchCountryCode,
} from "@/types/schemas/ai-search";

type PromptExplorerFormValues = {
  prompt: string;
  highlightBrand: string;
  models: PromptExplorerModel[];
  webSearch: boolean;
  webSearchCountryCode: WebSearchCountryCode;
};

type Props = {
  projectId: string;
  urlState: PromptExplorerFormValues;
  onSubmit: (values: PromptExplorerFormValues) => void;
};

const PROMPT_EXPLORER_BULLETS: Array<{
  icon: LucideIcon;
  titleId: MessageId;
  bodyId: MessageId;
}> = [
  {
    icon: Columns3,
    titleId: "aiPromptExplorer.paidGate.bullets.models.title",
    bodyId: "aiPromptExplorer.paidGate.bullets.models.body",
  },
  {
    icon: SearchCheck,
    titleId: "aiPromptExplorer.paidGate.bullets.citations.title",
    bodyId: "aiPromptExplorer.paidGate.bullets.citations.body",
  },
  {
    icon: Sparkles,
    titleId: "aiPromptExplorer.paidGate.bullets.brand.title",
    bodyId: "aiPromptExplorer.paidGate.bullets.brand.body",
  },
];

export function PromptExplorerPage(props: Props) {
  return (
    <HostedPlanGate>
      {(planGate) => <PromptExplorerPageInner {...props} planGate={planGate} />}
    </HostedPlanGate>
  );
}

function PromptExplorerPageInner({
  projectId,
  urlState,
  onSubmit,
  planGate,
}: Props & { planGate: HostedPlanGateState }) {
  const intl = useIntl();
  const [form, setForm] = useState<PromptExplorerFormValues>(urlState);
  const [validationError, setValidationError] = useState<string | null>(null);
  const access = useAiSearchAccess(projectId);
  const seoApiKeyStatus = useSeoApiKeyStatus();

  const {
    history,
    isLoaded: historyLoaded,
    addSearch,
    removeHistoryItem,
  } = usePromptExplorerSearchHistory(projectId);

  const trimmedPrompt = urlState.prompt.trim();
  const hasActivePrompt = trimmedPrompt.length > 0;

  const exploreQuery = useQuery({
    queryKey: [
      "prompt-explorer",
      projectId,
      trimmedPrompt,
      urlState.models.toSorted().join(","),
      urlState.webSearch,
      urlState.webSearchCountryCode,
      urlState.highlightBrand.trim(),
    ],
    queryFn: () =>
      explorePrompt({
        data: {
          projectId,
          prompt: trimmedPrompt,
          models: urlState.models,
          highlightBrand: urlState.highlightBrand.trim() || undefined,
          webSearch: urlState.webSearch,
          webSearchCountryCode: urlState.webSearchCountryCode,
        },
      }),
    enabled:
      hasActivePrompt &&
      urlState.models.length > 0 &&
      !planGate.isFreePlan &&
      access.enabled &&
      seoApiKeyStatus.data?.configured === true,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Sync form to URL state — covers initial mount, browser back/forward, and
  // cmd+click history navigation (in the originating tab nothing changes; in
  // a new tab the form mounts populated from the URL).
  useEffect(() => {
    setForm(urlState);
    setValidationError(null);
  }, [urlState]);

  // Persist successful searches to history. Run on isSuccess so failed
  // requests don't pollute recent searches. The dedup ref prevents repeat
  // adds when downstream renders create new urlState references.
  const lastAddedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hasActivePrompt || !exploreQuery.isSuccess) return;
    const key = [
      trimmedPrompt,
      urlState.highlightBrand.trim(),
      urlState.models.toSorted().join(","),
      urlState.webSearch,
      urlState.webSearchCountryCode,
    ].join("|");
    if (lastAddedKeyRef.current === key) return;
    lastAddedKeyRef.current = key;
    addSearch({
      prompt: trimmedPrompt,
      highlightBrand: urlState.highlightBrand.trim(),
      models: urlState.models,
      webSearch: urlState.webSearch,
      webSearchCountryCode: urlState.webSearchCountryCode,
    });
  }, [
    hasActivePrompt,
    exploreQuery.isSuccess,
    trimmedPrompt,
    urlState.highlightBrand,
    urlState.models,
    urlState.webSearch,
    urlState.webSearchCountryCode,
    addSearch,
  ]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = form.prompt.trim();
    if (trimmed.length === 0) {
      setValidationError(
        intl.formatMessage({
          id: "aiPromptExplorer.form.validation.emptyPrompt",
        }),
      );
      return;
    }
    if (trimmed.length > PROMPT_EXPLORER_MAX_PROMPT_LENGTH) {
      setValidationError(
        intl.formatMessage(
          { id: "aiPromptExplorer.form.validation.tooLong" },
          { max: PROMPT_EXPLORER_MAX_PROMPT_LENGTH },
        ),
      );
      return;
    }
    if (form.models.length === 0) {
      setValidationError(
        intl.formatMessage({
          id: "aiPromptExplorer.form.validation.noModels",
        }),
      );
      return;
    }
    setValidationError(null);
    onSubmit({
      ...form,
      prompt: trimmed,
      highlightBrand: form.highlightBrand.trim(),
    });
  };

  const errorMessage = exploreQuery.isError
    ? getLocalizedErrorMessage(
        intl,
        exploreQuery.error,
        intl.formatMessage({ id: "aiPromptExplorer.explore.errorDefault" }),
      )
    : null;
  // See BrandLookupPage: a key-gated query stays `isPending` while idle, so a
  // keyless user would spin forever. Fall through to the setup CTA when there is
  // no key (configured === false); keep spinning while status is still loading.
  const isLoading =
    hasActivePrompt &&
    exploreQuery.isPending &&
    seoApiKeyStatus.data?.configured !== false;
  const resultData = hasActivePrompt ? exploreQuery.data : undefined;

  const updateForm = <K extends keyof PromptExplorerFormValues>(
    key: K,
    value: PromptExplorerFormValues[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (validationError) setValidationError(null);
  };

  if (planGate.isLoading) return null;

  return (
    <div className="px-4 py-4 pb-24 overflow-auto md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">
            <FormattedMessage id="nav.promptExplorer" />
          </h1>
          <p className="text-sm text-base-content/70">
            <FormattedMessage id="aiPromptExplorer.page.subtitle" />
          </p>
        </div>

        {access.isLoading ? (
          <AccessGateLoadingState />
        ) : !access.enabled ? (
          <AiSearchSetupGate
            errorMessage={access.errorMessage ?? access.statusErrorMessage}
            isRefetching={access.isRefetching}
            onRetry={access.onRetry}
          />
        ) : planGate.isFreePlan ? (
          <AiSearchPaidPlanGate
            featureId="nav.promptExplorer"
            descriptionId="aiPromptExplorer.paidGate.description"
            bullets={PROMPT_EXPLORER_BULLETS}
          />
        ) : (
          <>
            <PromptExplorerForm
              form={form}
              onPromptChange={(value) => updateForm("prompt", value)}
              onHighlightBrandChange={(value) =>
                updateForm("highlightBrand", value)
              }
              onModelsChange={(value) => updateForm("models", value)}
              onWebSearchChange={(value) => updateForm("webSearch", value)}
              onCountryChange={(value) =>
                updateForm("webSearchCountryCode", value)
              }
              onSubmit={handleSubmit}
              isLoading={isLoading}
              validationError={validationError}
            />

            {errorMessage ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            ) : null}

            {isLoading ? (
              <PromptExplorerLoadingState modelCount={form.models.length} />
            ) : resultData ? (
              <>
                <div>
                  <Link
                    from="/p/$projectId/prompt-explorer"
                    to="/p/$projectId/prompt-explorer"
                    params={{ projectId }}
                    search={{}}
                    replace
                    className="btn btn-ghost btn-sm gap-2 px-0 text-base-content/70 hover:bg-transparent"
                  >
                    <ArrowLeft className="size-4" />
                    <FormattedMessage id="aiPromptExplorer.page.recentSearches" />
                  </Link>
                </div>
                <PromptExplorerResults result={resultData} />
              </>
            ) : !errorMessage ? (
              <PromptExplorerHistorySection
                projectId={projectId}
                history={history}
                historyLoaded={historyLoaded}
                onRemoveHistoryItem={removeHistoryItem}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
