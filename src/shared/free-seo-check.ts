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

export const freeSeoCheckRequestSchema = z.object({
  url: z.string().trim().min(1, "Enter a URL to check."),
  turnstileToken: z.string().min(1),
});

export type FreeSeoCheckRequest = z.infer<typeof freeSeoCheckRequestSchema>;
