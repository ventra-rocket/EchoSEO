import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { organization } from "./better-auth-schema";
import { projects } from "./app.schema";
import { audits } from "./audit.schema";

// One row per requested issue export. The heavy artifact (a ZIP of the issue
// CSV/JSON plus a provenance manifest) lives in private R2; this row holds only
// the lifecycle state, the applied filters, and the R2 key — never a public URL.
// A Workflow fills it in asynchronously, so the status moves
// queued → processing → ready | failed, and later → expired once the retention
// sweep (a separate slice) purges the R2 object.
export const auditExportJobs = sqliteTable(
  "audit_export_jobs",
  {
    id: text("id").primaryKey(),
    auditId: text("audit_id")
      .notNull()
      .references(() => audits.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // Denormalized so the download endpoint can authorize by organization
    // without a join, mirroring the other audit tables.
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["queued", "processing", "ready", "failed", "expired"],
    })
      .notNull()
      .default("queued"),
    // The issue filters applied when the export was requested, as JSON, so the
    // manifest can state exactly what the artifact covers.
    filtersJson: text("filters_json").notNull().default("{}"),
    workflowInstanceId: text("workflow_instance_id"),
    // Set once the artifact is written; null while queued/processing/failed and
    // after the object is purged.
    r2Key: text("r2_key"),
    rowCount: integer("row_count"),
    sizeBytes: integer("size_bytes"),
    errorMessage: text("error_message"),
    createdByUserId: text("created_by_user_id").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    // ISO timestamps written by the service (single sortable format): readyAt is
    // when the artifact landed, expiresAt = readyAt + retention window. The
    // download endpoint refuses a job past expiresAt even before a sweep runs.
    readyAt: text("ready_at"),
    expiresAt: text("expires_at"),
  },
  (table) => [
    index("audit_export_jobs_project_idx").on(table.projectId, table.createdAt),
    index("audit_export_jobs_audit_idx").on(table.auditId),
    index("audit_export_jobs_status_idx").on(table.status),
    index("audit_export_jobs_expires_idx").on(table.expiresAt),
  ],
);
