import {
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { ArrowUp, Check, Globe, Loader2, Sparkles } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import type { MessageId } from "@/client/i18n/messages";
import { FREE_ONBOARDING_QUESTION_LIMIT } from "@/shared/onboardingChat";

const DISCORD_URL = "https://discord.gg/c9uGs3cFXr";

// The paid plan's monthly price. Was written as a literal "$10" twice — the
// headline figure and the "Includes $10 of usage credits" sentence — which is
// how the two drift apart. One number, formatted per locale at both sites.
const PAID_PLAN_PRICE_USD = 10;

// One message id per bullet in the upgrade sidebar's feature list. An array of
// ids (rather than an array of strings mapped through `intl.formatMessage`)
// keeps the id visible at the definition site and lets `<FormattedMessage>`
// render each bullet directly.
const UPGRADE_FEATURE_IDS: readonly MessageId[] = [
  "onboardingChat.upgrade.feature.core",
  "onboardingChat.upgrade.feature.gsc",
  "onboardingChat.upgrade.feature.mcp",
  "onboardingChat.upgrade.feature.creditsRollover",
];

/**
 * A suggestion chip's stable identity (`key`, compared for dedup/highlighting)
 * separated from its localized display text (`label`). `label` also becomes
 * the literal chat message sent when the chip is clicked — see the identity
 * vs. display-text split in OnboardingChatConversation.tsx.
 */
export type SuggestionOption = { key: string; label: string };

export function SuggestedQuestions({
  questions,
  primaryKeys = [],
  onSelect,
}: {
  questions: SuggestionOption[];
  primaryKeys?: string[];
  onSelect: (question: SuggestionOption) => void;
}) {
  return (
    <div className="ml-10 flex flex-wrap gap-2">
      {questions.map((question) =>
        primaryKeys.includes(question.key) ? (
          <button
            key={question.key}
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
            onClick={() => onSelect(question)}
          >
            <Sparkles className="size-3.5" />
            {question.label}
          </button>
        ) : (
          <button
            key={question.key}
            type="button"
            className="rounded-full border border-base-300 bg-base-100 px-3 py-1.5 text-xs font-medium text-base-content/70 transition-colors hover:border-primary/50 hover:text-base-content"
            onClick={() => onSelect(question)}
          >
            {question.label}
          </button>
        ),
      )}
    </div>
  );
}

export function WelcomeMessage({
  domain,
  checkoutError,
  isStartingCheckout,
  onUpgrade,
}: {
  domain: string;
  checkoutError: string | null;
  isStartingCheckout: boolean;
  onUpgrade: () => void;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex size-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="size-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-3 pt-0.5 text-sm">
        <div className="space-y-3 text-base-content/80">
          <p>
            <FormattedMessage id="onboardingChat.welcome.greeting" />
          </p>
          <p>
            <FormattedMessage id="onboardingChat.welcome.upgradeExplainer" />
          </p>
          <p>
            <FormattedMessage
              id="onboardingChat.welcome.helpLinks"
              values={{
                discordLink: (chunks) => (
                  <a
                    href={DISCORD_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="link link-primary"
                  >
                    {chunks}
                  </a>
                ),
                emailLink: (chunks) => (
                  <a
                    href="mailto:ventrarocket.work@gmail.com"
                    className="link link-primary"
                  >
                    {chunks}
                  </a>
                ),
              }}
            />
          </p>
          <p>
            <FormattedMessage
              id="onboardingChat.welcome.analyzePrompt"
              values={{
                domain: (
                  <span className="font-medium text-base-content">
                    {domain}
                  </span>
                ),
              }}
            />
          </p>
        </div>

        <div className="rounded-box border border-base-300 bg-base-200/50 p-3 text-xs lg:hidden">
          <p className="font-medium">
            <FormattedMessage id="onboardingChat.welcome.mobileCalloutTitle" />
          </p>
          <p className="mt-0.5 text-base-content/70">
            <FormattedMessage
              id="onboardingChat.welcome.mobileCalloutBody"
              values={{ domain }}
            />
          </p>
          <button
            type="button"
            className="btn btn-primary btn-xs mt-2"
            disabled={isStartingCheckout}
            onClick={onUpgrade}
          >
            <FormattedMessage
              id={
                isStartingCheckout
                  ? "onboardingChat.upgrade.redirecting"
                  : "onboardingChat.upgrade.cta"
              }
            />
          </button>
          {checkoutError ? (
            <p className="mt-2 text-error">{checkoutError}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Left-rail upgrade CTA. Hidden below `lg` (the inline callout + remaining
// hint cover narrow viewports).
export function UpgradeSidebar({
  domain,
  questionsUsed,
  isStartingCheckout,
  onUpgrade,
}: {
  domain: string;
  questionsUsed: number;
  isStartingCheckout: boolean;
  onUpgrade: () => void;
}) {
  const intl = useIntl();
  const used = Math.min(questionsUsed, FREE_ONBOARDING_QUESTION_LIMIT);
  const progress = (used / FREE_ONBOARDING_QUESTION_LIMIT) * 100;
  // Computed once, reused both as the large standalone price and inside the
  // "Includes {price}..." sentence below. `intl.formatNumber` rather than
  // `<FormattedNumber style="currency">`: same output, and it matches every
  // other currency site in the app (RankTrackingTableParts, CheckConfirmModal,
  // SavedKeywordsTable) instead of tripping the DOM `style`-prop lint rule.
  const priceDisplay = intl.formatNumber(PAID_PLAN_PRICE_USD, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <aside className="hidden w-96 flex-shrink-0 flex-col border-r border-base-300 bg-base-200/20 lg:flex">
      <div className="flex items-center gap-2.5 border-b border-base-300 px-6 py-4 text-xs text-base-content/55">
        <span className="inline-flex size-8 items-center justify-center rounded-full border border-base-300 bg-base-100 text-primary">
          <Globe className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="font-medium text-base-content/80">
            <FormattedMessage id="onboardingChat.upgrade.previewingLabel" />
          </p>
          <p className="truncate" title={domain}>
            {domain}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-6 py-6">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-semibold tracking-tight">
              {priceDisplay}
            </span>
            <span className="text-sm text-base-content/55">
              <FormattedMessage id="onboardingChat.upgrade.perMonthSuffix" />
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-base-content/55">
            <FormattedMessage
              id="onboardingChat.upgrade.priceIncludes"
              values={{ price: priceDisplay }}
            />
          </p>
        </div>

        <ul className="space-y-3 border-t border-base-300 pt-5">
          {UPGRADE_FEATURE_IDS.map((id) => (
            <li
              key={id}
              className="flex gap-2.5 text-sm leading-snug text-base-content/75"
            >
              <Check className="mt-0.5 size-4 flex-shrink-0 text-primary" />
              <span>
                <FormattedMessage id={id} />
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-auto space-y-3 pt-2">
          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={isStartingCheckout}
            onClick={onUpgrade}
          >
            <FormattedMessage
              id={
                isStartingCheckout
                  ? "onboardingChat.upgrade.redirecting"
                  : "onboardingChat.upgrade.ctaFull"
              }
            />
          </button>
          <p className="text-center text-xs leading-relaxed text-base-content/55">
            <FormattedMessage
              id="onboardingChat.upgrade.discordPrompt"
              values={{
                discordLink: (chunks) => (
                  <a
                    href={DISCORD_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="link link-primary"
                  >
                    {chunks}
                  </a>
                ),
              }}
            />
          </p>
        </div>
      </div>

      <div className="space-y-1.5 border-t border-base-300 px-6 py-4">
        <div className="h-1 w-full overflow-hidden rounded-full bg-base-300">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-base-content/55">
          <FormattedMessage
            id="onboardingChat.upgrade.questionsUsed"
            values={{ used, limit: FREE_ONBOARDING_QUESTION_LIMIT }}
          />
        </p>
      </div>
    </aside>
  );
}

// Replaces the composer once a free user exhausts their question allowance.
export function ChatGate({
  isStartingCheckout,
  onUpgrade,
}: {
  isStartingCheckout: boolean;
  onUpgrade: () => void;
}) {
  return (
    <div className="flex-shrink-0 border-t border-base-300 px-5 py-4">
      <div className="mx-auto w-full max-w-2xl rounded-box border border-primary/30 bg-primary/5 p-4 text-center">
        <p className="text-sm font-medium">
          <FormattedMessage
            id="onboardingChat.gate.allQuestionsUsed"
            values={{ limit: FREE_ONBOARDING_QUESTION_LIMIT }}
          />
        </p>
        <p className="mx-auto mt-1 max-w-md text-xs text-base-content/70">
          <FormattedMessage id="onboardingChat.gate.description" />
        </p>
        <button
          type="button"
          className="btn btn-primary btn-sm mt-3"
          disabled={isStartingCheckout}
          onClick={onUpgrade}
        >
          <FormattedMessage
            id={
              isStartingCheckout
                ? "onboardingChat.upgrade.redirecting"
                : "onboardingChat.upgrade.ctaFull"
            }
          />
        </button>
        <p className="mt-2 text-xs text-base-content/45">
          <FormattedMessage id="onboardingChat.gate.moneyBackGuarantee" />
        </p>
      </div>
    </div>
  );
}

export function ChatComposer({
  busy,
  onSend,
}: {
  busy: boolean;
  onSend: (text: string) => void;
}) {
  const intl = useIntl();
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the textarea up to a few lines, then scroll. Resetting height to
  // `auto` first lets it shrink as well as grow.
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [value]);

  function submit() {
    const text = value.trim();
    if (!text || busy) return;
    onSend(text);
    setValue("");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function handleKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 rounded-box border border-base-300 bg-base-100 px-3 py-2 focus-within:border-primary"
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKey}
        rows={1}
        placeholder={intl.formatMessage({
          id: "onboardingChat.composer.placeholder",
        })}
        className="max-h-40 flex-1 resize-none border-0 bg-transparent px-1 py-1 text-sm leading-relaxed outline-none placeholder:text-base-content/50 focus:outline-none"
      />
      <button
        type="submit"
        aria-label={intl.formatMessage({
          id: "onboardingChat.composer.sendAriaLabel",
        })}
        disabled={busy || !value.trim()}
        className="btn btn-primary btn-circle btn-sm"
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ArrowUp className="size-4" />
        )}
      </button>
    </form>
  );
}
