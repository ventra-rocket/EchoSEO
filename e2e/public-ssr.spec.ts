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
    // Guard against a shell-only regression: the form itself, not just the head.
    // Match the attribute rather than the bare value — the sample-report card
    // also prints "example.com" as body text, so the looser string would keep
    // this assertion green even if the form stopped server-rendering.
    expect(html).toContain('placeholder="example.com"');
  });

  test("the primary call to action is never server-rendered disabled", async ({
    request,
  }) => {
    // The page's only action used to paint as a dead grey button and stay dead
    // until Turnstile cleared — or forever, when the widget never rendered at
    // all. A submit that cannot be pressed at first paint reads as broken.
    const html = await (await request.get("/free-seo-check")).text();
    const submit = html.match(/<button[^>]*type="submit"[^>]*>/)?.[0] ?? "";
    expect(submit).not.toBe("");
    // The real `disabled` attribute only — `aria-disabled` is the fix, and a
    // bare substring match would flag it as the bug it replaced.
    expect(submit).not.toMatch(/\sdisabled[\s=>]/);
    // …and the busy state is still announced, so the swap did not cost
    // assistive tech the information the disabled attribute used to carry.
    expect(submit).toContain("aria-disabled");
  });

  test("the landing is not a dead end and unfurls as a card", async ({
    request,
  }) => {
    // The page used to contain exactly one link — the language switch. No
    // footer, no legal links, an inert logo, and no share image. For the
    // surface the distribution strategy points at, a visitor who liked the
    // tool had nowhere to go and a shared link unfurled as a grey stub.
    const html = await (await request.get("/free-seo-check")).text();
    expect(html).toContain('href="/terms-and-conditions"');
    expect(html).toContain('href="/privacy"');
    expect(html).toContain("<footer");
    expect(html).toContain('property="og:image"');
    expect(html).toContain('content="summary_large_image"');

    // The Vietnamese landing points at the Vietnamese documents, not the
    // English ones — the reader should not change language by clicking Terms.
    const vi = await (await request.get("/vi/kiem-tra-seo")).text();
    expect(vi).toContain('href="/vi/dieu-khoan"');
    expect(vi).toContain('href="/vi/quyen-rieng-tu"');
  });

  test("the landing ships its form semantics and chrome hints in the initial HTML", async ({
    request,
  }) => {
    const html = await (await request.get("/free-seo-check")).text();
    // The URL field is a named control, not an anonymous input.
    expect(html).toContain('name="url"');
    // The keyboard user's first tab stop, and the landmark it points at.
    expect(html).toContain('href="#fsc-main"');
    expect(html).toContain('id="fsc-main"');
    // Browser chrome color hints for both schemes.
    expect(html).toContain('name="theme-color"');
    expect(html).toContain('content="#0b0f14"');
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

  test("the share page ships its loading body and stays noindex", async ({
    request,
  }) => {
    const response = await request.get("/c/nonexistent-check-id");
    expect(response.status()).toBe(200);
    // Bearer-capability headers, same rule as /r/ (set in server.ts).
    expect(response.headers()["x-robots-tag"]).toBe("noindex");
    expect(response.headers()["referrer-policy"]).toBe("no-referrer");
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

  test("a Vietnamese not-found URL keeps Vietnamese document semantics", async ({
    request,
    page,
  }) => {
    // Unknown routes SSR only the root shell, then hydrate their 404 body.
    // Check both halves: raw document semantics and the hydrated state after
    // AppLayout decides whether to mount the cookie-owned dashboard provider.
    const response = await request.get("/vi/khong-ton-tai");
    expect(response.status()).toBe(404);
    const html = await response.text();
    expect(html).toContain('lang="vi"');

    const navigation = await page.goto("/vi/khong-ton-tai");
    expect(navigation?.status()).toBe(404);
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
    await expect(
      page.getByText("Không tìm thấy trang bạn đang tìm."),
    ).toBeVisible();
  });

  test("the legal pages ship their body in the initial HTML", async ({
    request,
  }) => {
    // Linked from the sign-up form, so they must be readable with no account and
    // no JavaScript. Body copy, not the <title>: the head SSRs either way.
    const terms = await request.get("/terms-and-conditions");
    expect(terms.status()).toBe(200);
    const termsHtml = await terms.text();
    expect(termsHtml).toContain("Acceptable use");
    expect(termsHtml).toContain('rel="canonical"');

    const privacy = await request.get("/privacy");
    expect(privacy.status()).toBe(200);
    const privacyHtml = await privacy.text();
    expect(privacyHtml).toContain("How long we keep it");
    expect(privacyHtml).toContain('rel="canonical"');

    // Each English document points at its Vietnamese translation, so the pair is
    // reciprocal — the half Google needs to treat them as one page.
    const termsViAlt =
      termsHtml.match(/<link[^>]*hreflang="vi"[^>]*>/)?.[0] ?? "";
    expect(termsViAlt).toContain("/vi/dieu-khoan");
    const privacyViAlt =
      privacyHtml.match(/<link[^>]*hreflang="vi"[^>]*>/)?.[0] ?? "";
    expect(privacyViAlt).toContain("/vi/quyen-rieng-tu");
  });

  test("the Vietnamese legal pages server-render in Vietnamese with hreflang", async ({
    request,
  }) => {
    const terms = await request.get("/vi/dieu-khoan");
    expect(terms.status()).toBe(200);
    const termsHtml = await terms.text();
    // Vietnamese body copy, server-rendered — not the English document.
    expect(termsHtml).toContain("Cập nhật lần cuối");
    expect(termsHtml).toContain('lang="vi"');
    const termsCanonical =
      termsHtml.match(/<link[^>]*rel="canonical"[^>]*>/)?.[0] ?? "";
    expect(termsCanonical).toContain("/vi/dieu-khoan");
    // Reciprocal hreflang back to English, plus x-default.
    const termsEnAlt =
      termsHtml.match(/<link[^>]*hreflang="en"[^>]*>/)?.[0] ?? "";
    expect(termsEnAlt).toContain("/terms-and-conditions");
    expect(termsHtml).toContain('hreflang="x-default"');

    const privacy = await request.get("/vi/quyen-rieng-tu");
    expect(privacy.status()).toBe(200);
    const privacyHtml = await privacy.text();
    expect(privacyHtml).toContain("Cập nhật lần cuối");
    const privacyCanonical =
      privacyHtml.match(/<link[^>]*rel="canonical"[^>]*>/)?.[0] ?? "";
    expect(privacyCanonical).toContain("/vi/quyen-rieng-tu");
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
    // The legal pages are public and indexable, so they belong in the sitemap —
    // both languages of each, the same as the landings.
    expect(xml).toContain("/terms-and-conditions");
    expect(xml).toContain("/privacy");
    expect(xml).toContain("/vi/dieu-khoan");
    expect(xml).toContain("/vi/quyen-rieng-tu");
    // Bearer report links must never be advertised.
    expect(xml).not.toContain("/r/");
    expect(xml).not.toContain("/c/");
  });

  test("robots.txt disallows report pages and points at the sitemap", async ({
    request,
  }) => {
    const txt = await (await request.get("/robots.txt")).text();
    expect(txt).toContain("Disallow: /r/");
    // Deliberately NOT the share pages: a `/c/` Disallow would stop unfurl
    // bots from reading the OG tags, and noindex already handles search.
    expect(txt).not.toContain("Disallow: /c/");
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
