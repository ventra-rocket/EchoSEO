# Two reviews that earned their keep

**Date:** 2026-08-20
**Component:** Site Audit crawl rate control · audit report export
**Status:** #91 and #51 shipped, closed with production evidence; no open issues

Two features, two independent reviews, and in both cases the review found a
defect that my own evidence had already contained and I had read past.

## #91 — the seed, and the loop I did not see

Measured first, which is what set the scope: on the 5,000-page trace, batches
53–208 ran at **exactly** the ideal pace (excess −0.1 min) while batches 1–52
wasted +6.4 min. That refuted the issue's own stated hypothesis — the
`Promise.allSettled` barrier and the 15 s per-request timeout cost nothing net —
and let me delete the per-request-timeout work from scope instead of doing it.

The real cost was rediscovery: open at `CRAWL_RATE_START = 3`, get refused down
to ~1.11, then climb back gated by the ceiling's ×1.02 per clean batch, which
needs ~41 clean batches. So: seed the opening rate from what #88 now stores.

**What review caught.** I argued a stale-low seed self-heals via `CEILING_RELAX`.
True for a 208-batch crawl; false in general. `crawl_settled_rate` is the rate
after the _final_ batch, so a crawl whose last batch draws one refusal stores a
number up to 25% low, and a 200-page site crawled weekly gets 8 batches ×1.02 ≈
1.17 recovery per crawl — a dozen weeks to climb out of the floor. Pinning the
ceiling to the settled rate turned one bad trailing batch into every later
crawl's opening rate.

The fix separates the two questions the seed answers: open at `settledRate`
(polite), but ceiling at `crawl_highest_rate` — the rate that crawl
_demonstrably sustained_ — which `afterCleanBatch` reaches additively. Evidence
bounds the climb instead of licensing one. Plus: a crawl that dispatched no batch
now records no pacing at all, because `rate` still held the seed and writing it
back would launder a seed forward as the site's own answer.

Production check, same target and config as baseline: **refusals halved, 51 →
25**, congested batches 3 → 1. Every recorded number reconciles against the law
exactly — `highest` is the seed, `lowest` is `seed × 0.75` after the wholesale
refusal, and `settled` is `lowest × 1.02⁴` over the four clean batches that
followed.

## #51 — a report that lied in its own summary

One HTML template, two rendered outputs. The interesting part was not the
Browser Rendering plumbing; it was the honesty rules. Chapters this job does not
collect are _named as absent_ rather than estimated, and a rule the catalogue
cannot explain says so rather than getting invented prose.

**What review caught.** The executive summary counted issue _occurrences_ under a
header reading "Affected URLs". Occurrences are unique per (audit, rule, url), so
a page failing three rules contributed three. My first production PDF printed
`2 + 100 = 102 affected URLs` for a **100-page** crawl — on a page whose cover
says _"every figure below is measured, not estimated."_ I had that PDF open, read
the numbers, and did not notice the total exceeded the pages crawled.

Second: a filtered export rendered as a whole-site audit. The ZIP's manifest had
always stated its filters; the report did not — and unlike the panel it was
requested from, the artifact travels to a client alone.

Both fixed and re-verified on a fresh render: filtered to `severity=low` the
summary now reads 99 against findings of 94 and 6 (100 occurrences, 99 distinct
URLs, one page failing both), and the page carries its filter notice.

## The pattern worth keeping

Both defects were _in evidence I had already gathered_. The 102-on-100 was on a
PDF I had extracted and quoted; the recovery-loop arithmetic was implicit in a
trace I had already parsed. Independent review was not catching things I could
not see — it was catching things I had looked straight at. That is an argument
for review even when the implementation is well tested, and an argument for
writing the number down where it can be checked against another number.

Two smaller notes:

- `max-lines` counts code, not comments, so trimming prose to fit is theatre.
  Twice this pushed a real extraction — `AuditSnapshotRepository`, then
  `siteAuditWorkflowLighthouse` — both of which the codebase wanted anyway. The
  gate is doing its job.
- Threading a format through the export pipeline meant finding **three**
  hardcoded `.zip` sites plus a fourth in the retention sweep, whose test stubbed
  `auditExportKey` with a one-argument function that always returned `.zip`. The
  stub would have kept the suite green while every rendered report orphaned in
  R2. A mock that cannot observe the parameter under test is not covering it.
