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
