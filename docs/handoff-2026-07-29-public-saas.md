# EchoSEO Handoff — Public SaaS status

**Date:** 2026-07-29  
**Production:** `https://echoseo.ventrarocket.vn`  
**Worker:** `open-seo` · latest verified deployment `25ea08f3-7a90-47e6-a5e5-37ec9e3c2e63`  
**Current branch/worktree:** `feat/public-saas-auth` at commit `33c6d78`

## Executive summary

EchoSEO is an Alpha public SEO SaaS. Public Free SEO Checker and Professional
Site Audit are built and deployed. Customer email/password signup, Google
sign-in, email flows, and Cloudflare Turnstile are configured for the public
hostname. The product is no longer protected by Cloudflare Access.

Do not represent inherited OpenSEO surfaces as independently hardened EchoSEO
features. Keyword research, rank tracking, backlinks, competitor/domain,
GSC, MCP and AI-search are present but need dogfooding/hardening.

## Completed in this handoff

| Area                | Current state | Key implementation / config                                                                                                                                                              |
| ------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public auth         | Live          | `AUTH_MODE=hosted`; native Better Auth signup/sign-in replaces Cloudflare Access OTP.                                                                                                    |
| Email auth          | Live          | Verification, reset password, invitations use Resend. `AUTH_EMAIL_FROM` is a public Worker variable; API credentials remain secrets.                                                     |
| Google OAuth        | Live          | Google button is enabled only by `GOOGLE_AUTH_ENABLED=true`; credentials are Worker secrets. Callback URI is `https://echoseo.ventrarocket.vn/api/auth/callback/google`.                 |
| Cloudflare Access   | Removed       | Do **not** recreate an Access Application/policy for `echoseo.ventrarocket.vn`; it would block customer routes and reintroduce OTP.                                                      |
| Turnstile           | Live          | `TURNSTILE_SITE_KEY` is a public Worker variable; `TURNSTILE_SECRET_KEY` is an encrypted Worker secret. Public checker reads the site key at Worker runtime, not at frontend build time. |
| Free Checker config | Fixed         | `GET /api/free-seo-check/config` exposes only the public Turnstile site key. It bypasses TanStack server-function auth intentionally.                                                    |
| Production release  | Live          | Latest Worker release is listed above. No migrations were pending during deploy.                                                                                                         |

## Important implementation constraints

### Authentication

- Production must keep `AUTH_MODE=hosted`.
- Keep `echoseo.ventrarocket.vn` publicly reachable over HTTPS; `/sign-up` and
  `/sign-in` are customer routes.
- Required Worker secrets: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
  `RESEND_API_KEY`; Google additionally needs `GOOGLE_CLIENT_ID` and
  `GOOGLE_CLIENT_SECRET`.
- Never commit or print any secret. The Google client secret was shared in an
  earlier chat, so Boss should rotate it in Google Cloud Console and update the
  Worker secret afterward.

### Turnstile

- Site key is intentionally public; secret key must never reach browser code,
  `wrangler.jsonc`, dotenv committed to git, or documentation values.
- `createServerFn` is globally authenticated in this app. Any anonymous
  endpoint must be dispatched from `src/server.ts` before the TanStack auth
  pipeline. This is why `/api/free-seo-check/config` is a raw Worker endpoint.
- The config endpoint only returns `{ "turnstileSiteKey": string | null }`.
  It must never become a generic public config dump.
- The Live browser test verified the runtime config response, no missing-key
  warning, Turnstile script injection and a widget iframe. Headless browsers
  are expected to be denied a valid Turnstile token, so they cannot prove
  Siteverify end-to-end.

## Key files

| Responsibility                   | Files                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| Deploy/config variables          | `wrangler.jsonc`, `worker-configuration.d.ts`, `.env.example`, `docs/deployment.md` |
| Public checker routes            | `src/server.ts`, `src/shared/free-seo-check.ts`                                     |
| Public Turnstile config endpoint | `src/server/services/seo-check/public-config.ts`                                    |
| Runtime site-key hook            | `src/client/features/free-seo-check/use-turnstile-site-key.ts`                      |
| Lite and Deep UI                 | `src/client/features/free-seo-check/FreeSeoCheckLanding.tsx`, `DeepRequestForm.tsx` |
| Auth UI/config                   | `src/client/features/auth/AuthPage.tsx`, `src/env.d.ts`, `src/lib/auth.ts`          |

## Verification already run

| Check                       | Result                                                                  |
| --------------------------- | ----------------------------------------------------------------------- |
| Focused public-config tests | 2/2 passed                                                              |
| Full unit suite             | 161 files, 1214 tests passed                                            |
| Build                       | `pnpm run build` passed                                                 |
| Static CI                   | `pnpm run ci:check` passed (Prettier, knip, TypeScript, oxlint)         |
| Production config           | `GET /api/free-seo-check/config` returns the configured public Site key |
| Production browser          | Missing-key warning gone; Turnstile script and iframe appear            |

