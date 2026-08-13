import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { organization } from "./better-auth-schema";
import { projects } from "./app.schema";
import { auditTargets } from "./audit.schema";

// ============================================================================
// Periodic report tables (Phase 07: weekly report email + critical alerts)
// ============================================================================
//
// Timestamp contract for both tables, learned the hard way (see the note on
// `audit_referring_domain_snapshots.queried_at`): every column written by code
// carries a full ISO 8601 string (`new Date().toISOString()`), while column
// defaults render D1's `current_timestamp` format (`YYYY-MM-DD HH:MM:SS`). The
// two formats DO NOT compare as strings — `' '` sorts below `'T'`, so an ISO
// value always looks "newer" than a defaulted one regardless of real time. Only
// compare a column against values written the same way it was.

// One subscription per audit target: who gets the periodic report, in which
// language, and under whose authority the scheduled crawl runs.
//
// D1 is the source of truth here, not the scheduling Durable Object. The DO only
// holds the alarm; if it is ever reset, relocated or replayed, the subscription
// state and the send ledger survive, which is what keeps a lost DO from turning
// into a lost (or duplicated) email.
export const reportSubscriptions = sqliteTable(
  "report_subscriptions",
  {
    id: text("id").primaryKey(),
    targetId: text("target_id")
      .notNull()
      .references(() => auditTargets.id, { onDelete: "cascade" }),
    // Denormalized alongside the target so authorization and billing lookups do
    // not have to join back through audit_targets on every scheduled run.
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // Only weekly ships in this phase; the enum exists so adding "monthly" is a
    // migration rather than a semantic reinterpretation of existing rows.
    cadence: text("cadence", { enum: ["weekly"] })
      .notNull()
      .default("weekly"),
    recipientEmail: text("recipient_email").notNull(),
    locale: text("locale", { enum: ["en", "vi"] })
      .notNull()
      .default("en"),
    // Soft switch used by the settings UI. Kept separate from `unsubscribedAt`:
    // pausing from inside the app and opting out from an email footer are
    // different intents, and only the latter must survive a re-enable click.
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    // The scheduled crawl runs under this user's authority, not the system's.
    // In hosted mode audit authorization resolves the caller's role through the
    // `member` table, so a synthetic id such as "system" has no membership row,
    // degrades to viewer and gets rejected — the run must name a real member.
    ownerUserId: text("owner_user_id").notNull(),
    // Needed to build the BillingCustomerContext for the scheduled crawl; the
    // recipient may be a third party (an agency client), so it cannot stand in.
    ownerEmail: text("owner_email").notNull(),
    // Page cap for the scheduled crawl. Default stays at
    // AUDIT_VERIFICATION_PAGE_THRESHOLD (100), the largest unverified crawl
    // hosted mode allows: a scheduled run has no human present to complete
    // domain verification, so exceeding it would fail every week in silence.
    maxPages: integer("max_pages").notNull().default(100),
    // Capability token for one-click unsubscribe. Unique so the link resolves
    // without knowing the subscriber, and never rotated on update so links in
    // already-delivered mail keep working for as long as the subscription does.
    unsubscribeToken: text("unsubscribe_token").notNull(),
    // Last successful delivery (ISO). Informational — deduplication is decided
    // by report_sends, never by this column.
    lastSentAt: text("last_sent_at"),
    unsubscribedAt: text("unsubscribed_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    // One subscription per target, enforced by the database rather than by
    // convention: the upsert path relies on this conflict to converge instead of
    // creating a second subscription that would double every weekly email.
    uniqueIndex("report_subscriptions_target_idx").on(table.targetId),
    uniqueIndex("report_subscriptions_token_idx").on(table.unsubscribeToken),
    // The scheduler's own lookup: "which subscriptions of this cadence are live".
    index("report_subscriptions_enabled_idx").on(table.enabled, table.cadence),
  ],
);

// Ledger of report emails, and the deduplication key that guards them.
//
// A row is inserted to CLAIM a period before any crawling or sending happens,
// then marked sent, or deleted to hand the period back. Claim-first is the same
// trade made by the free-check sender: a crash between claim and send loses one
// email, whereas claiming afterwards would let two overlapping runs both crawl
// and both mail the same week.
export const reportSends = sqliteTable(
  "report_sends",
  {
    id: text("id").primaryKey(),
    subscriptionId: text("subscription_id")
      .notNull()
      .references(() => reportSubscriptions.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["weekly", "alert"] }).notNull(),
    // What this send is "about", derived from content and never from the clock
    // at send time: the ISO week for `weekly` (e.g. "2026-W33"), the audit id for
    // `alert`. A clock-derived key would change between an attempt and its retry,
    // so the retry would claim a fresh period and the subscriber would get a
    // second copy of the same report.
    periodKey: text("period_key").notNull(),
    // The crawl this send reports on. Null at claim time because the claim is
    // taken before the audit is launched; filled in once the id exists. A plain
    // pointer, not a foreign key: retention may delete the audit long before the
    // ledger row, and losing the ledger would un-dedupe the period.
    auditId: text("audit_id"),
    claimedAt: text("claimed_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    // Null while the claim is held; ISO once delivery actually succeeded. The
    // distinction matters: only a real delivery counts against the alert cap.
    sentAt: text("sent_at"),
  },
  (table) => [
    // The actual deduplication key. Every send path goes through an insert that
    // relies on this conflict, so "did we already handle this period?" is decided
    // atomically by the database instead of by a read-then-write race.
    uniqueIndex("report_sends_period_idx").on(
      table.subscriptionId,
      table.kind,
      table.periodKey,
    ),
    // Counting delivered alerts in a rolling window, for the
    // one-alert-per-day-per-target cap that keeps a thrashing site from
    // mailbombing its owner.
    index("report_sends_throttle_idx").on(
      table.subscriptionId,
      table.kind,
      table.sentAt,
    ),
  ],
);
