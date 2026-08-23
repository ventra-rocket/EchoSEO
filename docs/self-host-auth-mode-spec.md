# AUTH_MODE: the build-time / runtime split

`AUTH_MODE` decides who EchoSEO trusts. It is read in two places, from two
different sources, and they can disagree. This document is the contract for
keeping them aligned, and `scripts/deploy-preflight.mjs` enforces it.

## The three modes

- **`hosted`** — Better Auth sessions (email/password, Google) with per-user
  signup. `resolveHostedContext`, `src/middleware/ensure-user/hosted.ts`.
- **`cloudflare_access`** — Cloudflare Access, validated from the
  `cf-access-jwt-assertion` JWT. `resolveCloudflareAccessContext`,
  `src/middleware/ensure-user/cloudflareAccess.ts`.
- **`local_noauth`** — nobody; one implicit `local-admin` user, for a trusted
  local machine. `resolveLocalNoAuthContext`,
  `src/middleware/ensure-user/delegated.ts`.

Dispatch: `src/middleware/ensure-user/resolve.ts:14`. An unset or invalid value
fails closed to `cloudflare_access` (`src/lib/auth-mode.ts:5-11`) — never to
public signup.

## Why the value is read twice

**Runtime (server).** `env.AUTH_MODE`, from the Worker environment. Committed in
`wrangler.jsonc` `vars`, or set as a Worker secret/var, or forwarded by Compose.

**Build time (client).** `import.meta.env.AUTH_MODE`, inlined into the public
client bundle by Vite because `AUTH_MODE` is listed in `envPrefix`
(`vite.config.ts:20-22`). The client needs it before its first request in order
to render the right auth UI, so `isHostedClientAuthMode()`
(`src/lib/auth-mode.ts:17-24`) reads the baked constant rather than paying a
startup round-trip to ask the server.

That is a deliberate trade, and it is the whole hazard: the build reads
`.env`/`.env.local`/`.env.<mode>` — all gitignored (`.gitignore:15-17`) — while
the runtime reads a committed config. Nothing in Vite, wrangler, or TypeScript
compares the two.

## What a mismatch actually breaks

A build with no `.env.local` — a fresh clone, CI, a second maintainer's laptop —
inlines nothing, so the client fails closed to `cloudflare_access` while the
Worker still runs `hosted`. The server authenticates paying customers; the UI
renders the self-host product:

- `src/client/features/billing/HostedPlanGate.tsx:12-24` — hands every visitor
  `isFreePlan: false`. The paywall is gone.
- `src/client/features/auth/AuthPage.tsx:21-23` — hosted sign-in copy and the
  Google button disappear.
- `src/client/lib/posthog.ts:13` — product analytics silently stop.
- `src/client/features/gsc/startGscLink.ts:26` — Search Console linking takes
  the self-hosted OAuth path on a hosted deployment.

None of this errors. It just serves the wrong product.

## The names that must agree

Any name that is both in `wrangler.jsonc` `vars` and matched by `envPrefix` is
declared twice and can drift. Today:

- `AUTH_MODE` — runtime `wrangler.jsonc:19`, build-time `.env.local` /
  `.env.<mode>`
- `GOOGLE_AUTH_ENABLED` — runtime `wrangler.jsonc:55`, build-time `.env.local` /
  `.env.<mode>`
- `TURNSTILE_SITE_KEY` — runtime `wrangler.jsonc:58`, build-time `.env.local` /
  `.env.<mode>`

Do not maintain this list by hand — the preflight derives it.

## The guard

```sh
pnpm run deploy:preflight            # checks the "production" Vite mode
pnpm run deploy:preflight -- --mode selfhost
```

`scripts/deploy-preflight.mjs` reads `envPrefix` from `vite.config.ts` with
Vite's own config loader, resolves the build-time values with Vite's own
`loadEnv`, reads `vars` with wrangler's own config reader, intersects the two
name sets, and exits non-zero on any difference. Because both halves come from
the tools that own them, the check cannot drift from what really ships.

`pnpm run deploy` runs it first, before the remote migration and before the
multi-minute build, so a misconfiguration costs two seconds instead of a bad
release.

## Docker self-host

`compose.yaml` pins `AUTH_MODE=local_noauth` and forwards it into the container,
where `docker-entrypoint.sh` runs `vite build` at container start. Build and
runtime read the same process environment there, so they cannot disagree — which
is why the container builds on start instead of at image-build time. The
entrypoint fingerprints exactly the `envPrefix` names and skips the rebuild when
none of them changed.
