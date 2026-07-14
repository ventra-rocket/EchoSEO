/**
 * Raw HTTP handler for the anonymous Lite check — wired directly into
 * server.ts's fetch() (not a `createServerFn`) so it stays public in every
 * AUTH_MODE. See shared/free-seo-check.ts for why.
 *
 * Order matters: Turnstile -> per-IP rate limit -> cache -> crawl+parse.
 * Each gate runs before the next so an abusive caller never reaches the
 * expensive crawl.
 */
import { env } from "cloudflare:workers";
import { AppError } from "@/server/lib/errors";
import { getRequiredEnvValue } from "@/server/lib/runtime-env";
import { normalizeAndValidateStartUrl } from "@/server/lib/audit/url-policy";
import { freeSeoCheckRequestSchema } from "@/shared/free-seo-check";
import { verifyTurnstileToken } from "./turnstile";
import { checkIpRateLimit } from "./rate-limit-do";
import { getCachedLiteReport, putCachedLiteReport } from "./cache";
import { runLiteCheck } from "./lite";
import { clientIp, errorResponse, jsonResponse } from "./http-response";

export async function handleFreeSeoCheckRequest(
  request: Request,
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  try {
    const body = freeSeoCheckRequestSchema.safeParse(await request.json());
    if (!body.success) throw new AppError("VALIDATION_ERROR");
    const { url, turnstileToken } = body.data;

    const ip = clientIp(request);

    const turnstileSecret = await getRequiredEnvValue("TURNSTILE_SECRET_KEY");
    const turnstile = await verifyTurnstileToken(
      turnstileToken,
      turnstileSecret,
      ip,
    );
    if (!turnstile.success) throw new AppError("FORBIDDEN");

    const rateLimit = await checkIpRateLimit(env.RATE_LIMIT_DO, ip);
    if (!rateLimit.allowed) throw new AppError("RATE_LIMITED");

    // SSRF gate — first thing that touches the user-supplied URL.
    const normalizedUrl = await normalizeAndValidateStartUrl(url);
    const domain = new URL(normalizedUrl).hostname.toLowerCase();

    const cached = await getCachedLiteReport(domain);
    if (cached) {
      return jsonResponse({ report: cached, cached: true });
    }

    const report = await runLiteCheck(normalizedUrl);
    await putCachedLiteReport(domain, report);

    return jsonResponse({ report, cached: false });
  } catch (error) {
    return errorResponse(error, request);
  }
}
