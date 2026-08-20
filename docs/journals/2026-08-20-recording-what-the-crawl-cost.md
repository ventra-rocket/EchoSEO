# Recording what the crawl cost

**Date:** 2026-08-20
**Component:** Site Audit crawl loop · `audits` schema · crawl progress KV/card
**Status:** Deployed `bf7f2e54`; migration `0045` applied; #88 closed, #76 re-scoped and closed, #91 opened

## What shipped (#88, PR #90)

Since #87 a partially refused batch no longer hibernates, so the Workflow trace
stopped counting refusals — a crawl settling at half a site's tolerance looked
identical to one settling at its ceiling. The loop already computed the pacing
(`crawl-pacing` line in #89); it just went nowhere durable.

- `audits` gains five nullable columns (settled/lowest/highest rate, refused
  requests, congested batches), written once at completion by `completeAudit`.
  Migration `0045` is additive-nullable; rollback is five `DROP COLUMN`, safe
  because the columns are unread by prior code and null on existing rows.
- `crawlPhaseDetail` (KV) gains the same three live numbers, riding the
  per-batch write that already happens — no extra write, fields optional so old
  payloads still parse. The progress card shows them in plain English.
- The pacing accumulator became a pure `crawl-pacing.ts`
  (`initialPacing`/`foldBatchPacing`/`pacingSummary`/`pacingColumns`), and
  `partitionRefusedBatch`/`throttleBackoffSeconds` moved to `crawl-retry.ts`
  beside the refusal classifier — which also kept both touched files under the
  `max-lines` gate honestly, not with a suppression.

Verified from stored data: a 100-page kello crawl (audit `e39bc5f9`) completed
with `settled_rate 1.75`, `refused_requests 51`, `congested_batches 3`,
`lowest 1.69`, `highest 3.00` — the whole acceptance question answered by one
`SELECT`, and it caught this crawl settling from 3.0 down to 1.75 under real
congestion.

## The reorder that had to stay behaviour-preserving

The pacing/rate update moved _above_ the KV progress write so the live feed and
the backoff both see the current batch. This is safe only because the durable
step sequence per iteration is unchanged
(`crawl-batch → kv-progress → progress → throttle-backoff → cpu-break`) and
nothing between the old and new update sites reads `rate`. The existing interval
and sleep assertions (`[333, 444, 436, 427]`, the `throttle-backoff-N`
durations) still pass unchanged, which is the proof.

## A review that caught a dropped file

The fallback reviewer found that `CrawlProgressCard.tsx` was left uncommitted —
`git add src/db src/server drizzle` had missed `src/client`. The first commit
shipped the KV-write side with no consumer. Committed the card, CI re-ran green,
then merged. The lesson is mechanical: stage by intent, not by directory.

## #76 re-scoped rather than left open

The one unmet #76 box — "wall time approaches ~24 min" — was mis-derived. The
24-min figure came from probing a single cache-busted URL (the edge), while the
deep watch-page set is metered near 2.8 req/s at the origin, agreed by four
independent numbers. At 0×429 the governing constraint has left our code and
lives at the site; even at perfect efficiency 5,000 pages is ~30–33 min from one
polite IP. Keeping the box open would pressure closing it the only way left —
IP-sharding — which is the impoliteness this crawler exists to avoid. Re-scoped
to calibration / cleanliness / efficiency (first two met), closed with the
evidence, and split the one real remainder — achieved rate lags offered rate
because each batch is a `Promise.allSettled` barrier held open by the 15 s
per-request timeout — to #91.
