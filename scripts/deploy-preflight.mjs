#!/usr/bin/env node

// @ts-check

// Fails a deploy in ~2s when the client bundle would bake a different value
// than the Worker runs with.
//
// `vite.config.ts` lists non-`VITE_` names in `envPrefix`, so Vite inlines
// them into the PUBLIC client bundle at build time (`import.meta.env.AUTH_MODE`
// in src/lib/auth-mode.ts). The Worker reads the same names at RUNTIME from
// `wrangler.jsonc` `vars`. Those are two independent sources: the build reads
// gitignored `.env*` files, the runtime reads a committed config. Nothing in
// the toolchain compares them.
//
// The failure is silent and severe. A build without `.env.local` — a fresh
// clone, CI, a second maintainer's laptop — bakes `AUTH_MODE=undefined`, which
// src/lib/auth-mode.ts fails closed to `cloudflare_access`. The Worker still
// runs `hosted`, so the server authenticates paying customers while the client
// renders the self-host UI: HostedPlanGate hands out `isFreePlan: false` to
// everyone (paywall gone), the Google sign-in button vanishes, PostHog goes
// quiet, and GSC linking takes the self-hosted path.
//
// Rather than hand-maintain the list of at-risk names, derive it: every
// `wrangler.jsonc` var whose name Vite would inline. Both halves are read with
// the tools that own them (Vite's own config loader and env resolution;
// wrangler's own config reader), so neither can drift from what really ships.
//
// Upstream hit the same class of bug on their self-host path and fixed it by
// pinning that build to its own Vite mode (every-app/open-seo f14aa4c7). That
// only aligns one path; comparing the two sources covers every path.

import { parseArgs } from "node:util";
import { loadConfigFromFile, loadEnv } from "vite";
import { unstable_readConfig } from "wrangler";

const { values } = parseArgs({
  options: {
    // The Vite mode the build that follows will run in. `vite build` with no
    // --mode flag is "production".
    mode: { type: "string", default: "production" },
    config: { type: "string", default: "wrangler.jsonc" },
    help: { type: "boolean", default: false },
  },
});

if (values.help) {
  process.stdout.write(
    "Usage: node scripts/deploy-preflight.mjs [--mode production] [--config wrangler.jsonc]\n",
  );
  process.exit(0);
}

const mode = values.mode;
const configPath = values.config;

/** @param {string[]} lines */
function fail(lines) {
  process.stderr.write(`\ndeploy preflight failed:\n\n`);
  for (const line of lines) process.stderr.write(`  ${line}\n`);
  process.stderr.write("\n");
  process.exit(1);
}

const loaded = await loadConfigFromFile(
  { command: "build", mode },
  "vite.config.ts",
  process.cwd(),
);
const envPrefix = loaded?.config.envPrefix;
if (!Array.isArray(envPrefix) || envPrefix.length === 0) {
  fail([
    "Could not read `envPrefix` from vite.config.ts, so there is no way to tell",
    "which values get inlined into the client bundle. Fix the config, or this",
    "check silently protects nothing.",
  ]);
}
const prefixes = /** @type {string[]} */ (envPrefix);

// Exactly what `import.meta.env` will hold in the bundle: Vite's own
// resolution over `.env`, `.env.local`, `.env.<mode>`, `.env.<mode>.local`,
// with prefixed `process.env` values winning.
const baked = loadEnv(mode, process.cwd(), prefixes);

const wrangler = unstable_readConfig({ config: configPath });
const runtimeVars = wrangler.vars ?? {};

/** @type {string[]} */
const problems = [];

for (const [name, rawValue] of Object.entries(runtimeVars)) {
  if (!prefixes.some((prefix) => name.startsWith(prefix))) continue;
  // A JSON object/array var is never a scalar the client can inline; only
  // primitives can disagree in a way that matters.
  if (rawValue !== null && typeof rawValue === "object") continue;

  const runtime = String(rawValue);
  const buildTime = baked[name];
  if (buildTime === runtime) continue;

  problems.push(
    buildTime === undefined
      ? `${name}: runtime "${runtime}" (${configPath}) but the client bundle bakes nothing`
      : `${name}: runtime "${runtime}" (${configPath}) but the client bundle bakes "${buildTime}"`,
  );
}

if (problems.length > 0) {
  fail([
    `The Worker and the client bundle would disagree (Vite mode "${mode}"):`,
    "",
    ...problems,
    "",
    "The server would run one configuration while the UI renders another.",
    `Set the missing/mismatched values in .env.local (or .env.${mode}) so the`,
    `build inlines what ${configPath} runs, then deploy again.`,
    "",
    "Names, meanings, and the build-time/runtime split are documented in",
    "docs/self-host-auth-mode-spec.md.",
  ]);
}
