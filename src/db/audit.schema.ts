import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { organization } from "./better-auth-schema";
import { projects } from "./app.schema";

// ============================================================================
// Site Audit tables
// ============================================================================

// One row per audit run
export const audits = sqliteTable(
  "audits",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    startedByUserId: text("started_by_user_id").notNull(),
    startUrl: text("start_url").notNull(),
    status: text("status", {
      enum: ["running", "completed", "failed"],
    })
      .notNull()
      .default("running"),
    workflowInstanceId: text("workflow_instance_id"),
    // JSON config: { maxPages, lighthouseStrategy }
    config: text("config").notNull().default("{}"),
    // Progress & summary
    pagesCrawled: integer("pages_crawled").notNull().default(0),
    pagesTotal: integer("pages_total").notNull().default(0),
    lighthouseTotal: integer("lighthouse_total").notNull().default(0),
    lighthouseCompleted: integer("lighthouse_completed").notNull().default(0),
    lighthouseFailed: integer("lighthouse_failed").notNull().default(0),
    currentPhase: text("current_phase").default("discovery"),
    startedAt: text("started_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    completedAt: text("completed_at"),
  },
  (table) => [
    index("audits_project_id_idx").on(table.projectId),
    index("audits_started_by_user_id_idx").on(table.startedByUserId),
  ],
);

// One row per crawled page
export const auditPages = sqliteTable(
  "audit_pages",
  {
    id: text("id").primaryKey(),
    auditId: text("audit_id")
      .notNull()
      .references(() => audits.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    statusCode: integer("status_code"),
    redirectUrl: text("redirect_url"),
    // Metadata
    title: text("title"),
    metaDescription: text("meta_description"),
    canonicalUrl: text("canonical_url"),
    robotsMeta: text("robots_meta"),
    // Open Graph
    ogTitle: text("og_title"),
    ogDescription: text("og_description"),
    ogImage: text("og_image"),
    // Headings
    h1Count: integer("h1_count").notNull().default(0),
    h2Count: integer("h2_count").notNull().default(0),
    h3Count: integer("h3_count").notNull().default(0),
    h4Count: integer("h4_count").notNull().default(0),
    h5Count: integer("h5_count").notNull().default(0),
    h6Count: integer("h6_count").notNull().default(0),
    headingOrderJson: text("heading_order_json"),
    // Content
    wordCount: integer("word_count").notNull().default(0),
    // Images
    imagesTotal: integer("images_total").notNull().default(0),
    imagesMissingAlt: integer("images_missing_alt").notNull().default(0),
    imagesJson: text("images_json"),
    // Links
    internalLinkCount: integer("internal_link_count").notNull().default(0),
    externalLinkCount: integer("external_link_count").notNull().default(0),
    // Structured data
    hasStructuredData: integer("has_structured_data", { mode: "boolean" })
      .notNull()
      .default(false),
    // Hreflang
    hreflangTagsJson: text("hreflang_tags_json"),
    // Indexability
    isIndexable: integer("is_indexable", { mode: "boolean" })
      .notNull()
      .default(true),
    // Present in an XML sitemap — evidence for orphan detection. Matched on
    // crawl-boundary equivalence (see sitemap-membership.ts), so a path-level
    // redirect can still read false; the error is one-sided. Audits that predate
    // this column also read false, so date-gate historical comparisons.
    inSitemap: integer("in_sitemap", { mode: "boolean" })
      .notNull()
      .default(false),
    // Performance
    responseTimeMs: integer("response_time_ms"),
  },
  (table) => [index("audit_pages_audit_id_idx").on(table.auditId)],
);

// One row per Lighthouse test (mobile + desktop per page).
export const auditLighthouseResults = sqliteTable(
  "audit_lighthouse_results",
  {
    id: text("id").primaryKey(),
    auditId: text("audit_id")
      .notNull()
      .references(() => audits.id, { onDelete: "cascade" }),
    pageId: text("page_id")
      .notNull()
      .references(() => auditPages.id, { onDelete: "cascade" }),
    strategy: text("strategy", { enum: ["mobile", "desktop"] }).notNull(),
    performanceScore: integer("performance_score"),
    accessibilityScore: integer("accessibility_score"),
    bestPracticesScore: integer("best_practices_score"),
    seoScore: integer("seo_score"),
    lcpMs: real("lcp_ms"),
    cls: real("cls"),
    inpMs: real("inp_ms"),
    ttfbMs: real("ttfb_ms"),
    errorMessage: text("error_message"),
    r2Key: text("r2_key"),
    payloadSizeBytes: integer("payload_size_bytes"),
  },
  (table) => [index("audit_lighthouse_results_audit_id_idx").on(table.auditId)],
);

// Project/domain-bound professional audit target. Auto-created from the first
// validated audit start URL for a (project, origin). Holds the crawl scope,
// caps and retention that later phases enforce. Domain-ownership verification is
// derived at check time from the connected GSC property, so no verification
// column is persisted here.
export const auditTargets = sqliteTable(
  "audit_targets",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // Denormalized for direct authorization + retention queries, mirroring
    // gsc_connections. Always the owning project's organization.
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // Canonical origin, e.g. "https://example.com".
    origin: text("origin").notNull(),
    // Extra allowed subdomains beyond the origin host; empty = origin host only.
    allowedHostsJson: text("allowed_hosts_json").notNull().default("[]"),
    // Crawl cap for this target; audit launch clamps requested pages to it.
    maxPagesLimit: integer("max_pages_limit").notNull().default(10_000),
    // Completed-snapshot retention window (plan default: 90 days).
    retentionDays: integer("retention_days").notNull().default(90),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    uniqueIndex("audit_targets_project_origin_idx").on(
      table.projectId,
      table.origin,
    ),
    index("audit_targets_organization_idx").on(table.organizationId),
  ],
);

