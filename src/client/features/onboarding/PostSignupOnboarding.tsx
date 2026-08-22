import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { ReactNode } from "react";
import { useIntl, type IntlShape } from "react-intl";
import {
  CLIENT_WEBSITE_COUNT_OPTION_LABELS,
  CLIENT_WEBSITE_COUNT_OPTIONS,
  CLIENT_WORK_FOR,
  INTEREST_OPTION_LABELS,
  INTEREST_OPTIONS,
  ONBOARDING_LAST_STEP,
  type OnboardingAnswers,
  SOURCE_OPTION_LABELS,
  SOURCE_OPTIONS,
  WORK_FOR_OPTION_LABELS,
  WORK_FOR_OPTIONS,
} from "@/client/features/onboarding/onboardingModel";
import { SearchConsoleOnboardingStep } from "@/client/features/onboarding/SearchConsoleOnboardingStep";
import { OnboardingChoiceGroup } from "@/client/features/onboarding/OnboardingChoiceGroup";
import { EchoSeoLogo } from "@/client/components/EchoSeoLogo";
import type { MessageId } from "@/client/i18n/messages";

type PostSignupOnboardingProps = {
  firstName: string;
  title?: string;
  helperText?: string;
  step: number;
  answers: OnboardingAnswers;
  onAnswersChange: (answers: OnboardingAnswers) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onFinish: (mcpSetupIntent: "yes" | "no") => void;
  onUpgradeAcknowledged: () => void;
  isSaving: boolean;
  accountMenu: ReactNode;
};

/** Cap for step 0; shared by the `maxSelections` prop and its own copy. */
const MAX_INTERESTS = 3;

/**
 * Resolves each canonical, DB-stored option value to its current-locale
 * label. The value itself never changes — only the label a user sees.
 */
function localizedOptions<T extends string>(
  intl: IntlShape,
  options: readonly T[],
  labels: Record<T, MessageId>,
): { value: T; label: string }[] {
  return options.map((value) => ({
    value,
    label: intl.formatMessage({ id: labels[value] }),
  }));
}

