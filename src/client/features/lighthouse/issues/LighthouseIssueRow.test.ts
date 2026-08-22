import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createIntl, RawIntlProvider } from "react-intl";
import { describe, expect, it } from "vitest";
import { LighthouseIssueRow } from "./LighthouseIssueRow";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";
import type { LighthouseIssue } from "./types";

const CATALOGS = { en, vi: viMessages } as const;

function renderWithIntl(
  locale: keyof typeof CATALOGS,
  issue: LighthouseIssue,
): string {
  const intl = createIntl({ locale, messages: CATALOGS[locale] });
  return renderToStaticMarkup(
    createElement(
      RawIntlProvider,
      { value: intl },
      createElement(
        "table",
        null,
        createElement(
          "tbody",
          null,
          createElement(LighthouseIssueRow, { issue }),
        ),
      ),
    ),
  );
}

// Lighthouse's own audit text — the exact sentence Lighthouse writes for this
// rule — is expected to stay in English regardless of locale; only EchoSEO's
// own chrome around it (severity, category, impact, score) is translated.
// `open` (LighthouseIssueRow.tsx useState) starts false, so the expanded
// description/affected-items panel never renders through a static pass —
// there is no click to fire. That ICU message is verified directly against a
// real IntlShape in the second describe block below instead.
const ISSUE_WITH_IMPACT: LighthouseIssue = {
  category: "performance",
  auditKey: "unused-javascript",
  title: "Reduce unused JavaScript",
  description:
    "Reduce unused JavaScript and defer loading scripts until they are required.",
  score: 47,
  scoreDisplayMode: "metricSavings",
  displayValue: "Potential savings of 227 KiB",
  impactMs: 1270,
  impactBytes: 232886,
  severity: "critical",
  items: ["https://example.com/app.js", "https://example.com/vendor.js"],
};

const ISSUE_NO_IMPACT: LighthouseIssue = {
  category: "seo",
  auditKey: "meta-description",
  title: "Document has a meta description",
  description: "",
  score: 100,
  scoreDisplayMode: "binary",
  displayValue: null,
  impactMs: null,
  impactBytes: null,
  severity: "info",
  items: [],
};

describe("LighthouseIssueRow", () => {
  it("renders EchoSEO's own chrome in English and leaves Lighthouse's report text untouched", () => {
    const markup = renderWithIntl("en", ISSUE_WITH_IMPACT);

    expect(markup).toContain("Critical");
    expect(markup).toContain("Performance");
    // impactMs (1270) and impactBytes (232886) run through intl.formatNumber
    // with unit style rather than the original hand-rolled ".toFixed(1)}s" /
    // ".toFixed(0)} KB" suffixes.
    expect(markup).toContain("1.3s / 227kB");
    expect(markup).toContain("47");
    // Lighthouse's own words, unconverted — the provider-data half of the
    // line drawn in this conversion.
    expect(markup).toContain("Reduce unused JavaScript");
    expect(markup).toContain("Potential savings of 227 KiB");
  });

  it("translates EchoSEO's chrome in Vietnamese but leaves Lighthouse's report text in English", () => {
    const markup = renderWithIntl("vi", ISSUE_WITH_IMPACT);

    expect(markup).toContain("Nghiêm trọng");
    expect(markup).toContain("Hiệu suất");
    // Locale-aware unit formatting: comma decimal separator and the full
    // Vietnamese unit words (CLDR has no narrower form for "giây"/"mili
    // giây" than the full word), not the English row's tight "1.3s" suffix.
    expect(markup).toContain("1,3 giây / 227 kB");
    expect(markup).toContain("47");
    expect(markup).not.toContain("Critical");
    expect(markup).not.toContain("Performance");
    // Lighthouse's own words stay English in every locale — the asserted
    // half of "how a reader can tell which is which on screen".
    expect(markup).toContain("Reduce unused JavaScript");
    expect(markup).toContain("Potential savings of 227 KiB");
  });

  it("renders the SEO category untranslated in both locales and hides the impact cell with no impact data", () => {
    const enMarkup = renderWithIntl("en", ISSUE_NO_IMPACT);
    const viMarkup = renderWithIntl("vi", ISSUE_NO_IMPACT);

    expect(enMarkup).toContain("SEO");
    expect(viMarkup).toContain("SEO");
    expect(enMarkup).toContain("Info");
    expect(viMarkup).toContain("Thông tin");
    expect(enMarkup).not.toContain("null");
  });
});

describe("lighthouseIssues.row.affectedItems", () => {
  it("formats the affected-item count through intl.formatMessage in both locales", () => {
    const enIntl = createIntl({ locale: "en", messages: en });
    const viIntl = createIntl({ locale: "vi", messages: viMessages });
    const count = ISSUE_WITH_IMPACT.items.length;

    expect(
      enIntl.formatMessage(
        { id: "lighthouseIssues.row.affectedItems" },
        { count },
      ),
    ).toBe("Affected items (2)");
    expect(
      viIntl.formatMessage(
        { id: "lighthouseIssues.row.affectedItems" },
        { count },
      ),
    ).toBe("Mục bị ảnh hưởng (2)");
  });
});
