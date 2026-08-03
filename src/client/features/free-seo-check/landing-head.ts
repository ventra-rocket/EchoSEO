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

/**
 * The share card. One image serves both locales: it carries the mark, the
 * product name, and the English claim — regenerate it per locale only if the
 * Vietnamese share surface becomes worth its own artwork. The source that
 * produced it is kept at `docs/og-free-seo-check.source.html` so the card can
 * be rebuilt rather than redrawn.
 */
const OG_IMAGE_PATH = "/og-free-seo-check.png";

const OG_IMAGE_ALT: Record<Locale, string> = {
  en: "EchoSEO Free SEO Checker — every fix cited to Google's own documentation.",
  vi: "EchoSEO — công cụ kiểm tra SEO, mỗi cách sửa đều dẫn nguồn tài liệu chính thức của Google.",
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
      // Browser chrome color per scheme, matching the page ground (bg-base-200
      // in app.css): without it mobile browsers paint default chrome against
      // the near-black page. Two tags with media queries is the standard form.
      {
        name: "theme-color",
        media: "(prefers-color-scheme: light)",
        content: "#eef1f5",
      },
      {
        name: "theme-color",
        media: "(prefers-color-scheme: dark)",
        content: "#0b0f14",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "EchoSEO" },
      { property: "og:title", content: copy.metaTitle },
      { property: "og:description", content: copy.metaDescription },
      { property: "og:url", content: canonical },
      { property: "og:locale", content: OG_LOCALE[locale] },
      // Without an image every share on X, LinkedIn, Slack, or Discord unfurls
      // as a grey text stub — a pure loss for the page the whole distribution
      // strategy points at. Served from `public/` rather than the Vite pipeline
      // so the URL stays stable across builds and cached unfurls keep working.
      { property: "og:image", content: publicUrl(OG_IMAGE_PATH) },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: OG_IMAGE_ALT[locale] },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: publicUrl(OG_IMAGE_PATH) },
      { name: "twitter:title", content: copy.metaTitle },
      { name: "twitter:description", content: copy.metaDescription },
    ],
    links: [{ rel: "canonical", href: canonical }, ...alternateLinks()],
    scripts: landingStructuredDataScripts(locale),
  };
}
