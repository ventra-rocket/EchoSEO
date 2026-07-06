# EchoSEO — Project Contract

Always-loaded context for this project. Keep short; deeper detail lives in `docs/`.

## Communication

- **Always communicate with the user in Vietnamese (Tiếng Việt).** Explanations, summaries, questions, and status updates are in Vietnamese. Keep code, identifiers, commit messages, file/branch names, and technical docs in `docs/`/`plans/` in English unless asked otherwise.

## What EchoSEO Is

An **open, agent-native SEO platform** — a comprehensive, self-hostable alternative to Semrush/Ahrefs built by **forking [every-app/open-seo](https://github.com/every-app/open-seo)** (MIT) and extending it. Ventra pairs a polished SEO dashboard with a first-class AI-agent layer that *does the work* (keyword → brief → draft → on-page fix → monitor) and proves it against the user's own Google Search Console / GA4 data — at bring-your-own-key data cost.

## Core Decisions (2026-07-03)

- **Base:** Fork OpenSEO; track upstream as a git remote for security/feature pulls.
- **Runtime:** Cloudflare-native — Workers (workerd) + **D1/SQLite** + Durable Objects + Workflows + KV + R2. App = **TanStack Start (React 19)**, one unified Worker. Tailwind 4 + daisyUI 5. Drizzle ORM.
- **Data:** **DataForSEO** primary aggregator (BYO-key) behind a thin provider-abstraction; free first-party fusion via **GSC + GA4 + Bing Webmaster**. Avoid SerpApi (active Google DMCA suit).
- **AI/agents:** Vercel AI SDK 6 + OpenRouter; **MCP server** (18 tools) + portable **agent skills**. MVP = assisted skills; autonomous read-write pipelines come V1+.
- **i18n:** **Bilingual Vietnamese + English from day one** (net-new vs OpenSEO, which is English-only).
- **Posture:** Balanced — dashboard and agent layer are both first-class.
- **Business model:** Open-core — free self-host (BYO-key) → managed cloud PAYG credits (20–40% transparent markup) → team seats for collaboration only. License: MIT.

## Docs

- `docs/project-overview-pdr.md` — product definition, scope, personas, KPIs, architecture.
- `docs/project-roadmap.md` — phased roadmap (Fork/Foundation → MVP → V1 → Later) + milestones.
- `docs/marketing-overview.md` — positioning, GTM, pricing, channels.
- `plans/reports/research-summary-260703-1047-ventra-seo.md` — the research this project is grounded in (+ 4 source reports).

## Engineering Rules

- Follow the ClaudeKit engineer contract and on-demand references in `.claude/rules/` (`development-rules.md`, `primary-workflow.md`, `orchestration-protocol.md`, `review-audit-self-decision.md`, `documentation-management.md`).
- YAGNI › KISS › DRY. Do not chase backlink-index depth or PPC/social breadth (out of scope).
- Prefer forking + extending OpenSEO's proven layers over rebuilding. Keep the DataForSEO/MCP/skills seams clean.
- Plans → `plans/`, docs → `docs/`. Conventional commits, no AI references.
