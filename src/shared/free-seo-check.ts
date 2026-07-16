import { z } from "zod";

/**
 * Raw Worker-level route (not a TanStack `createServerFn`) — every server
 * function goes through the global auth middleware
 * (`globalServerFunctionMiddleware` in serverFunctions/middleware.ts), which
 * requires a session in every AUTH_MODE. This endpoint must stay public, so
 * it's dispatched directly in server.ts's fetch() before that pipeline, the
 * same way /agents/* and the Autumn webhook are.
 */
export const FREE_SEO_CHECK_API_PATH = "/api/free-seo-check";
/** Public POST — start a Deep check (creates an unconfirmed lead + sends the opt-in email). */
export const FREE_SEO_CHECK_DEEP_START_PATH = "/api/free-seo-check/deep";
/** Public POST — confirm the double opt-in via the emailed token. */
export const FREE_SEO_CHECK_CONFIRM_PATH = "/api/free-seo-check/confirm";
/** The public Lite checker landing. Single source for its route, canonical, OG
 * URL, sitemap entry, and SSR-switch membership, so those cannot drift apart. */
export const FREE_SEO_CHECK_LANDING_PATH = "/free-seo-check";
/** SSR landing the confirmation email links to; it POSTs to the confirm path. */
export const FREE_SEO_CHECK_CONFIRM_ROUTE = "/free-seo-check/confirm";
/** Public GET — reads a finished Deep report by id (`?id=<uuid>`). */
export const FREE_SEO_CHECK_REPORT_PATH = "/api/free-seo-check/report";
/**
 * Path prefix of the shareable report page. The id is an unguessable capability
 * token, so responses under it get `Referrer-Policy: no-referrer` +
 * `X-Robots-Tag: noindex` in server.ts and are excluded in robots.txt.
 */
export const FREE_SEO_CHECK_REPORT_ROUTE_PREFIX = "/r/";

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
  FREE_SEO_CHECK_CONFIRM_ROUTE,
]);

export function isPublicSsrPath(pathname: string): boolean {
  return (
    PUBLIC_SSR_EXACT_PATHS.has(pathname) ||
    pathname.startsWith(FREE_SEO_CHECK_REPORT_ROUTE_PREFIX)
  );
}

/**
 * Absolute origin of the public site, for canonical/OG links that must be
 * absolute URLs. Baked in at build time so `head()` can use it during both server
 * and client render; overridable for forks via `VITE_PUBLIC_ORIGIN`, defaulting
 * to the production domain. Background Worker code (the report email) reads the
 * runtime `FREE_CHECK_PUBLIC_ORIGIN` var for the same value — a different
 * mechanism because a Worker binding is not readable from a client render.
 */
const PUBLIC_ORIGIN =
  import.meta.env.VITE_PUBLIC_ORIGIN ?? "https://echoseo.ventrarocket.vn";

/** Absolute URL for a public path, e.g. canonical/OG/sitemap entries. */
export function publicUrl(pathname: string): string {
  return new URL(pathname, PUBLIC_ORIGIN).toString();
}

export const freeSeoCheckRequestSchema = z.object({
  url: z.string().trim().min(1, "Enter a URL to check."),
  turnstileToken: z.string().min(1),
});

export type FreeSeoCheckRequest = z.infer<typeof freeSeoCheckRequestSchema>;

export const startDeepCheckRequestSchema = z.object({
  url: z.string().trim().min(1, "Enter a URL to check."),
  email: z.string().trim().max(254).pipe(z.email()),
  // Explicit opt-in — must be checked. Establishes the consent record.
  consent: z.literal(true),
  turnstileToken: z.string().min(1),
});

export const confirmDeepCheckRequestSchema = z.object({
  token: z.string().min(1),
});
