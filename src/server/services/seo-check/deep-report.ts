/**
 * Raw HTTP handler for reading a Free Deep SEO report — wired directly into
 * server.ts's fetch() (like the Lite and confirm endpoints) so it stays public
 * in every AUTH_MODE.
 *
 * The report id is a bearer capability: whoever holds the link sees the report.
 * That is the intended free-tier sharing model (P11 defines private review
 * access for authenticated audits), so the defences here are the id's own
 * 122-bit entropy plus a read rate limit — never a lookup of who "owns" it.
 */
import { env } from "cloudflare:workers";
import { AppError } from "@/server/lib/errors";
import { checkIpRateLimit } from "./rate-limit-do";
import { loadReportView } from "./report-view";
import { clientIp, errorResponse, jsonResponse } from "./http-response";

/**
 * The report page polls while a check runs, so reads need a budget of their own
 * rather than the Lite check's 10/hour: at a 5s interval capped at 2 minutes a
 * single visitor spends ~24 reads. This limit blunts scripted enumeration; the
 * unguessable id is what actually keeps reports private.
 */
const READ_RATE_LIMIT = { limit: 120, windowMs: 10 * 60 * 1000 };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function handleDeepReportRequest(
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
    // Reject junk before spending a DO round-trip or a D1 read: ids are always
    // crypto.randomUUID() (see deep-start.ts), so anything else cannot exist.
    if (!UUID_PATTERN.test(id)) throw new AppError("VALIDATION_ERROR");

    const rateLimit = await checkIpRateLimit(
      env.RATE_LIMIT_DO,
      `report:${clientIp(request)}`,
      READ_RATE_LIMIT,
    );
    if (!rateLimit.allowed) throw new AppError("RATE_LIMITED");

    const view = await loadReportView(id);
    if (!view) throw new AppError("NOT_FOUND");

    return jsonResponse(view);
  } catch (error) {
    return errorResponse(error, request);
  }
}
