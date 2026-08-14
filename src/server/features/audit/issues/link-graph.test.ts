/**
 * The link graph is built from two SQL aggregates rather than from the edge list,
 * because reading the list does not fit the runtime. Measured on production
 * 14/08 against a 5,000-page crawl with ~500,000 edges: loading all of them put
 * ~120 MB in a 128 MB isolate and the materialize step died in 4 seconds, so the
 * crawl sealed with `issues_materialized_at` null and the audit had no findings.
 * Paging them 25,000 at a time survived the memory and still lost the step after
 * 54 seconds of round trips.
 *
 * What that trade costs is pinned here. SQL groups by the RAW target URL, so two
 * spellings of one document arrive as two rows and are summed — which can
 * over-count a source that links the same document twice under different
 * spellings. That is safe only because the value is read as zero-versus-non-zero,
 * and these tests state both halves of that: the merge happens, and zero stays
 * zero.
 */
import { describe, expect, it } from "vitest";
import {
  brokenPageUrls,
  buildCrossPageSignals,
  buildLinkGraph,
} from "./cross-page-signals";
import { pageRow } from "./__tests__/issue-fixtures";

const HOME = "https://example.com/";
const A = "https://example.com/a";
const B = "https://example.com/b";
const GONE = "https://example.com/gone";

const PAGES = [
  pageRow({ id: "p0", url: HOME }),
  pageRow({ id: "p1", url: A }),
  pageRow({ id: "p2", url: B }),
  pageRow({ id: "p3", url: GONE, statusCode: 404 }),
];

function signalsFor(input: {
  inboundCounts: Array<{ targetUrl: string; sources: number }>;
  brokenEdges?: Array<{ sourceUrl: string; targetUrl: string }>;
}) {
  const graph = buildLinkGraph({
    pages: PAGES,
    inboundCounts: input.inboundCounts,
    brokenEdges: input.brokenEdges ?? [],
  });
  return buildCrossPageSignals({
    pages: PAGES,
    graph,
    startUrl: HOME,
    crawlWasTruncated: false,
  }).map(({ page, signals }) => ({
    url: page.url,
    inbound: signals.inboundInternalLinks,
    broken: signals.brokenLinkTargets,
  }));
}

describe("buildLinkGraph", () => {
  it("merges spellings of one target into a single page's inbound count", () => {
    // `/a`, `/a/` and the www spelling are one document; SQL cannot know that.
    const rows = signalsFor({
      inboundCounts: [
        { targetUrl: A, sources: 2 },
        { targetUrl: `${A}/`, sources: 1 },
        { targetUrl: "https://www.example.com/a", sources: 3 },
      ],
    });

    expect(rows.find((row) => row.url === A)?.inbound).toBe(6);
  });

  it("keeps zero as zero, which is the only reading the rules make", () => {
    const rows = signalsFor({ inboundCounts: [{ targetUrl: A, sources: 4 }] });

    // B has no inbound rows at all, so it stays orphan-eligible; A does not.
    expect(rows.find((row) => row.url === B)?.inbound).toBe(0);
    expect(rows.find((row) => row.url === A)?.inbound).toBeGreaterThan(0);
  });

  it("ignores a target URL that is not a usable http(s) URL", () => {
    const rows = signalsFor({
      inboundCounts: [
        { targetUrl: "mailto:hi@example.com", sources: 9 },
        { targetUrl: A, sources: 1 },
      ],
    });

    expect(rows.find((row) => row.url === A)?.inbound).toBe(1);
  });

  it("attributes a broken target to the page that links it", () => {
    const rows = signalsFor({
      inboundCounts: [],
      brokenEdges: [
        { sourceUrl: A, targetUrl: GONE },
        { sourceUrl: A, targetUrl: GONE },
        { sourceUrl: B, targetUrl: GONE },
      ],
    });

    expect(rows.find((row) => row.url === A)?.broken).toEqual([GONE, GONE]);
    expect(rows.find((row) => row.url === B)?.broken).toEqual([GONE]);
    expect(rows.find((row) => row.url === HOME)?.broken).toEqual([]);
  });

  it("does not call a link to another spelling of itself broken", () => {
    const rows = signalsFor({
      inboundCounts: [],
      brokenEdges: [{ sourceUrl: GONE, targetUrl: `${GONE}/` }],
    });

    expect(rows.find((row) => row.url === GONE)?.broken).toEqual([]);
  });
});

describe("brokenPageUrls", () => {
  it("returns the 4xx pages the broken-link rule counts", () => {
    expect(brokenPageUrls(PAGES)).toEqual([GONE]);
  });

  it("excludes statuses that mean 'not for you' rather than 'gone'", () => {
    // A members-only page and a rate-limited response are not broken links.
    const guarded = [
      pageRow({
        id: "x1",
        url: "https://example.com/members",
        statusCode: 401,
      }),
      pageRow({
        id: "x2",
        url: "https://example.com/private",
        statusCode: 403,
      }),
      pageRow({ id: "x3", url: "https://example.com/slow", statusCode: 429 }),
      pageRow({ id: "x4", url: "https://example.com/oops", statusCode: 500 }),
    ];

    expect(brokenPageUrls(guarded)).toEqual([]);
  });
});
