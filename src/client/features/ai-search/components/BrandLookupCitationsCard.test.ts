import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIntl, RawIntlProvider } from "react-intl";
import { describe, expect, it, vi } from "vitest";

import { CitationTabsCard } from "./BrandLookupCitationsCard";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";
import type { BrandLookupResult } from "@/types/schemas/ai-search";

// CitationTabsCard's tables link into Prompt Explorer; the router itself is
// not under test here, matching DomainTables.test.ts's own Link mock.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    "aria-label": ariaLabel,
    children,
  }: {
    "aria-label"?: string;
    children?: ReactNode;
  }) => createElement("a", { "aria-label": ariaLabel }, children),
  linkOptions: (options: unknown) => options,
}));

const CATALOGS = { en, vi: viMessages } as const;

/**
 * Same onError probe as BrandLookupCitationTables.test.ts: markup alone can
 * look right even when a message id resolves to its own
 * MissingTranslationError fallback, so every assertion here also checks
 * `errors` is empty.
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

// Named so the assertion can format the exact number the table receives.
const QUERY_VOLUME = 5400;

const RESULT: BrandLookupResult = {
  query: "example.com",
  detectedTargetType: "domain",
  resolvedTarget: "example.com",
  fetchedAt: "2024-01-01T00:00:00.000Z",
  hasData: true,
  totalMentions: 10,
  totalAiSearchVolume: 5000,
  perPlatform: [],
  shareOfVoice: null,
  topPages: [],
  topQueries: [
    {
      question: "what is the best seo tool",
      platform: "google",
      aiSearchVolume: QUERY_VOLUME,
      firstSeenAt: "2024-01-01",
      lastSeenAt: "2024-02-01",
      citedSources: [],
      brandsMentioned: [],
    },
  ],
  monthlyVolume: [],
};

describe("CitationTabsCard", () => {
  it.each(["en", "vi"] as const)(
    // The tab starts on "queries" (CitationTabsCard's own useState default)
    // and is switched by a click this static render cannot simulate, so this
    // covers the queries variant; the pages caption shares the exact same
    // formatMessage(id, { brand: ReactNode }) call shape, exercised here.
    "renders tabs, the export menu and the queries caption with the brand bolded in %s",
    (locale) => {
      const catalog = CATALOGS[locale];
      const intl = createIntl({ locale, messages: catalog });
      const { markup, errors } = renderWithIntl(
        locale,
        createElement(CitationTabsCard, {
          result: RESULT,
          projectId: "proj_1",
        }),
      );

      expect(errors).toEqual([]);

      // Tabs.
      expect(markup).toContain(catalog["aiCitations.card.tab.queries"]);
      expect(markup).toContain(catalog["aiCitations.card.tab.pages"]);

      // Export dropdown: the trigger and the Google Sheets item reuse
      // common.table.export / common.sheets.export rather than a second
      // "Export" id; only the CSV item is this catalog's own.
      expect(markup).toContain(catalog["common.table.export"]);
      expect(markup).toContain(catalog["common.sheets.export"]);
      expect(markup).toContain(catalog["aiCitations.card.export.csv"]);

      // Filters toggle.
      expect(markup).toContain(
        `title="${catalog["aiCitations.card.filters.toggleTitle"]}"`,
      );
      expect(markup).toContain(catalog["aiCitations.card.filters.label"]);

      // Caption: the resolved brand/domain is user data, not prose, so it is
      // interpolated as a value (bolded) rather than translated. Split the
      // catalog sentence on the placeholder so this assertion tracks the
      // shipped copy instead of a second hardcoded copy of it.
      const [prefix, suffix] =
        catalog["aiCitations.card.caption.queries"].split("{brand}");
      expect(markup).toContain(prefix);
      expect(markup).toContain(suffix);
      expect(markup).toContain(
        `<strong class="text-base-content/80">${RESULT.resolvedTarget}</strong>`,
      );

      // Never the raw id: an id-echo bug reads as plausible prose here too.
      expect(markup).not.toContain('aiCitations.card.tab.queries"');

      // Volume in the rendered queries table is locale-formatted through the
      // active IntlShape.
      expect(markup).toContain(intl.formatNumber(QUERY_VOLUME));
    },
  );
});
