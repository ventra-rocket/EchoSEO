import { z } from "zod";

// ─── Server function input schemas ──────────────────────────────────────────

export const startAuditSchema = z.object({
  projectId: z.string().min(1),
  startUrl: z.string().min(1, "URL is required").max(2048),
  maxPages: z.number().int().min(10).max(10_000).optional().default(50),
  lighthouseStrategy: z
    .enum(["auto", "all", "manual", "none"])
    .optional()
    .default("auto"),
});

export const getAuditStatusSchema = z.object({
  projectId: z.string().min(1),
  auditId: z.string().min(1),
});

export const getAuditResultsSchema = z.object({
  projectId: z.string().min(1),
  auditId: z.string().min(1),
});

export const getAuditHistorySchema = z.object({
  projectId: z.string().min(1),
});

export const getAuditAccessSchema = z.object({
  projectId: z.string().min(1),
});

export const deleteAuditSchema = z.object({
  projectId: z.string().min(1),
  auditId: z.string().min(1),
});

export const getCrawlProgressSchema = z.object({
  projectId: z.string().min(1),
  auditId: z.string().min(1),
});

/**
 * Locale for rule remediation text. Rule copy is resolved server-side (the rule
 * catalog never ships to the client), so the viewer's locale travels with the
 * request. `en` is the catalog's own language and re-renders byte-identically.
 */
const ruleLocaleSchema = z.enum(["en", "vi"]).optional().default("en");

/**
 * Issue filters stay plain strings rather than mirroring the server's group and
 * severity enums here: this module is imported by the client route, so pulling
 * the server rule catalog in would drag server-only code into the browser
 * bundle. The values reach SQL only as bound equality filters, so an unknown
 * one returns no rows instead of matching something unintended.
 */
export const getAuditIssueSummarySchema = z.object({
  projectId: z.string().min(1),
  auditId: z.string().min(1),
  locale: ruleLocaleSchema,
});

// No locale: occurrence rows are URLs and evidence, never rule prose.
export const listAuditIssuesSchema = z.object({
  projectId: z.string().min(1),
  auditId: z.string().min(1),
  issueGroup: z.string().min(1).max(64).optional(),
  severity: z.string().min(1).max(64).optional(),
  ruleId: z.string().min(1).max(128).optional(),
  urlContains: z.string().min(1).max(2048).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional(),
});

export const explainAuditIssueSchema = z.object({
  projectId: z.string().min(1),
  auditId: z.string().min(1),
  ruleId: z.string().min(1).max(128),
  locale: ruleLocaleSchema,
});

export const getComparableSnapshotsSchema = z.object({
  projectId: z.string().min(1),
  auditId: z.string().min(1),
});

// `baselineAuditId` is optional: absent means auto-pick the most recent
// comparable prior crawl. Rule copy for resolved-only rules is resolved
// server-side, so the viewer's locale rides along like the summary's.
export const getAuditIssueComparisonSchema = z.object({
  projectId: z.string().min(1),
  auditId: z.string().min(1),
  baselineAuditId: z.string().min(1).optional(),
  locale: ruleLocaleSchema,
});

// Page-fact changes carry no rule prose, so no locale. `baselineAuditId` absent
// means auto-pick the most recent prior sealed crawl.
export const getAuditPageChangesSchema = z.object({
  projectId: z.string().min(1),
  auditId: z.string().min(1),
  baselineAuditId: z.string().min(1).optional(),
});

// GSC signals for an audit's target. The window is server-fixed (last 28 days
// vs the previous 28), so the request carries no dates.
export const getAuditSearchSignalsSchema = z.object({
  projectId: z.string().min(1),
  auditId: z.string().min(1),
});

// Off-page referring-domain signals for an audit's target. Read, access and the
// credit-spending refresh all key off the audit alone; the provider target and
// window are derived server-side, so one shape covers every server function.
export const auditReferringDomainsRequestSchema = z.object({
  projectId: z.string().min(1),
  auditId: z.string().min(1),
});

// ─── URL search params schema for /p/$projectId/audit ────────────────────────

const auditTabs = ["pages", "performance", "issues", "search"] as const;

export type AuditTab = (typeof auditTabs)[number];

const optionalSearchStringParam = z.string().optional().catch(undefined);

export const auditSearchSchema = z.object({
  auditId: z.string().optional().catch(undefined),
  tab: z.enum(auditTabs).catch("pages").default("pages"),
  // All Issues tab state. Prefixed so it cannot collide with a future filter on
  // the pages/performance tabs, which share this one search schema.
  issueGroup: optionalSearchStringParam,
  issueSeverity: optionalSearchStringParam,
});
