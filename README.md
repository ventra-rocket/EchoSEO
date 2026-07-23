# EchoSEO

> The open, agent-native SEO platform — SEO tooling that _does the work_ and **proves it** against your own data, at bring-your-own-key cost.

EchoSEO is a self-hostable, open-core alternative to Semrush/Ahrefs, built by **[VentraRocket](https://echoseo.ventrarocket.vn)**. It stands on the excellent MIT-licensed [every-app/open-seo](https://github.com/every-app/open-seo) base and extends it with a free public SEO checker, a professional site audit that verifies its own fixes, first-party Google Search Console data fusion, and bilingual (🇻🇳/🇬🇧) support — all Cloudflare-native and self-hostable.

**Status:** Alpha, actively developed. The free SEO checker and the professional site audit are built and running in production ([echoseo.ventrarocket.vn](https://echoseo.ventrarocket.vn)); the inherited keyword/rank/backlink/competitor surfaces come from the open-seo base and work with your own DataForSEO key. Not a 1.0 release yet — see [Roadmap](docs/project-roadmap.md) for what is shipped vs. planned.

## Why EchoSEO

- **An audit that proves the fix.** Not just a list of issues: EchoSEO re-crawls the site to verify each fix actually landed (resolved / still-present / regressed), cites the relevant Google guidance per issue, and scores GEO / AI-search readiness separately.
- **A free SEO checker that is a real product.** A public instant on-page check plus an email-gated deep check (Google PageSpeed Insights + our own bounded crawl) — $0 marginal cost per check, delivered as an emailed report and a shareable link. It doubles as a live demo of the audit engine.
- **BYO-key economics.** Paid competitive data (DataForSEO) runs at your own cost behind a thin provider seam — undercutting $99–$500/mo suites by 1–2 orders of magnitude for targeted usage.
- **Agent-native.** An 18-tool MCP server + portable agent skills let Claude Code (or any MCP client) run **assisted** SEO workflows against your data. (The fully autonomous read-write loop is the V1 goal, not shipped yet — see roadmap.)
- **Open + self-hostable.** MIT core, Cloudflare-native, no lock-in. Free to self-host with your own keys; a managed cloud tier is planned.
- **Bilingual.** Vietnamese and English (the public checker surfaces are fully localized; the dashboard is being localized incrementally).

## What's shipped vs. planned

Legend: ✅ built & deployed by EchoSEO · ◐ inherited from the open-seo base (present; bring your own DataForSEO key; not yet independently hardened as EchoSEO) · ○ planned

| Area                                                                             |       Status        |
| -------------------------------------------------------------------------------- | :-----------------: |
| Free SEO Checker — public Lite + email-gated Deep, shareable report              |         ✅          |
| Professional Site Audit — crawl snapshots, All Issues, per-URL AI remediation    |         ✅          |
| Audit history + GSC search-signal fusion, async ZIP export, evidence screenshots |         ✅          |
| Verified indexation — IndexNow submit, GSC index-status, re-crawl verification   |         ✅          |
| Bilingual VN + EN — public checker surfaces                                      |         ✅          |
| Keyword research (DataForSEO)                                                    |          ◐          |
| Rank tracking (global, scheduled)                                                |          ◐          |
| Backlinks · Competitor / domain overview                                         |          ◐          |
| GSC integration (search performance)                                             |          ◐          |
| MCP server (18 tools) + agent skills — assisted                                  |          ◐          |
| AI-search visibility (Brand Lookup + Prompt Explorer)                            |          ◐          |
| Managed cloud (hosted, PAYG credits, team seats)                                 | built, not launched |
| Keyword clustering                                                               |          ○          |
| Content optimization engine (briefs, entities, score, AI writing)                |        ○ V1         |
| Autonomous read-write agent loop                                                 |        ○ V1         |
| GA4 + Bing Webmaster integrations                                                |        ○ V1         |
| Local + SERP-feature rank tracking · White-label reporting                       |        ○ V1         |
| Dashboard VN localization · Programmatic SEO · Autonomous pipelines              |       ○ Later       |

See [`docs/project-roadmap.md`](docs/project-roadmap.md) for the full plan.

## Tech stack

- **App:** TanStack Start (React 19), Vite, Tailwind 4 + daisyUI 5, TypeScript
- **Runtime:** Cloudflare Workers + D1 (SQLite) + Durable Objects + Workflows + KV + R2
- **ORM:** Drizzle · **Auth:** Better Auth (+ Cloudflare Access / local modes)
- **AI:** Vercel AI SDK 6 + OpenRouter · **MCP:** `@modelcontextprotocol/sdk`
- **SEO data:** DataForSEO (BYO-key) + Google PageSpeed Insights + GSC (first-party)

## Self-hosting

EchoSEO deploys as a single Cloudflare Worker.

- **Cloudflare (recommended):** [`docs/SELF_HOSTING_CLOUDFLARE.md`](docs/SELF_HOSTING_CLOUDFLARE.md)
- **Docker:** [`docs/SELF_HOSTING_DOCKER.md`](docs/SELF_HOSTING_DOCKER.md)

Quick local start:

```bash
corepack enable
pnpm install
pnpm dev
```

You will need your own keys (DataForSEO for paid data, an OpenRouter key for the agent features). See the self-hosting guides for the full environment setup.

## Documentation

- [`docs/project-overview-pdr.md`](docs/project-overview-pdr.md) — product definition, personas, scope, architecture
- [`docs/project-roadmap.md`](docs/project-roadmap.md) — phased roadmap and milestones
- [`docs/marketing-overview.md`](docs/marketing-overview.md) — positioning, GTM, pricing

## Relationship to open-seo

EchoSEO is a friendly fork of [every-app/open-seo](https://github.com/every-app/open-seo) (MIT). We track it as a git remote and pull security/feature updates upstream where they fit. Net-new EchoSEO work — the free public checker, the professional site audit and its verification loop, bilingual support, and the hosted collaboration layer — is layered on top. Credit for the base platform goes to its authors.

## License

MIT. See [`LICENSE`](LICENSE). EchoSEO is © VentraRocket; the upstream open-seo copyright is retained alongside it, both preserved per the MIT terms.
