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
