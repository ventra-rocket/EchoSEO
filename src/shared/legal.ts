/**
 * Paths and shared facts for the two public legal pages.
 *
 * These live in their own module rather than beside the page content because the
 * SSR allowlist in `free-seo-check.ts` and the sitemap both need the paths, and
 * neither should have to pull in the full document copy to get them.
 *
 * The paths are relative by design. Everything that links to a legal page — the
 * sign-up form above all — must resolve against the deployment it is running on,
 * because a self-hosted EchoSEO is governed by its own operator's documents, not
 * ours.
 */

export const LEGAL_TERMS_PATH = "/terms-and-conditions";
export const LEGAL_PRIVACY_PATH = "/privacy";

/**
 * Vietnamese documents live at their own Vietnamese URLs, the same way the
 * checker landing does, so each language is a distinct indexable page that
 * hreflang can pair with its translation. A locale query parameter or cookie
 * would give both languages one URL and nothing for a crawler to choose between.
 */
export const LEGAL_TERMS_PATH_VI = "/vi/dieu-khoan";
export const LEGAL_PRIVACY_PATH_VI = "/vi/quyen-rieng-tu";

/** Both languages of one document, keyed by locale — the hreflang pair. */
export const LEGAL_TERMS_PATH_BY_LOCALE = {
  en: LEGAL_TERMS_PATH,
  vi: LEGAL_TERMS_PATH_VI,
} as const;

export const LEGAL_PRIVACY_PATH_BY_LOCALE = {
  en: LEGAL_PRIVACY_PATH,
  vi: LEGAL_PRIVACY_PATH_VI,
} as const;

/**
 * The address in both documents for privacy requests (access, erasure, consent
 * withdrawal). Kept next to the paths so the pages, and any test that pins the
 * documents' contact route, read one value.
 */
export const LEGAL_CONTACT_EMAIL = "ventrarocket.work@gmail.com";

/**
 * Publication date shown on both documents. A legal page with no date gives a
 * reader no way to tell whether it describes the service they signed up to, so
 * this is required chrome rather than decoration. Bump it whenever the substance
 * of either document changes.
 */
export const LEGAL_LAST_UPDATED = "2026-07-29";
