import { expect, test } from "@playwright/test";

/**
 * The regression tripwire for the public SSR restructure. `request.get` fetches
 * raw HTML with no JavaScript execution — exactly what a `curl` (and a non-JS AI
 * crawler) sees. Before the restructure this body was empty because the whole
 * route tree rendered inside <ClientOnly>; if anyone re-wraps the root, this goes
 * red immediately rather than the page silently going invisible to crawlers again.
 */
test.describe("public routes server-render their body", () => {
  test("the free checker landing ships its heading in the initial HTML", async ({
    request,
  }) => {
    const response = await request.get("/free-seo-check");
    expect(response.status()).toBe(200);

    const html = await response.text();
    // The <h1> copy, present in the server response with no client hydration.
    expect(html).toContain("Free SEO Checker");
    // Guard against a shell-only regression: the form action, not just the head.
    expect(html).toContain("example.com");
  });

  test("the double-opt-in confirm page ships its body in the initial HTML", async ({
    request,
  }) => {
    const response = await request.get("/free-seo-check/confirm?token=x");
    expect(response.status()).toBe(200);
    // Body copy (the confirm button), not the <title> — the head SSRs even when
    // the body does not, so only a body string proves this route is in the switch.
    expect(await response.text()).toContain("Confirm my deep check");
  });

  test("the report page ships its loading body in the initial HTML", async ({
    request,
  }) => {
    const response = await request.get("/r/nonexistent-report-id");
    expect(response.status()).toBe(200);
    // The deterministic initial state before the client fetch resolves.
    expect(await response.text()).toContain("Loading your report");
  });

  test("the landing serves its SEO metadata and structured data", async ({
    request,
  }) => {
    const html = await (await request.get("/free-seo-check")).text();
    // Canonical + Open Graph so the page is indexable and shares as a card.
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('property="og:title"');
    // Both JSON-LD blocks, server-rendered.
    expect(html).toContain('"@type":"SoftwareApplication"');
    expect(html).toContain('"@type":"FAQPage"');
    // Real editorial body, not a thin page.
    expect(html).toContain("Frequently asked questions");
  });

  test("sitemap.xml lists the landing and excludes report pages", async ({
    request,
  }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("xml");
    const xml = await response.text();
    expect(xml).toContain("/free-seo-check");
    // Bearer report links must never be advertised.
    expect(xml).not.toContain("/r/");
  });

  test("robots.txt disallows report pages and points at the sitemap", async ({
    request,
  }) => {
    const txt = await (await request.get("/robots.txt")).text();
    expect(txt).toContain("Disallow: /r/");
    expect(txt).toMatch(/Sitemap: https?:\/\/\S+\/sitemap\.xml/);
  });

  test("the landing hydrates without error and is interactive", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto("/free-seo-check");
    await expect(
      page.getByRole("heading", { name: "Free SEO Checker", exact: true }),
    ).toBeVisible();
    await expect(page.getByPlaceholder("example.com")).toBeEditable();

    expect(consoleErrors.filter((text) => /hydrat/i.test(text))).toHaveLength(
      0,
    );
  });
});
