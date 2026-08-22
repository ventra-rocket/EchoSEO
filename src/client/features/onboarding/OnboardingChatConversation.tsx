import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import { type UIMessage } from "ai";
import { useCustomer } from "autumn-js/react";
import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Loader2,
  Check,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import { Markdown } from "@/client/components/Markdown";
import { captureClientEvent } from "@/client/lib/posthog";
import type { MessageId } from "@/client/i18n/messages";
import { AUTUMN_PAID_PLAN_ID } from "@/shared/billing";
import { FREE_ONBOARDING_QUESTION_LIMIT } from "@/shared/onboardingChat";
import {
  ChatComposer,
  ChatGate,
  SuggestedQuestions,
  UpgradeSidebar,
  WelcomeMessage,
  type SuggestionOption,
} from "./OnboardingChatParts";

// Whether an assistant message already shows something — visible text or a tool
// badge. Used to decide when the standalone typing indicator is still needed: a
// running tool badge already reads as progress, so the dots would double up.
function messageHasVisibleContent(message: UIMessage): boolean {
  return message.parts.some(
    (part) =>
      (part.type === "text" && part.text.trim().length > 0) ||
      (part.type === "reasoning" && part.text.trim().length > 0) ||
      part.type.startsWith("tool-"),
  );
}

// Collapsible "thinking" block for the model's reasoning stream. Collapsed by
// default so the chain-of-thought doesn't bury the answer; while it's still
// streaming it doubles as the progress indicator ("Thinking…" + spinner).
function ReasoningBlock({
  part,
}: {
  part: Extract<UIMessage["parts"][number], { type: "reasoning" }>;
}) {
  const [expanded, setExpanded] = useState(false);
  const isStreaming = part.state === "streaming";
  return (
    <div className="text-base-content/60">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="inline-flex items-center gap-1.5 text-xs hover:text-base-content/80"
      >
        {isStreaming ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <ChevronRight
            className={`size-3 transition-transform ${expanded ? "rotate-90" : ""}`}
          />
        )}
        <span>
          <FormattedMessage
            id={
              isStreaming
                ? "onboardingChat.reasoning.thinking"
                : "onboardingChat.reasoning.thoughtProcess"
            }
          />
        </span>
      </button>
      {expanded ? (
        <div className="mt-1.5 whitespace-pre-wrap border-l-2 border-base-300 pl-3 text-xs text-base-content/50">
          {part.text}
        </div>
      ) : null}
    </div>
  );
}

// Friendly labels for each tool Sam can run, so the chat shows what it's doing
// rather than going silent while it gathers site data. `running` shows while the
// call is in flight; `done` stays as a persistent badge once it finishes.
const TOOL_LABEL_IDS: Record<string, { running: MessageId; done: MessageId }> =
  {
    "tool-read_website": {
      running: "onboardingChat.tool.readWebsite.running",
      done: "onboardingChat.tool.readWebsite.done",
    },
    "tool-get_seo_metrics": {
      running: "onboardingChat.tool.seoMetrics.running",
      done: "onboardingChat.tool.seoMetrics.done",
    },
    "tool-research_keywords": {
      running: "onboardingChat.tool.researchKeywords.running",
      done: "onboardingChat.tool.researchKeywords.done",
    },
    "tool-get_domain_overview": {
      running: "onboardingChat.tool.domainOverview.running",
      done: "onboardingChat.tool.domainOverview.done",
    },
    "tool-get_serp_results": {
      running: "onboardingChat.tool.serpResults.running",
      done: "onboardingChat.tool.serpResults.done",
    },
    "tool-find_serp_competitors": {
      running: "onboardingChat.tool.competitors.running",
      done: "onboardingChat.tool.competitors.done",
    },
    "tool-get_competitor_keywords": {
      running: "onboardingChat.tool.competitorKeywords.running",
      done: "onboardingChat.tool.competitorKeywords.done",
    },
    "tool-get_backlinks_overview": {
      running: "onboardingChat.tool.backlinksOverview.running",
      done: "onboardingChat.tool.backlinksOverview.done",
    },
  };

