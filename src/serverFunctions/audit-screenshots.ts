/**
 * Read and capture evidence screenshots for an audit's affected URLs.
 *
 * Reading a capture's state carries only project membership; capturing is a
 * mutation gated on the investigate role inside the service. The image itself is
 * a separate authorized route (`/api/audit/screenshots/get?id=`) so it can
 * stream the bytes from private R2 rather than serialize them here.
 */
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { getAuthMode } from "@/lib/auth-mode";
import { AuditScreenshotService } from "@/server/features/audit/services/AuditScreenshotService";
import { requireProjectContext } from "@/serverFunctions/middleware";
import { auditScreenshotRequestSchema } from "@/types/schemas/audit";

export const getAuditScreenshot = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => auditScreenshotRequestSchema.parse(data))
  .handler(async ({ data, context }) => {
    return AuditScreenshotService.getEvidenceState({
      auditId: data.auditId,
      projectId: context.projectId,
      url: data.url,
    });
  });

export const captureAuditScreenshot = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => auditScreenshotRequestSchema.parse(data))
  .handler(async ({ data, context }) => {
    return AuditScreenshotService.captureEvidence({
      auditId: data.auditId,
      projectId: context.projectId,
      url: data.url,
      actorUserId: context.userId,
      organizationId: context.organizationId,
      authMode: getAuthMode(env.AUTH_MODE),
    });
  });
