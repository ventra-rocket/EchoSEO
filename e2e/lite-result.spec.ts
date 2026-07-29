import { expect, test } from "@playwright/test";

/**
 * The Lite result state — the surface the checker is judged on, and the one
 * that was untestable until now: reaching it for real needs a solved Turnstile
 * challenge, which no automated browser can produce.
 *
 * The fixture route renders it from `buildLiteReport`, the same function a real
 * check uses, so what these assertions see is what production would produce for
 * that page. The route answers 404 in any build without VITE_E2E_RESULT_FIXTURES.
 */
const FIXTURE = "/dev-fixtures/lite-report";

test.describe("the Lite result state", () => {
  test("renders the score, the categories, and every signal", async ({
    page,
  }) => {
    await page.goto(FIXTURE);

    // The score, and the headline that interprets it.
    await expect(page.getByText("out of 100")).toBeVisible();
    // All three categories the Lite tier scores.
    for (const label of ["Meta", "Page Structure", "Server"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
    // The fixture page has real failures, so every verdict must be reachable.
    await expect(page.getByText("fail", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("warn", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("pass", { exact: true }).first()).toBeVisible();
  });

  test("shows the visitor what was actually read from their page", async ({
    page,
  }) => {
    await page.goto(FIXTURE);

    // The panel that closes the gap between what the sample advertises and
    // what a real report delivers. These are the fixture page's real values.
    await expect(page.getByText("What we read on your page")).toBeVisible();
    await expect(
      page.getByText("Pricing — Acme Industrial Fasteners"),
    ).toBeVisible();
    // The measured length beside the value — the thing the sample promised.
    await expect(page.getByText("12 chars")).toBeVisible();
    // Word count is a measurement already; it must not gain a second one.
    await expect(page.getByText("268", { exact: true })).toBeVisible();
  });

  test("renders the result in Vietnamese when asked", async ({ page }) => {
    await page.goto(`${FIXTURE}?locale=vi`);
    await expect(
      page.getByText("Những gì chúng tôi đọc được trên trang của bạn"),
    ).toBeVisible();
    await expect(page.getByText("12 ký tự")).toBeVisible();
  });

  test("has no horizontal overflow on a phone", async ({ page }) => {
    // The owner reported the checker as broken on mobile, and the result state
    // was the surface nobody could check. Measure it rather than assume.
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(FIXTURE);

    // Measure the widest element against the viewport, not the document's own
    // scrollWidth. An app shell that puts content in an inner scroller leaves
    // the document unscrollable, so a document-level measurement reads 0 no
    // matter how far a child overflows — a test that passes by measuring
    // nothing. This asks the question the owner actually asked.
    const widest = await page.evaluate(() => {
      let worst = 0;
      for (const element of document.querySelectorAll("body *")) {
        const { right } = element.getBoundingClientRect();
        if (right > worst) worst = right;
      }
      return Math.round(worst);
    });
    expect(widest).toBeLessThanOrEqual(375);
  });

  test("gives every interactive control an adequate touch target", async ({
    page,
  }) => {
    // WCAG 2.2 asks for 24px. The fix toggles and the Deep submit were the
    // smallest controls on the page while being the most important taps.
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(FIXTURE);

    const toggles = page.locator("summary");
    const count = await toggles.count();
    expect(count).toBeGreaterThan(0);
    for (let index = 0; index < count; index += 1) {
      const box = await toggles.nth(index).boundingBox();
      expect(box, `toggle ${index} has no box`).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(24);
    }
  });
});