// A small inline badge for one tool call, rendered in document order inside the
// assistant bubble so the sequence of work stays visible after it completes.
function ToolBadge({ part }: { part: UIMessage["parts"][number] }) {
  const intl = useIntl();
  const labels = TOOL_LABEL_IDS[part.type];
  if (!labels) return null;
  const state = "state" in part ? part.state : undefined;
  const isError = state === "output-error";
  const isDone = state === "output-available";
  const isRunning = !isError && !isDone;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
        isError ? "bg-error/10 text-error" : "bg-base-200 text-base-content/70"
      }`}
    >
      {isRunning ? (
        <Loader2 className="size-3 animate-spin" />
      ) : isError ? (
        <AlertTriangle className="size-3" />
      ) : (
        <Check className="size-3" />
      )}
      <span>
        {intl.formatMessage({ id: isRunning ? labels.running : labels.done })}
      </span>
    </span>
  );
}

function ChatBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end pl-8 sm:pl-16">
        <div className="rounded-box rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-content">
          {message.parts.map((part, index) =>
            part.type === "text" ? (
              <span key={index} className="whitespace-pre-wrap">
                {part.text}
              </span>
            ) : null,
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="flex size-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="size-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-2 pt-0.5 text-sm">
        {message.parts.map((part, index) => {
          if (part.type === "reasoning") {
            return part.text.trim() ? (
              <ReasoningBlock key={index} part={part} />
            ) : null;
          }
          if (part.type === "text") {
            return part.text.trim() ? (
              <Markdown key={index}>{part.text}</Markdown>
            ) : null;
          }
          if (part.type.startsWith("tool-")) {
            return <ToolBadge key={index} part={part} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}

// Canonical (locale-independent) identities for the two highlighted chips, so
// business logic — dedup, "did they already ask for their strategy" — never
// compares translated display text.
const STRATEGY_SUGGESTION_KEY = "strategy";
const COMPETITOR_SUGGESTION_KEY = "competitor";
const PRIMARY_SUGGESTION_KEYS = [
  STRATEGY_SUGGESTION_KEY,
  COMPETITOR_SUGGESTION_KEY,
];

// General suggestion chips, in the order they appear after the two primary
// ones. Each pairs a stable key with its message id; the localized label is
// resolved with `intl.formatMessage` inside the component below.
const SUGGESTION_IDS: { key: string; id: MessageId }[] = [
  { key: "traffic", id: "onboardingChat.suggestion.traffic" },
  { key: "compareClaude", id: "onboardingChat.suggestion.compareClaude" },
  { key: "afterUpgrade", id: "onboardingChat.suggestion.afterUpgrade" },
  { key: "gscIntegration", id: "onboardingChat.suggestion.gscIntegration" },
  { key: "agencyFit", id: "onboardingChat.suggestion.agencyFit" },
];

export function OnboardingChatConversation({
  projectId,
  domain,
}: {
  projectId: string;
  domain: string;
}) {
  const intl = useIntl();
  // The conversation lives in a Durable Object (Agents SDK), keyed by projectId,
  // so history persists across reloads. The WebSocket connection is authorized
  // in the Worker (src/server.ts) before it reaches the DO; billing gates come
  // back as normal assistant messages rather than HTTP errors.
  const agent = useAgent({ agent: "onboarding-chat", name: projectId });
  // The reader's locale travels with every message: the agent's replies are
  // model prose, so the only way they arrive in Vietnamese is for the prompt to
  // say so. The SDK persists this body across tool continuations, so a reply
  // that pauses for a tool call does not switch language halfway through.
  const { messages, sendMessage, status } = useAgentChat({
    agent,
    body: { locale: intl.locale },
  });

  // This chat is only ever the pre-upgrade free preview: once a user upgrades
  // they are routed into the GSC onboarding step and never return here, so
  // there's no "paid" state to model — the question cap always applies.
  const customerQuery = useCustomer();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [usedSuggestionKeys, setUsedSuggestionKeys] = useState<string[]>([]);
  // Set once the user asks for their strategy (welcome CTA or the strategy
  // chip) so we don't keep offering the "What do you recommend" chip.
  const [strategyRequested, setStrategyRequested] = useState(false);

  const questionsUsed = messages.filter((m) => m.role === "user").length;
  const remaining = Math.max(0, FREE_ONBOARDING_QUESTION_LIMIT - questionsUsed);
  const isLocked = remaining <= 0;
  // Nudge once they're within the last few questions, not from the start.
  const showRemainingHint = remaining > 0 && remaining <= 3;

  const isBusy = status === "submitted" || status === "streaming";
  const sendText = (text: string) => void sendMessage({ text });
  async function startCheckout() {
    setCheckoutError(null);
    setIsStartingCheckout(true);
    try {
      captureClientEvent("billing:checkout_start");
      // After payment, re-enter onboarding at the GSC step (not back into this
      // chat) so the user finishes connecting Search Console + MCP.
      const successUrl = new URL("/onboarding", window.location.origin);
      successUrl.searchParams.set("step", "3");
      successUrl.searchParams.set("checkout", "success");
      await customerQuery.attach({
        planId: AUTUMN_PAID_PLAN_ID,
        redirectMode: "always",
        successUrl: successUrl.toString(),
      });
    } catch (checkoutErr) {
      console.error("Failed to start checkout", checkoutErr);
      setCheckoutError(
        intl.formatMessage({
          id: "onboardingChat.conversation.checkoutErrorDefault",
        }),
      );
      setIsStartingCheckout(false);
    }
  }

  // Pin to the bottom while the user is following along; the strategy doc plus
  // a streaming reply quickly grows past the viewport.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  const lastMessage = messages[messages.length - 1];
  // The chip's resolved (localized) label doubles as the literal chat message
  // sent when it's clicked — see the identity vs. display-text split in
  // SuggestionOption. Only STRATEGY_SUGGESTION_KEY / COMPETITOR_SUGGESTION_KEY
  // ever drive business logic; the label is display + send text only.
  const strategySuggestion: SuggestionOption = {
    key: STRATEGY_SUGGESTION_KEY,
    label: intl.formatMessage({ id: "onboardingChat.suggestion.strategy" }),
  };
  const competitorSuggestion: SuggestionOption = {
    key: COMPETITOR_SUGGESTION_KEY,
    label: intl.formatMessage({ id: "onboardingChat.suggestion.competitors" }),
  };
  const suggestionPool: SuggestionOption[] = [
    ...(strategyRequested ? [] : [strategySuggestion]),
    competitorSuggestion,
    ...SUGGESTION_IDS.map(({ key, id }) => ({
      key,
      label: intl.formatMessage({ id }),
    })),
  ];
  const remainingSuggestions = suggestionPool.filter(
    (question) => !usedSuggestionKeys.includes(question.key),
  );
  // Show the typing indicator from the moment the user sends until the
  // assistant's reply shows something — covers the "submitted" wait (last
  // message is still the user's own) and the gap before any text or tool badge
  // renders. Once a tool badge is in flight, it carries the progress, so the
  // dots would just double up.
  const showTyping =
    isBusy &&
    (lastMessage?.role !== "assistant" ||
      !messageHasVisibleContent(lastMessage));
  // Show the chips up front (before the first message) and after each assistant
  // reply, but not while a reply is mid-flight.
  const showSuggestions =
    remainingSuggestions.length > 0 &&
    !isBusy &&
    (messages.length === 0 || lastMessage?.role === "assistant");

  return (
    <div className="flex min-h-0 flex-1">
      <UpgradeSidebar
        domain={domain}
        questionsUsed={questionsUsed}
        isStartingCheckout={isStartingCheckout}
        onUpgrade={() => void startCheckout()}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-6">
          <div className="mx-auto max-w-2xl space-y-6">
            <WelcomeMessage
              domain={domain}
              checkoutError={checkoutError}
              isStartingCheckout={isStartingCheckout}
              onUpgrade={() => void startCheckout()}
            />

            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}

            {showTyping ? (
              <div className="flex gap-3">
                <div className="flex size-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="size-4" />
                </div>
                <div className="flex items-center gap-2 pt-2 text-base-content/40">
                  <span className="flex items-center gap-1.5">
                    <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-current" />
                  </span>
                </div>
              </div>
            ) : null}

            {status === "error" ? (
              <div className="flex gap-3">
                <div className="flex size-7 flex-shrink-0 items-center justify-center rounded-full bg-error/10 text-error">
                  <Sparkles className="size-4" />
                </div>
                <p className="pt-1 text-sm text-error">
                  {/* Billing gates (free-question cap / out-of-credits) come
                      back as normal assistant messages now, so this only covers
                      genuine failures. */}
                  <FormattedMessage id="onboardingChat.conversation.genericError" />
                </p>
              </div>
            ) : null}

            {showSuggestions ? (
              <SuggestedQuestions
                questions={remainingSuggestions}
                primaryKeys={PRIMARY_SUGGESTION_KEYS}
                onSelect={(question) => {
                  setUsedSuggestionKeys((current) =>
                    current.includes(question.key)
                      ? current
                      : [...current, question.key],
                  );
                  if (question.key === STRATEGY_SUGGESTION_KEY) {
                    setStrategyRequested(true);
                  }
                  sendText(question.label);
                }}
              />
            ) : null}
          </div>
        </div>

        {isLocked ? (
          <ChatGate
            isStartingCheckout={isStartingCheckout}
            onUpgrade={() => void startCheckout()}
          />
        ) : (
          <div className="flex-shrink-0 border-t border-base-300 px-5 py-3">
            <div className="mx-auto w-full max-w-2xl space-y-2">
              {showRemainingHint ? (
                <p className="px-1 text-xs text-base-content/50">
                  <FormattedMessage
                    id="onboardingChat.composer.remainingHint"
                    values={{
                      remaining,
                      upgradeLink: (chunks) => (
                        <button
                          type="button"
                          className="link link-primary"
                          disabled={isStartingCheckout}
                          onClick={() => void startCheckout()}
                        >
                          {chunks}
                        </button>
                      ),
                    }}
                  />
                </p>
              ) : null}
              <ChatComposer busy={isBusy} onSend={sendText} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
