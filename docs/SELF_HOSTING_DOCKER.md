# Docker Self-Hosting

Run EchoSEO locally with Docker.

In Docker mode, EchoSEO uses `AUTH_MODE=local_noauth` (no auth checks, local admin user `admin@localhost`). Only expose it behind your own auth-protected reverse proxy, tunnel, or private network.

The default `compose.yaml` uses this repo's published GHCR image:

- `ghcr.io/ventra-rocket/echoseo:latest`

> **Important:** that image is published by
> [`.github/workflows/docker-image.yml`](../.github/workflows/docker-image.yml)
> on every push to `main` and every `v*` tag of `ventra-rocket/EchoSEO`. If no
> such build has run yet, `docker compose pull` will 404 — use the [Build your
> own image locally](#build-your-own-image-locally) path until it has. The
> recommended production path is Cloudflare — see
> [`SELF_HOSTING_CLOUDFLARE.md`](SELF_HOSTING_CLOUDFLARE.md).

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)

## Quickstart

```bash
cp .env.example .env
docker compose up -d
```

Set `DATAFORSEO_API_KEY` in `.env`, then open `http://localhost:<PORT>` (default `3001`). The first start builds the app and may take 1-2 minutes; follow progress with `docker compose logs -f`. Later restarts reuse that build unless the image or a build-time env value changed — see [Why the container builds at start](#why-the-container-builds-at-start).

Docker Compose passes `.env` values into the container, and `compose.yaml` enables `CLOUDFLARE_INCLUDE_PROCESS_ENV=true` so the Cloudflare Vite runtime can read them as Worker bindings during local self-hosting.

Optional env values:

- `PORT` (defaults to `3001`)
- `ALLOWED_HOST` (single reverse-proxy hostname to allow in Vite preview)
- `AUTH_MODE=local_noauth` (already set in compose)
- `OPENROUTER_API_KEY` (required for the in-app AI features — onboarding chat, assistant workspace, audit issue explainer; see [OpenRouter](https://openrouter.ai/settings/keys))
- `OPENROUTER_MODEL`, `OPENROUTER_EXPLAINER_MODEL` (model slug overrides; sensible defaults otherwise)
- `ECHOSEO_IMAGE` (defaults to `ghcr.io/ventra-rocket/echoseo:latest`)

If you are putting Docker behind a reverse proxy or a temporary tunnel, remember that Docker self-hosting runs with app auth disabled. Only expose it behind your own auth-protected reverse proxy, tunnel, or private network, and add the public hostname before restarting:

```bash
ALLOWED_HOST=yourdomain.com docker compose up -d
```

You can also persist it in `.env`.

## Pin to a specific image tag

Set `ECHOSEO_IMAGE` in `.env` and restart:

```bash
ECHOSEO_IMAGE=ghcr.io/ventra-rocket/echoseo:v0.2.0
docker compose up -d
```

## Build your own image locally

If you are testing local code changes, build and run a local tag:

```bash
docker build -f Dockerfile.selfhost -t echoseo:local .
ECHOSEO_IMAGE=echoseo:local docker compose up -d
```

## Why the container builds at start

`vite build` inlines the build-time client env values — `AUTH_MODE`,
`GOOGLE_AUTH_ENABLED`, `TURNSTILE_SITE_KEY`, anything `VITE_`-prefixed — into
the public client bundle. A self-hoster only chooses those at runtime, through
`.env` and Compose, so baking them at image-build time would ship a bundle that
disagrees with the server (see
[`self-host-auth-mode-spec.md`](self-host-auth-mode-spec.md)).

[`docker-entrypoint.sh`](../docker-entrypoint.sh) therefore builds at container
start, but writes a fingerprint of exactly those values next to the output. A
restart whose build-time env is unchanged reuses the previous build and starts
in seconds; a changed value, or a new image (whose writable layer has no
build output), rebuilds. Logs say which happened:

```
Reusing existing build (build-relevant env unchanged).
Building client + server (first start, changed build env, or new image)...
```

`docker compose down` removes the container and therefore the build output, so
the next `up` rebuilds. Use `docker compose restart` or `docker compose up -d`
to keep it.

## Common commands

- Restart service after env changes:

```bash
docker compose up -d open-seo
```

- Pull latest published image and restart:

```bash
docker compose pull && docker compose up -d
```

- Stop:

```bash
docker compose down
```

- Stop and remove volumes:

```bash
docker compose down -v
```

## Troubleshooting environment variables

To confirm Docker Compose is using the expected environment variables:

```bash
docker compose config
```

Check that `AUTH_MODE=local_noauth`, and that `DATAFORSEO_API_KEY` is the base64
encoded value of your DataForSEO email and API password in this format:
`email:password`.

If you changed `.env`, recreate the container so Compose reapplies it:

```bash
docker compose up -d --force-recreate open-seo
```
