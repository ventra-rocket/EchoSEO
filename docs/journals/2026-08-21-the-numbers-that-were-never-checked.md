# The numbers that were never checked

**Date:** 2026-08-21
**Component:** rank tracking × Search Console · audit i18n · local D1 resolution · GSC property scope
**Status:** #94, #95, #96 merged; deployed; gates green (2058 tests)

Started from "what is left?", which had an unusual answer: nothing on GitHub. All
30 issues closed. So the work came from the roadmap's own prose gaps.

Three PRs went out green, a review found eight defects across two of them, and
every one was real. That is the whole story of the day, and the rest of this is
which kinds.

## Defects I could have found and didn't

**I read a path and not what was in it.** Dropping `@every-app/sdk` looked like
a one-line swap: its only use was `getLocalD1Url` in `drizzle.config.ts`. The
inherited helper walked `.wrangler/state/v3` recursively and took the first
`*.sqlite`. Miniflare keeps ~20 of them, one directory per simulated binding,
and it resolved
`.wrangler/state/v3/cache/miniflare-CacheObject/metadata.sqlite` — the Cache
object's bookkeeping index. My check "passed" because it printed a path that
existed. `pnpm db:generate` also passed, because generate never opens the
database. The verification that verifies is a query:
`SELECT count(*) FROM rank_tracking_keywords` → 20, matching the seed.

**Then I did it again, in the same PR.** CI refused the merge at
`--frozen-lockfile`: the lockfile still listed the removed dependency. I had run
`pnpm install` and read the tail of its output, past the failure. `pnpm install`
in a non-interactive shell defaults to frozen too, so it had refused as well.
`pnpm run ci:check` cannot catch this — prettier, knip, tsc and oxlint never
read the lockfile.

**I verified one state and described a surface.** The i18n PR claimed the whole
Site Audit. Ten components had zero react-intl usage. I had checked live against
one completed four-page audit: no running crawl, no baseline, no comparison, no
export panel, no IndexNow, no periodic report. Every state I did not open kept
its English. The fix needed a seeded baseline crawl and a hand-written running
audit row before the missing copy would even appear on screen.

Three instances of one failure: evidence gathered, evidence not read. The tell
is the same each time — the check I ran could not have failed.

## Defects the review found that I would not have

**A complete read does not prove a zero.** The overlay's whole thesis was that
absence has two meanings: read fully means a measured zero, read truncated means
unknown. Search Console omits anonymized queries entirely — below its privacy
threshold a query never appears, however far you paginate. So a full read proves
only that we saw every query Google is willing to name. The mechanism survived;
the claim did not. Every "measured zero" now reads "Google reported nothing for
this query". I had reasoned carefully about pagination and not at all about what
Google declines to say.

**A URL-prefix property only covers its own path.** `propertyCoversOrigin`
compared protocol and host, and its doc comment asserted the opposite as fact:
"a path is ignored: verifying `https://example.com/shop/` does report on the
whole host." A confidently worded comment is not evidence, and this one had been
load-bearing for three surfaces.

Fixing it broke a test in a feature nobody was looking at, and it broke for the
right reason. `gsc-site-import.ts` declares in its own header that the origin it
derives must be covered by the property it came from — then mapped a
`/shop/`-scoped property to a whole-origin project and rendered the discarded
path to the user as **"scoped to /shop/, crawls the whole site"**. A promise
Search Console will never keep, shipped, in the UI. One corrected boolean and a
self-checking test found it.

Also: a cached read outliving the keyword set it was read for; and the
Vietnamese copy for a _connected_ property telling a user who had just proved
ownership that they were capped, when the English and the server gate both say
the opposite. A mistranslation that inverts a permission is worse than no
translation.

## What actually worked

**Rendering in a second locale is a different question than rendering.** Three
bugs surfaced only because a Vietnamese screen was on screen: an English header
above a Vietnamese body, an entirely English Search Console card, a setup modal
nobody had opened. And `formatStartedAt` — hardcoded `en-US`, fed a D1
`current_timestamp` with no zone, which JS reads as local time. Every audit's
start time had printed seven hours early for a Hanoi reader since the surface
shipped. The i18n pass was not looking for that. Formatting a date for a second
audience is the question the first audience never asks.

**The lint gate kept finding real seams.** `max-lines` pushed `ComparisonTable`
466 → 230 and `ResultsTables` 530 → 193, both along boundaries the code already
wanted. Third day running that this rule has paid for itself.

**Parallel agents, three at once, zero conflicts** — because file ownership was
stated up front and the one shared resource, the message catalogs, had a rule
about who appends and who edits. What I got wrong was telling them to skip
project-wide gates _and_ not running `oxlint` myself between waves; seven errors
sat in the tree until I did.

## Worth keeping

- **A check that cannot fail is not a check.** Print the value, then read it.
  Assert on the content, not on the absence of an exception.
- **A doc comment stating an external system's behaviour is a claim, not
  evidence.** This one was wrong for a year and three features believed it.
- **Verify the states, not the page.** A surface is a set of states; the one that
  loads by default is the one already correct.
- **Reviews earn their keep on the premises, not the code.** Two of the eight
  findings were about what a number means. Neither would have been caught by
  more tests of what the code does.
