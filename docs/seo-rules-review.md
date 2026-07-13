# SEO Rules Knowledge-Base Review

The rule catalog in `src/server/lib/seo-rules/rules/` backs every fix shown by
the Free SEO Checker (and later Deep/GEO tiers) with a cited Google source.
Trust in that citation is the product's differentiator, so stale or wrong
citations are treated as bugs.

## Invariant

No rule without a source and a review date. Every `Rule` must carry:

- `googleSourceUrl` — a real, currently-live Google Search Central (or
  web.dev) URL, verified by fetching it, never guessed from memory.
- `guideQuote` — a verbatim excerpt copied from that URL, not a paraphrase.
- `lastReviewedDate` — the ISO date (`YYYY-MM-DD`) the URL and quote were
  last confirmed accurate.

`src/server/lib/seo-rules/__tests__/rules.test.ts` enforces both fields are
present and non-empty on every rule in the catalog. It cannot verify the URL
is still live or the quote still matches the page — that's the review's job.

## Review cadence

**Quarterly** (every 3 months). Re-verify each rule's `googleSourceUrl`
still resolves and `guideQuote` still appears on the page (Google
occasionally restructures or merges Search Central pages). Update
`lastReviewedDate` on every rule confirmed unchanged; fix or replace the
source on any rule that drifted.

## Owner

EchoSEO maintainer (`ventrarocket.work@gmail.com`). If ownership changes,
update this section — do not let the review lapse silently.
