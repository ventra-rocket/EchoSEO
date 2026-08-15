/**
 * Crawl size limits, in one place because three had drifted apart: the zod input
 * schema, the server-side clamp, and the launch form each carried their own copy
 * of the same two numbers.
 */

export const AUDIT_MIN_PAGES = 10;

/**
 * The largest crawl that completes, measured rather than assumed.
 *
 * Verified on production 14/08 twice at this number: once on a real sparse site
 * (`www.thehourglass.com`, 5,000 pages / 106,336 link edges, 1h30m) and once on a
 * purpose-built rig with 101 internal links per page (5,000 pages / 499,900 edges,
 * 13m). See `plans/reports/verification-260814-crawl-ceiling.md`.
 *
 * Two things bind above it, and neither is a policy choice:
 *
 * - **Workflow steps.** Measured at 0.129 steps per page (261 steps at 2,000
 *   pages, 645 at 5,000) against a hard ceiling of 1,024, so a crawl stops being
 *   able to finish at roughly 7,800 pages. Merging the three per-batch steps into
 *   one would lift that to ~20,000; that is the backlog item, not this constant.
 * - **Isolate memory.** The crawl holds every page's result (`allPages`) for the
 *   whole run plus the finalize link graph. 5,000 measures ~60-80 MB peak heap
 *   against 128 MB; 10,000 stacks past it.
 *
 * Raising this without re-measuring would recreate exactly what Phase 05 found:
 * a number in the code that nobody had ever run.
 *
 * The launch default is deliberately this same number, so it is not a separate
 * constant. It was 50, which meant a 600-page site reported 50 pages with nothing
 * anywhere saying it had been cut short — the tool looked weak at the one thing it
 * is for. Sites under the ceiling finish naturally when the frontier empties, so
 * for almost every real site "crawl up to the limit" means "crawl all of it", and
 * it costs nothing extra in PageSpeed calls: the `auto` strategy is a flat 20
 * checks regardless of page count (`audit-capacity.ts`).
 */
export const AUDIT_MAX_PAGES = 5_000;

/**
 * Above this crawl size a hosted-tier audit must run against a domain the
 * connected Search Console property proves ownership of. Self-host / local stay
 * permissive with an honest "unverified" label.
 *
 * Lives here, beside the crawl ceiling, because the launch form has to name this
 * number to the user before a crawl is refused for it — and the client cannot
 * import the server authz module that enforces it.
 */
export const AUDIT_VERIFICATION_PAGE_THRESHOLD = 100;
