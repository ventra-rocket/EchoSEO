import { z } from "zod";
import {
  LEGAL_PRIVACY_PATH,
  LEGAL_PRIVACY_PATH_VI,
  LEGAL_TERMS_PATH,
  LEGAL_TERMS_PATH_VI,
} from "@/shared/legal";

/**
 * Raw Worker-level route (not a TanStack `createServerFn`) — every server
 * function goes through the global auth middleware
 * (`globalServerFunctionMiddleware` in serverFunctions/middleware.ts), which
 * requires a session in every AUTH_MODE. This endpoint must stay public, so
 * it's dispatched directly in server.ts's fetch() before that pipeline, the
 * same way /agents/* and the Autumn webhook are.
 */
export const FREE_SEO_CHECK_API_PATH = "/api/free-seo-check";
/** Public GET — returns browser-safe configuration for the checker. */
export const FREE_SEO_CHECK_CONFIG_PATH = "/api/free-seo-check/config";
/** Public POST — start a Deep check (creates an unconfirmed lead + sends the opt-in email). */
export const FREE_SEO_CHECK_DEEP_START_PATH = "/api/free-seo-check/deep";
/** Public POST — confirm the double opt-in via the emailed token. */
export const FREE_SEO_CHECK_CONFIRM_PATH = "/api/free-seo-check/confirm";
/** The public Lite checker landing (English). Single source for its route,
 * canonical, OG URL, sitemap entry, and SSR-switch membership. */
export const FREE_SEO_CHECK_LANDING_PATH = "/free-seo-check";
/** The Vietnamese landing — a distinct URL (prefix + Vietnamese slug) because
 * hreflang needs one URL per language, not a cookie-switched single page. */
export const FREE_SEO_CHECK_VI_LANDING_PATH = "/vi/kiem-tra-seo";
/** SSR landing the confirmation email links to; it POSTs to the confirm path. */
export const FREE_SEO_CHECK_CONFIRM_ROUTE = "/free-seo-check/confirm";
/** Public GET — reads a finished Deep report by id (`?id=<uuid>`). */
export const FREE_SEO_CHECK_REPORT_PATH = "/api/free-seo-check/report";
/** Public GET — reads a frozen Lite check snapshot by id (`?id=<uuid>`). */
export const FREE_SEO_CHECK_CHECK_PATH = "/api/free-seo-check/check";
/**
 * Public GET — a desktop page capture for a URL (`?url=<url>`), used as the
 * capture shown on both the Lite result and the Deep report. Keyed by domain,
 * not report id, so both tiers share one cached image. Sits under the same
 * `/api/free-seo-check*` prefix as the endpoints above, which keeps it on the
 * existing Cloudflare Access bypass without spending a destination.
 */
export const FREE_SEO_CHECK_SITE_SCREENSHOT_PATH =
  "/api/free-seo-check/site-screenshot";

/**
 * Public GET — the loading-filmstrip JSON bundle for a URL
 * (`?url=<url>&strategy=…`). Strictly read-only: it serves whatever the last
 * capture render stored, or 404s — it never triggers a PSI render, so client
 * polls against it can never spend the shared quota. Same prefix, same Access
 * bypass as the capture endpoint above.
 */
export const FREE_SEO_CHECK_SITE_FILMSTRIP_PATH =
  "/api/free-seo-check/site-filmstrip";

/**
 * The form factor a capture was rendered on. A local literal rather than an
 * import of the server's `PsiStrategy` for the same layering reason as
 * `checkLocaleSchema` below: shared code must not depend on server modules.
 */
export type SiteCaptureStrategy = "mobile" | "desktop";

function evidenceUrl(
  basePath: string,
  pageUrl: string,
  strategy?: SiteCaptureStrategy,
): string {
  // Omitted strategy puts NOTHING on the wire — the server defaults that to
  // desktop, so `<img>` URLs minted before the mobile tab existed (and any
  // copy of them in a browser cache) stay byte-identical and keep resolving.
  const suffix = strategy ? `&strategy=${strategy}` : "";
  return `${basePath}?url=${encodeURIComponent(pageUrl)}${suffix}`;
}

