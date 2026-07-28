# EchoSEO — Roadmap

**Version:** 0.4 · **Date:** 2026-07-23 · **Status:** M0 complete. Free SEO Checker and the Professional Site Audit are built, verified and deployed in production (self-host / Cloudflare Access). The hosted multi-tenant + billing layer is built but not launched. Remaining MVP work is dogfooding + hardening the inherited surfaces and the public OSS release; the content engine and read-write agent loop are unbuilt V1 goals.
**Grounded in:** `plans/reports/research-summary-260703-1047-ventra-seo.md` · Companion: `docs/project-overview-pdr.md`

Phases are scope-ordered, not date-locked. Durations are rough estimates for a small team and should be re-baselined after Phase 0.

---

## Phase 0 — Fork & Foundation (~1–3 weeks)

**Goal:** a rebranded, self-hostable EchoSEO running on Cloudflare, with the seams in place for later features.

- [x] Fork `every-app/open-seo`; import into this repo; add `upstream` remote for security/feature pulls.
- [x] Provision Cloudflare infra: D1, KV ×2, R2, Durable Objects, Workflows, cron.
- [x] Deploy **self-host mode** (`cloudflare_access`) end-to-end — live at `echoseo.ventrarocket.vn` behind Cloudflare Access.
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

- [ ] **Balanced UX:** polished dashboard + first-class agent panel (both first-class).
- [ ] **Bilingual VN + EN** across all shipped surfaces.
- [ ] Borrowed quick-wins (★ stack-native, mostly zero API cost):
  - [ ] Scheduled SERP rank loop refinement + change alerts (SerpBear pattern)
  - [ ] GSC-actuals reconciliation (overlay real clicks/impressions on tracked keywords)
  - [ ] Traffic-light real-time content analysis (client-side heuristics)
  - [ ] Severity-tiered audit issue taxonomy (critical/high/low) — P02 Rules KB seam; do not duplicate it in audit UI.
  - [ ] Private-by-default audit review; free public links never expose a workspace audit.

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
