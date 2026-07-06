# EchoSEO

> The open, agent-native SEO platform — comprehensive SEO tooling that _does the work_ and proves it against your own data, at bring-your-own-key cost.

EchoSEO is a self-hostable, open-core alternative to Semrush/Ahrefs. It is built by forking the excellent MIT-licensed [every-app/open-seo](https://github.com/every-app/open-seo) and extending it with a balanced dashboard + AI-agent experience, first-party data fusion (GSC/GA4/Bing), bilingual (🇻🇳/🇬🇧) support, and an open-core business model.

**Status:** Foundation / pre-fork. This repo currently holds the project definition, research, and roadmap. Code lands once the fork is set up (see roadmap Phase 0).

## Why EchoSEO

- **Agent-native, read-WRITE.** Not just "ask an MCP server for rankings" (every incumbent now does that, read-only). EchoSEO's agents run the full loop: keyword → brief → draft → on-page fix → GSC-monitored → refresh.
- **Your data, fused.** Combines paid competitive data (DataForSEO) with your own Search Console / GA4 / Bing ground truth in one agent context.
- **BYO-key economics.** ~$0.0006/SERP self-host cost undercuts $99–$500/mo suites by 1–2 orders of magnitude for targeted usage.
- **Open + self-hostable.** MIT core, no lock-in. Free to self-host; managed cloud when you want the convenience.
- **Bilingual.** Vietnamese and English from day one.

## Feature scope

| Area                                         | MVP | V1  | Later |
| -------------------------------------------- | :-: | :-: | :---: |
| Keyword research + clustering                | ✅  |     |       |
| Rank tracking (global)                       | ✅  |     |       |
| Backlinks                                    | ✅  |     |       |
| Site audit + Core Web Vitals                 | ✅  |     |       |
| Competitor / domain overview                 | ✅  |     |       |
| GSC integration                              | ✅  |     |       |
| MCP server + agent skills (assisted)         | ✅  |     |       |
| AI-search visibility (basic)                 | ✅  |     |       |
| Bilingual VN + EN                            | ✅  |     |       |
| Content optimization engine                  |     | ✅  |       |
| Scheduled/deep technical audit               |     | ✅  |       |
| Local + SERP-feature rank tracking           |     | ✅  |       |
| GA4 + Bing integrations                      |     | ✅  |       |
| White-label reporting                        |     | ✅  |       |
| Managed cloud (PAYG) + read-write agent loop |     | ✅  |       |
| Programmatic SEO engine                      |     |     |  ✅   |
| Fully autonomous agent pipelines             |     |     |  ✅   |

See `docs/project-roadmap.md` for the full plan.

## Tech stack (inherited from OpenSEO)

- **App:** TanStack Start (React 19), Vite 7, Tailwind 4 + daisyUI 5, TypeScript
- **Runtime:** Cloudflare Workers + D1 (SQLite) + Durable Objects + Workflows + KV + R2
- **ORM:** Drizzle · **Auth:** Better Auth (+ Cloudflare Access / local modes)
- **AI:** Vercel AI SDK 6 + OpenRouter · **MCP:** `@modelcontextprotocol/sdk`
- **SEO data:** DataForSEO (BYO-key) + GSC/GA4/Bing (first-party)

## Repository layout (current)

```
CLAUDE.md                     Project contract (always-loaded)
README.md                     This file
docs/                         Product, roadmap, marketing docs
plans/                        Plans + research reports
  reports/                    Research synthesis + source reports
.claude/                      ClaudeKit engineer config, rules, skills
```

## Getting started (marketing/product workflows)

This is a ClaudeKit-managed project. Common next steps:

- Read the research: `plans/reports/research-summary-260703-1047-ventra-seo.md`
- Plan the fork: `/ckm:plan` — "Fork OpenSEO and set up EchoSEO foundation (Phase 0)"
- Personas & positioning: `/ckm:persona`, `/ckm:competitor`
- Content & SEO for our own site: `/ckm:seo`, `/ckm:write:blog`

## License

MIT (inherited from OpenSEO). See upstream terms; attribution retained.
