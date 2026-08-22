import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIntl, RawIntlProvider } from "react-intl";
import { describe, expect, it } from "vitest";

import { BrandLookupShareOfVoice } from "./BrandLookupShareOfVoice";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";
import type { BrandLookupResult } from "@/types/schemas/ai-search";

type ShareOfVoice = NonNullable<BrandLookupResult["shareOfVoice"]>;

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

const TWO_PLATFORM_SOV: ShareOfVoice = {
  platforms: ["chat_gpt", "google"],
  entries: [
    { label: "acme.com", isTarget: true, mentions: 800, sharePct: 60 },
    { label: "rival.com", isTarget: false, mentions: 480, sharePct: 40 },
    { label: "unknown.com", isTarget: false, mentions: null, sharePct: null },
  ],
};

describe("BrandLookupShareOfVoice", () => {
  it.each(["en", "vi"] as const)(
    "shows the target's share, per-row counts and the platform footer (%s)",
    (locale) => {
      const catalog = CATALOGS[locale];
      const intl = createIntl({ locale, messages: catalog });
      const { markup, errors } = renderWithIntl(
        locale,
        createElement(BrandLookupShareOfVoice, {
          shareOfVoice: TWO_PLATFORM_SOV,
        }),
      );
      expect(errors).toEqual([]);

      expect(markup).toContain(catalog["aiBrandLookup.shareOfVoice.title"]);
      // Target summary line: "· {percent}" through IntlShape, not a
      // hand-rolled `Math.round(x) + "%"` string.
      expect(markup).toContain(
        intl.formatMessage(
          { id: "aiBrandLookup.shareOfVoice.targetShare" },
          {
            percent: intl.formatNumber(0.6, {
              style: "percent",
              maximumFractionDigits: 0,
            }),
          },
        ),
      );
      expect(markup).toContain(catalog["aiBrandLookup.shareOfVoice.youBadge"]);
      // Non-target row's mention count and percent, both through IntlShape.
      expect(markup).toContain(intl.formatNumber(480));
      expect(markup).toContain(
        intl.formatNumber(0.4, { style: "percent", maximumFractionDigits: 0 }),
      );
      // A row with no data at all renders a dash, not zero.
      expect(markup).toContain("—");

      // Footer: both platform names joined through `Intl.ListFormat`
      // ("and"/"và"), not `.join(" and ")`.
      expect(markup).toContain(
        intl.formatMessage(
          { id: "aiBrandLookup.shareOfVoice.footer" },
          { platforms: intl.formatList(["ChatGPT", "Google AI Overview"]) },
        ),
      );
    },
  );

  it.each(["en", "vi"] as const)(
    "says so when the target has no comparable share (%s)",
    (locale) => {
      const catalog = CATALOGS[locale];
      const { markup, errors } = renderWithIntl(
        locale,
        createElement(BrandLookupShareOfVoice, {
          shareOfVoice: {
            platforms: ["chat_gpt"],
            entries: [
              {
                label: "acme.com",
                isTarget: true,
                mentions: null,
                sharePct: null,
              },
            ],
          },
        }),
      );
      expect(errors).toEqual([]);
      expect(markup).toContain(
        catalog["aiBrandLookup.shareOfVoice.noComparableData"],
      );
      // Single-platform footer: no "and"/"và" joiner to assert away.
      expect(markup).toContain(
        createIntl({ locale, messages: catalog }).formatMessage(
          { id: "aiBrandLookup.shareOfVoice.footer" },
          { platforms: "ChatGPT" },
        ),
      );
    },
  );
});
