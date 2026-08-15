# Site Audit Refused Launches Without Saying Why, Through a Browser Alert

**Date**: 2026-08-15 23:45
**Severity**: Medium
**Component**: Site Audit launch (client form, verification gate, error transport)
**Status**: Resolved locally; verified in a browser against the local dev server

## What Happened

Two defects on the Site Audit launch form, both exposed by the same earlier
change (`68cad5f`, default crawl size 50 -> 5,000):

1. Launching a 5,000-page crawl of `thehourglass.com` on a project whose Search
   Console property is `https://ventrarocket.vn/` failed with **"You do not have
   access to this resource."** The user had access; the crawl was simply larger
   than an unverified domain is allowed.
2. The large-crawl confirmation was `window.confirm`, so it rendered as a raw
   `app.echoseo.ventrarocket.vn says` browser alert.

## The Brutal Truth

The server authored the right sentence and then threw it away. `AuditService`
raised `AppError("FORBIDDEN", "Verify domain ownership in Search Console to run
an audit of this size")`, but `toClientError()` transmits **only the code**, and
`FORBIDDEN` maps to one generic sentence shared by every permission failure in
the product. The reason was unrepresentable in the wire format, so no amount of
client copy could have recovered it.

The second half: the form already had everything needed to answer the question
before the click — `getAuditAccess()` returns `verifiedSiteUrl` and
`verificationPageThreshold`, and the user had typed the URL. It rendered a
generic note instead and let a doomed request go out.

Neither defect was reachable while the default was 50 pages: 50 is under the
100-page verification threshold and under the 500-page confirmation threshold.
Raising the default to the measured ceiling put every default launch through
both. A default is not a cosmetic choice; it decides which code paths are the
product.

## Technical Details

- New error code `AUDIT_VERIFICATION_REQUIRED` (non-reportable — a policy state,
  not a fault). The launch gate throws it instead of `FORBIDDEN`, and
  `error-messages.ts` maps it to copy that names the limit and the way out.
- `originMatchesGscSiteUrl()` moved to `src/shared/gsc-property-match.ts` and
  `AUDIT_VERIFICATION_PAGE_THRESHOLD` to `src/shared/audit-limits.ts`, so the
  form and the launch gate share one matcher and one number instead of a copy.
- `evaluateLaunchVerificationGate()` (client) reports the gate that _will_ refuse
  a launch, and returns null wherever the outcome is not knowable locally — no
  threshold in this deployment, unreadable URL, unparsed page count. The server
  stays the authority.
- The form now names the typed domain, disables submit while blocked
  (`aria-describedby` points at the reason), and offers one click to crawl at the
  allowed size.
- `LargeCrawlConfirmModal` replaces `window.confirm`, using the existing `Modal`
  component (Escape and Cancel both close; the confirm button carries the
  in-flight state). The launch request is captured before confirmation, so what
  the user confirmed is what runs.

## Verification

`npm run ci:check` clean (Prettier, Knip, TypeScript, Oxlint — 1,004 files, zero
warnings) and `vitest run` green at 1,831 tests / 210 files.

Driven in a browser against `vite dev` (`AUTH_MODE=local_noauth`): the confirm
modal renders in-app with no native dialog fired (`page.on('dialog')` never
triggered), Cancel and Escape both dismiss it. The blocked state was exercised by
temporarily returning hosted-shaped access data from `getAccess`, then reverted:
the warning names `thehourglass.com` and the connected property, Start Audit is
disabled, "Crawl 100 pages" sets the input to 100 and re-enables it, and a domain
the property covers stays launchable at 5,000.

## Follow-Ups

- The hosted 100-page threshold for unverified domains is still an open product
  question (`docs/project-overview-pdr.md`); this change only makes the rule
  legible, it does not argue for the number.
- No commit or deploy; both are separate reviewable steps.