export function PostSignupOnboarding({
  firstName,
  title,
  helperText,
  step,
  answers,
  onAnswersChange,
  onNext,
  onBack,
  onSkip,
  onFinish,
  onUpgradeAcknowledged,
  isSaving,
  accountMenu,
}: PostSignupOnboardingProps) {
  const intl = useIntl();
  const canContinue =
    step === 0
      ? answers.selectedInterests.length > 0
      : step === 1
        ? Boolean(answers.workFor)
        : step === 2
          ? Boolean(answers.source)
          : true;

  const updateAnswers = (patch: Partial<OnboardingAnswers>) =>
    onAnswersChange({ ...answers, ...patch });

  // After a successful checkout the user lands on the GSC step with
  // `?checkout=success`. Show a one-time "you're in" screen (same layout as the
  // steps) and only reveal the actual GSC step once they continue, which drops
  // the param.
  const justUpgraded =
    step === 3 &&
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("checkout") === "success";

  if (justUpgraded) {
    return (
      <div className="w-full max-w-md space-y-6">
        {accountMenu}

        <div className="text-center space-y-3">
          <EchoSeoLogo className="mx-auto size-10" />
          <h1 className="text-xl font-semibold">
            {intl.formatMessage({ id: "onboarding.upgrade.title" })}
          </h1>
          <p className="text-sm text-base-content/60">
            {intl.formatMessage({ id: "onboarding.upgrade.subtitle" })}
          </p>
        </div>

        <div className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
          <h2 className="text-lg font-semibold">
            {intl.formatMessage({ id: "onboarding.upgrade.cardTitle" })}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-base-content/70">
            {intl.formatMessage({ id: "onboarding.upgrade.cardBody" })}
          </p>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              className="btn btn-soft"
              onClick={onUpgradeAcknowledged}
            >
              {intl.formatMessage({ id: "onboarding.action.continue" })}
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {accountMenu}

      <div className="text-center space-y-3">
        <EchoSeoLogo className="mx-auto size-10" />
        <p className="text-xs font-medium uppercase tracking-wide text-base-content/50">
          {intl.formatMessage(
            { id: "onboarding.progress.step" },
            { step: step + 1, total: ONBOARDING_LAST_STEP + 1 },
          )}
        </p>
        <h1 className="text-xl font-semibold">
          {title ??
            (firstName
              ? intl.formatMessage(
                  { id: "onboarding.welcome.namedTitle" },
                  { firstName },
                )
              : intl.formatMessage({ id: "onboarding.welcome.title" }))}
        </h1>
        <p className="text-sm text-base-content/60">
          {helperText ??
            intl.formatMessage({ id: "onboarding.welcome.helper" })}
        </p>
      </div>

      <div className="rounded-lg border border-base-300 bg-base-100 p-5 shadow-sm">
        {step === 0 ? (
          <OnboardingChoiceGroup
            title={intl.formatMessage({
              id: "onboarding.step.interests.title",
            })}
            description={intl.formatMessage(
              { id: "onboarding.step.interests.description" },
              { max: MAX_INTERESTS },
            )}
            maxSelections={MAX_INTERESTS}
            options={localizedOptions(
              intl,
              INTEREST_OPTIONS,
              INTEREST_OPTION_LABELS,
            )}
            selectedValues={answers.selectedInterests}
            onToggle={(value) => {
              updateAnswers({
                selectedInterests: answers.selectedInterests.includes(value)
                  ? answers.selectedInterests.filter((item) => item !== value)
                  : [...answers.selectedInterests, value],
              });
            }}
            otherValue={answers.interestOther}
            onOtherChange={(interestOther) => updateAnswers({ interestOther })}
            multiple
          />
        ) : step === 1 ? (
          <OnboardingChoiceGroup
            title={intl.formatMessage({ id: "onboarding.step.workFor.title" })}
            options={localizedOptions(
              intl,
              WORK_FOR_OPTIONS,
              WORK_FOR_OPTION_LABELS,
            )}
            selectedValues={answers.workFor ? [answers.workFor] : []}
            onToggle={(workFor) => updateAnswers({ workFor })}
            otherValue={answers.workForOther}
            onOtherChange={(workForOther) => updateAnswers({ workForOther })}
            followUp={{
              showForValue: CLIENT_WORK_FOR,
              label: intl.formatMessage({
                id: "onboarding.step.workFor.clientCountLabel",
              }),
              options: localizedOptions(
                intl,
                CLIENT_WEBSITE_COUNT_OPTIONS,
                CLIENT_WEBSITE_COUNT_OPTION_LABELS,
              ),
              value: answers.clientWebsiteCount,
              onChange: (clientWebsiteCount) =>
                updateAnswers({ clientWebsiteCount }),
            }}
          />
        ) : step === 2 ? (
          <OnboardingChoiceGroup
            title={intl.formatMessage({ id: "onboarding.step.source.title" })}
            options={localizedOptions(
              intl,
              SOURCE_OPTIONS,
              SOURCE_OPTION_LABELS,
            )}
            selectedValues={answers.source ? [answers.source] : []}
            onToggle={(source) => updateAnswers({ source })}
            otherValue={answers.sourceOther}
            onOtherChange={(sourceOther) => updateAnswers({ sourceOther })}
          />
        ) : step === 3 ? (
          <SearchConsoleOnboardingStep />
        ) : (
          <McpRecommendation
            isSaving={isSaving}
            onBack={onBack}
            onSetup={() => onFinish("yes")}
            onSkip={() => onFinish("no")}
          />
        )}

        {step < ONBOARDING_LAST_STEP ? (
          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={step === 0 || isSaving}
              onClick={onBack}
            >
              {intl.formatMessage({ id: "onboarding.action.back" })}
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm text-base-content/55"
                disabled={isSaving}
                onClick={onSkip}
              >
                {intl.formatMessage({ id: "onboarding.action.skip" })}
              </button>
              <button
                type="button"
                className="btn btn-soft"
                disabled={!canContinue || isSaving}
                onClick={onNext}
              >
                {intl.formatMessage({ id: "onboarding.action.continue" })}
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function McpRecommendation({
  isSaving,
  onBack,
  onSetup,
  onSkip,
}: {
  isSaving: boolean;
  onBack: () => void;
  onSetup: () => void;
  onSkip: () => void;
}) {
  const intl = useIntl();
  // Two of these are the same fact as the step-0 interest options — one id
  // each, reused here rather than re-spelled.
  const capabilityIds: MessageId[] = [
    "onboarding.option.keywordResearch",
    "onboarding.option.competitorResearch",
    "onboarding.mcp.capability.linkProspecting",
  ];

  return (
    <div className="flex flex-col">
      <button
        type="button"
        className="btn btn-ghost btn-sm -ml-2 mb-2 self-start gap-1.5 text-base-content/60"
        disabled={isSaving}
        onClick={onBack}
      >
        <ArrowLeft className="size-4" />
        {intl.formatMessage({ id: "onboarding.action.back" })}
      </button>
      <h2 className="text-lg font-semibold">
        {intl.formatMessage({ id: "onboarding.mcp.title" })}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-base-content/70">
        {intl.formatMessage({ id: "onboarding.mcp.pitch" })}
      </p>

      <ul className="mt-4 w-full space-y-2">
        {capabilityIds.map((capabilityId) => (
          <li key={capabilityId} className="flex items-center gap-2.5 text-sm">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-base-200 text-base-content">
              <Check className="size-3" />
            </span>
            <span className="text-base-content/80">
              {intl.formatMessage({ id: capabilityId })}
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="btn btn-neutral mt-5 w-full"
        disabled={isSaving}
        onClick={onSetup}
      >
        {intl.formatMessage({ id: "onboarding.mcp.setup" })}
        <ArrowRight className="size-4" />
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm mt-2 w-full text-base-content/60"
        disabled={isSaving}
        onClick={onSkip}
      >
        {intl.formatMessage({ id: "onboarding.mcp.notNow" })}
      </button>
    </div>
  );
}