/** The capture URL for a page — single source for the handler and both views. */
export function siteScreenshotUrl(
  pageUrl: string,
  strategy?: SiteCaptureStrategy,
): string {
  return evidenceUrl(FREE_SEO_CHECK_SITE_SCREENSHOT_PATH, pageUrl, strategy);
}

/** The filmstrip-bundle URL for a page — mirrors `siteScreenshotUrl`. */
export function siteFilmstripUrl(
  pageUrl: string,
  strategy?: SiteCaptureStrategy,
): string {
  return evidenceUrl(FREE_SEO_CHECK_SITE_FILMSTRIP_PATH, pageUrl, strategy);
}
/**
 * Path prefix of the shareable report page. The id is an unguessable capability
 * token, so responses under it get `Referrer-Policy: no-referrer` +
 * `X-Robots-Tag: noindex` in server.ts and are excluded in robots.txt.
 */
export const FREE_SEO_CHECK_REPORT_ROUTE_PREFIX = "/r/";

/**
 * Path prefix of the shareable Lite check page. Separate from `/r/` on purpose:
 * a `/c/{id}` link is a frozen 30-day R2 snapshot with no lead behind it, while
 * `/r/{id}` follows the Deep tier's lead-coupled canonical-resolver chain. Same
 * bearer-capability rules (`X-Robots-Tag: noindex` + `Referrer-Policy:
 * no-referrer` in server.ts), but deliberately NO robots.txt Disallow — a
 * Disallow would stop social unfurl bots from ever reading the OG tags, and
 * noindex already keeps pasted links out of search results.
 */
export const FREE_SEO_CHECK_CHECK_ROUTE_PREFIX = "/c/";

/** The share URL path for a check id — single source for client and server. */
export function checkPagePath(checkId: string): string {
  return `${FREE_SEO_CHECK_CHECK_ROUTE_PREFIX}${checkId}`;
}

/**
 * Test-only route that renders the Lite result from a fixture. Exported so the
 * SSR allowlist, robots.txt, and the tests all name one string.
 */
export const LITE_REPORT_FIXTURE_ROUTE = "/dev-fixtures/lite-report";

/**
 * Public routes that must server-render their body (not just their `<head>`).
 * The rest of the app renders inside `<ClientOnly>` in `__root.tsx` because it is
 * an authenticated dashboard where SSR buys nothing; these routes are the public,
 * indexable exception, so `AppLayout` renders them outside that island.
 *
 * This list and the Cloudflare Access bypass destinations are two separate lists
 * that must stay in sync: a path here that is not bypassed gets a 302 to Access
 * instead of the page. Report pages (`/r/`) are included so the emailed link
 * paints without waiting on JS; they stay noindex via robots.txt + X-Robots-Tag.
 */
const PUBLIC_SSR_EXACT_PATHS: ReadonlySet<string> = new Set([
  FREE_SEO_CHECK_LANDING_PATH,
  FREE_SEO_CHECK_VI_LANDING_PATH,
  FREE_SEO_CHECK_CONFIRM_ROUTE,
  // The legal pages are public for a different reason than the checker: they are
  // linked from the sign-up form, so they must render for someone who has no
  // account and no session. Their paths live in `shared/legal.ts` because this
  // set is the app-wide public list, not a checker-only one.
  LEGAL_TERMS_PATH,
  LEGAL_PRIVACY_PATH,
  LEGAL_TERMS_PATH_VI,
  LEGAL_PRIVACY_PATH_VI,
  // The fixture route renders the result state outside the authenticated
  // island, the same way a real result renders. It 404s in any build without
  // VITE_E2E_RESULT_FIXTURES, so listing it here costs a shipped build nothing.
  LITE_REPORT_FIXTURE_ROUTE,
]);

