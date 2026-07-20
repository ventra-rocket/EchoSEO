import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeGoodPage } from "@/server/lib/seo-rules/__tests__/on-page-signals-fixture";
import type { ParsedPage } from "./parse-html";

const { safeFetchMock } = vi.hoisted(() => ({ safeFetchMock: vi.fn() }));

vi.mock("./safe-fetch", () => ({
  safeFetch: safeFetchMock,
  readBoundedText: (response: Response) => response.text(),
}));

const { extractGeoSignals } = await import("./geo-signals");

const PAGE_URL = "https://site.test/";

/** Routes safeFetch by path: robots.txt / llms.txt each get their own response. */
function route(map: { robots?: Response | Error; llms?: Response | Error }) {
  safeFetchMock.mockImplementation((url: string) => {
    const which = url.endsWith("/robots.txt") ? map.robots : map.llms;
    if (which === undefined) return Promise.reject(new Error("unexpected url"));
    if (which instanceof Error) return Promise.reject(which);
    return Promise.resolve({ response: which, finalUrl: url });
  });
}

function page(overrides: Partial<ParsedPage> = {}): ParsedPage {
  return makeGoodPage(overrides) as ParsedPage;
}

beforeEach(() => vi.clearAllMocks());

describe("extractGeoSignals", () => {
  it("reads per-bot policy from robots.txt", async () => {
    route({
      robots: new Response("User-agent: Google-Extended\nDisallow: /"),
      llms: new Response("", { status: 404 }),
    });

    const geo = await extractGeoSignals(PAGE_URL, page());

    expect(geo.botAccess.googlebot).toBe(true);
    expect(geo.botAccess.googleExtended).toBe(false);
    expect(geo.botAccess.gptbot).toBe(true);
  });

  it("treats a missing robots.txt as everything allowed", async () => {
    route({
      robots: new Response("", { status: 404 }),
      llms: new Response("", { status: 404 }),
    });

    const geo = await extractGeoSignals(PAGE_URL, page());
    expect(geo.botAccess).toEqual({
      googlebot: true,
      googleExtended: true,
      gptbot: true,
    });
  });

  it("reports llms.txt presence by its response", async () => {
    route({
      robots: new Response("", { status: 404 }),
      llms: new Response("# llms", { status: 200 }),
    });
    expect((await extractGeoSignals(PAGE_URL, page())).llmsTxtFound).toBe(true);

    route({
      robots: new Response("", { status: 404 }),
      llms: new Response("", { status: 404 }),
    });
    expect((await extractGeoSignals(PAGE_URL, page())).llmsTxtFound).toBe(
      false,
    );
  });

  it("derives on-page signals from the parsed page", async () => {
    route({
      robots: new Response("", { status: 404 }),
      llms: new Response("", { status: 404 }),
    });

    const geo = await extractGeoSignals(
      PAGE_URL,
      page({
        h1s: ["One"],
        headingOrder: [1, 2, 3],
        schemaTypes: ["Article", "FAQPage"],
        robotsMeta: "index, nosnippet",
      }),
    );

    expect(geo.hasSingleH1).toBe(true);
    expect(geo.hasHeadingHierarchy).toBe(true);
    expect(geo.schemaTypes).toEqual(["Article", "FAQPage"]);
    expect(geo.robotsMeta).toBe("index, nosnippet");
  });

  it("flags a skipped heading hierarchy and multiple h1s", async () => {
    route({
      robots: new Response("", { status: 404 }),
      llms: new Response("", { status: 404 }),
    });

    const geo = await extractGeoSignals(
      PAGE_URL,
      page({ h1s: ["A", "B"], headingOrder: [1, 3] }),
    );

    expect(geo.hasSingleH1).toBe(false);
    expect(geo.hasHeadingHierarchy).toBe(false);
  });

  // Off the critical path: a fetch that throws must degrade, never propagate.
  it("degrades to all-allowed when the robots fetch throws", async () => {
    route({ robots: new Error("network"), llms: new Error("network") });

    const geo = await extractGeoSignals(PAGE_URL, page());
    expect(geo.botAccess.googlebot).toBe(true);
    expect(geo.llmsTxtFound).toBe(false);
  });
});
