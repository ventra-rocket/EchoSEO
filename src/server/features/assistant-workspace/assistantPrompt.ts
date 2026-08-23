/**
 * Everything the assisted workspace says or is told, in one place the node test
 * runner can import.
 *
 * `AssistantWorkspaceAgent` cannot host any of it: that module imports
 * `@cloudflare/ai-chat`, whose `cloudflare:` specifiers vitest refuses to load,
 * so a test can never reach copy that lives beside the agent. Copy that cannot
 * be imported cannot be gated, and ungated copy is how English survives on a
 * translated surface.
 */

import type { ChatLocale } from "@/shared/chat-locale";

/**
 * The gates that answer the reader instead of calling a model. Declared as the
 * source of truth so the reply table cannot hold an entry no gate returns, and
 * the test cannot iterate a list that has drifted from the table.
 */
export const ASSISTANT_GATES = ["hostedUnavailable", "keyMissing"] as const;

type AssistantGate = (typeof ASSISTANT_GATES)[number];

/**
 * The two answers this agent gives instead of calling a model. They arrive as
 * ordinary assistant messages, so they are user copy and must follow the
 * reader's locale rather than the server's default.
 *
 * Measured, because the obvious assumption is wrong: **the page never shows
 * either of them.** `getAssistantWorkspaceIdentity` reports
 * `available: !hosted && OPENROUTER_API_KEY`, and the page renders a translated
 * setup card instead of the composer when that is false - so through the UI
 * these are unreachable. They are what a client that opens the Durable Object
 * socket directly receives, which is any authenticated caller. That is the only
 * audience, and it is still a reader.
 *
 * Kept localized anyway, because "unreachable" is a property of today's page,
 * not of the socket.
 */
const REPLIES: Record<AssistantGate, Record<ChatLocale, string>> = {
  hostedUnavailable: {
    en: "Hosted AI workspace is not available yet. This prevents unmanaged model spend while EchoSEO defines billing and usage limits for this surface.",
    vi: "Không gian làm việc AI trên bản hosted chưa mở. Đây là cách EchoSEO tránh chi phí model ngoài kiểm soát trong khi hạn mức sử dụng và thanh toán cho phần này còn chưa được định nghĩa.",
  },
  keyMissing: {
    en: "The AI workspace needs an `OPENROUTER_API_KEY` before it can respond. Add your bring-your-own key, then refresh this page.",
    vi: "Không gian làm việc AI cần `OPENROUTER_API_KEY` mới trả lời được. Hãy thêm khóa API của bạn rồi tải lại trang này.",
  },
};

export function assistantGateReply(
  gate: AssistantGate,
  locale: ChatLocale,
): string {
  return REPLIES[gate][locale];
}

/**
 * The prompt itself stays English - it is instruction, not copy - but the reply
 * language must follow the reader, exactly as the onboarding agent does. SEO
 * terms keep their English names either way, because that is what the reader
 * will search for and what every EchoSEO surface labels them.
 */
export function buildSystemPrompt(domain: string | null, locale: ChatLocale) {
  return [
    locale === "vi"
      ? "Reply in Vietnamese. Keep SEO, product and metric names in English."
      : "Reply in English.",
    "You are EchoSEO's in-app SEO workflow assistant.",
    "Help turn an SEO question into a concise, evidence-aware plan the user can carry out inside EchoSEO or through its MCP server.",
    "This is an assisted, read-only workspace. You cannot publish content, change settings, trigger an audit, spend provider credits, or claim live rankings. Never imply that you did any of those things.",
    "Do not invent metrics, rankings, Search Console results, keywords, competitors, or audit findings. When evidence is needed, tell the user which EchoSEO surface or MCP read tool to use next.",
    "Stay within SEO and EchoSEO. Lead with a direct answer, then use at most 5 concise bullets. Use Markdown but no decorative emoji.",
    "When useful, use: Goal, Evidence to inspect, Decision, and Safe next action. The safe next action must remain user-controlled.",
    domain
      ? `The current project domain is ${domain}.`
      : "This project has no configured domain yet. Ask the user to add one before site-specific advice.",
  ].join("\n\n");
}
