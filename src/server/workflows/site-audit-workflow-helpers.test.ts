import { afterEach, describe, expect, it, vi } from "vitest";
import { crawlPage } from "./site-audit-workflow-helpers";

/**
 * A crawl-batch step returns up to `CRAWL_CONCURRENCY` of these objects, and a
 * Workflow step return has a hard 1 MiB ceiling. So what this shape carries is a
 * capacity question, not a style question: every unbounded field multiplies by
 * the batch size.
 */

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubHtml(html: string, url = "https://example.com/page") {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      const response = new Response(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
      // A constructed Response reports an empty `url`, and `crawlPage` reads it
      // to resolve the final (post-redirect) URL and to reject off-origin hops.
      // Left empty, every crawl in this file would return null.
      Object.defineProperty(response, "url", { value: url });
      return response;
    }),
  );
  return url;
}

function pageWith(links: string[]) {
  return `<!doctype html><html><head><title>T</title></head><body>${links
    .map((href) => `<a href="${href}">x</a>`)
    .join("")}</body></html>`;
}

describe("crawlPage keeps the step payload bounded", () => {
  it("counts off-origin links instead of carrying their URLs", async () => {
    // The regression this guards: `externalLinks: string[]` used to ride along in
    // every page object. Nothing ever read the URLs — the repository stores
    // `external_link_count`, no rule consults them, and snapshot signals rebuild
    // them as an empty array — so they were pure step-return weight, on the one
    // field a nav-and-footer-heavy page makes huge.
    const outbound = Array.from(
      { length: 40 },
      (_, index) => `https://partner-${index}.example.net/landing?utm=nav`,
    );
    const url = stubHtml(
      pageWith([...outbound, "https://example.com/internal-one"]),
    );

    const page = await crawlPage(url, "https://example.com");

    expect(page).not.toBeNull();
    if (!page) return;
    expect(page.externalLinkCount).toBe(40);
    // The URLs themselves must be gone from the serialized payload, not merely
    // unused: this is what the 1 MiB ceiling actually measures.
    const payload = JSON.stringify(page);
    expect(payload).not.toContain("partner-0.example.net");
    expect(payload).not.toContain("partner-39.example.net");
  });

  it("still carries same-origin link URLs, which two consumers need", async () => {
    // Unlike the external list, these are load-bearing: the crawl frontier walks
    // them and `buildLinkEdges` persists them as the link graph.
    const url = stubHtml(
      pageWith([
        "https://example.com/a",
        "https://example.com/b",
        "https://elsewhere.example.net/c",
      ]),
    );

    const page = await crawlPage(url, "https://example.com");

    expect(page?.internalLinks).toEqual([
      "https://example.com/a",
      "https://example.com/b",
    ]);
    expect(page?.externalLinkCount).toBe(1);
  });

  it("reports zero off-origin links on a page that has none", async () => {
    const url = stubHtml(pageWith(["https://example.com/only-internal"]));

    const page = await crawlPage(url, "https://example.com");

    expect(page?.externalLinkCount).toBe(0);
  });
});
