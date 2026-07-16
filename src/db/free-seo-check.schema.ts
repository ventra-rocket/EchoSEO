import { sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Anonymous Free Deep SEO Checker lead capture.
 *
 * `leads` records a visitor's confirmed opt-in (double opt-in): the row is
 * created unconfirmed with a single-use `confirmToken`; `consentConfirmedAt` is
 * set only after the recipient clicks the confirmation link. This establishes a
 * GDPR lawful basis and blocks joe-job spam to attacker-supplied addresses.
 *
 * `seo_reports` is the Deep check snapshot. Slice 1 only drives the status
 * machine up to `queued`; the PSI/crawl/Workflow that fills `r2Key` and moves it
 * to `done|failed` lands in Slice 2.
 */

export const DEEP_REPORT_STATUSES = [
  "confirming",
  "queued",
  "running",
  "done",
  "failed",
  "expired",
] as const;

export type DeepReportStatus = (typeof DEEP_REPORT_STATUSES)[number];

export const leads = sqliteTable(
  "leads",
  {
    id: text("id").primaryKey(),
    // Verbatim address the visitor entered (for display/delivery).
    email: text("email").notNull(),
    // Lowercased/trimmed form used for per-email quotas + dedupe.
    emailNormalized: text("email_normalized").notNull(),
    url: text("url").notNull(),
    domain: text("domain").notNull(),
    locale: text("locale").notNull(),
    // Where the lead came from (e.g. "free-seo-check").
    source: text("source").notNull(),
    // Single-use CSPRNG token for the double opt-in confirmation link.
    confirmToken: text("confirm_token").notNull(),
    confirmTokenExpiresAt: text("confirm_token_expires_at").notNull(),
    // Null until the recipient confirms; the timestamp is the consent record.
    consentConfirmedAt: text("consent_confirmed_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    uniqueIndex("leads_confirm_token_idx").on(table.confirmToken),
    index("leads_email_normalized_idx").on(table.emailNormalized),
    index("leads_domain_idx").on(table.domain),
  ],
);

export const seoReports = sqliteTable(
  "seo_reports",
  {
    id: text("id").primaryKey(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    url: text("url").notNull(),
    locale: text("locale").notNull(),
    status: text("status", { enum: DEEP_REPORT_STATUSES }).notNull(),
    // Set when this report deduped onto a canonical same-domain audit from the
    // same day: it serves the canonical's result instead of running its own.
    canonicalReportId: text("canonical_report_id"),
    // R2 object key of the persisted DeepReport payload (Slice 2).
    r2Key: text("r2_key"),
    // User-facing failure reason when status = failed.
    error: text("error"),
    // Terminal-state timestamp (done|failed|expired) — drives retention later.
    finishedAt: text("finished_at"),
    // Set when the "check finished" email was handed to the provider. Claimed by
    // a compare-and-swap, so the Workflow and the sweep can both try to send and
    // exactly one wins — whichever gets here first.
    emailSentAt: text("email_sent_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("seo_reports_lead_idx").on(table.leadId),
    index("seo_reports_domain_status_idx").on(table.domain, table.status),
    index("seo_reports_canonical_idx").on(table.canonicalReportId),
  ],
);

/**
 * Atomic `(domain, day)` dedupe reservation for the Deep check.
 *
 * The first confirm to insert `{domain}:{utc-date}` wins and runs the audit;
 * concurrent same-domain confirms lose the PK conflict and attach their report
 * to the winner (`seo_reports.canonical_report_id`) instead of running a second
 * PSI + crawl. A blocked or failed-to-enqueue winner releases its row so a later
 * confirm can become canonical.
 */
export const deepCheckDedupe = sqliteTable("deep_check_dedupe", {
  // "{domain}:{YYYY-MM-DD}" in UTC.
  domainDay: text("domain_day").primaryKey(),
  reportId: text("report_id")
    .notNull()
    .references(() => seoReports.id, { onDelete: "cascade" }),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});
