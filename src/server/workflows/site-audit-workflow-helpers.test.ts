import { afterEach, describe, expect, it, vi } from "vitest";
import { crawlPage } from "./site-audit-workflow-helpers";

/**
 * A crawl-batch step returns up to `CRAWL_BATCH_SIZE` of these objects, and a
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

function stubResponse(
  status: number,
  body: string,
  headers: Record<string, string>,
  url = "https://example.com/page",
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      const response = new Response(body, { status, headers });
      Object.defineProperty(response, "url", { value: url });
      return response;
    }),
  );
  return url;
}

describe("crawlPage does not mistake a refusal for the page", () => {
  it("never reads a rate-limit block page as the page's own content", async () => {
    // Cloudflare serves its 429 as `text/html`, so the old code parsed the block
    // page and stored "Attention Required" as the page's title with the block
    // page's word count. Those are facts about the block page, not the URL.
    const url = stubResponse(
      429,
      "<!doctype html><html><head><title>Attention Required</title></head><body><p>Rate limited. Please try again later, this page has plenty of words in it.</p></body></html>",
      { "content-type": "text/html; charset=utf-8" },
    );

    const page = await crawlPage(url, "https://example.com");

    expect(page?.statusCode).toBe(429);
    expect(page?.title).toBe("");
    expect(page?.wordCount).toBe(0);
    // `isHtml` is what the materializer and the diff read to decide whether any
    // on-page fact was observed at all.
    expect(page?.isHtml).toBe(false);
  });

  it("passes on a Retry-After delay in seconds", async () => {
    const url = stubResponse(429, "", {
      "content-type": "text/html",
      "retry-after": "12",
    });

    const page = await crawlPage(url, "https://example.com");

    expect(page?.retryAfterMs).toBe(12_000);
  });

  it("reads a Retry-After HTTP date as a delay from now", async () => {
    const url = stubResponse(429, "", {
      "content-type": "text/html",
      "retry-after": new Date(Date.now() + 8_000).toUTCString(),
    });

    const page = await crawlPage(url, "https://example.com");

    // Second granularity in the header, so the exact ms depends on when the
    // request started; what matters is that a date is understood as a wait.
    expect(page?.retryAfterMs).toBeGreaterThan(5_000);
    expect(page?.retryAfterMs).toBeLessThanOrEqual(9_000);
  });

  it("ignores a Retry-After it cannot trust, leaving the caller its own backoff", async () => {
    // Garbage, a past date, and an hour-long wait all mean "we have no usable
    // instruction" — sleeping on any of them would be worse than backing off.
    for (const header of ["soon", "-5", new Date(0).toUTCString()]) {
      const url = stubResponse(429, "", {
        "content-type": "text/html",
        "retry-after": header,
      });
      const page = await crawlPage(url, "https://example.com");
      expect(page?.retryAfterMs).toBeNull();
    }
  });

  it("clamps an implausibly long Retry-After", async () => {
    const url = stubResponse(429, "", {
      "content-type": "text/html",
      "retry-after": "3600",
    });

    const page = await crawlPage(url, "https://example.com");

    expect(page?.retryAfterMs).toBe(60_000);
  });
});