// One row per discovered same-scope internal link (source page -> target page),
// deduped per audit. This is the evidence later phases use to prove orphan and
// inlink findings with real source URLs.
//
// Consumption contract: `target_url` is the link as written (normalized), while
// `audit_pages.url` is the FINAL url after redirects. A link pointing at a
// redirecting URL therefore joins to no page row. Readers that count inlinks
// must resolve targets through the page redirect data or accept an undercount —
// do not present a raw unmatched target as a proven orphan.
export const auditLinkEdges = sqliteTable(
  "audit_link_edges",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    auditId: text("audit_id")
      .notNull()
      .references(() => audits.id, { onDelete: "cascade" }),
    sourceUrl: text("source_url").notNull(),
    targetUrl: text("target_url").notNull(),
  },
  (table) => [
    // Keeps the graph normalized and makes the finalize write retry-safe.
    uniqueIndex("audit_link_edges_unique_idx").on(
      table.auditId,
      table.sourceUrl,
      table.targetUrl,
    ),
    // Inlink lookups ("what links to this URL") drive orphan evidence.
    index("audit_link_edges_target_idx").on(table.auditId, table.targetUrl),
    index("audit_link_edges_source_idx").on(table.auditId, table.sourceUrl),
  ],
);

// Immutable completed-audit snapshot, sealed only at the finalize boundary. A
// running or failed audit never produces a row, so comparison baselines are
// always completed crawls.
export const auditSnapshots = sqliteTable(
  "audit_snapshots",
  {
    id: text("id").primaryKey(),
    auditId: text("audit_id")
      .notNull()
      .references(() => audits.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    targetId: text("target_id")
      .notNull()
      .references(() => auditTargets.id, { onDelete: "cascade" }),
    pagesCrawled: integer("pages_crawled").notNull(),
    edgeCount: integer("edge_count").notNull(),
    lighthouseCount: integer("lighthouse_count").notNull(),
    sealedAt: text("sealed_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    // One snapshot per audit; makes the seal write retry-safe.
    uniqueIndex("audit_snapshots_audit_idx").on(table.auditId),
    index("audit_snapshots_target_idx").on(table.targetId, table.sealedAt),
    index("audit_snapshots_project_idx").on(table.projectId, table.sealedAt),
  ],
);
