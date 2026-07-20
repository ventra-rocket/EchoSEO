/**
 * Raw HTTP handler serving a desktop page capture for a URL — the trust signal
 * ("we really loaded your site") shown on both the anonymous Lite result and
 * the shared Deep report.
 *
 * Wired directly into server.ts's fetch() under `/api/free-seo-check/*`, which
 * is already on the Cloudflare Access bypass, so it needs no new bypass
 * destination (that app is at its five-destination cap).
 *
 * The capture is the only part of the anonymous Lite tier that spends a PSI
 * call, so it carries its own guards: SSRF validation of the target, a per-IP
 * read limit, a global daily render ceiling protecting the shared PSI quota, a
 * kill-switch, and a 24h per-domain R2 cache so a repeat check renders nothing.
 * A stale cached capture is served in preference to failing when a render is
 * refused or errors.
 */
import { env } from "cloudflare:workers";
import { getRequiredEnvValue } from "@/server/lib/runtime-env";
import { normalizeAndValidateStartUrl } from "@/server/lib/audit/url-policy";
import { fetchPageSpeed, extractScreenshot } from "@/server/lib/psi/pagespeed";
import { AppError } from "@/server/lib/errors";
import { checkIpRateLimit } from "./rate-limit-do";
import {
  isScreenshotDisabled,
  getScreenshotDailyCeiling,
} from "./deep-check-config";
import { getSiteScreenshot, putSiteScreenshot } from "./site-screenshot-store";
import { recordCheckMetric } from "./metrics";
import { clientIp, errorResponse } from "./http-response";

/** A cached capture older than this is re-rendered; the edge caches it too. */
const CACHE_MAX_AGE_SECONDS = 24 * 60 * 60;
const CACHE_MAX_AGE_MS = CACHE_MAX_AGE_SECONDS * 1000;

/** A read costs a DoH-backed SSRF check, a DO round-trip, and an R2 get, but no
 * PSI call on a cache hit — cheap enough that this ceiling is generous and only
 * there to blunt scripted scraping. */
const READ_RATE_LIMIT = { limit: 60, windowMs: 10 * 60 * 1000 };

/** The window the global render ceiling is counted over. */
const RENDER_WINDOW_MS = 24 * 60 * 60 * 1000;

/** PSI usually answers within ~15s; cut it off so a hung call can't pin a
 * request open, and let the client retry. */
const PSI_TIMEOUT_MS = 28_000;

function imageResponse(contentType: string, body: BodyInit): Response {
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      // A public homepage thumbnail — the visitor's browser may hold it for a
      // day so a re-view never re-requests. (Worker responses are not CDN-cached
      // from this header alone; this is browser caching only.)
      "Cache-Control": `public, max-age=${CACHE_MAX_AGE_SECONDS}`,
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}

function isFresh(object: R2ObjectBody): boolean {
  return Date.now() - object.uploaded.getTime() < CACHE_MAX_AGE_MS;
}

export async function handleSiteScreenshotRequest(
  request: Request,
): Promise<Response> {
  if (request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET" },
    });
  }

  try {
    const rawUrl = new URL(request.url).searchParams.get("url") ?? "";
    // SSRF gate — the target is attacker-controlled just like the Lite check's.
    const normalizedUrl = await normalizeAndValidateStartUrl(rawUrl);
    const domain = new URL(normalizedUrl).hostname.toLowerCase();
    // Capture the ORIGIN ROOT, never the caller's path/query. The cache is keyed
    // by domain, so a per-path capture would let the first (unauthenticated)
    // caller pin a domain's shared capture to any page on it — e.g. a reflected
    // `?q=…` — that every later visitor then sees labelled "what we loaded".
    // Rendering the homepage keeps the key and the image consistent.
    const captureUrl = `${new URL(normalizedUrl).origin}/`;

    const rateLimit = await checkIpRateLimit(
      env.RATE_LIMIT_DO,
      `screenshot:${clientIp(request)}`,
      READ_RATE_LIMIT,
    );
    if (!rateLimit.allowed) throw new AppError("RATE_LIMITED");

    const cached = await getSiteScreenshot(domain);
    if (cached && isFresh(cached)) {
      return imageResponse(
        cached.httpMetadata?.contentType ?? "image/webp",
        cached.body,
      );
    }

    // A render is needed. The kill-switch and the daily ceiling both prefer a
    // stale capture over nothing — a slightly old homepage thumbnail still does
    // the job, and refusing the spend is about cost, not correctness.
    if (await isScreenshotDisabled()) {
      if (cached) return imageResponse(cachedType(cached), cached.body);
      // A missing thumbnail is not a server fault — 404, not a reported error.
      throw new AppError("NOT_FOUND", "Screenshots are paused");
    }

    const renderAllowance = await checkIpRateLimit(
      env.RATE_LIMIT_DO,
      "screenshot-render-global",
      { limit: await getScreenshotDailyCeiling(), windowMs: RENDER_WINDOW_MS },
    );
    if (!renderAllowance.allowed) {
      if (cached) return imageResponse(cachedType(cached), cached.body);
      throw new AppError("RATE_LIMITED", "Daily capture limit reached");
    }

    const shot = await renderScreenshot(captureUrl);
    if (!shot) {
      // PSI omitted the capture or timed out. Stale is better than nothing.
      if (cached) return imageResponse(cachedType(cached), cached.body);
      throw new AppError("NOT_FOUND", "No capture available");
    }

    await putSiteScreenshot(domain, shot);
    return imageResponse(shot.contentType, shot.bytes);
  } catch (error) {
    return errorResponse(error, request);
  }
}

function cachedType(object: R2ObjectBody): string {
  return object.httpMetadata?.contentType ?? "image/webp";
}

async function renderScreenshot(url: string) {
  const apiKey = await getRequiredEnvValue("GOOGLE_PSI_API_KEY");
  try {
    recordCheckMetric("psi_call", { kind: "screenshot" });
    const raw = await fetchPageSpeed(
      url,
      apiKey,
      // Desktop, not mobile: the wide 1350px capture reads as a real site, where
      // the mobile 412px one looks like a phone screenshot cropped to a strip.
      "desktop",
      AbortSignal.timeout(PSI_TIMEOUT_MS),
    );
    return extractScreenshot(raw);
  } catch (error) {
    console.error(`site-screenshot: PSI render failed for ${url}`, error);
    return null;
  }
}
