/**
 * Raw HTTP handler for starting a Free Deep SEO Check — wired directly into
 * server.ts's fetch() (like the Lite endpoint) so it stays public in every
 * AUTH_MODE.
 *
 * Order matters: Turnstile -> per-IP rate limit -> disposable-email screen ->
 * SSRF validation. Only then do we create the unconfirmed lead + report and
 * send the double opt-in email. The Deep audit itself runs ONLY after the
 * recipient confirms (see deep-confirm.ts) — this is the GDPR lawful basis and
 * the joe-job-spam guard.
 */
import { env } from "cloudflare:workers";
import { AppError } from "@/server/lib/errors";
import { getRequiredEnvValue } from "@/server/lib/runtime-env";
import { normalizeAndValidateStartUrl } from "@/server/lib/audit/url-policy";
import {
  FREE_SEO_CHECK_CONFIRM_ROUTE,
  startDeepCheckRequestSchema,
} from "@/shared/free-seo-check";
import { isDeepCheckDisabled } from "./deep-check-config";
import { formatTurnstileErrorCodes, verifyTurnstileToken } from "./turnstile";
import { checkIpRateLimit } from "./rate-limit-do";
import { createLeadWithReport } from "./leads-repository";
import { recordCheckMetric } from "./metrics";
import { isDisposableEmail, normalizeEmail } from "./disposable-email";
import { getEmailSender } from "./email/sender";
import { sendDeepCheckConfirmation } from "./email/deep-check-confirmation";
import { isAuthInterstitialUrl } from "./auth-interstitial";
import { safeFetch } from "./safe-fetch";
import {
  clientIp,
  errorResponse,
  jsonResponse,
  readJsonBody,
} from "./http-response";

const CONFIRM_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const LEAD_SOURCE = "free-seo-check";
// The requester's UI language, captured so the report page and emails render in
// it. Falls back to English when an older client omits `locale` from the body.
const DEFAULT_LOCALE = "en";

/** 256-bit CSPRNG hex token for the single-use double opt-in link. */
function generateConfirmToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function buildConfirmUrl(
  request: Request,
  token: string,
  locale: string,
): string {
  const url = new URL(
    FREE_SEO_CHECK_CONFIRM_ROUTE,
    new URL(request.url).origin,
  );
  url.searchParams.set("token", token);
  // Carry the requester's language on the emailed link so the confirm page
  // (only ever reached from that link) renders in it. Omitted for English to
  // keep those links unchanged.
  if (locale !== "en") url.searchParams.set("lang", locale);
  return url.toString();
}

/**
 * A Deep run calls PageSpeed only after email confirmation. Check the final
 * redirect target before creating that lead so an Access/SSO login page cannot
 * consume PSI quota or cause a misleading report later in the workflow.
 */
async function assertDeepTargetIsPublic(url: string): Promise<void> {
  const { finalUrl } = await safeFetch(url);
  if (isAuthInterstitialUrl(finalUrl)) {
    throw new AppError(
      "TARGET_BEHIND_AUTH",
      "Target redirected to an auth interstitial",
      { finalUrl },
    );
  }
}

export async function handleStartDeepCheckRequest(
  request: Request,
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  try {
    // Kill-switch first: refuse before creating a lead or sending an email.
    // Respond directly (no PostHog capture) — this runs before the rate limit,
    // so a flood against a deliberately paused endpoint must stay cheap.
    if (await isDeepCheckDisabled()) {
      return jsonResponse({ error: "UPSTREAM_UNAVAILABLE" }, 503);
    }

    const body = startDeepCheckRequestSchema.safeParse(
      await readJsonBody(request),
    );
    if (!body.success) throw new AppError("VALIDATION_ERROR");
    const { url, email, turnstileToken, locale } = body.data;
    const requestLocale = locale ?? DEFAULT_LOCALE;

    const ip = clientIp(request);

    const turnstileSecret = await getRequiredEnvValue("TURNSTILE_SECRET_KEY");
    const turnstile = await verifyTurnstileToken(
      turnstileToken,
      turnstileSecret,
      ip,
    );
    if (!turnstile.success) {
      recordCheckMetric("turnstile_reject", {
        surface: "deep",
        codes: formatTurnstileErrorCodes(turnstile.errorCodes),
      });
      throw new AppError("FORBIDDEN");
    }

    const rateLimit = await checkIpRateLimit(env.RATE_LIMIT_DO, ip);
    if (!rateLimit.allowed) throw new AppError("RATE_LIMITED");

    if (isDisposableEmail(email)) throw new AppError("VALIDATION_ERROR");

    // SSRF gate — first thing that touches the user-supplied URL.
    const normalizedUrl = await normalizeAndValidateStartUrl(url);
    const domain = new URL(normalizedUrl).hostname.toLowerCase();

    // This bounded, SSRF-safe preflight is intentionally before lead creation
    // and opt-in email. The workflow's later crawl repeats its own guard in
    // case a target changes between confirmation and execution.
    await assertDeepTargetIsPublic(normalizedUrl);

    const leadId = crypto.randomUUID();
    const reportId = crypto.randomUUID();
    const confirmToken = generateConfirmToken();
    const confirmTokenExpiresAt = new Date(
      Date.now() + CONFIRM_TOKEN_TTL_MS,
    ).toISOString();

    await createLeadWithReport(
      {
        id: leadId,
        email,
        emailNormalized: normalizeEmail(email),
        url: normalizedUrl,
        domain,
        locale: requestLocale,
        source: LEAD_SOURCE,
        confirmToken,
        confirmTokenExpiresAt,
      },
      {
        id: reportId,
        leadId,
        domain,
        url: normalizedUrl,
        locale: requestLocale,
        status: "confirming",
      },
    );

    await sendDeepCheckConfirmation(await getEmailSender(), {
      to: email,
      leadId,
      confirmUrl: buildConfirmUrl(request, confirmToken, requestLocale),
      targetUrl: normalizedUrl,
      locale: requestLocale,
    });

    // Funnel numerator for Lite→email: a confirmation was sent (consent not yet
    // given — that is `deep_confirm`).
    recordCheckMetric("deep_start", { domain });
    return jsonResponse({ status: "confirmation_sent" }, 202);
  } catch (error) {
    return errorResponse(error, request);
  }
}
