import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { IntlProvider } from "react-intl";
import { describe, expect, it, vi } from "vitest";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";

vi.mock("@/serverFunctions/billing", () => ({
  getBillingUsageEvents: vi.fn(),
}));

let mockUsageEvents: Array<{
  value: number;
  properties: Record<string, unknown>;
}> = [];

// Sidesteps react-query's real async lifecycle (a single `renderToStaticMarkup`
// pass only ever sees the initial `isLoading: true` state otherwise) so the
// data-driven rows branch — the one carrying every credit-feature message id
// — actually renders under test.
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: mockUsageEvents, isLoading: false }),
}));

import {
  BillingFeatureBreakdown,
  getBillingFeatureBreakdownRows,
} from "./BillingFeatureBreakdown";

describe("getBillingFeatureBreakdownRows", () => {
  it("uses explicit creditFeature when present", () => {
    const rows = getBillingFeatureBreakdownRows([
      {
        value: 250,
        properties: {
          creditFeature: "rank_tracking",
          paths: ["v3/serp/google/organic/live/regular"],
        },
      },
    ]);

    expect(rows).toEqual([
      { labelId: "billingPlans.creditFeature.rankTracking", usd: 0.25 },
    ]);
  });

  it("supports raw Autumn property aliases", () => {
    const rows = getBillingFeatureBreakdownRows([
      {
        value: 200,
        properties: {
          credit_feature: "local_seo",
          path: "v3/backlinks/summary/live",
        },
      },
    ]);

    expect(rows).toEqual([
      { labelId: "billingPlans.creditFeature.localSeo", usd: 0.2 },
    ]);
  });

  it("infers legacy events from DataForSEO paths", () => {
    const rows = getBillingFeatureBreakdownRows([
      {
        value: 500,
        properties: { paths: ["v3/backlinks/summary/live"] },
      },
      {
        value: 250,
        properties: {
          paths: ["v3/dataforseo_labs/google/domain_rank_overview/live"],
        },
      },
      {
        value: 125,
        properties: {
          paths: ["v3/ai_optimization/llm_mentions/search/live"],
        },
      },
      {
        value: 100,
        properties: { paths: ["backlinks/summary"] },
      },
    ]);

    expect(rows).toEqual([
      { labelId: "billingPlans.creditFeature.backlinks", usd: 0.6 },
      { labelId: "billingPlans.creditFeature.domainOverview", usd: 0.25 },
      { labelId: "billingPlans.creditFeature.aiCitations", usd: 0.125 },
    ]);
  });

  it("supports legacy JSON-encoded path groups", () => {
    const rows = getBillingFeatureBreakdownRows([
      {
        value: 300,
        properties: {
          paths: '["v3/ai_optimization/chat_gpt/llm_responses/live"]',
        },
      },
      {
        value: 200,
        properties: {
          paths: '["v3","ai_optimization","perplexity","llm_responses","live"]',
        },
      },
    ]);

    expect(rows).toEqual([
      { labelId: "billingPlans.creditFeature.aiPromptResponses", usd: 0.5 },
    ]);
  });

  it("falls back to Other when neither feature nor path is available", () => {
    const rows = getBillingFeatureBreakdownRows([
      {
        value: 100,
        properties: {},
      },
    ]);

    expect(rows).toEqual([
      { labelId: "billingPlans.creditFeature.other", usd: 0.1 },
    ]);
  });
});

function renderBreakdown(locale: "en" | "vi"): string {
  return renderToStaticMarkup(
    createElement(
      IntlProvider,
      { locale, messages: locale === "en" ? en : viMessages },
      createElement(BillingFeatureBreakdown),
    ),
  );
}

describe("BillingFeatureBreakdown", () => {
  it("resolves every credit-feature label (including the Other fallback) in Vietnamese", () => {
    mockUsageEvents = [
      { value: 1000, properties: { creditFeature: "keyword_research" } },
      { value: 900, properties: { creditFeature: "domain_overview" } },
      { value: 800, properties: { creditFeature: "backlinks" } },
      { value: 700, properties: { creditFeature: "site_audit" } },
      { value: 600, properties: { creditFeature: "rank_tracking" } },
      { value: 500, properties: { creditFeature: "ai_citations" } },
      { value: 400, properties: { creditFeature: "ai_prompt_responses" } },
      { value: 300, properties: { creditFeature: "ai_search" } },
      { value: 200, properties: { creditFeature: "local_seo" } },
      { value: 150, properties: { creditFeature: "onboarding" } },
      { value: 120, properties: { creditFeature: "issue_explainer" } },
      { value: 50, properties: { creditFeature: "totally_unknown_key" } },
    ];

    const html = renderBreakdown("vi");

    expect(html).toContain("Mức sử dụng theo tính năng");
    expect(html).toContain("Nghiên cứu từ khóa");
    expect(html).toContain("Tổng quan tên miền");
    expect(html).toContain("Liên kết trỏ về");
    expect(html).toContain("Kiểm tra website");
    expect(html).toContain("Theo dõi thứ hạng");
    expect(html).toContain("Trích dẫn AI");
    expect(html).toContain("Phản hồi Prompt AI");
    expect(html).toContain("Tìm kiếm AI");
    expect(html).toContain("SEO địa phương");
    expect(html).toContain("Onboarding");
    expect(html).toContain("Giải thích lỗi");
    expect(html).toContain("Khác");
    // None of the raw ids should ever leak into the DOM — the exact
    // "MissingTranslationError renders id text" failure class.
    expect(html).not.toContain("billingPlans.creditFeature");
  });

  it("shows the empty state in Vietnamese when there is no usage", () => {
    mockUsageEvents = [];
    const html = renderBreakdown("vi");
    expect(html).toContain("Chưa ghi nhận mức sử dụng nào");
  });
});
