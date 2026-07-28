# EchoSEO — Product Definition & Requirements (PDR)

**Version:** 0.4 · **Date:** 2026-07-28 · **Status:** Free SEO Checker and Professional Site Audit are deployed in production. EchoSEO is a public hosted SaaS with customer email/password signup and verification; billing is not yet launched. Inherited keyword/rank/backlink/competitor surfaces run on the open-seo base with a BYO DataForSEO key. The content-optimization engine and the autonomous read-write loop (§3) are the V1 goal — not yet built.
**Grounded in:** `plans/reports/research-summary-260703-1047-ventra-seo.md` (+ 4 source reports)

---

## 1. Vision

EchoSEO is the **open, agent-native SEO platform**: a comprehensive, self-hostable alternative to Semrush/Ahrefs that pairs a polished dashboard with AI agents that execute real SEO work end-to-end and prove results against the user's own data — at bring-your-own-key cost.

**One-liner:** _The open SEO platform that doesn't just answer questions — it does the work and proves it against your own Search Console data._

## 2. Strategy & Approach

- **Build by forking [every-app/open-seo](https://github.com/every-app/open-seo)** (MIT, ~74k LOC, actively maintained). It already ships the expensive parts — a clean DataForSEO integration, an 18-tool MCP server, 7 agent skills, rank tracking, site audit + Lighthouse, GSC, AI-Visibility. Rebranding + extending is ~1–3 weeks to MVP vs 4–8 months greenfield.
- **Track upstream** as a git remote for security and feature pulls.
- Covers **~55%** of a comprehensive platform out of the box; remaining gaps are **product build, not R&D** (DataForSEO supplies the data).

## 3. Differentiation (the moat)

"Agent-native / MCP" alone is **not** a moat — Semrush, Ahrefs, and DataForSEO all ship read-only MCP servers. EchoSEO's defensible wedge:

1. **Read-WRITE execution loop** — agents run keyword → brief → draft → on-page fix → GSC-monitored → refresh, not just retrieval. Incumbents won't hand agents write/publish access (it disintermediates their dashboards).
2. **First-party + competitive data fusion** — combine the user's GSC clicks + GA4 conversions with DataForSEO's keyword/SERP universe in one agent context.
3. **Open-source + BYO-key economics** — ~$0.0006/SERP undercuts $99–$500/mo suites; incumbents can't match without cannibalizing subscriptions.

**Durable defensibility:** community + shared agent-skill marketplace (open-core network effect) + trust as the neutral, non-lock-in layer.

**Explicitly NOT competing on:** backlink-index size (Ahrefs 500M ref domains — unwinnable, buy via DataForSEO), PPC/social/full-marketing-suite breadth (Semrush's game — YAGNI).

## 4. Target Users & Personas

Primary buyer (decided): **prosumer, open-core**. Agencies are a V1 expansion, not the launch wedge.

| Persona                                    | Who                                                | Jobs-to-be-done                                          | EchoSEO hook                                           |
| ------------------------------------------ | -------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| **Indie SEO / founder** (primary)          | Solo operators, bootstrappers, technical marketers | Run full SEO without a $150/mo suite; automate the grind | Free self-host, BYO-key, agents do the repetitive work |
| **Developer / prosumer** (primary)         | Devs who own their sites, MCP/agent users          | SEO inside their agent/IDE workflow; own their data      | MCP server + skills; self-hostable; open source        |
| **Small SEO agency** (V1 expansion)        | 1–10 person agencies managing multiple clients     | Multi-client workspaces + white-label reporting          | Managed cloud + white-label (V1)                       |
| **Vietnamese SMB / marketer** (i18n wedge) | VN-market operators underserved by English tools   | Native-language SEO tooling                              | Bilingual VN + EN from day one                         |

## 5. Scope

### In scope (phased — see roadmap)

Keyword research + clustering, rank tracking (global → local + SERP features), backlinks, technical/site audit (free bounded check → private professional audit → scheduled/deep), competitor/domain analysis, on-page content optimization, GSC → GA4 + Bing integrations, MCP + agent skills (assisted → autonomous read-write), AI-search/GEO visibility, white-label reporting, bilingual VN/EN, programmatic SEO (Later).

### Audit product contracts (locked 2026-07-13)

- **Free acquisition checker:** public Lite and email-gated bounded Deep check. Its `/r/{id}` report is an expiring/noindex bearer link, read-rate-limited and free of email/other PII. It is not a company audit workspace.
- **Professional Site Audit:** authenticated, private-by-default project/domain audit. It stores crawl snapshots, rule occurrences, affected-URL evidence and artifact metadata; it provides All Issues, AI-guided step-by-step fixes, history, background CSV/JSON/ZIP export, selective screenshots and workspace/invite review.
- **Data provenance:** crawler findings cover crawl/on-page/link/sitemap facts. Traffic, Top-10 and referring-domain deltas require persisted GSC or explicitly enabled BYO DataForSEO snapshots and must state their source.
- **Indexation actions:** only a verified target may submit IndexNow URLs. For ordinary Google pages EchoSEO directs authorized users to Search Console URL Inspection/manual recrawl; it does not promise a general Google indexing API.
- **Authority and roles:** a Google Search Console verified property (or project-owned DNS proof) is required for privileged Google-facing actions; an IndexNow key proves only that host. Workspace `owner/admin` manage targets, verification, invitations and actions; `editor` can investigate/export; `viewer` is read-only. The Cloudflare Access, hosted and local-noauth identity paths must all resolve to the same project-membership contract before private sharing ships.
- **Artifact defaults:** professional exports expire after 7 days, screenshots and nonessential browser artifacts after 30 days, and completed audit snapshots after 90 days by default. Self-host deployments may configure these values; purge removes both metadata and the R2 object.

### Out of scope (YAGNI)

Owning a backlink crawl/index, proxy-fleet SERP scraping, PPC/paid-media management, social-media management, full CRM/marketing-suite breadth.

## 6. Key Decisions (2026-07-03)

| Decision           | Choice                                                              | Rationale                                              |
| ------------------ | ------------------------------------------------------------------- | ------------------------------------------------------ |
| Fork vs greenfield | **Fork OpenSEO**                                                    | Inherits 6–12 months of proven work; ~1–3 wk to MVP    |
| Infra              | **Cloudflare-native** (Workers + D1 + DO + Workflows + KV + R2)     | Base repo is welded to it; team accepts the stack      |
| Buyer / model      | **Prosumer, open-core**                                             | Free self-host wedge → managed PAYG → seats            |
| Market / i18n      | **Bilingual VN + EN from start**                                    | Founder market + differentiated wedge; net-new i18n    |
| Product posture    | **Balanced** dashboard + agent                                      | Broad appeal + differentiation                         |
| Data provider      | **DataForSEO primary** + free GSC/GA4/Bing, behind thin abstraction | Best cost/coverage; hedge single-vendor lock-in        |
| Avoid              | **SerpApi**                                                         | Active Google DMCA suit (2025-12-19)                   |
| Autonomy at MVP    | **Assisted** skills; autonomous read-write V1+                      | Guardrail/eval cost                                    |
| License            | **MIT**                                                             | Confirmed on upstream; managed-SaaS monetization clean |

## 7. Architecture (inherited + extensions)

### Inherited from OpenSEO (verified against clone v0.0.23)

- **App:** TanStack Start (React 19) single unified Worker; file-based routes; server functions (RPC); feature-sliced `services/` + `repositories/`.
- **Runtime:** Cloudflare Workers (workerd). **D1 (SQLite)** via Drizzle (26 migrations). KV ×2, R2 (Lighthouse payloads), Durable Objects (onboarding chat agent), Workflows (`SiteAuditWorkflow`, `RankCheckWorkflow`), cron (`*/15 * * * *`).
- **Data layer:** `src/server/lib/dataforseo/` — layered core → per-section (labs/serp/backlinks/business/google-ads/lighthouse/ai) → metered client. BYO Base64 key, read lazily per-request.
- **MCP:** `src/server/mcp/` — 18 tools, zod in/out, OAuth 2.1 (DCR) hosted + self-host transports.
- **Auth:** `AUTH_MODE` = `local_noauth` | `cloudflare_access` | `hosted` (Better Auth + org).
- **Skills:** `.agents/skills/` — 7 portable SKILL.md agent skills.

### EchoSEO extensions

- **Provider abstraction** over the DataForSEO facade (swap/add raw-SERP providers behind one interface).
- **i18n layer** (VN + EN) wired into TanStack Start — net-new; string extraction + VN translations.
- **First-party fusion:** extend GSC to GA4 + Bing Webmaster (reuse GSC OAuth pattern).
- **Content-optimization engine** (V1): briefs, entity/NLP, content score, AI writing, internal linking.
- **Read-write agent loop** (V1): autonomous keyword→brief→draft→fix→monitor with guardrails + eval harness.
- **Professional Site Audit** (post-Free-Checker): authenticated domain targets, immutable crawl snapshots, rule occurrence/URL evidence records, asynchronous R2 export/artifacts and private review authorization. Screenshot capture is on-demand or high-severity only.
- **Managed cloud + PAYG metering** (V1): keep/extend Autumn-style metering behind hosted flag.
- **Rebrand:** OpenSEO → EchoSEO across UI, MCP tool descriptions, skills, wrangler names, `web/` site.

### Strip / gate for open-core self-host

PostHog, Reddit-attribution, Loops, and hosted-only billing are gated behind hosted mode (self-host already runs without them).

## 8. Data Layer

```
EchoSEO Data Layer (provider-abstraction interface)
├── Paid aggregator (primary):  DataForSEO → SERP, Keywords, Labs, Backlinks, On-Page
├── First-party fusion (free):  GSC + GA4 + Bing Webmaster (user OAuth)
└── Optional raw-SERP swap:     ScaleSERP / Bright Data (behind same interface)
```

DataForSEO: $0.0006/SERP std, 8B-keyword DB, ~2T backlink index, native MCP. First-party APIs free but own-site only. **Avoid SerpApi** (DMCA litigation).

## 9. Borrowed Ideas (from OSS landscape)

Prioritized (★ = stack-native): scheduled SERP rank loop (SerpBear), GSC-actuals reconciliation, traffic-light real-time content analysis (Yoast/RankMath, zero API cost), severity-tiered audit taxonomy (SEOnaut), parallel/sitemap Lighthouse (Unlighthouse), free keyword expansion via Autocomplete+PAA, free schema generator+validator. Defer: log-file analysis, custom XPath extraction, agency plugin architecture.

## 10. Success Metrics (KPIs)

**North star:** weekly active self-hosted instances running ≥1 agent workflow.

| Stage           | Metric                                                                         | Target (directional) |
| --------------- | ------------------------------------------------------------------------------ | -------------------- |
| Adoption        | GitHub stars; self-host deploys                                                | Track from launch    |
| Activation      | % installs that connect GSC + run first agent task                             | ≥ 40%                |
| Engagement      | Weekly active instances w/ ≥1 scheduled job                                    | Grow MoM             |
| Audit quality   | Completed audits; high/critical issues resolved after re-crawl; export success | Track from launch    |
| Differentiation | % using read-write agent loop (V1)                                             | Track                |
| Revenue (V1)    | Managed-cloud conversions; PAYG credit revenue                                 | Post-V1              |
| Retention       | Instances active at day 30                                                     | ≥ 30%                |

## 11. Risks & Mitigations

| Risk                                                     | Mitigation                                                                                |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Cloudflare lock-in**                                   | Accepted trade-off for speed; keep provider/DB seams clean; portability is a later option |
| **D1/SQLite scale ceiling**                              | Fine per-tenant; revisit for heavy cross-tenant analytics                                 |
| **Single data provider**                                 | Add provider abstraction early                                                            |
| **DataForSEO multi-tenant resale ToS**                   | ⚠️ Verify before managed tier — may require per-tenant keys                               |
| **Google v. SerpApi enforcement spreads to aggregators** | Monitor; lean on first-party data where possible                                          |
| **i18n adds MVP scope**                                  | Wire i18n scaffolding in Phase 0; VN translations incremental                             |
| **Balanced posture = more MVP surface**                  | Reuse OpenSEO's shipped dashboard; agent panel is incremental                             |
| **GEO/AI-visibility immaturity**                         | Build flexible; expect churn in LLM-citation surfaces                                     |
| **Upstream drift**                                       | Track upstream remote; scheduled merge cadence                                            |
| **Public-link / private-audit boundary**                 | Separate routes, tables and authorization; never reuse free `/r/{id}` for workspace data  |
| **Screenshot/export cost and retention**                 | On-demand screenshot policy; Workflow/R2 caps, expiry and audit-scoped access             |
| **History/data freshness**                               | Source-label metrics; require comparable snapshots; show unavailable rather than zero     |

## 12. Open Items to Verify

- DataForSEO ToS on multi-tenant resale (gates managed-cloud markup).
- Google v. SerpApi trajectory (aggregator risk).
- First-party API volume ceilings at managed scale (GSC ~50k rows/day, GA4 200k tokens/day per property).
- Read-write publishing surface scope (WordPress/Webflow/CMS APIs) for the V1 agent loop.
- Team Cloudflare fluency (Workers/D1/DO/Workflows) — training need?
- Professional-audit domain ownership UX and the threshold that upgrades an unverified crawl to verified-only.
- Professional-audit export/artifact retention and screenshot compute/storage caps.
