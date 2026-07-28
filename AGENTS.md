# EchoSEO Project Contract

## Product

EchoSEO is an open, agent-native SEO platform built on the MIT-licensed
`every-app/open-seo` base. It pairs a self-hostable dashboard with MCP and
assisted agent workflows, first-party Search Console data, and Vietnamese plus
English public surfaces.

## Engineering decisions

- Runtime: Cloudflare Workers, D1, Durable Objects, Workflows, KV, and R2.
- SEO data: user-provided DataForSEO credentials behind a provider seam;
  Search Console is first-party data.
- Product boundary: assisted workflows are read-only until an explicit,
  guarded publishing surface is designed. Do not introduce managed billing,
  GA4/Bing, or autonomous writes incidentally.
- Compatibility: preserve deployed Cloudflare resource names, database schema,
  Durable Object migrations, stored-state keys, and crypto salts unless a
  migration and rollback plan is included.

## Working agreement

- Communicate with contributors in Vietnamese; keep code, identifiers, commit
  messages, and technical docs in English.
- Read `README.md`, relevant `docs/`, and active plans before implementation.
- Prefer small, testable changes. Follow YAGNI, KISS, then DRY.
- Keep plans in `plans/`, evergreen docs in `docs/`, and use conventional
  commits without AI references.
- Never commit secrets, environment files, customer exports, or private data.
- Run focused tests first, then full relevant quality gates before deploy.

## Source of truth

- `docs/project-overview-pdr.md` — product definition and boundaries.
- `docs/project-roadmap.md` — shipped versus planned work.
- `docs/SELF_HOSTING_CLOUDFLARE.md` — production deployment and recovery.
