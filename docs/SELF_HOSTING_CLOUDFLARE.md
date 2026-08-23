# Cloudflare Self-Hosting

## Which path

**Use [Manual deploy with Wrangler](#manual-deploy-with-wrangler).** It is the
path this project deploys production with, and the only one that provisions
D1/KV/R2 reliably.

The [Deploy to Cloudflare button](#deploy-to-cloudflare-button-legacy) is kept
for people who already used it. Do not start there: it cannot create the D1
database, KV namespaces, R2 bucket, or the Access application, so it routinely
dies on `Cannot provision a KV Namespace with the title "open-seo" because it
already exists` and leaves you hand-finishing the rest. Upstream shipped that
button, spent months patching it (`3a94f02a`, 2026-07-20, "unbreak the Deploy to
Cloudflare button"), then retired it outright (`ffb5c9d9`, 2026-07-29) and
declared migration off it unsupported. See [Why not
Alchemy](#why-not-alchemy) for what they replaced it with and why we have not
followed yet.

This guide covers:

1. [Manual deploy with Wrangler](#manual-deploy-with-wrangler)
2. [How to run a public hosted SaaS](#run-a-public-hosted-saas)
3. [How to connect the EchoSEO MCP server through Cloudflare Access](#connect-the-mcp-server-through-cloudflare-access)
4. [How to update to the latest EchoSEO version](#how-to-update-to-the-latest-echoseo-version)
5. [How to add teammates](#give-teammates-access-to-echoseo)
6. [Why not Alchemy](#why-not-alchemy)
7. [Deploy to Cloudflare button (legacy)](#deploy-to-cloudflare-button-legacy)

## Deploy to Cloudflare button (legacy)

> **Legacy.** Prefer [Manual deploy with Wrangler](#manual-deploy-with-wrangler).
> What follows is maintenance for deployments that already exist. The
> [feature-key table](#feature-keys-and-safe-degradation) and the [R2 lifecycle
> rule](#3-optional-add-an-r2-lifecycle-rule) below apply to both paths.

### 1) Deploy from GitHub

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ventra-rocket/EchoSEO)

Click the deploy button, there are lots of fields on the deploy form, but you only need to do the below steps.

> **Note:** Select the authentication model before configuring the domain.
> `AUTH_MODE=hosted` is for a public SaaS where customers create their own
> accounts. `AUTH_MODE=cloudflare_access` is only for a private self-hosted
> deployment managed through Cloudflare Access.

1. Connect your Git provider (GitHub/GitLab).
2. Leave the resource naming fields as default unless you have a reason to change them.
3. Click `Create and Deploy`.
4. Wait 1-2 minutes for deployment to finish.

If deploy fails with `Cannot provision a KV Namespace with the title "open-seo" because it already exists`, use the [manual deploy with Wrangler](#manual-deploy-with-wrangler) flow instead.

### 2) Configure authentication and secrets

For a public SaaS, follow [Run a public hosted SaaS](#run-a-public-hosted-saas)
instead. Do not enable Cloudflare Access for the same hostname: it intercepts
visitors before EchoSEO can show its own sign-up and sign-in pages.

For a private Cloudflare Access deployment:

In the Cloudflare dashboard:

1. Go to `Compute` -> `Workers & Pages` -> your EchoSEO Worker.
2. Open `Settings`.
3. In `Domains & Routes`, enable `Cloudflare Access` for the `workers.dev` route.
4. Save the values shown by Cloudflare Access.
5. In `Variables & Secrets`, add:
   - `POLICY_AUD` (from Access setup)
   - `TEAM_DOMAIN` (domain from `JWKS_URL`, for example `https://your-team.cloudflareaccess.com`)

### Feature keys and safe degradation

Set secrets in Workers **only for the features you enable**. Do not put values
in `wrangler.jsonc` or commit local environment files.

| Feature                                              | Required secret / variable                                            | When missing                                                                              |
| ---------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Competitive keyword, rank, backlink, and domain data | `DATAFORSEO_API_KEY`                                                  | Data-backed screens ask the user to add their own key; no provider request is made.       |
| AI onboarding and assisted explanations              | `OPENROUTER_API_KEY`                                                  | AI surfaces show setup or skip optional explanations.                                     |
| Google Search Console                                | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET`      | The user cannot connect a Search Console property; existing dashboard features still run. |
| Public Lite checker                                  | `TURNSTILE_SECRET_KEY` plus public `TURNSTILE_SITE_KEY`               | Anonymous checks refuse requests rather than bypassing abuse protection.                  |
| Public Deep checker and screenshots                  | `GOOGLE_PSI_API_KEY`                                                  | Deep reports and PSI screenshots fail closed; Lite remains available.                     |
| Deep-check email delivery                            | `RESEND_API_KEY`, `FREE_CHECK_EMAIL_FROM`, `FREE_CHECK_PUBLIC_ORIGIN` | The report can complete but no email is sent; delivery logs explain the missing setup.    |

`FREE_CHECK_EMAIL_FROM` and `FREE_CHECK_PUBLIC_ORIGIN` may be committed Worker
variables for a single deployment, but must match the sender/domain you own.
Use Workers secrets for all credentials. See the dedicated
[Search Console guide](SELF_HOSTING_GOOGLE_SEARCH_CONSOLE.md) for OAuth setup.

> **Hosted safeguards:** when `AUTH_MODE=hosted` and
> `HOSTED_ACCESS_OPEN=true`, EchoSEO intentionally does not use the operator's
> global `DATAFORSEO_API_KEY`. Public organizations must add their own key in
> Settings. This prevents a future global key from silently becoming an
> unmetered operator-funded credential while billing and entitlements are
> bypassed. Non-hosted auth modes and hosted deployments with open access off
> retain the global-key behavior described above. In hosted mode, EchoSEO also
> limits Site Audit launches to 10 per organization per hour; `local_noauth`
> and `cloudflare_access` modes do not use this operator-protection throttle.

### 3) Optional: add an R2 lifecycle rule

DataForSEO API responses are cached in R2 under the `dataforseo-cache/` prefix. This step is optional, but recommended to automatically clean up expired cache objects:

```bash
npx wrangler r2 bucket lifecycle add open-seo dataforseo-cache-expiry dataforseo-cache/ --expire-days 7
```

If you changed the R2 bucket name during deploy, replace `open-seo` with your bucket name.

Without a lifecycle rule, cached objects under `dataforseo-cache/` will accumulate indefinitely and increase storage costs over time.

### 4) Validate private Access setup

1. Open your Worker URL again.
2. Sign in with Cloudflare Access.
3. EchoSEO should load after login.

If login fails, re-check the three secrets and Access toggle.

## Run a public hosted SaaS

Use this mode when customers must sign up and sign in directly at your domain.
It uses EchoSEO's Better Auth account flow and email verification; it does not
use Cloudflare Access.

1. In `wrangler.jsonc`, set `vars.AUTH_MODE` to `hosted` and set
   `vars.AUTH_EMAIL_FROM` to a verified Resend sender, for example
   `EchoSEO <noreply@example.com>`.
2. Add Workers secrets (never commit their values):

   ```bash
   pnpm exec wrangler secret put BETTER_AUTH_SECRET
   pnpm exec wrangler secret put BETTER_AUTH_URL
   pnpm exec wrangler secret put RESEND_API_KEY
   ```

   Set `BETTER_AUTH_URL` to your exact public origin, such as
   `https://echoseo.example.com`. Generate `BETTER_AUTH_SECRET` with at least
   32 random bytes.

3. Do **not** create or enable a Cloudflare Access Application for this public
   hostname. If one exists from an earlier private deployment, delete that
   application after the hosted Worker has been deployed.
4. Deploy with `AUTH_MODE=hosted pnpm run deploy` so the browser bundle and
   Worker use the same auth mode.
5. Open `/sign-up`, create a test account, complete the verification email,
   then sign in at `/sign-in`.

Google Search Console is optional. Add `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET` only when you are ready to offer that integration.
To offer Google sign-in, also set the public Worker variable
`GOOGLE_AUTH_ENABLED=true` and register
`https://YOUR_HOSTNAME/api/auth/callback/google` as the Google OAuth redirect
URI. Keep both Google credential values as Workers secrets.

## Connect the MCP server through Cloudflare Access

Use the same Cloudflare Access application that protects your EchoSEO Worker.
Managed OAuth is required for MCP clients and is not enabled by default.

1. Open Cloudflare Zero Trust.
2. Go to `Access controls` -> `Applications`.
3. Find your EchoSEO application, then select `Edit`.
4. Go to `Additional settings` -> `OAuth`.
5. Turn on `Managed OAuth`.
6. In `Managed OAuth settings`, allow the redirect URIs your MCP clients use:
   - Allow `localhost` / loopback clients — for CLI and desktop agents (Codex
     CLI, Claude Code) that register `http://localhost:PORT/callback`.
   - Add HTTPS redirect URIs for web connectors (a path may end in `/*`).
   - Without this, clients can't finish [Dynamic Client Registration](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/managed-oauth/)
     and log in but expose no tools.
7. Save.

MCP clients should connect to:

```text
https://YOUR_WORKER_HOSTNAME/mcp
```

## How to update to the latest EchoSEO version

If your repo was created from the Cloudflare Deploy button, use this flow.

### One-time setup

Run this once in your local repo. The remote points at **EchoSEO**, not the
open-seo base — resetting to the open-seo base would wipe every EchoSEO feature.

```bash
git remote add echoseo https://github.com/ventra-rocket/EchoSEO.git
git fetch echoseo
```

### Update steps (use every time)

```bash
git fetch echoseo
cp wrangler.jsonc wrangler.local.backup.jsonc
git checkout main
git reset --hard echoseo/main
cp wrangler.local.backup.jsonc wrangler.jsonc
git add wrangler.jsonc
git commit -m "restore Cloudflare settings" || true
git push --force-with-lease origin main
```

Why this is needed:

- `wrangler.jsonc` has your Cloudflare resource IDs.
- The update step keeps your IDs while pulling the newest EchoSEO code.
- `git reset --hard` discards local code edits — if you have customized EchoSEO
  beyond `wrangler.jsonc`, merge (`git merge echoseo/main`) instead of resetting.

## Give teammates access to EchoSEO

1. Open Cloudflare Zero Trust.
2. Go to Access -> Applications.
3. Open your EchoSEO application.
4. Edit the `Allow` policy.
5. Add teammate emails (or your company email domain / group).
6. Save.

Screenshots from the setup flow:

- [Edit the Access policy](https://github.com/user-attachments/assets/c7bbc7b4-a18e-4ae4-9fe5-3b33c72048a7)
- [Add teammate emails to the allow list](https://github.com/user-attachments/assets/fa4ecaf2-31f7-4a64-9001-210cf729747b)

After saving, teammates can open your EchoSEO URL and sign in through Cloudflare
Access.

> **Each Access user gets their own private workspace, not a shared one.** The
> Access JWT's `sub` becomes the user id, and that id becomes the workspace id
> (`src/middleware/ensure-user/cloudflareAccess.ts:73`,
> `src/server/auth/delegated-organization.ts:5-7` — `delegated-${userId}`).
> Teammates therefore see none of each other's projects, audits, or tracked
> keywords. Invite them into a workspace from inside the app if you want shared
> data. Upstream changed its default to one shared workspace per deployment
> (`17e7515e`); we have not, because folding existing per-user workspaces
> together is a destructive data merge, not a config flag.

## Manual deploy with Wrangler

This is the recommended path, and what this project deploys production with. It
is also the only way past the Deploy button's `Cannot provision a KV Namespace
with the title "open-seo" because it already exists`. You create the Cloudflare
resources yourself, put their IDs into `wrangler.jsonc`, then deploy with
Wrangler.

### 1) Clone your EchoSEO repo

Fork `ventra-rocket/EchoSEO` on GitHub if you want a repo you control for future updates, then clone it locally:

```bash
git clone https://github.com/YOUR_GITHUB_USER/EchoSEO.git
cd EchoSEO
corepack enable
pnpm install
```

If you do not need a fork, clone the EchoSEO repo directly instead:

```bash
git clone https://github.com/ventra-rocket/EchoSEO.git
cd EchoSEO
corepack enable
pnpm install
```

### 2) Log in to Cloudflare

```bash
pnpm exec wrangler login
```

### 3) Create Cloudflare resources

Use unique names so they do not collide with resources that already exist in your Cloudflare account. Replace `YOUR_SUFFIX` with something unique to you, for example your GitHub username or company name.

```bash
pnpm exec wrangler kv namespace create open-seo-YOUR_SUFFIX
pnpm exec wrangler kv namespace create open-seo-oauth-YOUR_SUFFIX
pnpm exec wrangler d1 create open-seo-YOUR_SUFFIX
pnpm exec wrangler r2 bucket create open-seo-YOUR_SUFFIX
```

Save the IDs and names printed by Wrangler:

- The first KV namespace ID is for the `KV` binding.
- The second KV namespace ID is for the `OAUTH_KV` binding.
- The D1 `database_id` is for the `DB` binding.
- The R2 bucket name is for the `R2` binding.

### 4) Edit `wrangler.jsonc`

Open `wrangler.jsonc` and replace only your Cloudflare resource values. Keep the binding names exactly as shown below, because the application code expects those names.

```jsonc
"kv_namespaces": [
  {
    "binding": "KV",
    "id": "YOUR_KV_NAMESPACE_ID",
  },
  {
    "binding": "OAUTH_KV",
    "id": "YOUR_OAUTH_KV_NAMESPACE_ID",
  },
],
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "open-seo-YOUR_SUFFIX",
    "database_id": "YOUR_D1_DATABASE_ID",
    "migrations_dir": "drizzle",
  },
],
"r2_buckets": [
  {
    "bucket_name": "open-seo-YOUR_SUFFIX",
    "binding": "R2",
  },
],
```

Do not use `wrangler deploy --update-config` for this step. Edit `wrangler.jsonc` manually so `"migrations_dir": "drizzle"` stays in the D1 database config.

### 5) Deploy

```bash
pnpm run deploy
```

### 6) Configure authentication and secrets

In the Cloudflare dashboard:

1. Go to `Compute` -> `Workers & Pages` -> your EchoSEO Worker.
2. Open `Settings`.
3. In `Domains & Routes`, enable `Cloudflare Access` for the `workers.dev` route.
4. Save the values shown by Cloudflare Access.

Then set the same values as Worker secrets with Wrangler:

```bash
pnpm exec wrangler secret put TEAM_DOMAIN
pnpm exec wrangler secret put POLICY_AUD
pnpm exec wrangler secret put DATAFORSEO_API_KEY
```

Use the domain from `JWKS_URL` for `TEAM_DOMAIN`, for example `https://your-team.cloudflareaccess.com`. Use the Access application audience value for `POLICY_AUD`.

### 7) Optional: add an R2 lifecycle rule

DataForSEO API responses are cached in R2 under the `dataforseo-cache/` prefix. This step is optional, but recommended to automatically clean up expired cache objects:

```bash
pnpm exec wrangler r2 bucket lifecycle add open-seo-YOUR_SUFFIX dataforseo-cache-expiry dataforseo-cache/ --expire-days 7
```

### 8) Validate setup

1. Open your Worker URL again.
2. Sign in with Cloudflare Access.
3. EchoSEO should load after login.

If login fails, re-check the three secrets, the Access toggle, and the binding values in `wrangler.jsonc`.

## Why not Alchemy

Upstream replaced the Deploy button with [Alchemy](https://alchemy.run) IaC
(`bd22268a` 2026-07-14, `ffb5c9d9` 2026-07-29, `625b76eb` 2026-07-29): a
declarative `alchemy.run.ts` stack behind one `pnpm deploy:selfhost`, which
provisions D1/KV/R2 and the Cloudflare Access application in a single command.
It is a genuinely better shape than a button, and it is the right long-term
direction for us too. We have not adopted it yet, for reasons that are about
cost and timing rather than design:

- **It is a beta toolchain, not a dependency.** Upstream pins
  `alchemy@2.0.0-beta.61`, `effect@4.0.0-beta.93`,
  `@effect/platform-node@4.0.0-beta.93`, and `@distilled.cloud/cloudflare@0.28.2`.
  That is four pre-1.0 packages, including Effect v4 betas, added to the
  lockfile that our working production deploy resolves from. Our
  `pnpm-workspace.yaml` also sets `minimumReleaseAge: 11520` (eight days), which
  these fast-moving betas trip.
- **Their URL derivation does not hold for us.** The stack names the Worker and
  the Access application from the account's `workers.dev` subdomain. We set
  `"workers_dev": false` and serve a custom domain (`wrangler.jsonc:64-67`), so
  every hostname the stack computes would be wrong for this deployment.
- **Half the stack is Postgres.** `DATABASE_PROVIDER`, the `HYPERDRIVE`
  connection, and the `deploy:postgres` stage exist because upstream migrated
  off D1. We are D1-only and staying D1-only, so that half is dead weight we
  would have to keep excising on every future port.
- **Our Worker has more surface to model.** Four Workflows, four SQLite-backed
  Durable Objects, Browser Rendering, and Turnstile
  (`wrangler.jsonc:68-134,171-173`) all need representing, and Alchemy is not the
  thing that runs local dev or the Docker self-host — so `wrangler.jsonc` stays
  the source of truth either way and the stack becomes a second place to keep in
  sync.

The button's actual failure was resource provisioning, and the manual Wrangler
flow above already solves that with tools we already ship. When Alchemy v2 goes
stable, the port is worth revisiting: read `alchemy.run.ts` on `upstream/main`,
drop the Hyperdrive/`DATABASE_PROVIDER` branches, and derive the runtime
contract from `wrangler.jsonc` the way upstream does — that anti-drift trick is
the genuinely good idea in their design.

What we did take from that work is the defect it exposed: a self-host deploy can
bake one `AUTH_MODE` into the client bundle while the Worker runs another
(upstream `f14aa4c7`). `pnpm run deploy` now refuses to ship that mismatch — see
[`self-host-auth-mode-spec.md`](self-host-auth-mode-spec.md).
