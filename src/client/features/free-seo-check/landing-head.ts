/**
 * Builds the localized `head()` for the two landing routes (EN + VI) from one
 * place, so the English and Vietnamese pages carry the same shape of metadata and
 * a symmetric hreflang set. Each page self-canonicals and advertises every locale
 * (including itself) plus `x-default` → English, which is the reciprocal linking
 * Google requires to treat them as translations of one page.
 */
import type { Locale } from "@/client/i18n/config";
import {
  FREE_SEO_CHECK_LANDING_PATH,
  FREE_SEO_CHECK_VI_LANDING_PATH,
  publicUrl,
} from "@/shared/free-seo-check";
import { LANDING_COPY } from "./landing-copy";
import { landingStructuredDataScripts } from "./landing-structured-data";

const LANDING_PATH_BY_LOCALE: Record<Locale, string> = {
  en: FREE_SEO_CHECK_LANDING_PATH,
  vi: FREE_SEO_CHECK_VI_LANDING_PATH,
};

const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  vi: "vi_VN",
};

function alternateLinks() {
  const perLocale = Object.entries(LANDING_PATH_BY_LOCALE).map(
    ([lang, path]) => ({
      rel: "alternate",
      // Lowercase `hreflang` is the standard HTML attribute crawlers expect;
      // TanStack serializes the key verbatim, so `hrefLang` would leak a
      // camelCased attribute into the HTML. React logs a dev-only prop warning
      // for the lowercase form; production output is the correct `hreflang="…"`.
      hreflang: lang,
      href: publicUrl(path),
    }),
  );
  return [
    ...perLocale,
    // x-default is the fallback for languages we do not target — English.
    {
      rel: "alternate",
      hreflang: "x-default",
      href: publicUrl(FREE_SEO_CHECK_LANDING_PATH),
    },
  ];
}

export function buildLandingHead(locale: Locale) {
  const copy = LANDING_COPY[locale];
  const canonical = publicUrl(LANDING_PATH_BY_LOCALE[locale]);
  return {
    meta: [
      { title: copy.metaTitle },
      { name: "description", content: copy.metaDescription },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "EchoSEO" },
      { property: "og:title", content: copy.metaTitle },
      { property: "og:description", content: copy.metaDescription },
      { property: "og:url", content: canonical },
      { property: "og:locale", content: OG_LOCALE[locale] },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: copy.metaTitle },
      { name: "twitter:description", content: copy.metaDescription },
    ],
    links: [{ rel: "canonical", href: canonical }, ...alternateLinks()],
    scripts: landingStructuredDataScripts(locale),
  };
}
