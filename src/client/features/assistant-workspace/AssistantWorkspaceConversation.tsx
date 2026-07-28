import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import type { UIMessage } from "ai";
import { Loader2, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { Markdown } from "@/client/components/Markdown";
import { createAssistantWorkspaceName } from "@/shared/assistant-workspace";

const SUGGESTIONS = [
  "Create a focused 30-day SEO workflow for this project.",
  "What evidence should I inspect before choosing new keywords?",
  "Turn an audit finding into a safe remediation workflow.",
];

export function AssistantWorkspaceConversation({
  projectId,
  userId,
}: {
  projectId: string;
  userId: string;
}) {
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
        <span className="font-medium text-base-content">
          Assisted and read-only.
        </span>{" "}
        Nothing here publishes, changes settings, starts jobs, or spends
        data-provider credits.
      </div>
      <div className="flex-1 space-y-5 px-4 py-5 md:px-6" aria-live="polite">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-semibold">Build a safer SEO workflow</h2>
                <p className="mt-1 max-w-2xl text-sm text-base-content/70">
                  Ask for a plan, decision framework, or a way to interpret
                  existing EchoSEO evidence. You remain in control of every
                  action.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="btn btn-outline btn-sm min-h-11 text-left"
                  disabled={busy}
                  onClick={() => submit(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {busy ? (
          <div className="flex items-center gap-2 text-sm text-base-content/60">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Preparing the workflow…
          </div>
        ) : null}
        {status === "error" ? (
          <div className="alert alert-error text-sm" role="alert">
            The assistant connection failed. Refresh the page and try again.
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
          Ask the workflow assistant
        </label>
        <div className="flex gap-2">
          <textarea
            id="assistant-workspace-message"
            className="textarea textarea-bordered min-h-11 flex-1 resize-none"
            placeholder="Ask for an SEO workflow…"
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
            Send
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
