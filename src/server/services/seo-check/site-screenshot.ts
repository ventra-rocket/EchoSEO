/**
 * Raw HTTP handlers serving the visual evidence for a URL — the trust signal
 * ("we really loaded your site") shown on both the anonymous Lite result and
 * the shared Deep report: a full-page capture per strategy (mobile/desktop)
 * plus a visual bundle — the loading filmstrip and the lab-only Lighthouse
 * scores/CWV — that rode along in the same PSI response.
 *
 * Wired directly into server.ts's fetch() under `/api/free-seo-check/*`, which
 * is already on the Cloudflare Access bypass, so it needs no new bypass
 * destination (that app is at its five-destination cap).
 *
 * The capture is the only part of the anonymous Lite tier that spends a PSI
 * call, so it carries its own guards: SSRF validation of the target, a per-IP
 * read limit, a global daily render ceiling protecting the shared PSI quota, a
 * kill-switch, and a 24h per-(domain, strategy) R2 cache so a repeat check
 * renders nothing. A stale cached capture is served in preference to failing
 * when a render is refused or errors.
 */
import { env } from "cloudflare:workers";
import { z } from "zod";
import { getRequiredEnvValue } from "@/server/lib/runtime-env";
import { normalizeAndValidateStartUrl } from "@/server/lib/audit/url-policy";
import {
  fetchPageSpeed,
  extractScreenshot,
  extractFilmstrip,
  shapePsiLabResult,
  type PsiFilmstripFrame,
  type PsiLabResult,
  type PsiStrategy,
} from "@/server/lib/psi/pagespeed";
import { AppError } from "@/server/lib/errors";
import { checkIpRateLimit } from "./rate-limit-do";
import {
  isScreenshotDisabled,
  getScreenshotDailyCeiling,
} from "./deep-check-config";
import {
  getSiteScreenshot,
  putSiteScreenshot,
  getSiteFilmstrip,
  putSiteFilmstrip,
} from "./site-screenshot-store";
import { recordCheckMetric } from "./metrics";
import { clientIp, errorResponse } from "./http-response";

/** A cached capture older than this is re-rendered; the edge caches it too. */
const CACHE_MAX_AGE_SECONDS = 24 * 60 * 60;
const CACHE_MAX_AGE_MS = CACHE_MAX_AGE_SECONDS * 1000;

/** A read costs a DoH-backed SSRF check, a DO round-trip, and an R2 get, but no
 * PSI call on a cache hit — cheap enough that this ceiling is generous and only
 * there to blunt scripted scraping. Shared by the capture and filmstrip reads.
 * One result view now issues 4–6 reads on this budget (2 captures warmed +
 * 2 bundle fetches, +retries), where it was 1 before the strategy tabs, so the
 * limit is sized to keep an agency checking ~10+ URLs — and users behind a
 * shared CGNAT IP — from self-throttling. Cost stays bounded by the global
 * render ceiling, not this. */
const READ_RATE_LIMIT = { limit: 300, windowMs: 10 * 60 * 1000 };

/** The window the global render ceiling is counted over. */
const RENDER_WINDOW_MS = 24 * 60 * 60 * 1000;

/** PSI usually answers within ~15s; cut it off so a hung call can't pin a
 * request open, and let the client retry. */
const PSI_TIMEOUT_MS = 28_000;

const strategySchema = z.enum(["mobile", "desktop"]);

/**
 * `?strategy=` is optional and defaults to desktop so `<img>` URLs minted
 * before the mobile tab existed keep resolving; junk is a 400 rather than a
 * silent desktop so a client bug cannot quietly mis-key the shared cache.
 */
function parseStrategy(requestUrl: URL): PsiStrategy {
  const raw = requestUrl.searchParams.get("strategy");
  if (raw === null) return "desktop";
  const parsed = strategySchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      "strategy must be mobile or desktop",
    );
  }
  return parsed.data;
}

function evidenceHeaders(contentType: string): HeadersInit {
  return {
    "Content-Type": contentType,
    // Public homepage evidence — the visitor's browser may hold it for a day so
    // a re-view never re-requests. (Worker responses are not CDN-cached from
    // this header alone; this is browser caching only.)
    "Cache-Control": `public, max-age=${CACHE_MAX_AGE_SECONDS}`,
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex",
  };
}

function imageResponse(contentType: string, body: BodyInit): Response {
  return new Response(body, { headers: evidenceHeaders(contentType) });
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
    const requestUrl = new URL(request.url);
    const rawUrl = requestUrl.searchParams.get("url") ?? "";
    const strategy = parseStrategy(requestUrl);
    // SSRF gate — the target is attacker-controlled just like the Lite check's.
    const normalizedUrl = await normalizeAndValidateStartUrl(rawUrl);
    const domain = new URL(normalizedUrl).hostname.toLowerCase();
    // Capture the ORIGIN ROOT, never the caller's path/query. The cache is keyed
    // by (domain, strategy), so a per-path capture would let the first
    // (unauthenticated) caller pin a domain's shared capture to any page on it
    // — e.g. a reflected `?q=…` — that every later visitor then sees labelled
    // "what we loaded". Rendering the homepage keeps the key and the image
    // consistent.
    const captureUrl = `${new URL(normalizedUrl).origin}/`;

    const rateLimit = await checkIpRateLimit(
      env.RATE_LIMIT_DO,
      `screenshot:${clientIp(request)}`,
      READ_RATE_LIMIT,
    );
    if (!rateLimit.allowed) throw new AppError("RATE_LIMITED");

    const cached = await getSiteScreenshot(domain, strategy);
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

    const rendered = await renderScreenshot(captureUrl, strategy);
    // One spent render slot yields ALL the artifacts. The visual bundle
    // (filmstrip + lab scores) is stored even when the capture is missing —
    // the quota was spent either way — and always best-effort: it must never
    // fail a response the capture alone would serve.
    if (rendered) {
      await storeVisualBundle(
        domain,
        strategy,
        rendered.filmstrip,
        rendered.lab,
      );
    }

    const shot = rendered?.screenshot ?? null;
    if (!shot) {
      // PSI omitted the capture or timed out. Stale is better than nothing.
      if (cached) return imageResponse(cachedType(cached), cached.body);
      throw new AppError("NOT_FOUND", "No capture available");
    }

    await putSiteScreenshot(domain, strategy, shot);
    return imageResponse(shot.contentType, shot.bytes);
  } catch (error) {
    return errorResponse(error, request);
  }
}

