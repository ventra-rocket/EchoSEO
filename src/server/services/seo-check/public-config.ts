/**
 * Returns only configuration that is safe for the browser. The Turnstile site
 * key is public by design; its matching secret remains an encrypted Worker
 * secret and is used only by the verification endpoints.
 */
export function handleFreeSeoCheckPublicConfigRequest(
  request: Request,
  env: { TURNSTILE_SITE_KEY?: string },
): Response {
  if (request.method !== "GET") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "GET" },
    });
  }

  return Response.json({
    turnstileSiteKey: env.TURNSTILE_SITE_KEY?.trim() || null,
  });
}
