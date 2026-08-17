# The Crawler Was Measuring The Wrong Quantity

**Date**: 2026-08-17 16:40
**Severity**: Medium
**Component**: Site Audit crawl (rate control, retry policy, unreachable-URL reporting)
**Status**: Both changes deployed and measured; one acceptance test still unrun

## What Happened

Two follow-ups to the throttling work (#70): make a 5,000-page crawl faster (#72), and
stop reporting a connection that died under our own load as the site's unreachable URL
(#73). Both shipped. The performance one did not do what I expected, and finding out why
produced the most useful measurement of the day.

## #72 — Additive Increase And A Measured Hibernation

The 47-minute crawl decomposed into two self-inflicted costs. The recovery from a throttle
was **multiplicative** — double after three clean batches — which against a fixed limit is
a sawtooth: sprint to 25, overshoot, lose a refused window, halve, sprint again. And the
CPU-budget hibernation slept 10 s every 5 batches, calibrated against a per-page cost
nobody had measured. So I measured it: `analyzeHtml` costs **6.0 ms** on a real 118 KB
product page, meaning five batches is 0.75 s of parse CPU against a 30 s budget, and those
40 sleeps were 6.7 minutes of a 47-minute run.

Fixed both: +1 per clean batch, and hibernate every 500 pages (~3 s of parse) counted in
pages rather than batches, because the batch size moves with the adaptive rate now.

### The result was not what I predicted

|           | before   | after        |
| --------- | -------- | ------------ |
| wall time | 47.0 min | **46.8 min** |
| 200       | 4,812    | **4,894**    |
| status 0  | 170      | **55**       |
| 429       | 18       | 22           |

Core throughput genuinely improved — 135 pages/min between the 15 and 31 minute marks
against 106 before — but a **four-minute stall** at 3,882 pages swallowed the gain. Quality
improved; the clock did not. Reporting that as a win would have been dishonest, so the
issue says so plainly.

## Then The Measurement That Mattered

With the crawl finished, I probed the origin at fixed sustained rates from one IP:

| offered rate | duration | result                  |
| ------------ | -------- | ----------------------- |
| 2 req/s      | 40 s     | 80 × 200, zero 429      |
| 3 req/s      | 40 s     | 120 × 200, zero 429     |
| 5 req/s      | 40 s     | 71 × 200, **129 × 429** |

The site sustains **~3–4 req/s per IP**. Our crawl averaged **1.78**. So there is a hard
floor no code can cross — about 24 minutes for 5,000 pages from a single egress IP — and we
are simultaneously leaving 2× on the table.

The reason is a units mismatch that had been sitting in plain sight: **we control
concurrency, the site meters requests per second.** At 2,559 ms latency, concurrency $C$
offers $C/2.559$ req/s, so:

- our floor of 3 offers 1.2 req/s — three times under;
- the sustainable point is $C \approx 9$;
- our ceiling of 25 offers 9.8 req/s — nearly three times over.

Every climb toward 25 trips the limit _by construction_, and each trip pays a halving plus
an exponential sleep escalating to 60 s, against a limit that recovers in about five
seconds. The control law overshoots and then over-punishes. Filed as #76 with the arithmetic
rather than tuned by feel in the same session.

## #73 — Retry Turns Absence Of Evidence Into Evidence

`audit-unreachable-url` reported every `status_code = 0` row as critical, and its remedy
text told the reader to check their own "firewall rules and rate limiting for anything
blocking automated crawlers". When the connection died under our load, that blamed their
configuration for our concurrency.

A refusal is now asked for again before anything is written down: **429, 503, 0, 502, 504**
— every response that says nothing about the page. A 404 is an answer and a 500 is the
site's own failure; neither is retried. A URL that fails all three attempts is a far
stronger claim than one that failed once, and the rule text now states that instead of
implying it.

Only some refusals mean "slow down". An explicit throttle does, from one occurrence. An
unanswered request only does when it took more than half the batch: a site with a handful
of dead links would otherwise drag every crawl to its floor, while a load-induced storm
takes nearly every request in flight. That threshold is a judgement, not a measurement,
and the code says so.

`classifyRefusal` is deliberately separate from `classifyPageStatus`. Yesterday's lesson
was that one question must have one answer; the temptation today was to over-apply it.
These are two questions — "ask again?" and "report as what?" — and a 503 legitimately
answers yes and error. The distinction is written at the top of the module so the next
reader does not "fix" it into one predicate.

## Verification

`ci:check` clean, `vitest` 1901/1901 (+21), build clean, deployed `e5293e41` then
`af87df16`.

Every new loop test was run against the pre-change source: three fail for #72, four for
#73. Doing this twice in two days has already paid for itself once — yesterday it exposed a
test that passed on both sides and was therefore a guard, not a proof.

Status-0 fell 170 → 55 on the #72 crawl alone, before the retry work deployed, which is
consistent with those being dropped connections rather than dead URLs. That is corroboration,
not the acceptance test.

## What Is Not Done

The acceptance test for #73 — re-crawling `thehourglass.com` (1,210 × 0, 73 × 502) and
comparing — has not run. Launching an audit requires the authenticated UI and the
workstation display went to sleep; the MCP surface covers keywords, backlinks and rank
tracking, not Site Audit, so there is no headless path to trigger one. The issue stays open
with the claim explicitly marked unproven on a real site.

Also declined, with the reason recorded: collapsing the two per-batch progress writes into
one durable step. It removes 200 steps from a 5,000-page crawl, but `pushCrawledUrls`
appends, so a retry of the combined step duplicates live-feed entries. Trading a correctness
property for step overhead nobody has measured is the wrong side of that deal.

## Lessons

- Predicting a performance win is not measuring one. Two correct changes produced a 0.4%
  wall-time change, and only probing the origin explained why.
- Control the quantity the other side meters. Concurrency and requests-per-second differ by
  a factor of latency, and that factor was three.
- Before optimising against a limit, measure the limit. Two probes and 80 seconds turned
  "the crawl is slow" into "the crawl is at half of a hard ceiling, for these reasons".
- A lesson learned yesterday can be over-applied today. "One question, one answer" does not
  mean "one predicate"; check whether the questions are actually the same.
- A backoff should be sized to the recovery window it is waiting out, not to an escalating
  guess. Sixty seconds for a five-second limit is not caution, it is waste.
