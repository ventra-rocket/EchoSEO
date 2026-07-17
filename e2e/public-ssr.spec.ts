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

  test("the confirm page renders Vietnamese when the email link carries lang=vi", async ({
    request,
  }) => {
    const response = await request.get(
      "/free-seo-check/confirm?token=x&lang=vi",
    );
    expect(response.status()).toBe(200);
    // The Vietnamese confirm button, server-rendered — the VN opt-in email links
    // here with lang=vi so the whole flow stays Vietnamese.
    expect(await response.text()).toContain("Xác nhận kiểm tra chuyên sâu");
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
    // The Vietnamese alternate link points at the Vietnamese URL (attribute
    // order-independent: grab the vi link tag, then check its href).
    const viAlt = html.match(/<link[^>]*hreflang="vi"[^>]*>/)?.[0] ?? "";
    expect(viAlt).toContain("/vi/kiem-tra-seo");
  });

  test("the Vietnamese landing server-renders in Vietnamese with hreflang", async ({
    request,
  }) => {
    const response = await request.get("/vi/kiem-tra-seo");
    expect(response.status()).toBe(200);
    const html = await response.text();
    // Vietnamese body copy, server-rendered (not the English page).
    expect(html).toContain("Kiểm tra SEO miễn phí");
    expect(html).toContain("Câu hỏi thường gặp");
    // The document declares Vietnamese, and self-canonicals to its own URL.
    expect(html).toContain('lang="vi"');
    const canonical = html.match(/<link[^>]*rel="canonical"[^>]*>/)?.[0] ?? "";
    expect(canonical).toContain("/vi/kiem-tra-seo");
    // Reciprocal hreflang back to English + x-default.
    const enAlt = html.match(/<link[^>]*hreflang="en"[^>]*>/)?.[0] ?? "";
    expect(enAlt).toContain("/free-seo-check");
    expect(html).toContain('hreflang="x-default"');
    // FAQPage JSON-LD is present and localized.
    expect(html).toContain('"@type":"FAQPage"');
  });

  test("sitemap.xml lists the landing and excludes report pages", async ({
    request,
  }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("xml");
    const xml = await response.text();
    expect(xml).toContain("/free-seo-check");
    // Both language landings are listed.
    expect(xml).toContain("/vi/kiem-tra-seo");
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
