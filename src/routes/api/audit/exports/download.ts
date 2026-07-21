/**
 * Authorized download for an audit issue export.
 *
 * A raw API route (not a server function) so it can stream the ZIP straight from
 * private R2. Every authorization or state failure — unauthenticated, a job the
 * caller's active organization does not own, expired, not ready, or a missing
 * object — answers a flat 404, so the endpoint never discloses a job's existence
 * and never exposes an R2 URL. An unexpected fault answers a generic 500.
 *
 * Authorization is by the caller's active-organization session: a job whose
 * organization differs is refused. Note this shares the platform's session seam
 * — in hosted mode a removed member's still-live session keeps resolving its old
 * organization until the session ends, so per-member revocation is a
 * session-layer concern to be handled with the workspace-invite slice, not an
 * immediate effect of this route.
 */
import { createFileRoute } from "@tanstack/react-router";
import { resolveUserContextFromHeaders } from "@/middleware/ensure-user/resolve";
import { responseForAppError } from "@/server/lib/http-errors";
import { AuditExportService } from "@/server/features/audit/services/AuditExportService";
import { getAuditExport } from "@/server/features/audit/exports/audit-export-store";

function notFound(): Response {
  return new Response("Not found", { status: 404 });
}

async function handleDownload(request: Request): Promise<Response> {
  const jobId = new URL(request.url).searchParams.get("jobId");
  if (!jobId) return notFound();

  let organizationId: string;
  try {
    const context = await resolveUserContextFromHeaders(request.headers);
    organizationId = context.organizationId;
  } catch {
    // No resolvable session → treat as not found rather than leaking a 401.
    return notFound();
  }

  try {
    const resolved = await AuditExportService.resolveDownload({
      organizationId,
      jobId,
    });
    if (!resolved) return notFound();

    const object = await getAuditExport(resolved.r2Key);
    if (!object) return notFound();

    return new Response(object.body, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="audit-${resolved.auditId}-issues.zip"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    // A D1/R2 fault is a genuine server error, not a "not found" — surface a
    // generic 500 rather than crashing the handler into a framework stack trace.
    return responseForAppError(error, "Could not download the export");
  }
}

export const Route = createFileRoute("/api/audit/exports/download")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => handleDownload(request),
    },
  },
});
