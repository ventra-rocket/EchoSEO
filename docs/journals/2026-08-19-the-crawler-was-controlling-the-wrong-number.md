# The crawler was controlling the wrong number, and then the wrong number was fine

**Date:** 2026-08-19 (overnight)
**Component:** Site Audit crawl loop — rate control, robots.txt, politeness
**Status:** Deployed `e7b318d4`; #85, #86, #87 merged; #76 acceptance partially met and one criterion contested with evidence

## What this was about

Issue #76: the crawler controlled **concurrency** while a site meters **requests
per second**. At the 2.6 s latency measured in August, a concurrency of 3 offers
1.2 req/s and a concurrency of 25 offers 9.8 req/s against a site that serves
3-4, so every climb toward the ceiling tripped the limit by construction. A
5,000-page crawl of `kello.ventrarocket.vn` averaged 1.88 req/s in 44.4 min and
still collected 36 × 429 — half the site's tolerance unused _while_ overshooting
in bursts.

Three deploys came out of one night, and each one was wrong about something the
next one measured.

## Deploy 1 (#85): control the rate, and pace inside the batch

`crawl-rate.ts` replaced the concurrency variable with an offered rate in req/s,
and `runCrawlBatch` began spacing its 25 requests by `1/rate` instead of firing
them at once. Concurrency became emergent (`rate × latency`), which is the right
way round. `Crawl-delay` was honoured for the first time, and the crawler's
user-agent became one exported constant instead of three literals.

Batch size stayed at 25 deliberately: a Workflow instance is capped at 1,024
steps and a 5,000-page crawl already spends ~645, so pacing by shrinking batches
would run large crawls out of steps.

## Deploy 1 was a regression, and the acceptance crawl said so within 15 minutes

The law lowered its learned ceiling on **any** refusal (`rate × 0.9`) and lifted
it by a flat `+0.005` per clean batch. That is a one-way ratchet on a site that
refuses occasionally for reasons of its own — and this site does, about one 429
per 139 pages while serving half its tolerance. Twelve times denser than the
ratchet could recover from.

Measured on the deploy: 1,154 pages in 15.2 min = **1.26 req/s**, below the 1.88
it was meant to beat. Recovery from the floor needed 560 clean batches — 14,000
pages — which no 5,000-page crawl reaches. An independent review flagged the same
defect from the arithmetic before the crawl finished; the crawl was terminated
rather than left to prove it for another hour.

## Deploy 2 (#86): a refused batch is a measurement, not a verdict

`congestionShare` now reports _how much_ of a batch was refused, and the rate
becomes `rate × (1 − share)` — the rate the site demonstrably did serve — floored
at ×0.75 so one batch cannot claim the site serves nothing. One 429 in twenty-five
costs 4%, not 25%. The ceiling forgets 2% per clean batch, so recovery is
symmetric with the decrease.

The same PR fixed a smaller thing with a sharper edge: `isAllowed(url)` matched
only the `*` group while `getCrawlDelay(AUDIT_USER_AGENT)` matched ours, so a site
could close `/admin` to `EchoSEO-Audit` **by name**, have its `Crawl-delay` from
that same group obeyed, and be crawled there anyway.

Result on production: 5,000 pages in 44.9 min, 1.86 req/s, **0 × 429 recorded**,
average response **350 ms** against 1,181 ms before. The site stopped being
overloaded. The wall time did not move.

## The measurement that ended three theories at once

`wrangler workflows instances describe site-audit-workflow <instance>` gives
per-step timings, and nobody had ever looked:

| step                |   n |   median |       total |
| ------------------- | --: | -------: | ----------: |
| `crawl-batch`       | 207 | **10 s** |    38.5 min |
| `kv-progress-batch` | 207 |      0 s |     1.4 min |
| `progress-batch`    | 207 |      0 s |     0.3 min |
| `throttle-backoff`  |  19 |      5 s |     2.0 min |
| `cpu-budget-break`  |   9 |     10 s |     1.5 min |
| step-to-step gaps   | 653 |      0 s | **0.2 min** |

Workflow step commits are free here. That killed, unwritten, two optimisations
that had been costed at 10 and 25 minutes of engineering: merging the two progress
steps, and moving page writes inside the crawl step so batches could grow to 100
(a schema migration, a deterministic page id, and a replay double-write hazard —
all of it now unnecessary). A micro-benchmark exonerated link classification too:
1.36 ms per batch.

The crawl is dispatch-bound. And the per-batch implied rate says what it is bound
_to_:

|                 |   n |         median |        max |
| --------------- | --: | -------------: | ---------: |
| refused batches |  19 | **2.79 req/s** |       3.16 |
| clean batches   | 188 |     2.50 req/s | 2.79 (p90) |

The control law is sitting on this site's ceiling, not below it.

## The probe in the issue measured a different site

#76 says the site sustains 3-4 req/s, from a probe that hit **one URL** with a
cache-busting query. Re-run tonight over **distinct** sitemap URLs from a single
IP:

| offered | requests | 200 | 429 | median latency |
| ------- | -------: | --: | --: | -------------: |
| 3 req/s |       60 |  60 |   0 |         436 ms |
| 4 req/s |       80 |  80 |   0 |         351 ms |
| 6 req/s |      120 |  83 |  37 |       1,751 ms |
| 8 req/s |      150 |  68 |  81 |       7,407 ms |

Light brand pages take 4 req/s. The 5,000-page mix — deep, uncached watch pages —
refuses from 2.8 req/s upward, which is exactly where the crawl's own trace says
it refuses. So #76's "wall time approaches ~24 min" assumes a rate this origin
does not serve for this page set. The floor for 5,000 pages at its real tolerance
is ~30 min.

## Deploy 3 (#87): stop paying five seconds for one refused request

19 batches were refused, **18 only partially**, and each bought a 5 s
hibernation: 1.6 min of deliberate idling to recover from something the
proportional rate cut had already answered. Hibernation lets a limiter's window
drain, which only matters when we filled that window, so it now needs a fifth of
the batch refused. `Retry-After` is obeyed at any share — the server named a
number.

Tuning was also tested and rejected: simulated against the calibrated 3 req/s
ceiling, climbing at `+0.4/1.04` or `+0.5/1.05` makes wall time **worse** (34.1
and 35.1 min vs 33.4) by trading refusals for reach. The constants that looked
timid were already right.

## What is true now

- The crawl offers a rate, spaced per request, at ~100% duty cycle. No bursts.
- It converges on the site's measured ceiling and recovers from isolated refusals
  instead of ratcheting down.
- It obeys `Crawl-delay`, and obeys the robots group written for it by name.
- 0 × 429 recorded on a 5,000-page crawl, and the site answers 3.4× faster.
- Wall time is ~45 min and the remaining gap to 30 min is small; the gap from 30
  to 24 is the site, not the code.

## What this cost, and the lesson worth keeping

Two of the three deploys were corrections of the previous one, and both
corrections came from measurements that took minutes: an acceptance crawl watched
for 15 minutes, and one `workflows instances describe` call that had been
available the whole time. The plan that got written before those measurements had
three optimisations in it, two of which were worth nothing.

Measure the thing you are about to optimise, in the place it runs, before writing
the optimisation. Every wrong turn tonight was a confident number that nobody had
looked up.
