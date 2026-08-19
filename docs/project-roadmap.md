# EchoSEO — Roadmap

**Version:** 0.7 · **Date:** 2026-08-19 · **Status:** M0 complete. Free SEO Checker and the Professional Site Audit are deployed in production, and the Google-First Parity Sprint (13–31/08) delivered all 12 committed days: weekly report email, trust repair on the free report, GSC multi-site import, site dashboard cards, page-level competitor audit, and a measured 5,000-page crawl ceiling. Billing remains unlaunched. Remaining MVP work is dogfooding + hardening the inherited surfaces and the public OSS release; the content engine and read-write agent loop are unbuilt V1 goals.

**Known gaps that the checkboxes below do not show:**

- **Rank tracking cannot run without a DataForSEO key**, and the company account has no balance. `rank_snapshots` has no source column, so `plans/260812-1320-gsc-first-rank-tracking/` is unimplemented — GSC-average positions cannot be shown as a Tier-0 substitute yet. This is the largest hole in the "Google-only" story.
- **One sprint acceptance box is still unverified on production**: the weekly email's rendering on real mail clients (Gmail, Outlook, Apple Mail). Both Search Console boxes closed on 19/08 against a real grant — multi-site import created exactly +2 projects/connections/targets from two ticked properties and refused the already-bound ones, and the GSC numbers matched the Search Console UI exactly over an identical window (3 clicks / 244 impressions / position 17.0). A `report_subscriptions` row is now live, so the first real email goes out Monday 24/08 and is the sample for the remaining box.
- **i18n covers the app shell and a handful of features only** (182 ids). Audit reports, the free-check report, competitor tables and the weekly email are English-only, so "Bilingual VN + EN across all shipped surfaces" is further off than one unticked box suggests.

**Grounded in:** `plans/reports/research-summary-260703-1047-ventra-seo.md` · Companion: `docs/project-overview-pdr.md`

Phases are scope-ordered, not date-locked. Durations are rough estimates for a small team and should be re-baselined after Phase 0.

---

## Phase 0 — Fork & Foundation (~1–3 weeks)

**Goal:** a rebranded, self-hostable EchoSEO running on Cloudflare, with the seams in place for later features.

- [x] Fork `every-app/open-seo`; import into this repo; add `upstream` remote for security/feature pulls.
- [x] Provision Cloudflare infra: D1, KV ×2, R2, Durable Objects, Workflows, cron.
- [x] Deploy a private self-host mode (`cloudflare_access`) end-to-end.
- [x] Convert `echoseo.ventrarocket.vn` to public hosted SaaS mode with customer email/password signup and verification.
- [x] **Rebrand** OpenSEO → EchoSEO: UI, MCP tool descriptions, agent skills, `wrangler` names, fact sheet. _(→ `web/` marketing site rebrand deferred — separate un-deployed surface; see M0 follow-ups.)_
- [x] Strip/gate hosted-only couplings behind hosted flag: PostHog, Reddit-attribution, Loops, Autumn billing, Svix (upstream already gated all network-firing paths behind the `hosted` auth mode; added reddit lib/client guards + self-host no-op tests). _(→ trivial `@every-app/sdk` dependency drop still pending.)_
- [x] **i18n scaffolding (VN + EN):** react-intl wired into TanStack Start, shell strings extracted, Vietnamese seed catalog (machine-translated, flagged for review). _(Net-new vs OpenSEO.)_
- [x] Introduce a thin **DataForSEO provider-abstraction** seam (`src/server/lib/seo-data`, no behavior change).
- [ ] Verify: DataForSEO ToS on multi-tenant resale; team Cloudflare fluency. _(Business/legal — logged as tracked open decisions.)_

**Exit:** ✅ **M0 met (2026-07-07)** — EchoSEO-branded app deploys self-host on Cloudflare (Access-enforced), bilingual shell live, upstream tracked. Open follow-ups: `web/` marketing-site rebrand, DataForSEO resale-ToS answer, team CF fluency sign-off, `@every-app/sdk` drop.

## Phase 1 — MVP: "AI-native self-hosted SEO core" (~4–8 weeks)

**Goal:** launch a coherent, differentiated open-core product. ~80% is inherited; effort is polish, i18n, agent panel, and borrowed quick-wins.

**Net-new EchoSEO surfaces — DONE, verified + deployed:**

- [x] **Free SEO Checker:** public Lite + email-gated bounded Deep check; noindex `/r/{id}` bearer report for the free tier only. _(Live.)_
- [x] **Professional Site Audit:** private workspace/domain crawl snapshots, All Issues, URL evidence, AI-guided remediation, snapshot history + GSC/DataForSEO fusion, async ZIP export, selective screenshots, IndexNow submit, GSC index-status, re-crawl verification. _(Built + deployed; hosted team-collaboration layer built but not launched.)_

**Inherited features — present from the open-seo base, still to dogfood & harden as EchoSEO:**

- [~] Keyword research _(inherited; **clustering not built**)_
- [~] Global rank tracking (scheduled cron + Workflow)
- [~] Backlink analysis + prospecting
- [~] Competitor analysis + domain overview
- [~] GSC integration (search performance, striking-distance)
- [~] MCP server (18 tools) + agent skills — **assisted** workflows
- [~] AI-search visibility (Brand Lookup + Prompt Explorer) — basic

