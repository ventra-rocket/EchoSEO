/**
 * Raw HTTP handler for reading a shared Lite check snapshot (`/c/{id}`'s data
 * source) — wired directly into server.ts's fetch() like deep-report.ts so it
 * stays public in every AUTH_MODE.
 *
 * The check id is a bearer capability: whoever holds the link sees the frozen
 * report. Defences are the id's own 122-bit entropy plus a read rate limit —
 * same model as the Deep report, minus the D1 lookup (snapshots are R2-only).
 */
import { env } from "cloudflare:workers";
import { AppError } from "@/server/lib/errors";
import { localizeRuleText } from "@/server/lib/seo-rules";
import { checkIpRateLimit } from "./rate-limit-do";
import { isDeepCheckDisabled } from "./deep-check-config";
import { recordCheckMetric } from "./metrics";
import { getLiteCheckSnapshot, type LiteCheckSnapshot } from "./check-store";
import { clientIp, errorResponse, jsonResponse } from "./http-response";

/**
 * Its OWN budget, isolated from both the Lite check's 10/hour and the Deep
 * report's `report:{ip}` counter (a DO instance exists per key string). The
 * numbers mirror deep-report.ts: generous for humans re-opening a shared link,
 * blunt for scripted enumeration — the unguessable id does the real work.
 */
const READ_RATE_LIMIT = { limit: 120, windowMs: 10 * 60 * 1000 };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The schema pins `finalUrl` as a string, not a URL — a snapshot that
 * validates can still hold an unparseable value, and `new URL` throwing would
 * turn that one corrupt object into a 500. Null lets each caller degrade.
 */
function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export async function handleCheckReadRequest(
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
    // Reject junk before spending a DO round-trip or an R2 read: ids are always
    // crypto.randomUUID() (see api.ts), so anything else cannot exist.
    if (!UUID_PATTERN.test(id)) throw new AppError("VALIDATION_ERROR");

    const rateLimit = await checkIpRateLimit(
      env.RATE_LIMIT_DO,
      `check-read:${clientIp(request)}`,
      READ_RATE_LIMIT,
    );
    if (!rateLimit.allowed) throw new AppError("RATE_LIMITED");

    const snapshot = await getLiteCheckSnapshot(id);
    // Missing and corrupt are the same flat 404 — an unguessable id that
    // misses is indistinguishable from one that never existed.
    if (!snapshot) throw new AppError("NOT_FOUND");

    // Read per request, never frozen with the snapshot: the Deep kill-switch
    // can flip any time, and a stale value would either hide a working form or
    // offer one that refuses.
    const deepAvailable = !(await isDeepCheckDisabled());

    recordCheckMetric("share_view", {
      domain: hostnameOf(snapshot.report.finalUrl) ?? "unparseable",
    });

    // The snapshot is canonical EN; translate on the way out so the link shows
    // the language the check was made in. English is a no-op.
    return jsonResponse({
      report: {
        ...snapshot.report,
        signals: snapshot.report.signals.map((signal) =>
          localizeRuleText(signal, snapshot.locale),
        ),
      },
      locale: snapshot.locale,
      createdAt: snapshot.createdAt,
      deepAvailable,
    });
  } catch (error) {
    return errorResponse(error, request);
  }
}

/** One head tag the `/c/` wrapper injects — kept structural so tests can
 * assert content without parsing HTML. */
interface CheckPageMetaTag {
  attr: "property" | "name";
  key: string;
  content: string;
}

/**
 * The unfurl description, per snapshot locale. Lives server-side (not in
 * check-result-copy.ts) because the client never renders it — it exists only
 * inside the injected OG tags.
 */
const OG_DESCRIPTION: Record<LiteCheckSnapshot["locale"], string> = {
  en: "Free SEO check by EchoSEO — every fix cited to Google's own documentation.",
  vi: "Kiểm tra SEO với EchoSEO — mỗi cách sửa đều dẫn nguồn tài liệu chính thức của Google.",
};

/**
 * The same static 1200×630 brand card the landing unfurls with
 * (`public/og-free-seo-check.png`, source at docs/og-free-seo-check.source.html).
 * Deliberately NOT the live capture: that object is webp, full-page-tall, and
 * swept at 7 days while `/c/` lives 30 — as og:image it would unfurl badly or
 * die on day 8. The score lives in og:title instead.
 */
const OG_IMAGE_PATH = "/og-free-seo-check.png";

/**
 * Head tags for a `/c/{id}` share page, or null when the snapshot is missing or
 * corrupt (the page then renders its own error state and needs no card).
 *
 * `publicUrl` must come from the caller (server.ts imports it from
 * shared/free-seo-check.ts) rather than being imported here: this module is
 * server-only and the shared module reads `import.meta.env` — keeping the
 * dependency injected keeps this file trivially unit-testable.
 */
export async function buildCheckPageMetaTags(
  checkId: string,
  publicUrl: (pathname: string) => string,
): Promise<CheckPageMetaTag[] | null> {
  if (!UUID_PATTERN.test(checkId)) return null;

  const snapshot = await getLiteCheckSnapshot(checkId);
  if (!snapshot) return null;

  const domain = hostnameOf(snapshot.report.finalUrl);
  if (!domain) return null;

  const title = `SEO score ${snapshot.report.overallScore}/100 — ${domain}`;
  const description = OG_DESCRIPTION[snapshot.locale];
  const imageUrl = publicUrl(OG_IMAGE_PATH);

  return [
    { attr: "property", key: "og:type", content: "website" },
    { attr: "property", key: "og:site_name", content: "EchoSEO" },
    { attr: "property", key: "og:title", content: title },
    { attr: "property", key: "og:description", content: description },
    { attr: "property", key: "og:url", content: publicUrl(`/c/${checkId}`) },
    { attr: "property", key: "og:image", content: imageUrl },
    { attr: "property", key: "og:image:width", content: "1200" },
    { attr: "property", key: "og:image:height", content: "630" },
    { attr: "name", key: "twitter:card", content: "summary_large_image" },
    { attr: "name", key: "twitter:image", content: imageUrl },
    { attr: "name", key: "twitter:title", content: title },
    { attr: "name", key: "twitter:description", content: description },
  ];
}
