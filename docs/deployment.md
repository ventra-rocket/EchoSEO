# Deployment

## Platform

Cloudflare Workers, deployed as the `open-seo` Worker on the
`app.echoseo.ventrarocket.vn` custom domain.

The apex, `echoseo.ventrarocket.vn`, belongs to a **separate** Worker
(`echoseo-landing`, built from `web/`) that serves the marketing site. Keep the
apex out of this Worker's `routes`: a deploy that lists it takes the hostname
away from the landing Worker, and the marketing site disappears until someone
notices. Old apex links to app paths are redirected in `web/public/_redirects`.

## Production deploy

```bash
AUTH_MODE=hosted pnpm run deploy
```

The command applies pending D1 migrations, builds the client and Worker, then
deploys through Wrangler.

## Public SaaS authentication

`AUTH_MODE=hosted` is the production mode. The public hostname must not be
protected by Cloudflare Access because visitors need EchoSEO's native signup
and sign-in routes.

Required Worker secrets:

- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `RESEND_API_KEY`
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` when Google sign-in is enabled

Required public Worker variables:

- `AUTH_EMAIL_FROM`
- `GOOGLE_AUTH_ENABLED=true` when Google sign-in is enabled

## Public Free SEO Checker

The checker needs both sides of the Cloudflare Turnstile pair:

- Worker secret: `TURNSTILE_SECRET_KEY`
- Public Worker variable: `TURNSTILE_SITE_KEY`

The site key is safe to include in the client bundle. Never put the secret key
in `wrangler.jsonc`, a frontend environment variable, or source control.
EchoSEO reads the public key from the running Worker, so changing the Worker
variable does not require a separate frontend build-time variable.

## Verification

After deploying, check `/sign-up` and `/sign-in` over HTTPS. For Google OAuth,
the registered redirect URI must exactly match:

```text
https://app.echoseo.ventrarocket.vn/api/auth/callback/google
```

Connecting Search Console goes through a second provider, so its callback has to
be registered as well:

```text
https://app.echoseo.ventrarocket.vn/api/auth/oauth2/callback/google-search-console
```

Both must sit on the same host as `BETTER_AUTH_URL`, which is the origin Better
Auth trusts and builds its callbacks from. Move the app to another hostname and
these three change together, or sign-in fails with `Invalid origin` and Search
Console with `redirect_uri_mismatch`.

The Google button on the sign-in page is a separate matter: it is compiled in
from `GOOGLE_AUTH_ENABLED` at **build** time, so it must be set in the build
environment (for example `.env.local`), not only in `wrangler.jsonc`.

## Rollback

Use the Cloudflare Workers dashboard's Deployments view to roll traffic back to
the prior healthy Worker version, then investigate before redeploying.