Expected test logs include simulated error-path messages from tests. They are
not production failures when Vitest exits successfully.

## How to deploy safely

```bash
pnpm test
pnpm run ci:check
AUTH_MODE=hosted pnpm run deploy
pnpm exec wrangler deployments list --name open-seo
```

After any `wrangler.jsonc` binding/variable change, run:

```bash
pnpm run cf-typegen
```

Then commit generated `worker-configuration.d.ts` if it changed. Do not push
secrets with git. See `docs/deployment.md` for rollback details.

## Immediate manual production checks (P0)

1. In a normal browser (not headless), open `/free-seo-check`, enter a benign
   domain such as `example.com`, and submit once. A report should return. This
   confirms the configured Turnstile secret matches the widget Site key and
   clears Cloudflare's “Siteverify isn't being called” warning after traffic
   reaches the endpoint.
2. Test `/sign-up` with a disposable test inbox: register, receive verification
   email, verify, sign in, sign out, then reset password.
3. Test **Continue with Google** using a non-admin Google account. Confirm the
   callback returns to EchoSEO and creates/uses the expected account.
4. Check Cloudflare Worker logs for `free-seo-check` errors and Resend delivery
   events after the above tests. Do not treat a successful UI redirect alone as
   proof of delivery.

If the Free Checker returns a Turnstile error after a real browser submit,
replace the Worker secret with the matching secret shown inside the same
Cloudflare Turnstile widget configuration, then retest. Never add the secret
to `wrangler.jsonc`.

## Recommended development order

### P1 — launch hardening and dogfooding

- Run end-to-end product journeys for inherited Keyword, Rank Tracking,
  Backlinks, Competitor/Domain, GSC, MCP, Brand Lookup and Prompt Explorer.
- Log failures as reproducible issues; fix public-contract, auth/tenant,
  billing/credit, provider-error, and data-integrity faults before visual
  polish.
- Dogfood Command Center and read-only Assisted AI Workspace in production.
- Review dashboard Vietnamese strings; public checker VN/EN is already live,
  dashboard localization remains partial.
- Add production observability/alert criteria for Worker exceptions, Resend
  failures, Turnstile failures, D1/Workflow failures, and provider cost spikes.

### P2 — MVP launch readiness

- Publish OSS release material: clean self-host onboarding, one-click
  Cloudflare deploy flow, accurate docs, licensing/upstream attribution.
- Finish quick wins from `docs/project-roadmap.md`: rank-change alerts,
  GSC-actual reconciliation, client-side content traffic lights, audit severity
  taxonomy.
- Resolve business/legal gate: confirm DataForSEO multi-tenant resale terms
  before selling managed credits.
- Make a deliberate launch decision for managed billing/team collaboration;
  infrastructure exists but billing is not launched.

### P3 — V1 scope, only after P1/P2 evidence

- On-page content optimization engine.
- GA4 and Bing Webmaster integrations.
- Local/SERP-feature rank tracking and white-label reporting.
- Read-write agent loop only with CMS scope, guardrails, audit log and eval
  harness. Do not enable autonomous publishing without those controls.

## Non-goals / guardrails

- No PPC/social suite, backlink-index ownership, proxy-fleet scraping, or broad
  “all-in-one marketing” expansion.
- Keep DataForSEO behind the existing provider abstraction; do not couple new
  product surfaces directly to a vendor implementation.
- Public Free Checker reports must not expose authenticated workspace audits or
  customer data.
- Prefer Cloudflare-native primitives: Workers, D1, KV, R2, Durable Objects,
  Workflows and cron.
- Preserve bilingual VN/EN behavior for every new public user-facing surface.

## Recent commits

| Commit    | Meaning                                                                    |
| --------- | -------------------------------------------------------------------------- |
| `33c6d78` | Configured production Turnstile widget and public runtime config endpoint. |
| `cf02f8a` | Enabled Google sign-in with public feature flag and secret credentials.    |
| `5dc6ccc` | Enabled public hosted authentication and Resend auth email flow.           |
| `e37960f` | Added Command Center and assisted workspace.                               |

## Unresolved questions

- Does a real browser submission pass Turnstile Siteverify with the current
  secret/site-key pair? Complete P0 item 1 before calling this fully closed.
- Does Google OAuth complete successfully for an external customer account and
  does its consent-screen configuration meet launch needs?
- What are the approved DataForSEO resale terms and managed-cloud credit model?
- Which inherited surface produces the highest-value dogfooding feedback first?