export function isPublicSsrPath(pathname: string): boolean {
  return (
    PUBLIC_SSR_EXACT_PATHS.has(pathname) ||
    pathname.startsWith(FREE_SEO_CHECK_REPORT_ROUTE_PREFIX) ||
    // Share pages must SSR their shell so unfurl bots (which run no JS) get a
    // real document around the injected OG tags, not an empty island.
    pathname.startsWith(FREE_SEO_CHECK_CHECK_ROUTE_PREFIX)
  );
}

/**
 * Absolute origin of THIS app, for the canonical, OG, sitemap, and robots links
 * that must be absolute. Baked in at build time so `head()` can use it during
 * both server and client render; overridable for forks via `VITE_PUBLIC_ORIGIN`.
 * Background Worker code (the report email) reads the runtime
 * `FREE_CHECK_PUBLIC_ORIGIN` var for the same value — a different mechanism
 * because a Worker binding is not readable from a client render.
 *
 * This is the app's own host, not the brand's. The apex serves the marketing
 * site from another Worker and only redirects app paths here, so pointing these
 * links at the apex told crawlers that every public page's real home was a URL
 * that redirects, and pointed robots.txt at the marketing site's sitemap instead
 * of this one — leaving the free checker's pages effectively undeclared. Keep
 * this in step with the app's hostname; see MARKETING_SITE_ORIGIN below for the
 * brand home, which is deliberately a different origin.
 */
const PUBLIC_ORIGIN =
  import.meta.env.VITE_PUBLIC_ORIGIN ?? "https://app.echoseo.ventrarocket.vn";

/** Absolute URL for a public path, e.g. canonical/OG/sitemap entries. */
export function publicUrl(pathname: string): string {
  return new URL(pathname, PUBLIC_ORIGIN).toString();
}

/**
 * The public MARKETING site — a different origin from this app. The brand home
 * is the marketing landing on the apex (echoseo.ventrarocket.vn), while this app
 * (the checker, its reports, the legal pages) is served from
 * app.echoseo.ventrarocket.vn. The EchoSEO mark in each public page's header
 * means "go to the brand home", so it must be an absolute URL to the landing —
 * not a path back into this app, which is where it used to point when the
 * checker itself was the public front door. Kept distinct from PUBLIC_ORIGIN
 * above (this app's own origin, for canonical/share URLs) so the two are never
 * conflated even while they still share a domain today.
 */
const MARKETING_SITE_ORIGIN = "https://echoseo.ventrarocket.vn";

/** The marketing landing home for a locale — English `/`, Vietnamese `/vi`. */
export function marketingHomeUrl(locale: "en" | "vi"): string {
  return locale === "vi"
    ? `${MARKETING_SITE_ORIGIN}/vi`
    : MARKETING_SITE_ORIGIN;
}

/**
 * The check-result language. Optional on the wire so older clients still
 * validate; the server treats a missing value as English. Kept as a local
 * literal (not imported from the client i18n config) to avoid a shared→client
 * layering dependency — the two supported locales are en + vi.
 */
const checkLocaleSchema = z.enum(["en", "vi"]).optional();

export const freeSeoCheckRequestSchema = z.object({
  url: z.string().trim().min(1, "Enter a URL to check."),
  turnstileToken: z.string().min(1),
  locale: checkLocaleSchema,
});

export type FreeSeoCheckRequest = z.infer<typeof freeSeoCheckRequestSchema>;

export const startDeepCheckRequestSchema = z.object({
  url: z.string().trim().min(1, "Enter a URL to check."),
  email: z.string().trim().max(254).pipe(z.email()),
  // Explicit opt-in — must be checked. Establishes the consent record.
  consent: z.literal(true),
  turnstileToken: z.string().min(1),
  locale: checkLocaleSchema,
});

export const confirmDeepCheckRequestSchema = z.object({
  token: z.string().min(1),
});
