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

/**
 * Renders siteverify's error codes for a metric line.
 *
 * Callers only ever act on the boolean, so without this the seven reasons
 * siteverify can say no all reach the operator as one indistinguishable 403 —
 * a secret that belongs to the wrong widget looks exactly like a token the
 * visitor left sitting past its five-minute life. That ambiguity cost a real
 * production diagnosis.
 *
 * Sanitized because the metric encoder joins bare `k=v` with no escaping and
 * these strings arrive from an external API, not from us.
 */
export function formatTurnstileErrorCodes(codes: string[]): string {
  const safe = codes
    .slice(0, 5)
    .map((code) => code.replace(/[^a-z0-9-]/gi, ""))
    .filter(Boolean);
  return safe.length > 0 ? safe.join(",") : "none";
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
