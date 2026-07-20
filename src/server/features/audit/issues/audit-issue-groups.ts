/**
 * Presentation adapter mapping a rule id to the group the audit UI shows it
 * under. This is a display/evidence grouping ONLY — it never restates a rule's
 * problem, fix steps or citation, which stay owned by the P02 knowledge base.
 *
 * Regrouping is recorded where it matters: every occurrence stores the
 * `issueGroup` it was materialized under, so an old audit keeps showing the
 * grouping it was judged with and only re-materialization adopts a new one.
 */

export const AUDIT_ISSUE_GROUPS = [
  "indexability",
  "links",
  "redirects",
  "content",
  "sitemaps",
  "structured-data",
  "performance",
  "ai-geo",
] as const;

export type AuditIssueGroup = (typeof AUDIT_ISSUE_GROUPS)[number];

/**
 * Rules the professional audit materializes today. GEO rules are intentionally
 * absent: their signals need robots.txt/llms.txt side fetches the audit crawl
 * does not perform, so the AI/GEO group has no evidence yet and must stay empty
 * rather than render a fabricated zero.
 */
const GROUP_BY_RULE_ID: Record<string, AuditIssueGroup> = {
  // On-page content
  "meta-title": "content",
  "meta-description": "content",
  "structure-h1": "content",
  "structure-heading-order": "content",
  "structure-image-alt": "content",
  "structure-word-count": "content",
  // Indexability / delivery
  "meta-canonical": "indexability",
  "server-https": "indexability",
  "server-status": "indexability",
  "server-indexable": "indexability",
  "server-mixed-content": "indexability",
  // Structured data
  "structure-structured-data": "structured-data",
  // Performance
  "cwv-lcp": "performance",
  "cwv-inp": "performance",
  "cwv-cls": "performance",
  "cwv-ttfb": "performance",
  // Cross-page rules, which need the link graph and sitemap membership.
  "audit-orphan-page": "links",
  "audit-broken-internal-link": "links",
  "audit-missing-from-sitemap": "sitemaps",
  "audit-unreachable-url": "indexability",
};

/**
 * The group for a rule, or null when the rule is not part of the audit surface.
 * Callers must skip unmapped rules rather than invent a group — a test pins that
 * every materialized rule has a mapping, so null here means "not audited yet".
 */
export function getIssueGroup(ruleId: string): AuditIssueGroup | null {
  return GROUP_BY_RULE_ID[ruleId] ?? null;
}
