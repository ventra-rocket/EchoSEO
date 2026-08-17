# Blaming The Site For Our Own Request Rate

**Date**: 2026-08-17 14:30
**Severity**: High
**Component**: Site Audit crawl (politeness, page-status classification, issue materialisation)
**Status**: Resolved and deployed; verified by re-running the exact failing case on production

## What Happened

A completed 5,000-page audit of `kello.ventrarocket.vn` reported **1,894 broken pages**.
The site is healthy. All 1,894 were `429 Too Many Requests` — our own crawl rate,
recorded as the site's defects, on the product's headline output.

Found by the live page feed shipped the day before for #68. Before that feed existed the
report simply arrived with a wrong number in it and nothing to contradict it.

## The Brutal Truth

The codebase already knew the right answer and only applied it in one place. From
`cross-page-signals.ts`, written earlier and unprompted:

> Restricted to 4xx, which is what the rule's Google citation covers, minus the codes
> that mean "you may not see this" or "not right now" rather than "this is gone": a
> members-only page and a rate-limited response are not broken links.

That judgement never reached `classifyPageStatus`, so four other consumers disagreed with
it: the crawl summary counted a 429 toward `pages_broken`, `server-status` raised a
critical issue against every refused page, the page diff read `200 → 429` as a site-wide
regression, and the results table coloured it red with no way to filter it. One correct
predicate in one file is not a decision; it is a note.

This is the third production defect traceable to `68cad5f` raising the launch default from
50 to 5,000 (#64, #67, #70). At 50 pages a crawl is two batches and never approaches a
rate-limit window. Raising a default is a behavioural change, not a config tweak.

`crawlPage` was also parsing the block page. Cloudflare serves its 429 as `text/html`, so
the rate-limit interstitial's title and word count were stored as the page's own facts.

## Measuring Before Deciding

Probing the origin directly, 25 requests at a time:

```
wave 1:  25 × 200
wave 2:  25 × 200
wave 3:  25 × 429     ← the limit trips; the whole window is refused
wave 4:  25 × 200     ← recovered
```

Once tripped, continuing to push keeps it tripped: a follow-up run took **100 of 100** as 429. And the response carries **no `Retry-After`** — so how long to wait had to be our own
decision, not something we could read off the wire. Both facts shaped the fix, and neither
was guessable from the code.

## What Changed

The rate is adaptive: a throttled batch halves concurrency (floor 3) and hibernates
through `step.sleep`, climbing back after three clean batches; the wait is exponential
5 s → 60 s, or exactly what `Retry-After` asked when a server sends one. A fixed lower
concurrency was rejected — it slows every well-provisioned site to protect the few.

Throttled URLs go back on the queue rather than being recorded, up to three attempts.
This needed `visited.delete(url)`: `selectNextCrawlBatch` marks a URL visited _before_ the
fetch, which is precisely why a refusal used to be permanent. After three refusals the row
is kept as throttled, so the crawl still terminates and the report can say "we could not
read this" instead of quietly shrinking.

The live feed keeps showing the 429s. Hiding the retries would have made the crawl look
merely slow, and that feed is the only reason any of this was visible.

429 became its own `PageStatusClass`. No migration: the class was always derived from
`status_code`, never stored.

## Verification

`ci:check` clean, `vitest` 1877/1877 (+18), build clean.

The five new crawl-loop tests were run **against the pre-fix source**: four fail there and
pass here. The fifth passes on both sides by design — it locks in the deliberate choice to
publish refusals to the live feed, and would fail if someone "tidied" that line. Worth
doing that check explicitly; a test that passes before the fix defends nothing, and
without running it against the old code that claim is only a belief.

Then the real proof, deployed as `171dc8bd` and re-running the exact failing case:

| status | before (`41dc1f88`) | after (`7e1d1de6`) |
| ------ | ------------------- | ------------------ |
| 200    | 3,106 (62%)         | **4,812 (96%)**    |
| 429    | **1,894 (38%)**     | **18 (0.36%)**     |
| 0      | 0                   | 170 (3.4%)         |

429 down 105×, and 1,706 more pages actually measured — the refusals were retried into
real reads. Watched it happen live: a wall of 429s across `/en/watches/a-lange-sohne-*`,
then the same URLs returning `200` with real titles after the backoff.

## A Claim I Got Wrong

I told the issue that the 1,210 `status_code = 0` rows on an earlier audit were "counted
as nothing at all". False: `audit-unreachable-url` reports every one of them as critical.
I had inferred it from the summary counters without reading the cross-page rules, and
posted it as a measurement. Corrected on the issue rather than quietly edited.

It matters beyond the embarrassment, because the true version is a worse defect: that
rule's remedy text tells the reader to check their _own_ rate limiting, so a connection
that died under our load is reported as their misconfiguration. I did not fix it here —
a bare 0 cannot distinguish "host is down" from "we killed the connection", and the one
site exhibiting it showed no 429s to attribute it with. This run then produced 170 of them
on a site that had zero before, which is the evidence that was missing (#73).

## What The Fix Exposed

47 minutes for 5,000 pages, and the decomposition is unflattering. Measured: the site
averages 2,559 ms per response, and `analyzeHtml` costs **6.0 ms/page** on a real 118 KB
product page — 165 pages/s on one core, about 30 seconds of parse CPU for the entire
crawl. At the configured 25 concurrent the ceiling is 9.8 pages/s (8.5 minutes). We
achieved 1.77 pages/s, an effective concurrency of **4.5** against a floor of 3.

So the crawl ran near its floor almost the whole time, because recovery is _multiplicative_
— climb to 25, overshoot the limit, lose a window, halve, repeat. Congestion control solved
this decades ago with additive increase, and I shipped the oscillating version. Separately,
the CPU-budget hibernation costs 40 × 10 s = 6.7 minutes, 14% of the run, calibrated
against a per-page cost nobody had measured until today; five batches is 0.75 s of parse
CPU against a 30 s budget. Both filed as #72.

Nothing here is hardware. 25 open sockets and 1% of a core would not trouble a $5 VPS.

## Lessons

- A correct predicate written in one file is a note, not a decision. If two callers can
  answer the same question differently, the answer belongs in the shared module — the
  same lesson as #65, learned again one file over.
- Run new regression tests against the unfixed code. Four of five failed; the fifth
  revealed itself as a guard rather than a proof, which is only knowable by trying.
- Measure the site before designing the politeness. The absent `Retry-After` and the
  all-or-nothing refusal window both changed the design, and neither was in the code.
- Do not report an inference as a measurement. Read the rule, then make the claim.
- Shipping observability pays immediately: the live feed found this within a day, and the
  same feed then proved the fix by showing refused URLs coming back as real pages.
