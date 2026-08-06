const DEFAULT_SITE_URL = "https://echoseo.ventrarocket.vn";
const DEFAULT_SOCIAL_IMAGE_PATH = "/social-card.png";
const DEFAULT_SOCIAL_IMAGE_ALT = "EchoSEO product preview";

// The marketing site's public origin. Env-driven so it can be pointed at the
// final marketing domain at deploy time without code changes (the default is
// the current EchoSEO production origin).
export const SITE_URL = (
  process.env.SITE_URL ??
  process.env.VITE_SITE_URL ??
  DEFAULT_SITE_URL
).replace(/\/+$/, "");

export function toCanonicalPath(path: string): string {
  if (!path || path === "/") return "/";

  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized.replace(/\/+$/, "");
}

export function toCanonicalUrl(path: string): string {
  return new URL(toCanonicalPath(path), `${SITE_URL}/`).href;
}

type LocaleAlternate = {
  /** BCP-47 hreflang value, e.g. "en", "vi", or "x-default". */
  hreflang: string;
  path: string;
};

type BuildSeoParams = {
  title: string;
  path: string;
  description?: string;
  titleSuffix?: string;
  ogType?: "website" | "article";
  imageAlt?: string;
  /** OpenGraph locale, e.g. "en_US" or "vi_VN". */
  ogLocale?: string;
  /** hreflang alternates emitted as <link rel="alternate">. */
  alternates?: LocaleAlternate[];
};

export function buildPageSeo({
  title,
  path,
  description,
  titleSuffix,
  ogType = "website",
  imageAlt = DEFAULT_SOCIAL_IMAGE_ALT,
  ogLocale,
  alternates,
}: BuildSeoParams) {
  const fullTitle = titleSuffix ? `${title} - ${titleSuffix}` : title;
  const canonicalUrl = toCanonicalUrl(path);
  const socialImageUrl = toCanonicalUrl(DEFAULT_SOCIAL_IMAGE_PATH);

  return {
    meta: [
      { title: fullTitle },
      ...(description ? [{ name: "description", content: description }] : []),
      { property: "og:site_name", content: "EchoSEO" },
      { property: "og:type", content: ogType },
      { property: "og:title", content: fullTitle },
      ...(description
        ? [{ property: "og:description", content: description }]
        : []),
      { property: "og:url", content: canonicalUrl },
      ...(ogLocale ? [{ property: "og:locale", content: ogLocale }] : []),
      { property: "og:image", content: socialImageUrl },
      { property: "og:image:alt", content: imageAlt },
      { property: "og:image:type", content: "image/png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: fullTitle },
      ...(description
        ? [{ name: "twitter:description", content: description }]
        : []),
      { name: "twitter:image", content: socialImageUrl },
      { name: "twitter:image:alt", content: imageAlt },
    ],
    links: [
      { rel: "canonical", href: canonicalUrl },
      ...(alternates ?? []).map((alt) => ({
        rel: "alternate",
        hrefLang: alt.hreflang,
        href: toCanonicalUrl(alt.path),
      })),
    ],
  };
}
