import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { organization } from "./better-auth-schema";
import { projects } from "./app.schema";
import { auditTargets } from "./audit.schema";

// One row per privileged indexation action taken against a target (today: an
// IndexNow submission). The submission is synchronous — a single HTTP POST — so
// the status is terminal, not a queued lifecycle. `detail_json` holds only small
// provenance (host, endpoint, HTTP status, message); it never stores the full
// submitted URL list or any secret, and the IndexNow key is not an action field.
//
// Retention: a handful of small rows per target, no R2 artifact and no PII beyond
// the actor id, so there is no dedicated sweep — the project/target cascades purge
// it when either is deleted.
export const auditActions = sqliteTable(
  "audit_actions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // Denormalized for direct authorization queries, mirroring the other audit
    // tables. Always the owning project's organization.
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    targetId: text("target_id")
      .notNull()
      .references(() => auditTargets.id, { onDelete: "cascade" }),
    // The audit whose URLs were submitted. A plain pointer, not a foreign key: the
    // audit may be deleted (retention) while the action log should survive.
    auditId: text("audit_id"),
    actorUserId: text("actor_user_id").notNull(),
    type: text("type", { enum: ["indexnow_submit"] }).notNull(),
    provider: text("provider").notNull(),
    status: text("status", { enum: ["succeeded", "failed"] }).notNull(),
    submittedCount: integer("submitted_count").notNull().default(0),
    detailJson: text("detail_json"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("audit_actions_target_idx").on(table.targetId, table.createdAt),
    index("audit_actions_project_idx").on(table.projectId, table.createdAt),
  ],
);
