import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIntl, RawIntlProvider } from "react-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  BrandLookupResults,
  formatRelativeUpdated,
} from "./BrandLookupResults";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";
import type { BrandLookupResult } from "@/types/schemas/ai-search";

// Renders through the real IntlProvider + real catalogs, matching
// DomainTables.test.ts / BacklinksPageStates.test.ts: this component takes a
// fixture `result` and does no fetching of its own, so it renders fully
// without a DataForSEO key. CitationTabsCard is a sibling slice's file (the
// citations trio), not under test here.
vi.mock(
  "@/client/features/ai-search/components/BrandLookupCitationsCard",
  () => ({
    CitationTabsCard: () => null,
  }),
);

const CATALOGS = { en, vi: viMessages } as const;

/**
 * Renders through a real IntlShape with an onError probe: a prop that expects
 * a message id but receives an already-formatted string renders
 * correct-looking text while throwing MissingTranslationError on every
 * render, so asserting rendered text alone would pass against that bug.
 */
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

/** Strips element tags so a rich-text `values` placeholder (e.g. `<strong>`)
 * can be compared against the plain-text `intl.formatMessage` reconstruction,
 * without hand-splitting the catalog string around it. */
function textOnly(markup: string): string {
  return markup.replace(/<[^>]+>/g, "");
}

const BASE_RESULT: BrandLookupResult = {
  query: "acme",
  detectedTargetType: "domain",
  resolvedTarget: "acme.com",
  fetchedAt: new Date(0).toISOString(),
  hasData: true,
  totalMentions: 1234,
  totalAiSearchVolume: 5600,
  perPlatform: [
    {
      platform: "chat_gpt",
      status: "success",
      mentions: 800,
      aiSearchVolume: 3000,
    },
    {
      platform: "google",
      status: "error",
      mentions: null,
      aiSearchVolume: null,
    },
  ],
  shareOfVoice: {
    platforms: ["chat_gpt", "google"],
    entries: [
      { label: "acme.com", isTarget: true, mentions: 800, sharePct: 60 },
      { label: "rival.com", isTarget: false, mentions: 480, sharePct: 40 },
    ],
  },
  topPages: [],
  topQueries: [],
  monthlyVolume: [
    { year: 2025, month: 1, volume: 100 },
    { year: 2025, month: 2, volume: 150 },
  ],
};

