# The Sitemap That Did Not Fit In A Step

**Date**: 2026-08-16 18:00
**Severity**: High
**Component**: Site Audit crawl (discovery phase, failure reporting, progress UI)
**Status**: Resolved and deployed; verified by a live production crawl

## What Happened

A default 5,000-page audit of `kello.ventrarocket.vn` failed and told the user their
own site was probably behind anti-bot or firewall rules. The Workflows API said
otherwise:

```
Error: WorkflowInternalError: Step discover-urls-1 output is too large.
       Maximum allowed size is 1MiB.
```

Six retries over seven minutes, `pages_crawled = 0`. `discoverUrls` collects
`maxPages * 20` capped at 50,000 URLs so that `inSitemap` can be judged for every
crawled page, and `runDiscoveryPhase` returned that list as its step output. The site
advertises **41,505** URLs in `/__sitemap__/en-US.xml` — about 2.7 MB serialised.

Three defects surfaced together, and a fourth was found while verifying the fix.

## The Brutal Truth

The product accused the user's site of blocking us to explain a limit we broke
ourselves. Every input needed to say the true thing was already in the run — the
error message existed in the Workflows API, and nothing in the code path ever looked
at it, because `audits` had no column to keep it in. The banner condition was
`isFailed || (isComplete && pagesCrawled <= 1)`, one sentence covering a crashed run,
a robots-blocked start URL, and a genuinely single-page site.

`68cad5f` is now responsible for three separate production defects (see #64, #67).
Raising a default from 50 to 5,000 did not add a feature; it moved the product into a
region of its own behaviour nobody had exercised. The 20× discovery multiplier had
been fine for years at `maxPages = 50` (1,000 URLs, 65 KB).

And the audits table said `Running` while the audit's own page said `Failed`. Same D1
row: the table had no `refetchInterval`, was never invalidated, and inherited a
5-minute `staleTime`. Its `Pages` column read `pagesTotal || pagesCrawled`, and
`pagesTotal` is the _requested_ ceiling until discovery replaces it — so a crawl that
fetched nothing advertised 5,000 pages.

## What Changed

The discovered URL set moved to R2 (`discovered-urls-store.ts`); the step boundary
carries a count. Truncating to the crawl budget was rejected: the set is sitemap
_evidence_, checked against every crawled page, and it drives
`audit-missing-from-sitemap` and the "removed from sitemap" page change. A partial set
would turn a large sitemap into a page of false warnings — worse than a slow crawl. A
missing object therefore reads as `null` ("no sitemap evidence"), never as an empty
set, because empty is the shape that manufactures those warnings. The crawl _seed_ is
capped at `maxPages` separately, since the queue can never consume more.

`audits.error_message` now records why a run stopped, written from the thrown error
with its name kept, whitespace collapsed, truncated to 300 characters. The banner
splits: a stopped run reports its own message; a completed run that read at most one
page says so and points at `robots.txt` instead of asserting a firewall.

The audits table polls while any row is running, the detail page invalidates it on
reaching a terminal state, and `Pages` reports pages crawled.

Progress became legible. The KV feed already carried crawled URLs with status codes,
polled every 1.5 s, and was empty exactly when it mattered. It now also carries phase
detail — sitemap documents read, URLs discovered, live frontier depth — published
_before_ the sitemap fetches, because that 32-second silence was indistinguishable
from a hang.

## What We Tried

1. Reading the failure from the UI. Impossible — nothing persisted it. The real cause
   came from `wrangler workflows instances describe`, which is not a diagnostic path a
   user has.
2. Blaming DNS. `dig kello.ventrarocket.vn` returned nothing from the workstation
   resolver while `@1.1.1.1` and `@8.8.8.8` both answered. Local resolver, again — the
   same trap as 2026-07-06.
3. Truncating discovery to `maxPages`. Rejected on the evidence argument above.
4. Deriving membership from hashes to shrink the payload under 1 MiB. Rejected:
   collision risk and opacity to buy back a limit R2 removes outright.

## Verification

`ci:check` clean (1,012 files), `vitest run` 1,859/1,859 (+18), production build clean.
New tests pin the step output under 200 bytes for a 41,505-URL sitemap, the full set
still reaching storage when the crawl seed is capped, the measured total replacing the
requested ceiling, absent evidence reading as `null`, the failure message keeping its
error name, and the live feed keeping a 404 and refreshing the frontier.

Deployed as version `055e181d-71ae-4970-96b3-634630c22fa2` after migration `0044`
(one additive nullable column) was applied to production D1. The first deploy attempt
failed registering the `site-audit-workflow` trigger against the Cloudflare API and
did not promote — worth knowing that a partial `wrangler deploy` can apply migrations
and upload assets without going live. A plain retry succeeded.

Verified on production through the browser: the same launch that failed now shows
`Reading sitemaps` during discovery, then `300 / 5000 pages`, `6,343 queued · 300
visited`, and a live page feed. The old failed audit reports "No reason was recorded
for this run" — honest for a row that predates the column — and the audits table shows
it as `Failed` with `0` pages instead of `Running` with `5,000`.

## What The Fix Exposed

At around page 100 the live feed turned into a wall of `429`. `classifyPageStatus`
maps `>= 400` to `error` and the summary counts `error` as **broken**, so the report
would have claimed hundreds of broken pages when the truth is that we asked too fast:
`CRAWL_CONCURRENCY = 25`, no delay between batches, no `Retry-After` handling, no
retry of a throttled URL. Filed as #70.

That is the payoff of the progress work, and the lesson worth keeping: the feature
that makes work visible is also the cheapest bug detector the product has.

## Lessons

- A step boundary is a serialisation contract with a hard limit. Anything whose size
  is a function of someone else's site does not belong in a step's return value.
- A wrong error message is worse than a missing one: it sends the user to fix
  something that was never broken. Store the real reason before writing copy that
  guesses at it.
- Two surfaces reading one row still need one refresh policy, or they will disagree
  and neither will look wrong on its own.
- Raising a default is a behavioural change, not a config tweak. Three production
  defects came out of one number.
