/**
 * Data access for audit evidence screenshots.
 *
 * The unique (audit_id, url) index makes `upsert` the natural write: a
 * re-capture overwrites the same row (and, via its stable id, the same R2 key)
 * rather than accumulating duplicates. `findHtmlPageByUrl` is the membership
 * gate the service depends on — a capture target must be a real crawled HTML
 * page of the audit.
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditPages } from "@/db/audit.schema";
import { auditScreenshots } from "@/db/audit-screenshot.schema";

type AuditScreenshotRow = typeof auditScreenshots.$inferSelect;

interface UpsertInput {
  id: string;
  auditId: string;
  projectId: string;
  organizationId: string;
  url: string;
  pageId: string | null;
  status: "ready" | "failed";
  r2Key: string | null;
  contentType: string | null;
  width: number | null;
  height: number | null;
  capturedAt: string;
}

/** The stored capture for a (audit, url), or null if none has been taken. */
async function findByAuditUrl(
  auditId: string,
  url: string,
): Promise<AuditScreenshotRow | null> {
  const row = await db.query.auditScreenshots.findFirst({
    where: and(
      eq(auditScreenshots.auditId, auditId),
      eq(auditScreenshots.url, url),
    ),
  });
  return row ?? null;
}

/** A capture by id — for the authorized serve endpoint's org-scope check. */
async function findById(id: string): Promise<AuditScreenshotRow | null> {
  const row = await db.query.auditScreenshots.findFirst({
    where: eq(auditScreenshots.id, id),
  });
  return row ?? null;
}

/**
 * The crawled HTML page for a (audit, url), or null. This is the capture
 * membership gate: only a URL the audit actually crawled as an HTML document is
 * eligible, which is what stops the endpoint rendering an arbitrary or external
 * URL. Non-HTML resources (PDF/image/failed fetch) are excluded.
 */
async function findHtmlPageByUrl(
  auditId: string,
  url: string,
): Promise<{ id: string } | null> {
  const row = await db.query.auditPages.findFirst({
    columns: { id: true },
    where: and(
      eq(auditPages.auditId, auditId),
      eq(auditPages.url, url),
      eq(auditPages.isHtml, true),
    ),
  });
  return row ?? null;
}

/** Insert or overwrite the capture for a (audit, url). */
async function upsert(input: UpsertInput): Promise<void> {
  await db
    .insert(auditScreenshots)
    .values(input)
    .onConflictDoUpdate({
      target: [auditScreenshots.auditId, auditScreenshots.url],
      set: {
        // id/pageId keep the existing row's identity on overwrite; refresh the
        // capture payload and clock.
        status: input.status,
        r2Key: input.r2Key,
        contentType: input.contentType,
        width: input.width,
        height: input.height,
        capturedAt: input.capturedAt,
      },
    });
}

export const AuditScreenshotRepository = {
  findByAuditUrl,
  findById,
  findHtmlPageByUrl,
  upsert,
} as const;
