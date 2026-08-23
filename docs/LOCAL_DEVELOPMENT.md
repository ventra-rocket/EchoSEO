# Local Development

## Prerequisites

- Node.js 22+
- [Corepack](https://nodejs.org/api/corepack.html) (bundled through Node.js 24; install it separately on Node.js 25+)
- A DataForSEO account/API credentials

## Local Development Workflow

```sh
# Activates the exact pnpm version declared by package.json's `packageManager`.
corepack enable
pnpm install --frozen-lockfile

# Run once per fresh local DB
pnpm run db:migrate:local
```

Configure `.env.local`:

1. `cp .env.example .env.local`
2. Add `DATAFORSEO_API_KEY` as a base64-encoded `login:password` value:

   `printf '%s' 'YOUR_LOGIN:YOUR_PASSWORD' | base64`

Run locally:

```sh
# Option 1
pnpm run dev

# Option 2 (Recommended)
# This log file makes it easier for your coding agent to debug.
mkdir .logs
touch .logs/dev-server.log

# This command uses portless, which is great for worktrees. It also pipes logs to that fixed file, which is helpful for agent debugging output.
pnpm dev:agents
```

`pnpm dev:agents` runs through [portless](https://github.com/vercel-labs/portless) at `http://open-seo.localhost:1355` by default.

When using a git worktree, [portless](https://github.com/vercel-labs/portless) prefixes the branch name, for example `http://feature-name.open-seo.localhost:1355`.

## Database Commands

Generate migration:

```sh
pnpm run db:generate
```

Migrate local DB:

```sh
pnpm run db:migrate:local
```

## Auth Modes

- `AUTH_MODE=cloudflare_access`: validates Cloudflare Access JWTs (`cf-access-jwt-assertion`) using `TEAM_DOMAIN` + `POLICY_AUD`; use only for a private self-hosted instance.
- `AUTH_MODE=local_noauth`: local trusted mode, no auth check, injects `admin@localhost`.
- `AUTH_MODE=hosted`: Better Auth-backed public email/password mode. Requires `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, and `AUTH_EMAIL_FROM`.

Nothing sets `AUTH_MODE` for you: `pnpm dev` is a bare `vite dev`. The mode comes
from `.env.local`, which is both the build-time value Vite inlines into the
client bundle and — via `CLOUDFLARE_INCLUDE_PROCESS_ENV` — the runtime value the
Worker reads. Set `AUTH_MODE=local_noauth` there for ordinary local work, or
`AUTH_MODE=cloudflare_access` when you specifically want to exercise Access
validation. Both halves come from one file locally, so they cannot disagree —
see [`self-host-auth-mode-spec.md`](./self-host-auth-mode-spec.md) for why they
can on a deploy.

For a public Cloudflare deployment, set `AUTH_MODE=hosted` and do not protect
the public hostname with Cloudflare Access. For a private Access deployment,
provide `TEAM_DOMAIN` + `POLICY_AUD` instead.
