import { z } from "zod";
import { AUDIT_MAX_PAGES, AUDIT_MIN_PAGES } from "@/shared/audit-limits";

// ─── Server function input schemas ──────────────────────────────────────────

export const startAuditSchema = z.object({
  projectId: z.string().min(1),
  startUrl: z.string().min(1, "URL is required").max(2048),
  maxPages: z
    .number()
    .int()
    .min(AUDIT_MIN_PAGES)
    .max(AUDIT_MAX_PAGES)
    .optional()
    .default(AUDIT_MAX_PAGES),
  lighthouseStrategy: z
    .enum(["auto", "all", "manual", "none"])
    .optional()
    .default("auto"),
  // Set when this launch is a re-crawl to verify fixes against an earlier
  // completed crawl of the same target. The server validates it belongs to this
  // project + target before trusting it.
  baselineAuditId: z.string().min(1).optional(),
});

// The verification outcome of a re-crawl compared to the baseline it was
// launched against. Read-only; no locale (the payload is counts + URLs).
export const getAuditVerificationOutcomeSchema = z.object({
  projectId: z.string().min(1),
  auditId: z.string().min(1),
});

// IndexNow status/setup/verify/submit all key off one audit (which resolves the
// target); owner/admin authorization is enforced server-side.
export const indexNowRequestSchema = z.object({
  projectId: z.string().min(1),
  auditId: z.string().min(1),
});

// Google index-status context for an audit (connected property + deep links).
export const getAuditIndexStatusSchema = z.object({
  projectId: z.string().min(1),
  auditId: z.string().min(1),
});

// Inspect one of the audit's own URLs against the connected GSC property. The
// server enforces same-origin + editor-and-up; the URL is a bounded string.
export const inspectAuditUrlSchema = z.object({
  projectId: z.string().min(1),
  auditId: z.string().min(1),
  url: z.string().min(1).max(2048),
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

// Request an async issue export. The optional filters mirror listAuditIssues so
// the export covers exactly the filtered view; they are plain bounded strings
// (see listAuditIssuesSchema for why the server enums are not imported here).
export const requestAuditExportSchema = z.object({
  projectId: z.string().min(1),
  auditId: z.string().min(1),
  issueGroup: z.string().min(1).max(64).optional(),
  severity: z.string().min(1).max(64).optional(),
  ruleId: z.string().min(1).max(128).optional(),
  urlContains: z.string().min(1).max(2048).optional(),
});

export const listAuditExportsSchema = z.object({
  projectId: z.string().min(1),
  auditId: z.string().min(1),
});

// Read/capture an evidence screenshot for one affected URL. The URL is a bounded
// string; the authoritative check is server-side — it must already be a crawled
// HTML page of this audit, so an unknown value simply resolves to "unavailable"
// (read) or NOT_FOUND (capture) rather than rendering anything.
export const auditScreenshotRequestSchema = z.object({
  projectId: z.string().min(1),
  auditId: z.string().min(1),
  url: z.string().min(1).max(2048),
});

// Competitor declaration for one audit target, keyed off the audit whose report
// the operator is looking at — the same addressing IndexNow and periodic reports
// use, and the server derives the target from it. `domain` is whatever was
// typed — bare host, host with path, either scheme — and is normalized and
// SSRF-checked server-side before anything fetches it, so nothing beyond a sane
// length is enforced here.
export const listAuditCompetitorsSchema = z.object({
  projectId: z.string().min(1),
  auditId: z.string().min(1),
});

export const addAuditCompetitorSchema = z.object({
  projectId: z.string().min(1),
  auditId: z.string().min(1),
  domain: z.string().min(1).max(253),
  label: z.string().max(120).optional(),
});

export const removeAuditCompetitorSchema = z.object({
  projectId: z.string().min(1),
  auditId: z.string().min(1),
  competitorId: z.string().min(1),
});

// Run / read the page-level competitor comparison, and override one pairing.
// `theirUrl` is normalized and SSRF-checked server-side before it is fetched.
export const auditComparisonRequestSchema = z.object({
  projectId: z.string().min(1),
  auditId: z.string().min(1),
});

// `pageId` repoints an existing pair; `ourUrl` creates one for a page the matcher
// found no candidate for. Exactly one is required — a competitor may genuinely
// have no counterpart to /pricing, and "no candidate" must not mean "no way to
// pair it".
export const setCompetitorPageUrlSchema = z
  .object({
    projectId: z.string().min(1),
    auditId: z.string().min(1),
    competitorId: z.string().min(1),
    pageId: z.string().min(1).nullish(),
    ourUrl: z.string().min(1).max(2048).nullish(),
    theirUrl: z.string().min(1).max(2048),
  })
  .refine((value) => Boolean(value.pageId) !== Boolean(value.ourUrl), {
    message: "Pass either pageId or ourUrl",
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