describe("BrandLookupResults", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-03-01T00:05:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(["en", "vi"] as const)(
    "renders the full result — header, stats, trend title, Share of Voice (%s)",
    (locale) => {
      const catalog = CATALOGS[locale];
      const intl = createIntl({ locale, messages: catalog });
      const fetchedAt = new Date(Date.now() - 5 * 60_000).toISOString();
      const { markup, errors } = renderWithIntl(
        locale,
        createElement(BrandLookupResults, {
          result: { ...BASE_RESULT, fetchedAt },
          projectId: "p1",
        }),
      );
      expect(errors).toEqual([]);

      // Badge: the translated target-type label, never the raw "domain" enum.
      expect(markup).toContain(
        catalog["aiBrandLookup.results.targetType.domain"],
      );

      // "Updated {relative}" through the same IntlShape mechanism the
      // component uses — not a hardcoded string, so this stays correct if
      // the wording ever changes.
      const relative = intl.formatRelativeTime(-5, "minute", {
        numeric: "auto",
      });
      expect(markup).toContain(
        intl.formatMessage(
          { id: "aiBrandLookup.results.updated" },
          { relative },
        ),
      );

      // Stat labels + tooltips (data-tip) + values through IntlShape, not the
      // locale-blind `formatCount` helper (hardcoded to "en-US").
      expect(markup).toContain(
        catalog["aiBrandLookup.results.stat.mentions.label"],
      );
      expect(markup).toContain(
        `data-tip="${catalog["aiBrandLookup.results.stat.mentions.tooltip"]}"`,
      );
      expect(markup).toContain(intl.formatNumber(1234));
      expect(markup).toContain(intl.formatNumber(5600));

      // Errored platform row: translated "unavailable", plus the ChatGPT
      // country-scope tooltip on the surviving platform.
      expect(markup).toContain(
        catalog["aiBrandLookup.results.platformUnavailable"],
      );
      expect(markup).toContain(
        `data-tip="${catalog["aiBrandLookup.results.chatGptCountryTooltip"]}"`,
      );

      // Mention trend + Share of Voice render under their translated
      // headings, with the target's share as a locale-correct percent.
      expect(markup).toContain(
        catalog["aiBrandLookup.results.mentionTrend.title"],
      );
      expect(markup).toContain(catalog["aiBrandLookup.shareOfVoice.title"]);
      expect(markup).toContain(catalog["aiBrandLookup.shareOfVoice.youBadge"]);
      expect(markup).toContain(
        intl.formatNumber(0.6, { style: "percent", maximumFractionDigits: 0 }),
      );
    },
  );

  it.each(["en", "vi"] as const)(
    "reports every platform down as unavailable, not a blank result (%s)",
    (locale) => {
      const catalog = CATALOGS[locale];
      const intl = createIntl({ locale, messages: catalog });
      const { markup, errors } = renderWithIntl(
        locale,
        createElement(BrandLookupResults, {
          result: {
            ...BASE_RESULT,
            hasData: false,
            perPlatform: [
              {
                platform: "chat_gpt",
                status: "error",
                mentions: null,
                aiSearchVolume: null,
              },
              {
                platform: "google",
                status: "error",
                mentions: null,
                aiSearchVolume: null,
              },
            ],
          },
          projectId: "p1",
        }),
      );
      expect(errors).toEqual([]);
      expect(textOnly(markup)).toContain(
        intl.formatMessage(
          { id: "aiBrandLookup.results.allPlatformsUnavailable" },
          { target: "acme.com" },
        ),
      );
    },
  );

  it.each(["en", "vi"] as const)(
    "names the one down platform (singular) when the other still has data (%s)",
    (locale) => {
      const catalog = CATALOGS[locale];
      const intl = createIntl({ locale, messages: catalog });
      const { markup, errors } = renderWithIntl(
        locale,
        createElement(BrandLookupResults, {
          result: {
            ...BASE_RESULT,
            hasData: false,
            perPlatform: [
              {
                platform: "chat_gpt",
                status: "error",
                mentions: null,
                aiSearchVolume: null,
              },
              {
                platform: "google",
                status: "success",
                mentions: 0,
                aiSearchVolume: 0,
              },
            ],
          },
          projectId: "p1",
        }),
      );
      expect(errors).toEqual([]);
      expect(textOnly(markup)).toContain(
        intl.formatMessage(
          { id: "aiBrandLookup.results.noMentionsFound" },
          { target: "acme.com" },
        ),
      );
      // Exactly one down platform out of two possible ones is the only way
      // this branch is reached, so the singular ("was") ICU branch and a
      // one-item `formatList` (no "and"/"và" joiner) are the only case to pin.
      expect(markup).toContain(
        intl.formatMessage(
          { id: "aiBrandLookup.results.platformsUnavailableNote" },
          { platforms: intl.formatList(["ChatGPT"]), count: 1 },
        ),
      );
    },
  );
});

describe("formatRelativeUpdated", () => {
  const NOW = new Date("2025-03-01T00:10:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(["en", "vi"] as const)(
    "covers seconds, minutes, hours, days and an unparseable date (%s)",
    (locale) => {
      const catalog = CATALOGS[locale];
      const intl = createIntl({ locale, messages: catalog });
      const minutesAgo = (n: number) =>
        new Date(NOW.getTime() - n * 60_000).toISOString();

      expect(formatRelativeUpdated(intl, minutesAgo(0))).toBe(
        intl.formatRelativeTime(0, "second", { numeric: "auto" }),
      );
      expect(formatRelativeUpdated(intl, minutesAgo(5))).toBe(
        intl.formatRelativeTime(-5, "minute", { numeric: "auto" }),
      );
      expect(formatRelativeUpdated(intl, minutesAgo(180))).toBe(
        intl.formatRelativeTime(-3, "hour", { numeric: "auto" }),
      );
      expect(formatRelativeUpdated(intl, minutesAgo(60 * 24 * 3))).toBe(
        intl.formatRelativeTime(-3, "day", { numeric: "auto" }),
      );
      // Unparseable input never claims a relative time it doesn't know.
      expect(formatRelativeUpdated(intl, "not-a-date")).toBe(
        catalog["aiBrandLookup.results.updatedFallback"],
      );
    },
  );
});
