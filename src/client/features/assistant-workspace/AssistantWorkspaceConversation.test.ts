import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIntl, RawIntlProvider } from "react-intl";
import { describe, expect, it, vi } from "vitest";
import type { UIMessage } from "ai";

// Hoisted so the mocked hooks below can read it: agents/react's useAgent and
// @cloudflare/ai-chat/react's useAgentChat both open a real WebSocket, which
// this test replaces with chrome the component renders for a given
// {messages, status} pair instead of a live Durable Object connection.
const chatState = vi.hoisted(() => ({
  messages: [] as UIMessage[],
  status: "ready" as "submitted" | "streaming" | "ready" | "error",
  sendMessage: vi.fn(),
}));

vi.mock("agents/react", () => ({
  useAgent: () => ({}),
}));
vi.mock("@cloudflare/ai-chat/react", () => ({
  useAgentChat: () => chatState,
}));

import { AssistantWorkspaceConversation } from "./AssistantWorkspaceConversation";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";

const CATALOGS = { en, vi: viMessages } as const;

/**
 * Renders through a real IntlShape with an onError probe, the same pattern
 * DomainTables.test.ts uses to pin the id-echo regression: a component that
 * passes an already-formatted string into a prop expecting a raw message id
 * renders a *correct-looking* string (the id resolves to itself as its own
 * MissingTranslationError fallback) while still throwing on every render.
 * Reading rendered text alone would pass against that bug, so every case
 * below also asserts `errors` is empty.
 */
function renderConversation(locale: keyof typeof CATALOGS): {
  markup: string;
  errors: string[];
} {
  const errors: string[] = [];
  const intl = createIntl({
    locale,
    messages: CATALOGS[locale],
    onError: (error) => errors.push(error.message),
  });
  const markup = renderToStaticMarkup(
    createElement(
      RawIntlProvider,
      { value: intl },
      createElement(AssistantWorkspaceConversation, {
        projectId: "proj_1",
        userId: "user_1",
      }),
    ),
  );
  return { markup, errors };
}

function textMessage(
  id: string,
  role: "user" | "assistant",
  text: string,
): UIMessage {
  return { id, role, parts: [{ type: "text", text }] };
}

describe("AssistantWorkspaceConversation", () => {
  it("renders the empty state, disclaimer and composer in Vietnamese with no missing-translation errors", () => {
    chatState.messages = [];
    chatState.status = "ready";
    const { markup, errors } = renderConversation("vi");

    expect(errors).toEqual([]);
    expect(markup).toContain("Chỉ hỗ trợ và chỉ đọc.");
    expect(markup).toContain("tiêu tốn credit của nhà cung cấp dữ liệu");
    expect(markup).toContain("Xây dựng workflow SEO an toàn hơn");
    expect(markup).toContain(
      "Hãy hỏi về một kế hoạch, một framework ra quyết định",
    );
    expect(markup).toContain(
      "Tạo một workflow SEO 30 ngày tập trung cho dự án này.",
    );
    expect(markup).toContain(
      "Tôi nên xem xét bằng chứng nào trước khi chọn từ khóa mới?",
    );
    expect(markup).toContain(
      "Biến một phát hiện từ audit thành workflow khắc phục an toàn.",
    );
    expect(markup).toContain('placeholder="Hỏi về một workflow SEO…"');
    expect(markup).toContain("Gửi");
    // Not busy and no messages yet: neither the loading nor the error chrome
    // should render alongside the empty state.
    expect(markup).not.toContain("Đang chuẩn bị workflow");
    expect(markup).not.toContain("Kết nối tới trợ lý đã thất bại");
  });

  it("renders the English catalog too, so the two locales cannot silently drift apart", () => {
    chatState.messages = [];
    chatState.status = "ready";
    const { markup, errors } = renderConversation("en");

    expect(errors).toEqual([]);
    expect(markup).toContain("Assisted and read-only.");
    expect(markup).toContain("Build a safer SEO workflow");
    expect(markup).toContain("Send");
  });

  it("shows the busy indicator in Vietnamese while a reply streams", () => {
    chatState.messages = [];
    chatState.status = "streaming";
    const { markup, errors } = renderConversation("vi");

    expect(errors).toEqual([]);
    expect(markup).toContain("Đang chuẩn bị workflow…");
  });

  it("shows the connection error in Vietnamese instead of a stale empty state", () => {
    chatState.messages = [];
    chatState.status = "error";
    const { markup, errors } = renderConversation("vi");

    expect(errors).toEqual([]);
    expect(markup).toContain(
      "Kết nối tới trợ lý đã thất bại. Hãy tải lại trang và thử lại.",
    );
  });

  it("hides the empty-state suggestions once the conversation has messages", () => {
    chatState.messages = [
      textMessage("m1", "user", "Xin chào"),
      textMessage("m2", "assistant", "Chào bạn, tôi có thể giúp gì?"),
    ];
    chatState.status = "ready";
    const { markup, errors } = renderConversation("vi");

    expect(errors).toEqual([]);
    expect(markup).not.toContain("Xây dựng workflow SEO an toàn hơn");
    expect(markup).toContain("Chào bạn, tôi có thể giúp gì?");
  });
});
