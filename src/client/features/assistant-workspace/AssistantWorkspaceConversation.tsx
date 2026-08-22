import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import type { UIMessage } from "ai";
import { Loader2, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Markdown } from "@/client/components/Markdown";
import type { MessageId } from "@/client/i18n/messages";
import { createAssistantWorkspaceName } from "@/shared/assistant-workspace";

// Each suggestion's resolved (localized) label doubles as the literal chat
// message sent when it's clicked, so only the message id needs to be stored.
const SUGGESTION_IDS: MessageId[] = [
  "aiWorkspace.conversation.suggestion.workflow",
  "aiWorkspace.conversation.suggestion.evidence",
  "aiWorkspace.conversation.suggestion.remediation",
];

export function AssistantWorkspaceConversation({
  projectId,
  userId,
}: {
  projectId: string;
  userId: string;
}) {
  const intl = useIntl();
  const agent = useAgent({
    agent: "assistant-workspace",
    name: createAssistantWorkspaceName(projectId, userId),
  });
  const { messages, sendMessage, status } = useAgentChat({ agent });
  const [draft, setDraft] = useState("");
  const busy = status === "submitted" || status === "streaming";
  function submit(text = draft) {
    const message = text.trim();
    if (!message || busy) return;
    setDraft("");
    void sendMessage({ text: message });
  }
  return (
    <div className="flex min-h-[32rem] flex-col">
      <div className="border-b border-base-300 bg-base-200/50 px-4 py-3 text-sm text-base-content/70">
        <FormattedMessage
          id="aiWorkspace.conversation.disclaimer"
          values={{
            b: (chunks) => (
              <span className="font-medium text-base-content">{chunks}</span>
            ),
          }}
        />
      </div>
      <div className="flex-1 space-y-5 px-4 py-5 md:px-6" aria-live="polite">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-semibold">
                  <FormattedMessage id="aiWorkspace.conversation.emptyState.title" />
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-base-content/70">
                  <FormattedMessage id="aiWorkspace.conversation.emptyState.body" />
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTION_IDS.map((id) => {
                const suggestion = intl.formatMessage({ id });
                return (
                  <button
                    key={id}
                    type="button"
                    className="btn btn-outline btn-sm min-h-11 text-left"
                    disabled={busy}
                    onClick={() => submit(suggestion)}
                  >
                    {suggestion}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {busy ? (
          <div className="flex items-center gap-2 text-sm text-base-content/60">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            <FormattedMessage id="aiWorkspace.conversation.preparing" />
          </div>
        ) : null}
        {status === "error" ? (
          <div className="alert alert-error text-sm" role="alert">
            <FormattedMessage id="aiWorkspace.conversation.connectionError" />
          </div>
        ) : null}
      </div>
      <form
        className="border-t border-base-300 p-4 md:p-5"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label className="sr-only" htmlFor="assistant-workspace-message">
          <FormattedMessage id="aiWorkspace.conversation.composer.label" />
        </label>
        <div className="flex gap-2">
          <textarea
            id="assistant-workspace-message"
            className="textarea textarea-bordered min-h-11 flex-1 resize-none"
            placeholder={intl.formatMessage({
              id: "aiWorkspace.conversation.composer.placeholder",
            })}
            value={draft}
            disabled={busy}
            rows={2}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button
            className="btn btn-primary min-h-11 self-end"
            type="submit"
            disabled={busy || !draft.trim()}
          >
            <Send className="size-4" aria-hidden="true" />
            <FormattedMessage id="aiWorkspace.conversation.composer.send" />
          </button>
        </div>
      </form>
    </div>
  );
}

function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex gap-3"}>
      {!isUser ? (
        <div className="flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="size-4" aria-hidden="true" />
        </div>
      ) : null}
      <div
        className={
          isUser
            ? "max-w-2xl rounded-box rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-content"
            : "min-w-0 max-w-2xl pt-1 text-sm"
        }
      >
        {message.parts.map((part, index) =>
          part.type === "text" && part.text.trim() ? (
            isUser ? (
              <span key={index} className="whitespace-pre-wrap">
                {part.text}
              </span>
            ) : (
              <Markdown key={index}>{part.text}</Markdown>
            )
          ) : null,
        )}
      </div>
    </div>
  );
}
