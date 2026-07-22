/**
 * Authorized serve for an audit evidence screenshot.
 *
 * A raw API route (not a server function) so it can stream the image straight
 * from private R2. Every authorization or state failure — unauthenticated, a
 * capture the caller's active organization does not own, not ready, or a missing
 * object — answers a flat 404, so the endpoint never discloses a capture's
 * existence and never exposes an R2 URL. An unexpected fault answers a generic
 * 500.
 *
 * The route path is `screenshot` (singular) rather than `screenshots`: the repo
 * gitignore has an unanchored `screenshots/` rule for local asset folders that
 * would otherwise stop this source file being committed.
 *
 * Authorization is by the caller's active-organization session. Hosted membership
 * revocation is enforced one layer up, at session resolution — a removed member's
 * session stops resolving the organization on its next request (it re-checks live
 * membership), so `resolveView` then refuses the capture as belonging to a
 * different organization. The invite and role-management surface that removes
 * members is a separate slice.
 */
import { createFileRoute } from "@tanstack/react-router";
import { resolveUserContextFromHeaders } from "@/middleware/ensure-user/resolve";
import { responseForAppError } from "@/server/lib/http-errors";
import { AuditScreenshotService } from "@/server/features/audit/services/AuditScreenshotService";
import { getAuditScreenshotObject } from "@/server/features/audit/evidence/audit-screenshot-store";

function notFound(): Response {
  return new Response("Not found", { status: 404 });
}

async function handleGet(request: Request): Promise<Response> {
  const screenshotId = new URL(request.url).searchParams.get("id");
  if (!screenshotId) return notFound();

  let organizationId: string;
  try {
    const context = await resolveUserContextFromHeaders(request.headers);
    organizationId = context.organizationId;
  } catch {
    // No resolvable session → treat as not found rather than leaking a 401.
    return notFound();
  }

  try {
    const resolved = await AuditScreenshotService.resolveView({
      organizationId,
      screenshotId,
    });
    if (!resolved) return notFound();

    const object = await getAuditScreenshotObject(resolved.r2Key);
    if (!object) return notFound();

    return new Response(object.body, {
      headers: {
        // The stored type is allowlisted at capture (webp/jpeg/png), so echoing
        // it back cannot turn this into a script sink.
        "Content-Type": resolved.contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    // A D1/R2 fault is a genuine server error, not a "not found" — surface a
    // generic 500 rather than crashing the handler into a framework stack trace.
    return responseForAppError(error, "Could not load the screenshot");
  }
}

export const Route = createFileRoute("/api/audit/screenshot/get")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => handleGet(request),
    },
  },
});
