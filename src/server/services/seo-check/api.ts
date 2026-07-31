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
import { localizeRuleText } from "@/server/lib/seo-rules";
import { freeSeoCheckRequestSchema } from "@/shared/free-seo-check";
import { formatTurnstileErrorCodes, verifyTurnstileToken } from "./turnstile";
import { checkIpRateLimit } from "./rate-limit-do";
import { getCachedLiteReport, putCachedLiteReport } from "./cache";
import { recordCheckMetric } from "./metrics";
import { isDeepCheckDisabled } from "./deep-check-config";
import { isAuthInterstitialUrl } from "./auth-interstitial";
import { runLiteCheck } from "./lite";
import type { LiteReport } from "./types";
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
    const { url, turnstileToken, locale } = body.data;

    // Reports are built + cached in canonical English; translate the signal text
    // to the requester's language on the way out, so a domain-keyed cache hit
    // still serves the right language. English is a no-op.
    const viewLocale = locale ?? "en";
    const localizeReport = (report: LiteReport): LiteReport => ({
      ...report,
      signals: report.signals.map((signal) =>
        localizeRuleText(signal, viewLocale),
      ),
    });

    const ip = clientIp(request);

    const turnstileSecret = await getRequiredEnvValue("TURNSTILE_SECRET_KEY");
    const turnstile = await verifyTurnstileToken(
      turnstileToken,
      turnstileSecret,
      ip,
    );
    if (!turnstile.success) {
      recordCheckMetric("turnstile_reject", {
        surface: "lite",
        codes: formatTurnstileErrorCodes(turnstile.errorCodes),
      });
      throw new AppError("FORBIDDEN");
    }

    const rateLimit = await checkIpRateLimit(env.RATE_LIMIT_DO, ip);
    if (!rateLimit.allowed) throw new AppError("RATE_LIMITED");

    // SSRF gate — first thing that touches the user-supplied URL.
    const normalizedUrl = await normalizeAndValidateStartUrl(url);
    const domain = new URL(normalizedUrl).hostname.toLowerCase();

    // Whether to offer the Deep tier at all. Without this the page shows a form
    // that asks for an email, a consent tick, and a CAPTCHA, then refuses — the
    // visitor pays the whole cost before learning it was never going to work.
    // Read per request, never cached with the report: the switch can flip any
    // time, and a stale `false` would hide a working feature.
    const deepAvailable = !(await isDeepCheckDisabled());

    const cached = await getCachedLiteReport(domain);
    if (cached) {
      // Older cached reports can predate the auth-interstitial guard. Their
      // final URL is enough to reject a known bad score without a new fetch or
      // waiting for the 24-hour TTL to expire.
      if (isAuthInterstitialUrl(cached.finalUrl)) {
        throw new AppError(
          "TARGET_BEHIND_AUTH",
          "Cached report points at an auth interstitial",
          { finalUrl: cached.finalUrl },
        );
      }
      recordCheckMetric("lite_check", { domain, cached: true });
      return jsonResponse({
        report: localizeReport(cached),
        cached: true,
        deepAvailable,
      });
    }

    const report = await runLiteCheck(normalizedUrl);
    await putCachedLiteReport(domain, report);

    recordCheckMetric("lite_check", {
      domain,
      cached: false,
      score: report.overallScore,
    });
    return jsonResponse({
      report: localizeReport(report),
      cached: false,
      deepAvailable,
    });
  } catch (error) {
    return errorResponse(error, request);
  }
}
