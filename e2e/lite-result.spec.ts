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
    // Passing checks are deliberately folded away, so this one has to be
    // opened. Reachable, not visible by default — that is the design.
    await page.getByText("6 checks passed").click();
    await expect(page.getByText("pass", { exact: true }).first()).toBeVisible();
  });

  test("leads with the worst finding and folds the passing checks away", async ({
    page,
  }) => {
    await page.goto(FIXTURE);

    // Severity order, not rule-definition order. The fixture's only failure
    // must be the first row; in definition order it sat seventh.
    const rows = page.locator("[data-signal-status]");
    await expect(rows.first()).toHaveAttribute("data-signal-status", "fail");

    // Its fix is already open — a reader who came for one answer should not
    // have to guess which row holds it.
    await expect(
      page.getByText("The page has very little visible text content", {
        exact: false,
      }),
    ).toBeVisible();

    // Passing checks are folded behind one row, present but not crowding.
    await expect(page.getByText("6 checks passed")).toBeVisible();
  });

  test("counts every verdict before the reader reads any of them", async ({
    page,
  }) => {
    await page.goto(FIXTURE);
    await expect(page.getByText("1 failing")).toBeVisible();
    await expect(page.getByText("4 warnings")).toBeVisible();
    await expect(page.getByText("6 passed")).toBeVisible();
  });

  test("puts the measured value on every check that has one", async ({
    page,
  }) => {
    await page.goto(FIXTURE);
    // What the page actually had, beside the verdict about it — the thing the
    // landing's sample advertised and the real report never delivered.
    await expect(page.getByText("12 chars").first()).toBeVisible();
    await expect(page.getByText("1 of 2")).toBeVisible();
    // The heading outline shows the skip rather than asserting it.
    await expect(page.getByText("H1 › H2 › H4 › H2 › H1")).toBeVisible();
  });

  test("shows the visitor what was actually read from their page", async ({
    page,
  }) => {
    await page.goto(FIXTURE);

    // The panel that closes the gap between what the sample advertises and
    // what a real report delivers. These are the fixture page's real values.
    await expect(page.getByText("What we read on your page")).toBeVisible();
    // Scoped to the panel: the same measurement vocabulary now also renders on
    // the signal rows, which is the point — one way of saying "12 chars".
    const panel = page.locator("dl");
    await expect(
      panel.getByText("Pricing — Acme Industrial Fasteners"),
    ).toBeVisible();
    await expect(panel.getByText("12 chars")).toBeVisible();
    // Word count is a measurement already; it must not gain a second one.
    await expect(panel.getByText("268", { exact: true })).toBeVisible();
  });

  test("renders the result in Vietnamese when asked", async ({ page }) => {
    await page.goto(`${FIXTURE}?locale=vi`);
    await expect(
      page.getByText("Những gì chúng tôi đọc được trên trang của bạn"),
    ).toBeVisible();
    await expect(page.locator("dl").getByText("12 ký tự")).toBeVisible();
    // The triage counts localize too, not just the panel.
    await expect(page.getByText("1 lỗi")).toBeVisible();
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

test.describe("the shareable Deep report", () => {
  // Never renderable under test before: a real one needs a solved challenge, a
  // confirmed email, and a Workflow run. Built through the real
  // `buildDeepReport`, so these are production's own numbers.
  const DEEP = "/dev-fixtures/lite-report?tier=deep";

  test("leads with the worst finding and folds the passing checks", async ({
    page,
  }) => {
    await page.goto(DEEP);
    const rows = page.locator("[data-signal-status]");
    await expect(rows.first()).not.toHaveAttribute(
      "data-signal-status",
      "pass",
    );
    await expect(page.getByText(/checks? passed$/)).toBeVisible();
  });

  test("carries the measured value on its on-page checks", async ({ page }) => {
    await page.goto(DEEP);
    // The same measurements the Lite result gained, on the report that gets
    // forwarded to whoever has to act on it.
    await expect(page.getByText("12 chars").first()).toBeVisible();
  });

  test("keeps the Core Web Vitals in their own cards, stated once", async ({
    page,
  }) => {
    await page.goto(DEEP);
    // The metrics belong to the dedicated card row, which picks a unit per
    // metric. Repeating them beside the rule ids would state the same numbers
    // twice on one page, in two formats.
    await expect(page.getByText("3.2s")).toHaveCount(1);
    await expect(page.getByText("140ms")).toHaveCount(1);
    await expect(page.getByText("0.18")).toHaveCount(1);
  });

  test("puts the page capture after the findings, not above them", async ({
    page,
  }) => {
    await page.goto(DEEP);
    const captureTop = await page
      .getByText("WHAT WE LOADED")
      .evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    const firstRowTop = await page
      .locator("[data-signal-status]")
      .first()
      .evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    expect(captureTop).toBeGreaterThan(firstRowTop);
  });
});

test.describe("the AI Search section", () => {
  const DEEP = "/dev-fixtures/lite-report?tier=deep";

  test("shows the robots directive and the schema types it found", async ({
    page,
  }) => {
    await page.goto(DEEP);
    // Neither was displayed anywhere in this section before, so a reader had no
    // way to learn *why* a verdict landed without leaving it.
    await expect(page.getByText("index, follow, max-snippet:0")).toHaveCount(1);
    await expect(page.getByText("Organization, FAQPage")).toBeVisible();
  });

  test("states the robots directive once, not on every rule that reads it", async ({
    page,
  }) => {
    await page.goto(DEEP);
    // Three GEO rules read the same single string. Exactly one renders it as a
    // MEASUREMENT; the snippet rule names the directives in its problem and fix
    // prose instead, which is where naming them belongs. Targeting the
    // measurement element rather than any text is what makes this precise —
    // a bare text count sees the prose too and says nothing.
    const section = page.locator("section", {
      has: page.getByText("AI Search readiness"),
    });
    const measured = section.locator("[data-measurement]");
    await expect(measured).toHaveCount(2);
    await expect(measured.filter({ hasText: "max-snippet:0" })).toHaveCount(1);
  });

  test("keeps its eligibility order rather than sorting by severity", async ({
    page,
  }) => {
    await page.goto(DEEP);
    // Unlike the findings list, this sequence is the argument: crawlable →
    // indexable → snippet-eligible → answerable → schema. Sorting the warning
    // to the top would break a funnel that reads as one.
    const section = page.locator("section", {
      has: page.getByText("AI Search readiness"),
    });
    const ids = await section.locator("code").allInnerTexts();
    expect(ids.slice(0, 3)).toEqual([
      "geo-crawlable",
      "geo-indexable",
      "geo-snippet-eligible",
    ]);
  });
});
