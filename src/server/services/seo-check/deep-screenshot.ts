/**
 * Raw HTTP handler serving a Deep report's page capture — the screenshot the
 * report page shows as evidence that we actually loaded the site.
 *
 * Served from `/api/free-seo-check/*`, which is already on the Cloudflare Access
 * bypass, so this needs no new bypass destination (that app is at its
 * five-destination cap).
 *
 * Same bearer-capability model as the report itself: holding the id is the
 * authorization. The image is therefore `private`-cached and noindexed, and the
 * canonical chain is followed so a deduped report shows the capture from the
 * check that actually ran.
 */
import { env } from "cloudflare:workers";
import { AppError } from "@/server/lib/errors";
import { checkIpRateLimit } from "./rate-limit-do";
import { findReportById } from "./seo-reports-repository";
import { resolveCanonicalRoot } from "./report-view";
import { getReportScreenshot } from "./report-store";
import { clientIp, errorResponse } from "./http-response";

/** One image per report view, so this sits well below the JSON read budget. */
const READ_RATE_LIMIT = { limit: 60, windowMs: 10 * 60 * 1000 };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function handleDeepScreenshotRequest(
  request: Request,
): Promise<Response> {
  if (request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET" },
    });
  }

  try {
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!UUID_PATTERN.test(id)) throw new AppError("VALIDATION_ERROR");

    const rateLimit = await checkIpRateLimit(
      env.RATE_LIMIT_DO,
      `screenshot:${clientIp(request)}`,
      READ_RATE_LIMIT,
    );
    if (!rateLimit.allowed) throw new AppError("RATE_LIMITED");

    const requested = await findReportById(id);
    if (!requested) throw new AppError("NOT_FOUND");

    // The capture is stored under the id of the check that ran, which for a
    // deduped row is its canonical root, not the id in the URL.
    const root = await resolveCanonicalRoot(requested);
    if (!root || root.status !== "done") throw new AppError("NOT_FOUND");

    const object = await getReportScreenshot(root.id);
    // A report may legitimately have no capture (PSI omitted it, or the store
    // failed and the check shipped anyway) — that is a 404 for this resource,
    // not an error for the report.
    if (!object) throw new AppError("NOT_FOUND");

    return new Response(object.body, {
      headers: {
        "Content-Type":
          object.httpMetadata?.contentType ?? "application/octet-stream",
        // Immutable: a capture is written once, for a report id that never
        // points anywhere else. `private` keeps a capability URL out of shared
        // caches.
        "Cache-Control": "private, max-age=86400, immutable",
        "X-Robots-Tag": "noindex",
        "Referrer-Policy": "no-referrer",
        // The stored type is allowlisted at capture (see extractScreenshot);
        // this stops a browser from ever second-guessing it anyway.
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error, request);
  }
}
