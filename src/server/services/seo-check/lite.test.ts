import { describe, expect, it, vi } from "vitest";
import { runLiteCheck } from "./lite";

const { safeFetchMock } = vi.hoisted(() => ({ safeFetchMock: vi.fn() }));

vi.mock("./safe-fetch", () => ({
  safeFetch: safeFetchMock,
  readBoundedText: (response: Response) => response.text(),
}));

function mockPage(html: string, status = 200, finalUrl = "https://good.test/") {
  safeFetchMock.mockResolvedValue({
    response: new Response(html, { status }),
    finalUrl,
  });
}

const GOOD_HTML = `
  <html>
    <head>
      <title>A Complete Guide to On-Page SEO Best Practices</title>
      <meta name="description" content="Learn the essential on-page SEO techniques including titles, meta tags, headings, and structured data to improve your search rankings.">
      <link rel="canonical" href="https://good.test/">
      <script type="application/ld+json">{"@context":"https://schema.org"}</script>
    </head>
    <body>
      <h1>Complete Guide to On-Page SEO</h1>
      <h2>Why On-Page SEO Matters</h2>
      <p>${"word ".repeat(650)}</p>
      <img src="https://good.test/img.png" alt="A descriptive alt text">
    </body>
  </html>`;

const BAD_HTML = `
  <html>
    <head>
      <meta name="robots" content="noindex">
    </head>
    <body>
      <h2>Skipped straight to H2</h2>
      <h4>Then jumped to H4</h4>
      <img src="http://insecure.test/img.png">
      <p>Too short.</p>
    </body>
  </html>`;

describe("runLiteCheck", () => {
  it("scores a well-optimized page highly across all categories", async () => {
    mockPage(GOOD_HTML);

    const report = await runLiteCheck("good.test");

    for (const category of report.categoryScores) {
      expect(category.score).toBeGreaterThanOrEqual(90);
    }
    expect(report.overallScore).toBeGreaterThanOrEqual(90);
    expect(report.signals.every((signal) => signal.status !== "fail")).toBe(
      true,
    );
  });

  it("flags missing meta, thin content, heading skips, and mixed content", async () => {
    mockPage(BAD_HTML, 200, "https://good.test/");

    const report = await runLiteCheck("good.test");

    const byId = Object.fromEntries(
      report.signals.map((signal) => [signal.id, signal.status]),
    );
    expect(byId["meta-title"]).toBe("fail");
    expect(byId["meta-description"]).toBe("fail");
    expect(byId["meta-canonical"]).toBe("fail");
    expect(byId["structure-h1"]).toBe("fail");
    expect(byId["structure-heading-order"]).toBe("warn");
    expect(byId["structure-word-count"]).toBe("fail");
    expect(byId["server-indexable"]).toBe("fail");
    expect(byId["server-mixed-content"]).toBe("fail");
    expect(report.overallScore).toBeLessThan(50);
  });

  it("passes scanned content through as raw text, not pre-escaped HTML", async () => {
    // pageSummary carries raw data — JSX escapes it on render (and scanned
    // content must never reach dangerouslySetInnerHTML). Pre-escaping here
    // would double-escape once JSX also escapes it. output-encode.ts's
    // escapeHtml is for an actual raw-HTML sink (e.g. a future email body).
    const maliciousHtml = `
      <html><head><title>&lt;script&gt;alert(1)&lt;/script&gt;</title></head>
      <body></body></html>`;
    mockPage(maliciousHtml);

    const report = await runLiteCheck("good.test");

    expect(report.pageSummary.title).toBe("<script>alert(1)</script>");
  });

  it("does not penalize a decorative image's valid empty alt attribute", async () => {
    const html = `
      <html><head><title>Decorative Image Page Title Example</title></head>
      <body><img src="https://good.test/deco.png" alt=""></body></html>`;
    mockPage(html);

    const report = await runLiteCheck("good.test");

    const byId = Object.fromEntries(
      report.signals.map((signal) => [signal.id, signal.status]),
    );
    expect(byId["structure-image-alt"]).toBe("pass");
  });

  // A hostname that does not resolve still yields a body from Cloudflare's own
  // error page, so "we got HTML back" is not evidence we reached the site.
  // Without this guard that error page scores like any other document and the
  // visitor is handed a confident number for a site nobody ever read.
  it.each([404, 500, 530])(
    "refuses to score a page that answered %i",
    async (status) => {
      mockPage(GOOD_HTML, status);
      await expect(runLiteCheck("https://gone.test/")).rejects.toThrow(
        "Target page did not return 2xx",
      );
    },
  );

  // An auth-gated site 302s to a login page that answers 200, so "we got a 2xx
  // body" is not evidence we reached the site. Without this guard the login page
  // scores like any other document and the visitor gets a number for a screen
  // they can't even see.
  it("refuses to score an auth interstitial the target redirected to", async () => {
    mockPage(
      GOOD_HTML,
      200,
      "https://team.cloudflareaccess.com/cdn-cgi/access/login/gated.test",
    );
    await expect(runLiteCheck("https://gated.test/")).rejects.toThrow(
      "Target redirected to an auth interstitial",
    );
  });

  it("exposes a fixed Core Web Vitals teaser count for the Deep tier", async () => {
    mockPage(GOOD_HTML);

    const report = await runLiteCheck("good.test");

    expect(report.deepTeaser.coreWebVitalsMetricCount).toBe(4);
  });
});
