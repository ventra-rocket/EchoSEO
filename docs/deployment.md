# Deployment

## Platform

Cloudflare Workers, deployed as the `open-seo` Worker on the
`echoseo.ventrarocket.vn` custom domain.

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

## Verification

After deploying, check `/sign-up` and `/sign-in` over HTTPS. For Google OAuth,
the registered redirect URI must exactly match:

```text
https://echoseo.ventrarocket.vn/api/auth/callback/google
```

## Rollback

Use the Cloudflare Workers dashboard's Deployments view to roll traffic back to
the prior healthy Worker version, then investigate before redeploying.
