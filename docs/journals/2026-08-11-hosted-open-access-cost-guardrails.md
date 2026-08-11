# Hosted Open Access Needed Real Cost Guardrails

**Date**: 2026-08-11 18:22
**Severity**: High
**Component**: Hosted access, DataForSEO credentials, Site Audit, rank tracking
**Status**: Resolved locally; production E2E pending

## What Happened

We kept the user's explicit decision that `HOSTED_ACCESS_OPEN=true` bypasses the
subscription gates, then closed its spend paths. Hosted-open organizations cannot
use the operator's global `DATAFORSEO_API_KEY`; they must bring their own key.
Hosted Site Audit is capped at **10 launches per organization per hour**. Queued
rank collection, readiness status, and cron now share the execution credential
policy.

## The Brutal Truth

The original safety argument was "production currently has no global key." That
was an accident of configuration waiting to become an operator-funded bill. The
real kick in the teeth: async rank posting was centralized, but result collection
could bypass that boundary and fall back to a global credential. Multiple
definitions of "configured" looked harmless alone and were dangerous together.

## Technical Details

`resolveDataforseoCredentialAccess()` now returns `unavailable`, `byo`,
`global-self-host`, or `global-metered`. Hosted-open plus global key yields
`DATAFORSEO_KEY_MISSING`; BYO remains usable. Audit throttling uses Durable Object
key `audit-launch-org:{organizationId}` with `limit: 10` and
`windowMs: 3_600_000`, fails with `RATE_LIMITED`, and creates no target/workflow
first. Unmetered `rankCheckTaskGet()` preserves BYO context; cron and status no
longer accept a credential execution rejects.

Verification on the latest local tree: `pnpm run ci:check` passed (Prettier,
Knip, TypeScript, Oxlint; 935 files, zero warnings/errors), `pnpm exec vitest run`
passed (185 files, 1,535 tests, zero failures/skips), and `git diff --check`
passed. No build or deploy occurred; commit and push are handled as a separate
reviewable Git step.

## What We Tried

1. Reverting the open-access subscription bypass was rejected because it
   contradicted the user's explicit pre-billing access decision.
2. Relying on the global key being absent was rejected because configuration
   drift would reopen operator spend.
3. Direct queued-result fetches were rejected: `task_get` remains unmetered by
   EchoSEO but still needs the same BYO identity as metered `task_post`.
4. Capacity checks alone were rejected: delete/relaunch churn burns Worker CPU
   without exceeding retained capacity.

## Root Cause Analysis

Access entitlement, credential authorization, and compute throttling had been
conflated. Opening access was valid, but no single policy decided whose credential
could spend, and audit guards measured retained capacity instead of launches.

## Lessons Learned

- Never call an absent production secret a cost control; encode the invariant.
- Route paid and unmetered workflow phases through one credential boundary.
- Readiness, cron, and execution must agree.
- Rate-limit the abuse action, not only the state it leaves behind.

## Next Steps

- **Founder, immediately after deployment:** run production E2E with a verified
  fresh non-allowlist account: start Site Audit, add a BYO key, then run a rank
  check and confirm no global fallback.
- **Engineering, before merge/deploy:** review the diff and preserve the
  `HOSTED_ACCESS_OPEN` subscription behavior plus the new credential boundary.
- **Operations, after E2E:** monitor rejections and spend before changing 10/hour.

Production E2E is explicitly **not passed**: changes are not deployed, and no real
non-allowlist account or BYO credential was supplied. We did not access or create
production secrets.
