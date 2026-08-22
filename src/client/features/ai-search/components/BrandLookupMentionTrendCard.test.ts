import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIntl, RawIntlProvider } from "react-intl";
import { describe, expect, it } from "vitest";

import {
  BrandLookupMentionTrendCard,
  buildMentionTrendChartData,
  MentionTooltip,
} from "./BrandLookupMentionTrendCard";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";
import type { BrandLookupResult } from "@/types/schemas/ai-search";

const CATALOGS = { en, vi: viMessages } as const;

function renderWithIntl(
  locale: keyof typeof CATALOGS,
  node: ReactNode,
): { markup: string; errors: string[] } {
  const errors: string[] = [];
  const intl = createIntl({
    locale,
    messages: CATALOGS[locale],
    onError: (error) => errors.push(error.message),
  });
  const markup = renderToStaticMarkup(
    createElement(RawIntlProvider, { value: intl }, node),
  );
  return { markup, errors };
}

const EMPTY_TREND_RESULT: BrandLookupResult = {
  query: "acme",
  detectedTargetType: "domain",
  resolvedTarget: "acme.com",
  fetchedAt: new Date(0).toISOString(),
  hasData: true,
  totalMentions: 0,
  totalAiSearchVolume: 0,
  perPlatform: [],
  shareOfVoice: null,
  topPages: [],
  topQueries: [],
  monthlyVolume: [],
};

describe("BrandLookupMentionTrendCard", () => {
  it.each(["en", "vi"] as const)(
    "names the empty state instead of rendering a blank chart (%s)",
    (locale) => {
      const catalog = CATALOGS[locale];
      const { markup, errors } = renderWithIntl(
        locale,
        createElement(BrandLookupMentionTrendCard, {
          result: EMPTY_TREND_RESULT,
        }),
      );
      expect(errors).toEqual([]);
      expect(markup).toContain(catalog["aiBrandLookup.mentionTrend.empty"]);
    },
  );
});

// recharts' `ResponsiveContainer` measures 0×0 and renders nothing under
// `renderToStaticMarkup` (no real browser layout pass), so the two pieces of
// locale-sensitive logic that feed the chart are asserted directly instead.
describe("buildMentionTrendChartData", () => {
  it.each(["en", "vi"] as const)(
    "labels each point with a locale-formatted month/year, pinned to UTC (%s)",
    (locale) => {
      const intl = createIntl({ locale, messages: CATALOGS[locale] });
      const data = buildMentionTrendChartData(intl, [
        { year: 2025, month: 1, volume: 100 },
        { year: 2025, month: 12, volume: null },
      ]);
      expect(data).toEqual([
        {
          label: intl.formatDate(Date.UTC(2025, 0, 1), {
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          }),
          volume: 100,
        },
        {
          label: intl.formatDate(Date.UTC(2025, 11, 1), {
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          }),
          // A null monthly volume renders as 0 on the line, not a gap.
          volume: 0,
        },
      ]);
    },
  );
});

describe("MentionTooltip", () => {
  it.each(["en", "vi"] as const)(
    "pluralizes the mention count through ICU, not a hardcoded 'mentions' suffix (%s)",
    (locale) => {
      const catalog = CATALOGS[locale];
      const intl = createIntl({ locale, messages: catalog });

      const { markup: oneMarkup, errors: oneErrors } = renderWithIntl(
        locale,
        createElement(MentionTooltip, {
          active: true,
          payload: [{ value: 1 }],
          label: "Jan 2025",
        }),
      );
      expect(oneErrors).toEqual([]);
      expect(oneMarkup).toContain(
        intl.formatMessage(
          { id: "aiBrandLookup.mentionTrend.tooltip" },
          { count: 1 },
        ),
      );

      const { markup: manyMarkup, errors: manyErrors } = renderWithIntl(
        locale,
        createElement(MentionTooltip, {
          active: true,
          payload: [{ value: 5 }],
          label: "Feb 2025",
        }),
      );
      expect(manyErrors).toEqual([]);
      expect(manyMarkup).toContain(
        intl.formatMessage(
          { id: "aiBrandLookup.mentionTrend.tooltip" },
          { count: 5 },
        ),
      );
    },
  );

  it("renders nothing while inactive, matching recharts' own contract", () => {
    const { markup } = renderWithIntl(
      "en",
      createElement(MentionTooltip, { active: false }),
    );
    expect(markup).toBe("");
  });
});
