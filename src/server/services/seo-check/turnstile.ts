/**
 * Server-side Cloudflare Turnstile verification for the anonymous Lite check.
 *
 * The route decides what to do with the result (e.g. throw FORBIDDEN) — this
 * module only talks to the siteverify endpoint.
 */

const SITEVERIFY_ENDPOINT =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface TurnstileVerifyResult {
  success: boolean;
  errorCodes: string[];
}

interface SiteverifyResponseBody {
  success?: boolean;
  "error-codes"?: string[];
}

export async function verifyTurnstileToken(
  token: string,
  secret: string,
  remoteIp?: string,
): Promise<TurnstileVerifyResult> {
  if (!token) {
    return { success: false, errorCodes: ["missing-input-response"] };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  const response = await fetch(SITEVERIFY_ENDPOINT, {
    method: "POST",
    body,
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) {
    return { success: false, errorCodes: ["siteverify-unavailable"] };
  }

  const result: SiteverifyResponseBody = await response.json();
  return {
    success: result.success === true,
    errorCodes: result["error-codes"] ?? [],
  };
}
