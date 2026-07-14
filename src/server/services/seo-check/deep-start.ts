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
import { verifyTurnstileToken } from "./turnstile";
import { checkIpRateLimit } from "./rate-limit-do";
import { createLeadWithReport } from "./leads-repository";
import { isDisposableEmail, normalizeEmail } from "./disposable-email";
import { getEmailSender } from "./email/sender";
import { sendDeepCheckConfirmation } from "./email/deep-check-confirmation";
import {
  clientIp,
  errorResponse,
  jsonResponse,
  readJsonBody,
} from "./http-response";

const CONFIRM_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const LEAD_SOURCE = "free-seo-check";
// VN localization of the tool surfaces is Phase 6; leads default to English.
const DEFAULT_LOCALE = "en";

/** 256-bit CSPRNG hex token for the single-use double opt-in link. */
function generateConfirmToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function buildConfirmUrl(request: Request, token: string): string {
  const url = new URL(
    FREE_SEO_CHECK_CONFIRM_ROUTE,
    new URL(request.url).origin,
  );
  url.searchParams.set("token", token);
  return url.toString();
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
    const body = startDeepCheckRequestSchema.safeParse(
      await readJsonBody(request),
    );
    if (!body.success) throw new AppError("VALIDATION_ERROR");
    const { url, email, turnstileToken } = body.data;

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

    if (isDisposableEmail(email)) throw new AppError("VALIDATION_ERROR");

    // SSRF gate — first thing that touches the user-supplied URL.
    const normalizedUrl = await normalizeAndValidateStartUrl(url);
    const domain = new URL(normalizedUrl).hostname.toLowerCase();

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
        locale: DEFAULT_LOCALE,
        source: LEAD_SOURCE,
        confirmToken,
        confirmTokenExpiresAt,
      },
      {
        id: reportId,
        leadId,
        domain,
        url: normalizedUrl,
        locale: DEFAULT_LOCALE,
        status: "confirming",
      },
    );

    await sendDeepCheckConfirmation(getEmailSender(), {
      to: email,
      confirmUrl: buildConfirmUrl(request, confirmToken),
      targetUrl: normalizedUrl,
    });

    return jsonResponse({ status: "confirmation_sent" }, 202);
  } catch (error) {
    return errorResponse(error, request);
  }
}
