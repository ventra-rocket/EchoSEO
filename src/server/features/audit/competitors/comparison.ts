/**
 * Building one page-against-page comparison run.
 *
 * The pure decisions live here so they can be tested without a network or a
 * database: which of their URLs are eligible, which pairs are worth a request,
 * and what a run turns into. The service alongside performs the fetches.
 *
 * The comparison is limited to the **11 on-page and technical rules**
 * (`LITE_RULES`), which is the set the issue materializer already runs per page
 * for our own site. That is the whole apples-to-apples argument: their page is
 * judged by `evaluateLiteSignals`, ours by `evaluateLiteSignals`, one function.
 *
 * Rules deliberately absent, and why the table says so rather than showing gaps:
 *
 *   Core Web Vitals (4)  — ours come from stored Lighthouse rows; theirs would
 *                          need a live PageSpeed Insights call per URL, which
 *                          takes tens of seconds each and belongs behind the
 *                          same async path the audit uses for Lighthouse, not
 *                          inside a button press.
 *   Cross-page (4)       — orphan pages, broken internal links and sitemap
 *                          membership are properties of a whole crawl. Deriving
 *                          them for a competitor means crawling their entire
 *                          site, which is exactly what the 3-5 URL ceiling
 *                          exists to prevent.
 *   GEO / AI-search (5)  — the professional audit does not evaluate these per
 *                          page for our own site either, so there would be no
 *                          left-hand column. A row comparing a rule we only ran
 *                          on one side is not a comparison.
 */
import type { Issue } from "@/server/lib/seo-rules";
import { buildPageMatches, type PageMatch } from "./page-matching";

/** Pages compared per competitor per run. */
const COMPARISON_PAGES_PER_COMPETITOR = 5;

/** Pause between two requests to the same competitor's site. */
export const COMPETITOR_CRAWL_DELAY_MS = 1_000;

/**
 * Their sitemap URLs considered when matching. A cap, not a crawl: reading a
 * large sitemap is one request per document, and pairing is a local computation
 * over the result.
 */
export const COMPETITOR_DISCOVERY_LIMIT = 300;

type PairPlan = PageMatch & {
  /** Set when this pair must not be fetched, with the reason to show. */
  skip: string | null;
};

/**
 * Decide the pairs for one competitor and which of them may be fetched.
 *
 * A pair is fetched when a person chose it, or when the matcher was confident
 * AND their robots.txt allows it. Everything else is kept with the reason
 * attached: a comparison that silently omits a page reads as "nothing to
 * compare", which is a different claim from "they block us" or "we are not sure
 * these two pages correspond".
 */
export function planComparison(input: {
  ourUrls: string[];
  theirUrls: string[];
  isAllowed: (url: string) => boolean;
  manualPairs: Array<{ ourUrl: string; theirUrl: string }>;
  limit?: number;
}): PairPlan[] {
  const limit = input.limit ?? COMPARISON_PAGES_PER_COMPETITOR;
  const manualByOurUrl: Record<string, string> = {};
  for (const pair of input.manualPairs) {
    manualByOurUrl[pair.ourUrl] = pair.theirUrl;
  }

  // A human's pairing is not a candidate to be re-derived; it is the answer.
  const manualPlans: PairPlan[] = Object.entries(manualByOurUrl).map(
    ([ourUrl, theirUrl]) => ({
      ourUrl,
      theirUrl,
      confidence: 1,
      confident: true,
      skip: input.isAllowed(theirUrl)
        ? null
        : "Their robots.txt disallows this URL, so we did not fetch it.",
    }),
  );

  const autoPlans: PairPlan[] = buildPageMatches({
    ourUrls: input.ourUrls.filter((url) => !(url in manualByOurUrl)),
    theirUrls: input.theirUrls.filter(
      (url) => !Object.values(manualByOurUrl).includes(url),
    ),
    limit: Math.max(limit - manualPlans.length, 0),
  }).map((match) => ({
    ...match,
    skip: !match.confident
      ? "We are not confident these two pages correspond. Confirm or paste the right URL."
      : input.isAllowed(match.theirUrl)
        ? null
        : "Their robots.txt disallows this URL, so we did not fetch it.",
  }));

  return [...manualPlans, ...autoPlans].slice(0, limit);
}

/** One rule's verdict on both sides, as the diff table renders it. */
export type RuleComparison = {
  ruleId: string;
  label: string;
  severity: string;
  /** `pass`, `warn`, `fail`, or null when that side was never measured. */
  ours: string | null;
  theirs: string | null;
  /** Their side passes where ours does not. */
  weLose: boolean;
  /** Ours passes where theirs does not. */
  weWin: boolean;
};

function isPass(status: string | null): boolean {
  return status === "pass";
}

/**
 * Join two rule verdict sets into the table's rows.
 *
 * Keyed on the union of rule ids, so a rule missing from one side renders as a
 * dash rather than being dropped — a rule that did not run and a rule that
 * passed are different facts, and collapsing them is how a comparison starts
 * flattering whichever side was not measured.
 */
export function compareIssues(
  ourIssues: Issue[],
  theirIssues: Issue[],
): RuleComparison[] {
  const ourById: Record<string, Issue> = {};
  for (const issue of ourIssues) ourById[issue.id] = issue;
  const theirById: Record<string, Issue> = {};
  for (const issue of theirIssues) theirById[issue.id] = issue;

  const ruleIds = [
    ...new Set([...Object.keys(ourById), ...Object.keys(theirById)]),
  ];

  return ruleIds
    .map((ruleId) => {
      const ours = ourById[ruleId] ?? null;
      const theirs = theirById[ruleId] ?? null;
      const ourStatus = ours?.status ?? null;
      const theirStatus = theirs?.status ?? null;
      const measuredBoth = ourStatus !== null && theirStatus !== null;
      return {
        ruleId,
        label: ours?.label ?? theirs?.label ?? ruleId,
        severity: ours?.severity ?? theirs?.severity ?? "low",
        ours: ourStatus,
        theirs: theirStatus,
        weLose: measuredBoth && !isPass(ourStatus) && isPass(theirStatus),
        weWin: measuredBoth && isPass(ourStatus) && !isPass(theirStatus),
      };
    })
    .toSorted(compareByInterest);
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  low: 2,
};

/**
 * Losses first, then wins, then everything else — and within each group by
 * severity. A reader opens this table to find what to fix, so the rows that name
 * something to fix belong at the top; a table sorted by rule id makes them hunt.
 */
const rank = (row: RuleComparison) => (row.weLose ? 0 : row.weWin ? 1 : 2);

function compareByInterest(a: RuleComparison, b: RuleComparison): number {
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  const severityA = SEVERITY_ORDER[a.severity] ?? 3;
  const severityB = SEVERITY_ORDER[b.severity] ?? 3;
  if (severityA !== severityB) return severityA - severityB;
  return a.ruleId.localeCompare(b.ruleId);
}

/** How many rules this pair loses on — the sort key for the pair list. */
export function countDeficit(rows: RuleComparison[]): number {
  return rows.filter((row) => row.weLose).length;
}
