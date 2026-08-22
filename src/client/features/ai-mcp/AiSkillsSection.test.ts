import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIntl, RawIntlProvider } from "react-intl";
import { describe, expect, it, vi } from "vitest";

// Same trade as AiSetupGuides.test.ts: Collapsible only renders its children
// once expanded, and this test cares about that body copy, not the
// expand/collapse interaction.
vi.mock("@/client/features/ai-mcp/SetupControls", () => ({
  Collapsible: ({
    title,
    subtitle,
    children,
  }: {
    title: string;
    subtitle?: string;
    children: ReactNode;
  }) =>
    createElement(
      "div",
      null,
      createElement("span", null, title),
      subtitle ? createElement("span", null, subtitle) : null,
      children,
    ),
  CodeBlock: ({ code }: { code: string }) => createElement("pre", null, code),
}));

import { AiSkillsSection } from "./AiSkillsSection";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";

const CATALOGS = { en, vi: viMessages } as const;

function renderSkills(locale: keyof typeof CATALOGS): {
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
      createElement(AiSkillsSection, {}),
    ),
  );
  return { markup, errors };
}

describe("AiSkillsSection", () => {
  it("renders every card's Vietnamese copy with no missing-translation errors", () => {
    const { markup, errors } = renderSkills("vi");

    expect(errors).toEqual([]);
    expect(markup).toContain("EchoSEO Skills");
    expect(markup).toContain("Cài đặt bằng skills add");
    expect(markup).toContain("Trình cài đặt được khuyên dùng cho mọi agent");
    expect(markup).toContain(
      "Bạn cũng có thể tự động chấp nhận từng skill của EchoSEO:",
    );
    expect(markup).toContain("Cài đặt cho Claude Code");
    expect(markup).toContain("Chỉ áp dụng cho Claude Code");
    expect(markup).toContain("Cài đặt cho Codex");
    expect(markup).toContain("Chỉ áp dụng cho OpenAI Codex");
    expect(markup).toContain("Cài đặt thủ công từ GitHub");
    expect(markup).toContain("Clone repo và copy các skill");
    expect(markup).toContain("Bắt đầu với");
    // The literal slash command is data, kept verbatim inside its <cmd> tag.
    expect(markup).toContain("/seo-project-setup");
    expect(markup).toContain("Các skill có sẵn");
    // Skill slugs are data (npm/skill package names), never translated.
    for (const skill of [
      "seo-project-setup",
      "seo-coach",
      "keyword-research",
      "keyword-clustering",
      "competitive-landscape",
      "competitor-analysis",
      "link-prospecting",
    ]) {
      expect(markup).toContain(skill);
    }
    // Every install snippet is a code block, byte-identical in every locale.
    expect(markup).toContain("npx skills add ventra-rocket/EchoSEO");
    expect(markup).toContain(
      "npx skills add ventra-rocket/EchoSEO --skill &#x27;*&#x27; --agent claude-code",
    );
    expect(markup).toContain(
      "git clone https://github.com/ventra-rocket/EchoSEO.git",
    );
  });

  it("renders the English catalog too, so the two locales cannot silently drift apart", () => {
    const { markup, errors } = renderSkills("en");

    expect(errors).toEqual([]);
    expect(markup).toContain("EchoSEO Skills");
    expect(markup).toContain("Manual GitHub install");
    expect(markup).toContain("Available skills");
  });
});
