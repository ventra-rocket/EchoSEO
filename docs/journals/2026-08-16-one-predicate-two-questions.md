# One Predicate Was Answering Two Different Questions

**Date**: 2026-08-16 16:20
**Severity**: Medium
**Component**: Site Audit launch gate, Search Console property matching
**Status**: Resolved and deployed; verified by a real production crawl

## What Happened

Yesterday's fix (#65) made a refused large crawl explain itself. Testing that fix
on production immediately exposed the deeper defect it had made legible: the owner
of `https://ventrarocket.vn/` was held to the 100-page unverified cap on their own
`kello.ventrarocket.vn`. The explanation was accurate. The rule was wrong.

`originMatchesGscSiteUrl` was shared by callers needing different answers:

| Caller                                                 | Question                                          | Right answer for a URL-prefix property |
| ------------------------------------------------------ | ------------------------------------------------- | -------------------------------------- |
| `AuditSearchSignalsService`, `AuditIndexStatusService` | whose Search Console **data** covers this origin? | exact protocol + host                  |
| launch gate, form pre-flight                           | does this user **control** this site?             | that host **and its subdomains**       |

The strict answer was winning both.

## The Brutal Truth

Nothing was broken in the user's setup, and no wording could have made the refusal
reasonable. Their Google account holds exactly one property — a URL-prefix one —
confirmed by reading the `Change property` dropdown live:
`popupbutton "Property": "https://ventrarocket.vn/"` with a single `menuitem`. The
product was telling a verified owner to go verify something.

Sharing one function between the form and the gate was the right call in #65 — it
is what makes the explanation unable to drift from the rule. The mistake was
assuming one function could serve the GSC readers too, because both look like
"does this property match this URL". They are a data question and an authority
question, and only the data question cares about the scheme or stops at the host.

## What Changed

`propertyCoversOrigin` keeps the old semantics and now serves only the GSC reads
and the importer's provability invariant — loosening it there would attribute one
host's search metrics to another, which is worse than a page cap.

`propertyProvesOwnership` serves the launch gate and the form. Proof of control
travels down the host tree and ignores the scheme: verifying `https://example.com/`
means placing a file, meta tag, or DNS record for `example.com`, and whoever can
do that controls its subdomains. This does **not** widen who passes the gate —
reaching `*.H` still requires already controlling `H`, exactly the bar
`sc-domain:H` sets — only which of their own hosts a verified owner may crawl.

Deliberately still strict: a path-scoped property extends to no other host
(`https://sites.example.com/site/mine/` proves a directory on a shared host, never
the customer hosts beside it); a child never proves its parent; look-alikes such as
`ventrarocket.vn.evil.com` stay out on the leading-dot check.

The hosted 100-page cap for genuinely unverified domains is untouched. Removing it
would turn EchoSEO into an authenticated free crawler for third-party sites at
operator-funded Workers cost, 5,000 pages against 10 launches per org per hour.
DNS-TXT self-verification stays the documented seam for a domain with no property.

## What We Tried

1. Making the message better — that was #65, and it was necessary but not the fix.
2. Loosening the shared matcher in place. Rejected: `AuditSearchSignalsService.ts`
   would then read `ventrarocket.vn` metrics into a `kello.ventrarocket.vn` audit.
   A wrong number in a report is worse than a cap that is merely inconvenient.
3. Deriving ownership from the registrable domain (eTLD+1). Rejected: correct only
   with a public-suffix list, since `example.com.vn` would otherwise collapse to
   `com.vn`. The property host is already proof-carrying, so asking "is the target
   at or under the verified host" needs no such list.

## Verification

`ci:check` clean (1,004 files) and 1,841/1,841 tests, +10 covering the reported
case at both the gate and the pre-flight, protocol-insensitivity, look-alike hosts,
child-does-not-prove-parent, and the path-scope boundary. `propertyCoversOrigin`
keeps a test proving a subdomain is **not** covered for data reads, so the split
cannot quietly collapse back into one rule.

Deployed as version `ad707775-321a-445a-ad18-26f3889cd67b` with
`AUTH_MODE=hosted`. Verified on production through the browser: with
`kello.ventrarocket.vn` at 5,000 pages the warning is gone and `Start Audit` is
enabled; confirming the in-app modal started audit
`048851e7-43d6-448c-9ec6-5a70398b314b`, which progressed `Discovery → Crawling`
instead of being refused.

## Lessons

- A shared helper whose name describes a _comparison_ (`...Matches...`) rather than
  a _question_ invites exactly this defect. Both predicates are now named for the
  question they answer, and each one's doc comment says why the other is wrong for
  its callers.
- Shipping a clear error message is not the same as shipping a correct rule. The
  better message is what made the wrong rule reviewable — but the review has to
  actually happen, on the real product, with the user's real data.
- Local DNS lied again: `dig kello.ventrarocket.vn` returned nothing from the
  workstation resolver while `@1.1.1.1` and `@8.8.8.8` both answered with the
  Cloudflare pair. Same trap recorded on 2026-07-06. Never conclude a host is dead
  from the local resolver alone.
