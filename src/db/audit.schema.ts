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
    // An HTTPS page referencing an HTTP sub-resource. Captured during the crawl
    // so the shared rule catalog can evaluate it from stored facts. Rows crawled
    // before this column existed read false; re-materialize to trust it.
    hasMixedContent: integer("has_mixed_content", { mode: "boolean" })
      .notNull()
      .default(false),
    // The response really was an HTML document. Non-HTML resources (PDF, image)
    // and failed fetches are stored with empty placeholder fields, and judging
    // those placeholders as content would invent findings — so document-level
    // rules only run when this is true. Pre-existing rows default to true.
    isHtml: integer("is_html", { mode: "boolean" }).notNull().default(true),
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

// One row per rule that did not pass, per affected URL, materialized from a
// sealed snapshot. Only warn/fail are stored: a passing check is not an issue,
// and storing passes would add ~12 rows per crawled page with no reader.
//
// `ruleVersion` is the rule's lastReviewedDate at materialization time, so an
// occurrence always states which revision of the knowledge base judged it.
export const auditIssueOccurrences = sqliteTable(
  "audit_issue_occurrences",
  {
    id: text("id").primaryKey(),
    auditId: text("audit_id")
      .notNull()
      .references(() => audits.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // Null for site-level issues that belong to no single crawled page.
    pageId: text("page_id").references(() => auditPages.id, {
      onDelete: "cascade",
    }),
    ruleId: text("rule_id").notNull(),
    ruleVersion: text("rule_version").notNull(),
    issueGroup: text("issue_group").notNull(),
    severity: text("severity").notNull(),
    status: text("status", { enum: ["warn", "fail"] }).notNull(),
    // Denormalized so the issue list can filter and page without joining.
    url: text("url").notNull(),
    evidenceJson: text("evidence_json"),
    firstSeenAt: text("first_seen_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    lastSeenAt: text("last_seen_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    // Makes re-materializing a snapshot a no-op rather than a duplicate set.
    uniqueIndex("audit_issue_occurrences_unique_idx").on(
      table.auditId,
      table.ruleId,
      table.url,
    ),
    index("audit_issue_occurrences_group_idx").on(
      table.auditId,
      table.issueGroup,
      table.severity,
    ),
    index("audit_issue_occurrences_rule_idx").on(table.auditId, table.ruleId),
  ],
);

// Per-rule counts for one audit, so the All Issues summary costs one small read
// instead of aggregating every occurrence row on each page load.
export const auditIssueRollups = sqliteTable(
  "audit_issue_rollups",
  {
    id: text("id").primaryKey(),
    auditId: text("audit_id")
      .notNull()
      .references(() => audits.id, { onDelete: "cascade" }),
    ruleId: text("rule_id").notNull(),
    issueGroup: text("issue_group").notNull(),
    severity: text("severity").notNull(),
    urlCount: integer("url_count").notNull(),
  },
  (table) => [
    uniqueIndex("audit_issue_rollups_unique_idx").on(
      table.auditId,
      table.ruleId,
    ),
    index("audit_issue_rollups_group_idx").on(table.auditId, table.issueGroup),
  ],
);

// One aggregate off-page reading per explicit, credit-spending refresh of a
// target. Bound to the target (not a single crawl) so referring-domain figures
// accrue as a time series independent of when audits run. Stores only the
// aggregate counts plus provenance (provider, queried target/coverage, when) —
// never the raw provider payload or any per-domain list.
//
// Retention: this table is deliberately NOT swept. The daily audit retention
// sweep now enforces `audit_targets.retentionDays` on completed crawls (and ages
// out export artifacts), but these off-page readings are a target-bound time
// series — a handful of integers, no raw payload, no PII — kept for trend across
// crawls, so they are intentionally left untouched by that sweep.
export const auditReferringDomainSnapshots = sqliteTable(
  "audit_referring_domain_snapshots",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    targetId: text("target_id")
      .notNull()
      .references(() => auditTargets.id, { onDelete: "cascade" }),
    // Provenance: which data provider produced these numbers.
    provider: text("provider").notNull(),
    // The normalized provider target actually queried, e.g. "example.com".
    target: text("target").notNull(),
    // What the count covers, e.g. "domain+subdomains" (backlinks queries with
    // include_subdomains). Disclosed so a number is never read out of context.
    coverage: text("coverage").notNull(),
    // Current total referring domains at query time.
    referringDomains: integer("referring_domains").notNull(),
    // New / lost referring domains over the provider's own tracking period.
    // Nullable: a provider response may omit them.
    newReferringDomains: integer("new_referring_domains"),
    lostReferringDomains: integer("lost_referring_domains"),
    // When the provider was queried — the provenance date shown with the figure.
    // No column default on purpose: the writer supplies a full ISO timestamp so
    // every row shares one lexicographically-sortable format. A `current_timestamp`
    // default would render `YYYY-MM-DD HH:MM:SS`, which sorts inconsistently
    // against ISO `T` values, so an omitted write must fail loudly, not default.
    queriedAt: text("queried_at").notNull(),
    // Who spent the credit for this refresh.
    triggeredByUserId: text("triggered_by_user_id").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    // Latest reading + the previous one (for the snapshot-over-snapshot trend).
    index("audit_referring_domain_snapshots_target_idx").on(
      table.targetId,
      table.queriedAt,
    ),
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
    // Set once issues have been materialized for this snapshot. Null means "not
    // materialized", which readers must present differently from "no issues
    // found" — otherwise a broken materializer looks like a clean site.
    issuesMaterializedAt: text("issues_materialized_at"),
  },
  (table) => [
    // One snapshot per audit; makes the seal write retry-safe.
    uniqueIndex("audit_snapshots_audit_idx").on(table.auditId),
    index("audit_snapshots_target_idx").on(table.targetId, table.sealedAt),
    index("audit_snapshots_project_idx").on(table.projectId, table.sealedAt),
  ],
);
