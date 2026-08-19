# The crawl that finally measured the fix

**Date:** 2026-08-19
**Component:** Site Audit crawl loop · page analyzer · GSC import · weekly report
**Status:** Deployed `d8482407`; #73, #77, #78, #79, #80, #36, #43 closed on evidence

## What happened

Two days of fixes had been deployed without a single full crawl running on top of
them. Today one did, and it settled several arguments at once.

`kello.ventrarocket.vn`, 5,000 pages, same target every time:

| crawl (UTC) | deploy     |   200 |   429 | 5xx | status-0 | avg response |
| ----------- | ---------- | ----: | ----: | --: | -------: | -----------: |
| 08-16 10:53 | `055e181d` | 3,106 | 1,894 |   0 |        0 |     2,003 ms |
| 08-17 06:37 | `171dc8bd` | 4,812 |    18 |   0 |      170 |     2,559 ms |
| 08-17 07:51 | `e5293e41` | 4,894 |    22 |  29 |       55 |     1,630 ms |
| 08-19 08:02 | `3776d880` | 4,964 |    36 |   0 |    **0** |     1,181 ms |

Status-0 and 5xx both zero, on the fastest of the four runs. The rows that used
to be reported as the site's unreachable URLs were connections dying under our
own load, exactly as #73 argued; retrying them turns each one into a real answer.

The remaining honest failure came from the 100-page sample of
`www.thehourglass.com`: one URL, `response_time_ms = 15000`, timed out on every
attempt, reported once as `audit-unreachable-url`. That is the case worth
keeping — and the rule text now earns it ("on any attempt — it is retried before
this is reported") instead of assuming a site defect.

## The analyzer, measured at scale instead of on one page

The element-boundary fix (#79, PR #82) had one page of evidence. Pairing the
08-17 and 08-19 crawls **by URL** gives 4,859 pages that returned 200 in both:

- 4,852 grew, 1 unchanged, 6 shrank
- average words/page **135.4 → 216.2**

The six that shrank are not regressions: `SKIP_TAGS` is unchanged and the fix
only ever _adds_ separators, so for identical HTML the count can rise or stay
equal, never fall. All six are `/brands/*` listings on a live demo site whose
inventory moved between crawls.

Then the part I nearly got wrong. I wrote that the fix would cut over-reported
thin content, and the measurement said otherwise: `structure-word-count`
occurrences went **4,891 → 4,953**, up, because the later crawl reached 70 more
live pages and this site averages 216 words either way — still under the
300-word fail threshold. The real number is the crossings: **445 pages moved
from under 300 to over it**, so 445 false thin-content findings disappear and
4,852 displayed word counts stop being wrong. Direction right, magnitude wrong,
and only the query knew.

## Two acceptance boxes closed with a real Google grant

The sprint had carried both since 13/08 because they needed production and a real
grant, and the workstation could not give the agent an authenticated session.
Today's route was the omp browser relay driving the operator's own Chrome.

**Multi-site import** (Phase 02): the modal listed all 5 properties with
`sc-domain:` and URL-prefix labelled distinctly, the already-bound property
disabled and named with the project holding it. Ticking two —
`https://app.echoseo.ventrarocket.vn/` and `sc-domain:kello.ventrarocket.vn` —
moved `projects` 6→8, `gsc_connections` 2→4, `audit_targets` 5→7. Exactly +2 each,
hosts normalised (`sc-domain:kello…` → `https://kello.ventrarocket.vn`).
Re-opening the modal immediately: three bound rows disabled, button now
"Select all 2" — the duplicate guard compares the property binding, not the name.

**Weekly report numbers** (Phase 07): `resolveDateRange` puts the app window at
`2026-08-09..2026-08-16` (3-day lag). Against Search Console's own per-day table
for the identical 8 days:

|              |  app | Search Console UI |
| ------------ | ---: | ----------------: |
| clicks       |    3 |                 3 |
| impressions  |  244 |               244 |
| CTR          | 1.2% |     3/244 = 1.23% |
| avg position | 17.0 |   4150/244 = 17.0 |

Exact, including the impression-weighted position. The email's own window is a
day shorter (`buildWeeklyPeriod`, 4-day lag) and that arithmetic has unit tests.
A subscription is now live for `https://ventrarocket.vn`, so the first real email
lands Monday 24/08 — which is also the sample for the last open box, rendering on
real mail clients.

## Four defects verified after deploying `d8482407`

Each of these had been argued from source; production now shows them.

- **#43** — nav has 11 links and none is `/p/<id>/assistant`; the Command Center
  card reads "Via your MCP client · In-app chat is off here" and points at `/ai`.
- **#77** — `/p/<id>/zzz-does-not-exist` renders `h1: 404` **inside** the shell,
  sidebar intact, instead of 20 seconds of black.
- **#78** — Keyword Research with no key: "No DataForSEO API key connected ·
  Nothing was requested, so there is nothing to report about it yet", plus the
  help link. One state, correctly named.
- **#80** — the free checker released its queued submit at **12s** with
  "Couldn't load verification — please refresh the page." and the button back to
  "Check my site". Measured on the previous deploy this morning: past 100 seconds
  of silence with no message at all.

That last one is a happy accident of tooling: CDP-attached Chrome is precisely
the client Turnstile declines to mint a token for, so the relay reproduces the
"token never arrives" branch on demand.

## What the relay cost to get working

Two false starts worth recording. `.omp` is hidden, so macOS's file chooser
cannot reach the extension — dragging the folder onto `chrome://extensions`
works. Then the relay flapped on a ~6 second cycle:

```
1 tabs  | app.echoseo.ventrarocket.vn
17 tabs | github.com ; docs.google.com …
1 tabs  | app.echoseo.ventrarocket.vn
```

I first blamed MV3 service-worker eviction and told the operator to pin DevTools
open. Wrong: two tab sets that never intersect are two Chrome **profiles**, both
running the extension, fighting for one relay port. Disabling it in one profile
fixed it immediately. The evidence was in the data I already had — I had read it
as noise instead of as a partition.

## Not done

- A 5,000-page re-crawl of `www.thehourglass.com` from `1ad87aaf` would give the
  1,210 → n comparison at full scale. Different account; the 100-page sample
  (24% → 1%) is what exists.
- #76 stands, and this crawl sharpened it: 5,000 pages in 44m 21s is 1.88 req/s
  against a site serving 3–4, while 36 requests still came back 429. Faster
  responses (1,630 → 1,181 ms) bought 2.4 minutes, because batch structure sets
  the pace, not latency.
- Google Ads Basic access is still unsubmitted; the MCC exists (`367-707-0296`).
