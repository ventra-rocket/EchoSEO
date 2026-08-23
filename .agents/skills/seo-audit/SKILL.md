---
name: seo-audit
description: "Crawl a site with EchoSEO's Site Audit and turn the findings into a prioritized, evidence-backed technical SEO report."
---

# EchoSEO Site Audit

## Goal

Crawl a site, read the findings, and deliver a report where every claim is backed by a URL and a measured value. The report exists to support a short ordered list of fixes — worst first — not to enumerate everything the crawler noticed.

Use this when asked to audit, review, or health-check a site the user controls. For expert-facing analysis of someone else's site or market, use `competitor-analysis` or `competitive-landscape`; for query-level demand work, use `keyword-research`.

## Required inputs

- The site's URL (the crawl stays on that URL's origin)
- `projectId`

If `projectId` is missing, call `list_projects`. There is no MCP tool that creates a project: if no project matches the site, ask the user to create one in the dashboard and stop. Do not audit a project the user did not name.

## EchoSEO MCP tools

- `whoami`: confirm the connection and the deployment mode before starting. On a hosted deployment it also reports the remaining data balance; on self-host, provider calls run on the operator's own DataForSEO key.
- `list_projects`: resolve the `projectId`.
- `run_site_audit`: **starts a real crawl.** This is the only privileged tool in the server — it spends compute and fetches pages from a third-party site. Call it once per site per session.
  - `maxPages` defaults to the measured ceiling of **5,000 pages**, which for almost every real site means "crawl all of it": a site smaller than the budget finishes when the crawl frontier empties. The floor is 10.
  - On a hosted deployment a crawl above **100 pages** requires a Search Console property that proves the user owns the domain. Without one the tool **refuses** and says so; it never quietly shrinks the crawl. Either pass `maxPages: 100` (and say in the report that the crawl was capped) or ask the user to connect the property first. Self-hosted deployments have no such gate.
  - Leave `runLighthouse` off — that is the default. It adds minutes of wall clock to a crawl that otherwise finishes in one, and it is a metered DataForSEO call on the user's own key. Pass `true` only when the user explicitly asked for performance or Core Web Vitals detail.
- `get_audit_status`: **waits server-side** while the crawl runs and answers as soon as it finishes. Call it once. If it returns still-running, report the progress and the estimate it gives you to the user, then call it at most a few more times — never in a tight loop. It also reports the crawl queue depth, which is what separates "slow" from "stalled".
- `get_audit_issues`: the prioritized findings. One row per rule with its severity (`critical`, `high`, `low`), its group (`indexability`, `links`, `redirects`, `content`, `sitemaps`, `structured-data`, `performance`, `ai-geo`), how many URLs it affects, and remediation steps with the Google documentation the rule cites. Filter by `ruleId`, `issueGroup`, `severity`, or `urlContains` to pull the affected URLs and per-URL evidence for one finding. `locale: "vi"` returns Vietnamese remediation text.
- `get_audit_pages`: the crawled pages with the facts the rules were judged from — status, redirect target, title, meta description, canonical, robots directives, word and heading counts, image alt coverage, link counts, structured-data presence, mixed content, sitemap membership, response time. Filter (`statusCode`, `indexable`, `inSitemap`, `isHtml`, `urlContains`) instead of paging the whole crawl.
- `get_search_console_performance` and `inspect_urls`: when Search Console is connected, first-party impressions/clicks per page and Google's own index verdict for a URL. This is what turns "this page is noindex" into "this page is noindex and used to earn 400 clicks a month".
- `get_backlinks_overview`, `get_domain_overview`: off-site context, when the user asked for it. These are metered provider calls — one each, at most.

Crawling is not metered against the data balance. The provider-backed tools (`get_backlinks_overview`, `get_domain_overview`, keyword tools, Lighthouse) are. Keep provider calls to what the report actually uses.

## Workflow

1. `whoami`, then resolve the `projectId`.
2. `run_site_audit` for the site's URL, Lighthouse off. If it refuses, read the refusal: it names the reason and the way forward. Do not retry the same call.
3. `get_audit_status` once. While waiting is happening server-side you have nothing to do; when it returns still-running, tell the user how far along it is before calling again. If Search Console is connected, this is the moment to fetch `get_search_console_performance` — it is independent of the crawl.
4. `get_audit_issues`. Read `materializedAt` first:
   - a timestamp with an empty findings list means the crawl genuinely passed every rule;
   - `null` means the analysis never ran (crawl still going, or it failed before sealing). **This is not a clean bill of health.** Say the analysis did not run and re-run the audit; never report the site as issue-free from a null.
5. For each finding you intend to report, pull its affected URLs with `get_audit_issues` filtered by `ruleId`, and read the per-URL `evidence` — that is the measured value you quote. A finding without a URL and a value does not go in the report.
6. Sanity-check the shape of the crawl with `get_audit_pages` before drawing conclusions:
   - `pagesCrawled` far below the site's real size, or a crawl that stopped at `maxPages`, means the link graph is incomplete — orphan-page and sitemap findings are unreliable and must be labelled as such.
   - a crawl of one or two pages with non-200 statuses usually means the site blocked the crawler, was down, or has a certificate problem. Investigate that before writing anything else; it changes the whole report.
   - `isHtml: false` rows are PDFs, images, and failed fetches. Their empty title and zero word count are placeholders, not findings.
7. Order the fixes by real impact, not by severity label alone: a `critical` on one orphaned page ranks below a `high` on 300 indexable pages that earn traffic. Use Search Console clicks where you have them.
8. Verify anything surprising against the live page yourself before reporting it. The crawl is a snapshot; a fix may have shipped since.
9. Write the report (see Output format). Point the user at the dashboard for the PDF/DOCX export and the IndexNow submission — those are app actions, not agent actions.

## Output format

Start with the decision, not the inventory:

- Verdict: one paragraph on the state of the site's technical SEO
- Do this first: one fix, with the exact URLs and the exact change
- Then: 3 to 7 more fixes, ordered by impact

Then a table of the findings you are reporting:

| Severity | Finding | URLs affected | Evidence | Fix |
| -------- | ------- | ------------: | -------- | --- |

Close with a method footer stating: the audit id, the start URL, how many pages were crawled out of what budget, whether Lighthouse ran, when the analysis was materialized, and which claims you verified against the live site rather than taking from the crawl.

## Guardrails

- Never call `run_site_audit` twice for the same site in one session, and never to "retry" a refusal. It is a real crawl of someone's server.
- Never report a `materializedAt: null` audit as a site with no issues.
- Quote the measured value, never a paraphrase. "Title is 78 characters" — not "title is too long".
- Do not present a capped or blocked crawl as full site coverage. State the coverage.
- Do not invent numbers. If EchoSEO did not return a value, write `unknown`.
- A finding on a page that is already `noindex` and gets no traffic is not worth the user's week. Cut it.
- Remediation text comes from the rule catalogue with a Google citation. Use it rather than writing generic advice, and keep the citation in the report.
- Report language follows the user; the tool arguments, rule ids, and severities stay as EchoSEO returns them.
