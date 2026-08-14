/**
 * The link graph is folded in chunks because reading a crawl's whole edge list
 * put ~120 MB in a 128 MB isolate: measured on production 14/08, where a
 * 5,000-page crawl with ~500,000 edges sealed successfully and then produced no
 * findings at all, because materialization died inside its own try/catch.
 *
 * The invariant that fix rests on is here: chunking must not change the answer.
 * Both aggregates dedupe (distinct sources per target) and accumulate (broken
 * targets per source), so a chunk boundary falling between two edges of the same
 * page is exactly where a naive implementation would lose or double-count one.
 */
import { describe, expect, it } from "vitest";
import {
  addEdgesToLinkGraph,
  buildCrossPageSignals,
  createLinkGraph,
} from "./cross-page-signals";
import { edge, pageRow } from "./__tests__/issue-fixtures";

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

const EDGES = [
  edge(HOME, A),
  edge(HOME, B),
  edge(A, B),
  edge(B, A),
  edge(A, GONE),
  edge(B, GONE),
  // A second spelling of the same source linking the same target: the dedupe
  // must survive being split from its twin by a chunk boundary.
  edge("https://www.example.com/", A),
];

function signalsFor(chunks: Array<typeof EDGES>) {
  const graph = createLinkGraph(PAGES);
  for (const chunk of chunks) addEdgesToLinkGraph(graph, chunk);
  return buildCrossPageSignals({
    pages: PAGES,
    graph,
    startUrl: HOME,
    crawlWasTruncated: false,
  }).map(({ page, signals }) => ({
    url: page.url,
    inbound: signals.inboundInternalLinks,
    broken: signals.brokenLinkTargets.toSorted(),
  }));
}

describe("link graph chunking", () => {
  it("gives the same answer whole, split in two, and one edge at a time", () => {
    const whole = signalsFor([EDGES]);
    const halved = signalsFor([EDGES.slice(0, 3), EDGES.slice(3)]);
    const singly = signalsFor(EDGES.map((e) => [e]));

    expect(halved).toEqual(whole);
    expect(singly).toEqual(whole);
  });

  it("still counts one source spelled two ways as one inbound link", () => {
    // `example.com/` and `www.example.com/` both link to /a, and the two edges
    // are deliberately in different chunks.
    const split = signalsFor([EDGES.slice(0, 6), EDGES.slice(6)]);
    const forA = split.find((row) => row.url === A);

    // HOME (either spelling, counted once) and B.
    expect(forA?.inbound).toBe(2);
  });

  it("accumulates broken targets across chunks instead of replacing them", () => {
    const split = signalsFor([[edge(A, GONE)], [edge(A, GONE)]]);
    const forA = split.find((row) => row.url === A);

    // Two edges to the same broken target are two entries, matching the
    // unchunked behaviour — the rule counts link instances, not distinct URLs.
    expect(forA?.broken).toEqual([GONE, GONE]);
  });

  it("holds no state between graphs", () => {
    const first = signalsFor([EDGES]);
    const second = signalsFor([EDGES]);
    expect(second).toEqual(first);
  });

  it("reports zero inbound for a graph fed no edges", () => {
    const none = signalsFor([]);
    expect(none.every((row) => row.inbound === 0)).toBe(true);
  });
});
