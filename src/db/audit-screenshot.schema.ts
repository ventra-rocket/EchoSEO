import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { organization } from "./better-auth-schema";
import { projects } from "./app.schema";
import { audits, auditPages } from "./audit.schema";

// One row per captured evidence screenshot, keyed by (audit, url). The image is
// a full-page render of a crawled page, fetched on demand from Google PageSpeed
// Insights and stored in private R2 — the row holds only its lifecycle and the
// R2 key, never a public URL. Reading a stored capture is project-membership
// scoped; capturing a new one is a mutation gated on the investigate role.
export const auditScreenshots = sqliteTable(
  "audit_screenshots",
  {
    id: text("id").primaryKey(),
    auditId: text("audit_id")
      .notNull()
      .references(() => audits.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // Denormalized so the serve endpoint can authorize by organization without a
    // join, mirroring audit_export_jobs.
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // The crawled page URL this capture depicts. Only ever a URL that exists in
    // audit_pages for this audit — the membership check at capture time is what
    // stops the endpoint being driven to render an arbitrary/external URL.
    url: text("url").notNull(),
    // Provenance link to the crawled page. Nulled if the page row is ever
    // removed independently; the capture is still identified by (auditId, url).
    pageId: text("page_id").references(() => auditPages.id, {
      onDelete: "set null",
    }),
    // A failed capture is recorded (not just dropped) so a page PSI cannot render
    // is not re-attempted on every click; a short cooldown in the service governs
    // when a failed row may be recaptured.
    status: text("status", { enum: ["ready", "failed"] }).notNull(),
    // Set on `ready`; null on `failed`. (A retention purge deletes the whole
    // row, so a surviving row's key is never nulled out from under it.)
    r2Key: text("r2_key"),
    // Allowlisted image/webp|jpeg|png (enforced by extractScreenshot); echoed as
    // the served Content-Type, so it must not carry an arbitrary value.
    contentType: text("content_type"),
    width: integer("width"),
    height: integer("height"),
    // ISO 8601 written by the service — the 30-day retention clock. Uses the
    // `T`-separated ISO format (NOT the space-format `current_timestamp`), so it
    // compares against an ISO cutoff like audit_export_jobs.expiresAt.
    capturedAt: text("captured_at").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    // Dedupe/upsert key: one capture per (audit, url).
    uniqueIndex("audit_screenshots_audit_url_idx").on(table.auditId, table.url),
    index("audit_screenshots_audit_idx").on(table.auditId),
    // Retention scans by capture age.
    index("audit_screenshots_captured_idx").on(table.capturedAt),
  ],
);
