# Contributing to EchoSEO

EchoSEO is a fork of [`every-app/open-seo`](https://github.com/every-app/open-seo)
(MIT). It has diverged substantially — bilingual UI, a DataForSEO provider seam,
its own audit engine — and it stays **D1-only**. Read
[`AGENTS.md`](../AGENTS.md) before your first change; it is the short list of
things this project will not accept.

See [`LOCAL_DEVELOPMENT.md`](./LOCAL_DEVELOPMENT.md) for how to run the app.

## Reproducible checks

Run the same checks CI runs ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)),
in this order, before requesting review:

```sh
pnpm install --frozen-lockfile
pnpm run ci:check   # deps:check + prettier + knip + tsc + oxlint
pnpm run test:ci
```

If you changed the marketing site under `web/`:

```sh
pnpm --dir web install --frozen-lockfile
pnpm --dir web run types:check
pnpm --dir web run build
```

If you changed anything under `Dockerfile.selfhost`, `docker-entrypoint.sh`, or
`compose.yaml`, build the self-host image the way CI does:

```sh
docker build -f Dockerfile.selfhost -t echoseo:local .
```

`pnpm run ci:check` is not optional and not advisory. `deps:check` fails on a
lockfile that does not match `package.json`, `knip` fails on dead exports, and
`oxlint --type-aware` needs a clean `tsc` first — so run the whole thing rather
than the piece you think you affected.

## Pull requests

- One feature or fix per PR. Split refactors out of behaviour changes.
- For anything larger than a bug fix, open an issue first and agree the approach
  before writing code. A rejected design costs less as a paragraph.
- Say what you actually verified. "Ran the audit against `example.com` and the
  export PDF rendered" is worth more than a green checkmark; a screenshot or a
  short screen recording of a UI change is worth more again.
- Do not commit generated output, `.env*` files, or anything under `dist/`.

## Things this project will reject

These are settled decisions, not preferences to relitigate in review:

- **Every user-visible string is bilingual.** Add the id to
  `src/client/i18n/messages/en/<namespace>.ts` **and**
  `src/client/i18n/messages/vi/<namespace>.ts`. The Vietnamese catalog is typed
  `Record<keyof typeof en, string>`, so a missing key fails `tsc`, and
  `src/client/i18n/no-hardcoded-strings.test.ts` fails a raw English literal in
  a converted surface. Vietnamese keeps SEO/product/metric nouns in English.
- **No new analytics, telemetry, or phone-home.** No GA4, no Bing Webmaster, no
  usage heartbeat. A self-hosted EchoSEO talks to nothing we run.
- **D1 only.** No Postgres, no Hyperdrive. A schema change is an additive
  Drizzle migration in `drizzle/` — never a rename or a drop — and the PR must
  state the rollback.
- **Read-only product boundary.** Agents and integrations read; they do not
  write to a customer's site and there is no publishing surface.
- **Reuse the existing error code** in `src/shared/error-codes.ts` before adding
  one, and map it for humans in `src/client/lib/error-messages.ts`.
- **DataForSEO access goes through the provider seam** in
  `src/server/lib/seo-data/`. Do not reach for `dataforseo-client` directly.

## Deploying

`pnpm run deploy` runs `deploy:preflight` first, which fails in about two
seconds if the client bundle would bake a different `AUTH_MODE`,
`GOOGLE_AUTH_ENABLED`, or `TURNSTILE_SITE_KEY` than the Worker runs with. If it
fires, read [`self-host-auth-mode-spec.md`](./self-host-auth-mode-spec.md)
rather than working around it — the two values genuinely disagree, and shipping
anyway serves the wrong product.

## Upstream

Upstream fixes are ported by hand, never merged or cherry-picked: the trees have
diverged far enough that a patch will not apply, and forcing one has broken this
repo before. Read the upstream diff, find the equivalent code here, and write
the change in our shape. Note the upstream SHA in the commit message so the next
person can tell a port from an original.

## Releases

Maintainer-only; see [`MAINTAINERS.md`](./MAINTAINERS.md).
