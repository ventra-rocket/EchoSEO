/**
 * Authorized download for an audit issue export.
 *
 * A raw API route (not a server function) so it can stream the artifact straight
 * from private R2. Every authorization or state failure — unauthenticated, a job
 * the caller's active organization does not own, expired, not ready, or a missing
 * object — answers a flat 404, so the endpoint never discloses a job's existence
 * and never exposes an R2 URL. An unexpected fault answers a generic 500.
 *
 * Authorization is by the caller's active-organization session: a job whose
 * organization differs is refused. Hosted membership revocation is enforced one
 * layer up, at session resolution — a removed member's session stops resolving the
 * organization on its next request (it re-checks live membership), so this route
 * then refuses the job as belonging to a different organization. The invite and
 * role-management surface that removes members is a separate slice.
 */
import { createFileRoute } from "@tanstack/react-router";
import { resolveUserContextFromHeaders } from "@/middleware/ensure-user/resolve";
import { responseForAppError } from "@/server/lib/http-errors";
import { AuditExportService } from "@/server/features/audit/services/AuditExportService";
import { getAuditExport } from "@/server/features/audit/exports/audit-export-store";
import {
  AUDIT_EXPORT_MEDIA,
  auditExportFilename,
} from "@/shared/audit-export-format";

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
        "Content-Type": AUDIT_EXPORT_MEDIA[resolved.format].contentType,
        "Content-Disposition": `attachment; filename="${auditExportFilename(
          resolved.auditId,
          resolved.format,
        )}"`,
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
