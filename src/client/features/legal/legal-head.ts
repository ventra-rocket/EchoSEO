/**
 * `head()` for the legal routes.
 *
 * These pages are indexable on purpose — a visitor, or a reviewer deciding
 * whether to trust the service, should be able to find them from search. They
 * self-canonical through the same `publicUrl()` helper the landings use, so the
 * canonical, the sitemap entry, and the served URL cannot drift apart.
 *
 * Each document advertises every locale it exists in, including itself, plus
 * `x-default` → English. That reciprocal linking is what lets Google treat the
 * two URLs as translations of one page rather than as duplicates.
 */
import type { Locale } from "@/client/i18n/config";
import { publicUrl } from "@/shared/free-seo-check";
import type { LegalDocument } from "./legal-content";

const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  vi: "vi_VN",
};

export type LegalPathByLocale = Record<Locale, string>;

function alternateLinks(pathByLocale: LegalPathByLocale) {
  const perLocale = Object.entries(pathByLocale).map(([lang, path]) => ({
    rel: "alternate",
    // Lowercase `hreflang` is the standard HTML attribute crawlers expect;
    // TanStack serializes the key verbatim, so `hrefLang` would leak a
    // camelCased attribute into the HTML. React logs a dev-only prop warning for
    // the lowercase form; production output is the correct `hreflang="…"`.
    hreflang: lang,
    href: publicUrl(path),
  }));
  return [
    ...perLocale,
    // x-default is the fallback for languages we do not target — English.
    {
      rel: "alternate",
      hreflang: "x-default",
      href: publicUrl(pathByLocale.en),
    },
  ];
}

export function buildLegalHead(
  doc: LegalDocument,
  locale: Locale,
  pathByLocale: LegalPathByLocale,
) {
  const canonical = publicUrl(pathByLocale[locale]);
  const title = `${doc.title} — EchoSEO`;
  return {
    meta: [
      { title },
      { name: "description", content: doc.summary },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "EchoSEO" },
      { property: "og:title", content: title },
      { property: "og:description", content: doc.summary },
      { property: "og:url", content: canonical },
      { property: "og:locale", content: OG_LOCALE[locale] },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: doc.summary },
    ],
    links: [
      { rel: "canonical", href: canonical },
      ...alternateLinks(pathByLocale),
    ],
  };
}
