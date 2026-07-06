# Phase-0 Landed: OpenSEO Fork Imported, Deployed, Locked Down, Rebranded to EchoSEO

**Date**: 2026-07-06 10:30–14:51  
**Severity**: High (foundation work — blocks all Phase-1+ features)  
**Component**: Phase-0 (fork + Cloudflare deploy + rebrand)  
**Status**: Complete (P01 + P02 done; P03–06 pending)

## What Happened

Phase-0 rolled forward in a single 4.5-hour sprint: fork landed from every-app/open-seo, deployed live to Cloudflare, locked behind Zero Trust Access, and rebranded from OpenSEO to EchoSEO. The precondition gate (fork import) that was initially missing when the plan was created turned out to be the first thing to fix.

### Timeline

**10:30–11:00** — Ran `/cook` on the free-deep-seo-checker plan (Phase-1). Hard precondition failed: the fork wasn't in the repo yet. Stopped, pivoted to P01.

**11:00–11:45** — **P01 Part A (import + build):** Imported every-app/open-seo @ c8a1e17 into Code/EchoSEO; baseline commit e9fa6e5 establishes the fork. Reconciled scaffold (`.claude/`, `plans/`, `docs/CLAUDE.md`), kept upstream's code + our rules, fixed `.gitignore` and `knip.jsonc` to exclude local tooling. Ran `pnpm install`; `ci:check` and 437 vitest tests pass green (94c4e8e).

**11:45–13:30** — **P01 Part B (Cloudflare deploy):** Cloudflare account f0c369d8… provisioned with D1 database `open-seo`, KV buckets `KV` + `OAUTH_KV`, R2 bucket `open-seo`. All 26 D1 migrations applied. Registered custom domain `echoseo.ventrarocket.vn` (workers_dev disabled). Committed infrastructure config (3edcc62). App lives at https://echoseo.ventrarocket.vn but **currently unauthenticated** (AUTH_MODE=local_noauth injected via deploy flag, not committed).

**13:30–13:50** — **Security hardening (P01 P.S.):** Cloudflare Zero Trust Access locked down (commit c6540bf). Created an Access org (scoped API token in .dev.vars, never committed). Set up self_hosted app policy allowing only ventrarocket.work@gmail.com. Deployed with `POLICY_AUD` + `TEAM_DOMAIN` worker secrets and `AUTH_MODE=cloudflare_access`. Verified: root and /mcp now 302 to login.

**13:50–14:51** — **P02 (rebrand):** Branch feat/rebrand-echoseo; 199 user-facing OpenSEO → EchoSEO swaps across `src/client/`, `.agents/skills/`, `public/` assets, `docs/`, MCP tool descriptions, email/support URLs. **Intentionally preserved:** internal identifiers (daisyUI theme `openseo`, package name `open-seo`, Cloudflare resource names, MCP test fixtures). `ci:check` + 437 tests pass. Fixed one `transport.test.ts` assertion. Merged to main (6589c43), deployed live (Version c77a29a1). Access still enforced.

**Phase-02 scope deferral:** `web/` (landing site, 266 refs) stays OpenSEO for now — deferred to Phase-06 as a separate web site project.

## The Brutal Truth

Getting Phase-0 done felt urgent because it was the critical precondition for literally everything after it. The precondition gate (fork missing) forced a mid-stream pivot, which could have been demoralizing — instead, it forced clarity: the plan was sound, but the fork wasn't provisioned yet. Fixing that immediately revealed the scope.

The frustration: AUTH_MODE is **dual-mode** (build-time `import.meta.env` vs runtime Worker `env`). The deploy flag `--var AUTH_MODE=local_noauth` sticks only for that deploy; a redeploy without the flag silently falls back to `cloudflare_access` (the env default). This is fragile. The first deploy went out unauthenticated (`local_noauth`, empty D1) — the very next step locked it behind Zero Trust Access before any real data, and `AUTH_MODE=cloudflare_access` is now the committed default.

The weird part: local DNS resolution cached NXDOMAIN for the new custom domain for ~30s, but the Cloudflare edge was already serving 200. Verified with `curl --resolve` to bypass local resolver. Classic timing trap.

Rebranding was mechanical but **pervasive** — 199 swaps without breaking identifiers or imports took surgical care. Got it done in one pass, 0 post-merge regressions.

## Technical Details

**Git state after P01:**

- Baseline: e9fa6e5 (fork import complete, all OpenSEO code in)
- CI-fix: 94c4e8e (knip/prettier/tsc all pass)
- Deploy: 3edcc62 (wrangler.jsonc configured, D1/KV/R2 live)
- Access: c6540bf (AUTH_MODE=cloudflare_access, POLICY_AUD set)
- Rebrand: 6589c43 (OpenSEO → EchoSEO user-visible)

**Cloudflare resources:**

- D1 `open-seo` (cc386283…): 26 migrations applied, schema intact
- KV `KV` (056fb7db…), `OAUTH_KV`: created, ready
- R2 `open-seo`: created, ready for file storage
- Worker `open-seo` deployed to `echoseo.ventrarocket.vn` (custom domain zone ventrarocket.vn, workers_dev=disabled)
- Zero Trust org created, Access app + policy locked to ventrarocket.work@gmail.com

**Tests:** `pnpm ci:check` (prettier + knip + tsc + oxlint) + `pnpm test` (437 vitest) all pass.

**Secrets state:**

