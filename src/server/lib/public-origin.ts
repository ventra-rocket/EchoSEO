import { getOptionalEnvValue } from "@/server/lib/runtime-env";

/**
 * The origin this deployment is reachable on, for links inside outgoing mail.
 *
 * Request handlers read their own origin off the request. A Durable Object
 * alarm has no request, so an environment value is the only way it can build an
 * absolute link — and a report email whose links point nowhere is worse than no
 * email at all, so callers must treat `null` as "do not send".
 *
 * `FREE_CHECK_PUBLIC_ORIGIN` is the fallback because it already carries exactly
 * this value on every existing deployment (see wrangler.jsonc). It is read
 * second, not first, so the name a self-hoster reaches for — `APP_PUBLIC_ORIGIN`
 * — wins, and so disabling the free checker never silently breaks the periodic
 * reports.
 */
export async function getAppPublicOrigin(): Promise<string | null> {
  const [appOrigin, freeCheckOrigin] = await Promise.all([
    getOptionalEnvValue("APP_PUBLIC_ORIGIN"),
    getOptionalEnvValue("FREE_CHECK_PUBLIC_ORIGIN"),
  ]);
  const origin = appOrigin ?? freeCheckOrigin;
  if (!origin) return null;
  // A trailing slash would produce "…//api/reports/unsubscribe", which some
  // mail clients rewrite and some proxies 301 — either breaks one-click.
  return origin.endsWith("/") ? origin.slice(0, -1) : origin;
}
