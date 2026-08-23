#!/bin/sh
# Self-host container entrypoint. `vite build` inlines the envPrefix'd client
# envs (see vite.config.ts) into the bundle, so the build must run at container
# start — that is the only point where the operator's runtime AUTH_MODE is
# known, and it is what keeps the baked value and the served value identical
# (docs/self-host-auth-mode-spec.md).
#
# But the output stays valid until those envs or the image change. Fingerprint
# them and skip the build when the last start's output still matches, so a
# `docker compose restart` costs seconds instead of minutes. A new image lands a
# fresh container with an empty writable layer and no marker, so new code always
# rebuilds.
set -e

pnpm run db:migrate:local

# POSTHOG_SOURCEMAPS moves vite's outDir; keep the marker beside the output it
# describes.
if [ "${POSTHOG_SOURCEMAPS:-}" = "true" ]; then OUT_DIR=dist-sourcemaps; else OUT_DIR=dist; fi
FP_FILE="$OUT_DIR/.echoseo-build-env"

# Everything that changes build output: the envPrefix prefixes from
# vite.config.ts (keep in sync) plus POSTHOG_SOURCEMAPS.
FINGERPRINT="$(env | grep -E '^(VITE_|AUTH_MODE|BYPASS_EMAIL_VERIFICATION|POSTHOG_PUBLIC_KEY|POSTHOG_HOST|TURNSTILE_SITE_KEY|GOOGLE_AUTH_ENABLED|POSTHOG_SOURCEMAPS)' | sort | sha256sum | cut -d' ' -f1)"
# A missing sha256sum would yield an empty, always-matching fingerprint and
# silently disable rebuilds forever — fail loudly instead.
test -n "$FINGERPRINT"

if [ -f "$FP_FILE" ] && [ "$(cat "$FP_FILE")" = "$FINGERPRINT" ]; then
  echo "Reusing existing build (build-relevant env unchanged)."
else
  echo "Building client + server (first start, changed build env, or new image)..."
  # Drop the marker before building: a crash mid-build must not leave a marker
  # claiming the partial output is valid.
  rm -f "$FP_FILE"
  # NODE_OPTIONS raises the V8 heap ceiling so the SSR build of ~7400 modules
  # doesn't OOM under Node's ~2GB default.
  NODE_OPTIONS=--max-old-space-size=4096 pnpm run build
  printf '%s' "$FINGERPRINT" >"$FP_FILE"
fi

exec pnpm exec vite preview --host 0.0.0.0 --port "${PORT:-3001}"