- `DATAFORSEO_API_KEY`: unset (keyword searches fail until owner adds test key)
- `BETTER_AUTH_SECRET`: unset (only needed for hosted/GSC mode)
- `POLICY_AUD`, `TEAM_DOMAIN`: set via wrangler secrets (Access enforcement live)

## What We Tried

1. **Full P01 in one shot** — Fork + build + deploy + security in a single session. Succeeded.
2. **Dual AUTH_MODE confusion** — Set it at deploy time via `--var` (ephemeral), which caused the "default falls back" trap. Remedied with committed `AUTH_MODE=cloudflare_access` in worker secrets + wrangler.jsonc, but the deploy `--var` pattern needs documentation or a helper script.
3. **DNS cache stale entry** — Local resolver didn't pick up the new custom domain immediately. Used `curl --resolve 1.2.3.4:443:echoseo.ventrarocket.vn https://echoseo.ventrarocket.vn` to bypass and verify the app was live.

## Root Cause Analysis

The precondition gate (fork missing) existed because the plan was drafted _before_ the import work started — a reasonable artifact of planning-first workflow. When the fork didn't exist in repo, the plan was still correct; execution order just needed adjustment.

AUTH_MODE fragility is a design smell: Vite build-time env and Cloudflare Worker runtime env should not both control the same feature toggle without explicit reconciliation. The app defaults to `cloudflare_access` at runtime if undefined, but the deploy command relies on the operator remembering to pass `--var`. This is a footgun waiting for a tired human (like midnight deploys).

The rebranding scope creep was avoided because we explicitly kept internal identifiers (daisyUI theme, package name, test fixtures) stable. If we'd swapped those, we'd have 3x more churn and higher regression risk.

## Lessons Learned

1. **Precondition gates are healthy** — the fork-missing gate forced clarity early instead of wasting time on Phase-1 setup. Document gates explicitly in the plan.

2. **Dual-mode feature flags are treacherous** — when build-time and runtime env both control the same toggle, make the precedence explicit and test both paths. Better: one source of truth. Consider a commit-time config validation script.

3. **Rebranding is safer with internal identity boundaries** — keeping daisyUI theme `openseo` stable (not `echoseo`) saved us from CSS regressions. Define what's part of the brand (user-facing copy, assets) vs what's internal (identifiers, test fixtures) upfront.

4. **A fresh Cloudflare account needs API calls wrangler won't do** — a brand-new account must register a workers.dev subdomain before _any_ Worker deploy (done via `PUT /accounts/{id}/workers/subdomain`, not the dashboard); Zero Trust Access setup needs a scoped API token because the wrangler OAuth token lacks Access scope. Custom-domain routing + DNS + cert are then provisioned automatically on deploy.

5. **Scout-block hook rejection on `build` string** — the safety hook rejects Bash commands containing certain keywords (we hit `build`). The allowlist in `.claude/.ckignore` (`!build`) exempts known safe patterns. If you see "rejected" on a build command, check `.ckignore` first.

## Next Steps

| Item                                                                                                                          | Owner       | Timeline               |
| ----------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------- |
| Set `DATAFORSEO_API_KEY` test key and verify keyword search                                                                   | Owner       | Before Phase-1 kickoff |
| Revoke the Zero Trust API token from .dev.vars (it's in .gitignore but keep it short-lived)                                   | Owner       | ASAP                   |
| Create a `scripts/deploy.sh` helper that enforces committed AUTH_MODE (no --var override)                                     | Engineering | After Phase-3          |
| Delete the merged branch `feat/rebrand-echoseo`                                                                               | Cleanup     | Next commit            |
| Phase-03 (strip hosted-only couplings): gate PostHog/Loops/Reddit-attribution behind `hosted` flag                            | TBD         | Parallel with P04–P05  |
| Phase-04 (bilingual i18n): extract strings + seed VN catalog (machine-translate OK, flag for review)                          | TBD         | After P02 (this)       |
| Phase-05 (DataForSEO provider abstraction): route calls through interface layer                                               | TBD         | Parallel with P03–P04  |
| Phase-06 (verification + exit checks): DataForSEO resale ToS audit, team Cloudflare fluency check, separate web/ landing site | TBD         | Last                   |

## State at End of Session

- **App live:** https://echoseo.ventrarocket.vn (EchoSEO branded, Zero Trust enforced, root → 302 login).
- **Git remotes:** `origin` = QuocHuannn/EchoSEO (private), `upstream` = every-app/open-seo (fetch-only).
- **Baseline stable:** e9fa6e5. Latest: 6589c43 (rebrand, main).
- **Tests passing:** ci:check + 437 vitest green.
- **Secrets unset:** DATAFORSEO_API_KEY (keyword search blocked), BETTER_AUTH_SECRET (hosted-mode only).
- **Phase-0 acceptance:** ✓ Fork imported + build green ✓ Deployed to Cloudflare ✓ Zero Trust locked ✓ Rebranded to EchoSEO ✓ Upstream remote configured. **Open:** KEY provisioning, Phase-03–06 work.

---

**Status:** DONE  
**Summary:** Phase-0 fork, deploy, hardening, and rebrand complete in one sprint. App live behind Zero Trust at echoseo.ventrarocket.vn; 437 tests passing; all P01–P02 acceptance criteria met. P03–06 and secret keys remain.  
**Concerns:** AUTH_MODE dual-mode fragility (deploy --var vs worker secrets); DATAFORSEO_API_KEY not yet provisioned blocks Phase-1 keyword features.