/**
 * READ-ONLY companion to the capture endpoint: serves the filmstrip bundle the
 * last render stored for (domain, strategy), or 404s. It NEVER calls PSI and
 * never touches the kill-switch or the render ceiling, whatever the cache
 * state: the client pre-warm fires concurrent GETs, and with no single-flight
 * in this module a render-capable filmstrip path would double-render every
 * strategy and double the plan's quota math. Only handleSiteScreenshotRequest
 * renders, and that one render stores both artifacts.
 */
export async function handleSiteFilmstripRequest(
  request: Request,
): Promise<Response> {
  if (request.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET" },
    });
  }

  try {
    const requestUrl = new URL(request.url);
    const rawUrl = requestUrl.searchParams.get("url") ?? "";
    const strategy = parseStrategy(requestUrl);
    // Same normalization as the write path so read keys always match written
    // keys, and junk input cannot probe arbitrary R2 key shapes.
    const normalizedUrl = await normalizeAndValidateStartUrl(rawUrl);
    const domain = new URL(normalizedUrl).hostname.toLowerCase();

    const rateLimit = await checkIpRateLimit(
      env.RATE_LIMIT_DO,
      `screenshot:${clientIp(request)}`,
      READ_RATE_LIMIT,
    );
    if (!rateLimit.allowed) throw new AppError("RATE_LIMITED");

    // Served regardless of age — a stale filmstrip beats an empty row, exactly
    // like the stale-capture rule above. Freshness is the render path's job.
    const bundle = await getSiteFilmstrip(domain, strategy);
    if (!bundle) {
      // Absence is the normal cold state (nothing has rendered this strategy
      // yet), not a server fault — 404, non-reported, and NO render fallback.
      throw new AppError("NOT_FOUND", "No filmstrip available");
    }

    return new Response(bundle.body, {
      headers: evidenceHeaders(
        bundle.httpMetadata?.contentType ?? "application/json",
      ),
    });
  } catch (error) {
    return errorResponse(error, request);
  }
}

function cachedType(object: R2ObjectBody): string {
  return object.httpMetadata?.contentType ?? "image/webp";
}

interface RenderedArtifacts {
  screenshot: ReturnType<typeof extractScreenshot>;
  filmstrip: PsiFilmstripFrame[] | null;
  lab: PsiLabResult | null;
}

async function renderScreenshot(
  url: string,
  strategy: PsiStrategy,
): Promise<RenderedArtifacts | null> {
  const apiKey = await getRequiredEnvValue("GOOGLE_PSI_API_KEY");
  try {
    recordCheckMetric("psi_call", { kind: "screenshot", strategy });
    const raw = await fetchPageSpeed(
      url,
      apiKey,
      strategy,
      AbortSignal.timeout(PSI_TIMEOUT_MS),
    );
    return {
      screenshot: extractScreenshot(raw),
      filmstrip: extractFilmstrip(raw),
      lab: shapeLab(raw, url, strategy),
    };
  } catch (error) {
    console.error(
      `site-screenshot: PSI render failed for ${url} (${strategy})`,
      error,
    );
    return null;
  }
}

/**
 * `shapePsiLabResult` throws on malformed input by design (Workflow
 * semantics), and the catch in `renderScreenshot` discards EVERYTHING — so
 * shaping gets its own catch here, where a failure costs only the lab fields,
 * never the capture. A shaped result with nothing in it reads as null so the
 * store guard treats it like any other absent artifact.
 */
function shapeLab(
  raw: unknown,
  url: string,
  strategy: PsiStrategy,
): PsiLabResult | null {
  try {
    const lab = shapePsiLabResult(raw);
    const hasData =
      lab.coreWebVitals !== null ||
      Object.values(lab.scores).some((score) => score !== null);
    return hasData ? lab : null;
  } catch (error) {
    console.error(
      `site-screenshot: PSI lab shaping failed for ${url} (${strategy})`,
      error,
    );
    return null;
  }
}

/** Best-effort: the bundle rides along on a render already spent for the
 * capture, so failing to extract or store it must never fail the response.
 * Either half alone is worth storing — a filmstrip-extract failure must not
 * swallow the scores, nor the reverse. */
async function storeVisualBundle(
  domain: string,
  strategy: PsiStrategy,
  frames: PsiFilmstripFrame[] | null,
  lab: PsiLabResult | null,
): Promise<void> {
  if (!frames && !lab) return;
  try {
    await putSiteFilmstrip(domain, strategy, frames, lab);
  } catch (error) {
    console.error(
      `site-screenshot: visual-bundle store failed for ${domain} (${strategy})`,
      error,
    );
  }
}
