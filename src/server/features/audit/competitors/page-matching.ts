/**
 * Pairing our pages with a competitor's, from URLs alone.
 *
 * Deliberately simple and deliberately explainable. A clever matcher that
 * silently pairs the wrong two pages produces a comparison table that is worse
 * than no table: every row reads as evidence, and nobody re-checks the pairing
 * before repeating a number in a meeting. So this scores on structure the
 * operator can see in the URL, reports the score it used, and refuses to guess
 * below a threshold rather than offering its best bad answer as a match.
 *
 * Scoring, for two paths:
 *
 *   identical normalized path            → 1
 *   otherwise  0.5 x token overlap  +  0.5 x (a shared meaningful segment)
 *
 * The two halves catch different things. Token overlap alone rates
 * `/brand/rolex` against `/en/rolex/discover` at 0.5, which is indecisive for
 * what is obviously the same page; the shared-segment half recognises `rolex` in
 * both and lifts it to 0.75. Segment matching alone would pair `/watches/rolex`
 * with `/rolex` and also `/watches/omega` with `/rolex/watches`, so neither half
 * is trustworthy without the other.
 *
 * Structural segments (`brand`, `collections`, `product`, locale prefixes) are
 * dropped before scoring. They are how two sites differ while selling the same
 * thing, so counting them punishes exactly the pairs we want.
 */

/** Below this, the pair is a suggestion for a human, not a match. */
export const MATCH_CONFIDENCE_THRESHOLD = 0.6;

export type PageMatch = {
  ourUrl: string;
  theirUrl: string;
  /** 0..1, rounded to two places so a stored score reads as what was decided. */
  confidence: number;
  /** Whether this clears `MATCH_CONFIDENCE_THRESHOLD`. */
  confident: boolean;
};

/**
 * Path segments that describe a site's shelving rather than its subject. Two
 * shops selling Rolex watches disagree on all of these and agree on "rolex".
 *
 * Locale codes are NOT here. They are stripped positionally instead, because a
 * locale is only a locale in front: treating `us` as structural anywhere makes
 * `/about-us` identical to `/about`, and `/watches/us-open` identical to
 * `/watches`.
 */
const STRUCTURAL_SEGMENTS = new Set([
  "p",
  "page",
  "pages",
  "product",
  "products",
  "brand",
  "brands",
  "collection",
  "collections",
  "category",
  "categories",
  "shop",
  "store",
  "catalog",
  "catalogue",
  "index",
  "html",
  "htm",
  "php",
  "aspx",
]);

/** A locale-ish first segment: `en`, `en-us`, `vi-vn`. */
const LOCALE_SEGMENT = /^[a-z]{2}([-_][a-z]{2})?$/;

function pathOf(url: string): string | null {
  try {
    return new URL(url).pathname;
  } catch {
    return null;
  }
}

function normalizePath(path: string): string {
  const lowered = path.toLowerCase();
  const trimmed = lowered.endsWith("/") ? lowered.slice(0, -1) : lowered;
  return trimmed === "" ? "/" : trimmed;
}

/**
 * The path addresses the site root, allowing for a single locale prefix. `/` and
 * `/en` are both the homepage; `/en/watches` is not.
 */
function isRootPath(normalizedPath: string): boolean {
  const segments = normalizedPath.split("/").filter(Boolean);
  if (segments.length === 0) return true;
  return segments.length === 1 && LOCALE_SEGMENT.test(segments[0]);
}

/**
 * Meaningful tokens of a path: segments split on separators, with structural
 * shelving and locale prefixes removed. Pure numbers go too — an id is the one
 * thing guaranteed not to correspond between two different sites.
 */
function tokenize(path: string): Set<string> {
  const tokens = new Set<string>();
  const rawSegments = path.split("/").filter(Boolean);
  for (const [index, segment] of rawSegments.entries()) {
    if (index === 0 && LOCALE_SEGMENT.test(segment)) continue;
    for (const part of segment.split(/[-_.]+/).filter(Boolean)) {
      if (STRUCTURAL_SEGMENTS.has(part)) continue;
      if (/^\d+$/.test(part)) continue;
      tokens.add(part);
    }
  }
  return tokens;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const token of a) {
    if (b.has(token)) shared += 1;
  }
  const union = a.size + b.size - shared;
  return union === 0 ? 0 : shared / union;
}

/** Score two URLs, 0..1. Exported for the pair-level explanation in the UI. */
export function scoreUrlPair(ourUrl: string, theirUrl: string): number {
  const ourPath = pathOf(ourUrl);
  const theirPath = pathOf(theirUrl);
  if (ourPath === null || theirPath === null) return 0;

  const ourNormalized = normalizePath(ourPath);
  const theirNormalized = normalizePath(theirPath);
  if (ourNormalized === theirNormalized) return 1;

  const ourTokens = tokenize(ourNormalized);
  const theirTokens = tokenize(theirNormalized);

  // Two homepages, one of which may carry a locale prefix ("/en" against "/").
  // This is the comparison every reader expects and token overlap cannot see it.
  // Keyed on the path really being root — NOT on both token sets coming back
  // empty, which also happens for `/product/12345` against `/product/98765`,
  // where everything meaningful was an id and the two pages are unrelated.
  if (isRootPath(ourNormalized) && isRootPath(theirNormalized)) return 1;

  let sharesSegment = false;
  for (const token of ourTokens) {
    if (theirTokens.has(token)) {
      sharesSegment = true;
      break;
    }
  }

  const score =
    0.5 * jaccard(ourTokens, theirTokens) + (sharesSegment ? 0.5 : 0);
  return Math.round(score * 100) / 100;
}

/**
 * Pair our pages with theirs, best-scoring first, each URL used at most once.
 *
 * One-to-one on purpose: a competitor page appearing beside two of our pages
 * makes a table nobody can read, and the second row is always the worse match.
 *
 * Returns at most `limit` pairs, and only the ones worth spending a request on:
 * a pair below the threshold is returned too (so the operator sees the
 * suggestion) but is flagged `confident: false`, and the caller must not crawl
 * it until a human has accepted it.
 */
export function buildPageMatches(input: {
  ourUrls: string[];
  theirUrls: string[];
  limit: number;
}): PageMatch[] {
  const candidates: PageMatch[] = [];
  for (const ourUrl of input.ourUrls) {
    for (const theirUrl of input.theirUrls) {
      const confidence = scoreUrlPair(ourUrl, theirUrl);
      if (confidence <= 0) continue;
      candidates.push({
        ourUrl,
        theirUrl,
        confidence,
        confident: confidence >= MATCH_CONFIDENCE_THRESHOLD,
      });
    }
  }

  // Sort by score, then by both URLs, so two runs over the same site produce the
  // same table instead of a different arbitrary winner among equal scores.
  const ordered = candidates.toSorted((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    if (a.ourUrl !== b.ourUrl) return a.ourUrl.localeCompare(b.ourUrl);
    return a.theirUrl.localeCompare(b.theirUrl);
  });

  const usedOurs = new Set<string>();
  const usedTheirs = new Set<string>();
  const matches: PageMatch[] = [];
  for (const candidate of ordered) {
    if (matches.length >= input.limit) break;
    if (usedOurs.has(candidate.ourUrl)) continue;
    if (usedTheirs.has(candidate.theirUrl)) continue;
    usedOurs.add(candidate.ourUrl);
    usedTheirs.add(candidate.theirUrl);
    matches.push(candidate);
  }
  return matches;
}
