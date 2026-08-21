# EchoSEO — Roadmap

**Version:** 0.8 · **Date:** 2026-08-21 · **Status:** M0 complete. Free SEO Checker and the Professional Site Audit are deployed in production, and the Google-First Parity Sprint (13–31/08) delivered all 12 committed days: weekly report email, trust repair on the free report, GSC multi-site import, site dashboard cards, page-level competitor audit, and a measured 5,000-page crawl ceiling. Every GitHub issue is closed. Since 19/08: Search Console actuals now overlay tracked keywords, the Site Audit surface is bilingual, and the last hosted-vendor dependency (`@every-app/sdk`) is gone. Billing remains unlaunched. Remaining MVP work is dogfooding + hardening the inherited surfaces, translating the keyword/rank/domain surfaces, and the public OSS release; the content engine and read-write agent loop are unbuilt V1 goals.

**Known gaps that the checkboxes below do not show:**

- **Rank tracking cannot run a SERP check without a DataForSEO key**, and the company account has no balance. What a keyless workspace _does_ get, as of 21/08: Search Console actuals (clicks, impressions, 28-day average position) overlaid on the tracked keywords it already has, read straight from the connected property (`RankTrackingSearchActualsService`). That is Google's own measurement, not a substitute for a point-in-time SERP rank, and the UI says so — the two are never blended. Two limits are stated in the UI rather than hidden: a truncated read renders `?` instead of `0`, and even a complete read is only "Google reported nothing for this query", because Search Console omits anonymized queries entirely no matter how far you paginate. `plans/260812-1320-gsc-first-rank-tracking/` stays parked (its premise was refuted on 12/08); the `rank_snapshots.source` column it designed is still unbuilt because nothing writes a GSC row into snapshots.
- **One sprint acceptance box is still unverified on production**: the weekly email's rendering on real mail clients (Gmail, Outlook, Apple Mail). Both Search Console boxes closed on 19/08 against a real grant — multi-site import created exactly +2 projects/connections/targets from two ticked properties and refused the already-bound ones, and the GSC numbers matched the Search Console UI exactly over an identical window (3 clicks / 244 impressions / position 17.0). A `report_subscriptions` row is now live, so the first real email goes out Monday 24/08 and is the sample for the remaining box.
- **i18n now covers the app shell, the Command Center, and the whole Site Audit surface** — 476 ids per catalog as of 21/08 (was 182), split per namespace under `src/client/i18n/messages/{en,vi}/`, with key parity enforced by types and pinned by `messages.test.ts`. Verified by rendering at `echoseo_locale=vi` and reading the screen, not by grepping for hardcoded strings: results, all-issues, competitors, route chrome, launch flow, verification banner, Search Console panels, setup banner and modal, plus the states a single completed audit never shows — the running crawl's progress card, the baseline selector and the page-changes and comparison panels. Dates and numbers go through `intl.formatDate`/`formatNumber` off a UTC-safe parse; before this they used a hardcoded `en-US` and read a D1 UTC timestamp as local time, printing 06:03 for a 06:03 **UTC** start. Already-bilingual outside react-intl: the free-check report, the weekly report email, and the audit PDF/DOC report, each with its own copy dictionary. **Still English:** rank tracking, search performance, keyword research, saved keywords, domain overview, backlinks, brand lookup, prompt explorer, the AI workspace — and the server rule catalogue (`src/server/lib/seo-rules/`), whose prose the UI now labels "guidance shown in English" wherever it surfaces, the same disclosure the rendered report already makes. So the "Bilingual VN + EN across all shipped surfaces" box stays unticked, but the largest single surface is done.
- **A URL-prefix Search Console property only covers its own path**, and until 21/08 the code claimed otherwise: `propertyCoversOrigin` compared protocol and host and documented "a path is ignored". Three surfaces trusted that. The audit's search signals and index status showed `/shop/`-only numbers as whole-site numbers; the rank overlay would have reported a confident zero for keywords whose traffic lands on another path; and GSC site import mapped such a property to a whole-origin project while telling the user "scoped to /shop/, crawls the whole site" — a promise Search Console never keeps. The gate now requires a root prefix, all three refuse instead of guessing, and site import gives the real reason on the row. `propertyProvesOwnership` is unchanged: ownership legitimately follows the host tree, which is why the two questions are separate functions.
- **Crawl throughput is now bounded by the target site, not by our control law.** The crawler controls an offered rate in req/s and spaces requests inside a batch (#85, #86, #87): a 5,000-page production crawl records 0 × 429 and the site answers 3.4× faster (341 ms vs 1,181 ms), but wall time is unchanged at ~46 min because the measured per-IP tolerance for that site's deep pages is ~2.8 req/s, not the 3-4 req/s #76 assumed from a probe of one cached URL. #76's "~24 min" acceptance box is therefore contested with evidence rather than ticked, and the follow-up (#88) is that refusal pressure is no longer visible in the workflow trace.

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
- [x] Strip/gate hosted-only couplings behind hosted flag: PostHog, Reddit-attribution, Loops, Autumn billing, Svix (upstream already gated all network-firing paths behind the `hosted` auth mode; added reddit lib/client guards + self-host no-op tests). _(→ `@every-app/sdk` dropped 21/08: its only use was `getLocalD1Url` in `drizzle.config.ts`, now `scripts/local-d1.ts` — which also fixes the inherited bug of resolving whichever `.wrangler/**.sqlite` the directory listing returned first, in practice the Cache object's rather than D1's.)_
- [x] **i18n scaffolding (VN + EN):** react-intl wired into TanStack Start, shell strings extracted, Vietnamese seed catalog (machine-translated, flagged for review). _(Net-new vs OpenSEO.)_
- [x] Introduce a thin **DataForSEO provider-abstraction** seam (`src/server/lib/seo-data`, no behavior change).
- [ ] Verify: DataForSEO ToS on multi-tenant resale; team Cloudflare fluency. _(Business/legal — logged as tracked open decisions.)_

**Exit:** ✅ **M0 met (2026-07-07)** — EchoSEO-branded app deploys self-host on Cloudflare (Access-enforced), bilingual shell live, upstream tracked. Open follow-ups: `web/` marketing-site rebrand, DataForSEO resale-ToS answer, team CF fluency sign-off.

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
- [~] **Bilingual VN + EN** across all shipped surfaces — shell, Command Center and the full Site Audit surface done (476 ids); the keyword, rank, domain and AI-visibility surfaces are still English. See the i18n note at the top for the exact split.
- [~] Borrowed quick-wins (★ stack-native, mostly zero API cost):
  - [ ] Scheduled SERP rank loop refinement + change alerts (SerpBear pattern) — _blocked with rank tracking itself on a DataForSEO key or a GSC rank source._
  - [x] GSC-actuals reconciliation (overlay real clicks/impressions on tracked keywords) — shipped 21/08: three source-labelled columns + a note naming the property and window; an absent keyword renders as a measured zero only when the whole query set was read, otherwise as unknown; CSV/Sheets export carries the window in its headers.
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