**EchoSEO additions in MVP:**

- [~] **Balanced UX:** Command Center and private, read-only assisted AI workspace are built; production verification pending. Autonomous or write-capable workflows remain V1+.
- [ ] **Bilingual VN + EN** across all shipped surfaces.
- [~] Borrowed quick-wins (★ stack-native, mostly zero API cost):
  - [ ] Scheduled SERP rank loop refinement + change alerts (SerpBear pattern) — _blocked with rank tracking itself on a DataForSEO key or a GSC rank source._
  - [ ] GSC-actuals reconciliation (overlay real clicks/impressions on tracked keywords)
  - [ ] Traffic-light real-time content analysis (client-side heuristics)
  - [x] Severity-tiered audit issue taxonomy (critical/high/low) — shipped in the rules engine (`src/server/lib/audit/rules/`), read by the audit UI rather than redefined there.
  - [x] Private-by-default audit review; free public links never expose a workspace audit — `/r/{id}` reads the free-check report store only (`src/routes/r.$id.tsx`), and is `noindex` + robots-disallowed.

**Exit / launch:** public open-source release; "Deploy to Cloudflare" one-click; docs; positioning = _the open, agent-native SEO platform_.

## Phase 2 — V1: "Tool → Business" (~2–4 months)

**Goal:** convert a self-host tool into a sellable product; open the managed revenue tier and the read-write agent moat.

- [ ] **On-page content optimization engine** — briefs, target terms/entities (NLP), content score, AI writing, internal-linking suggestions. _(Top differentiator.)_
- [ ] **Professional Audit scale** — scheduled/large crawl, snapshot history, indexation/schema/robots/sitemap/broken-link depth, GSC + optional BYO DataForSEO deltas (traffic/Top-10/ref-domain), verified IndexNow/GSC/sitemap actions and re-crawl proof.
- [ ] **Local + SERP-feature rank tracking** — city/GPS scope, SERP features incl. AI Overview presence.
- [ ] **GA4 + Bing Webmaster integrations** — reuse GSC OAuth pattern (DRY).
- [ ] **White-label reporting + dashboards** — scheduled PDF/email, branded client portals (agency expansion).
- [ ] **Deepen GEO / AI-search** — prompt tracking, LLM mention monitoring, GEO content recommendations.
- [ ] **Read-WRITE agent execution loop** — autonomous keyword → brief → draft → on-page fix → GSC-monitored → refresh, with guardrails + eval harness. _(The moat.)_
- [ ] **Managed Cloud (PAYG credits, 20–40% transparent markup)** — managed DataForSEO + first-party OAuth; open-source metering/billing layer. _(Gated on DataForSEO resale ToS.)_

**Exit:** managed cloud in beta; agencies can white-label; agents do end-to-end work.

## Phase 3 — Later: "High-ceiling automation"

- [ ] **Programmatic SEO engine** — template + dataset → publish at scale + indexation monitor + thin-content guardrails. _(Med–High build; save until core stable.)_
- [ ] **Fully autonomous agent pipelines** — research → publish → monitor → recover with minimal human input.
- [ ] **Multi-tenant agency scale + skill marketplace** — only if V1 agency demand validates.

**Explicitly out of scope (YAGNI):** PPC/paid-media data, social-media tracking, full-marketing-suite breadth, owning a backlink index, proxy-fleet SERP scraping.

---

## Milestones

| Milestone                   | Phase | Definition of done                                                                                             |
| --------------------------- | ----- | -------------------------------------------------------------------------------------------------------------- |
| **M0 — EchoSEO runs** ✅    | 0     | ✅ Done 2026-07-07 — rebranded app self-host-deploys on Cloudflare (Access), bilingual shell, upstream tracked |
| **M1 — MVP launch**         | 1     | Inherited features hardened + agent panel + VN/EN + quick-wins; public OSS release                             |
| **M2 — Professional audit** | 1B→2  | Private All Issues + remediation + export, then history/data fusion and verified remediation actions shipped   |
| **M3 — Revenue on**         | 2     | Managed cloud PAYG beta + white-label reporting live                                                           |
| **M4 — Autonomous loop**    | 2→3   | Read-write agent loop GA with guardrails                                                                       |
| **M5 — Scale**              | 3     | pSEO engine or agency multi-tenant, demand-validated                                                           |

## Dependencies & gating checks

- **M3 (managed cloud)** gated on **DataForSEO multi-tenant resale ToS**.
- **Professional Site Audit** starts after the Free Checker P07 launch gate; it is an authenticated product surface, not an expansion of public `/r/{id}` reports.
- **Audit history claims** need at least two completed snapshots; traffic, ranking and referring-domain deltas additionally need GSC or an enabled provider snapshot.
- **Indexation actions** require verified domain ownership. IndexNow is separate from Google's manual URL Inspection recrawl flow.
- **Read-write loop** gated on scoping the **publishing surface** (WordPress/Webflow/CMS APIs).
- All phases: monitor **Google v. SerpApi** enforcement trajectory (aggregator risk).
- Re-baseline dates after **M0** once team Cloudflare velocity is known.
