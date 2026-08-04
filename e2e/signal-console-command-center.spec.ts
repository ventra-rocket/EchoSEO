import { expect, test, type Page } from "@playwright/test";

// State-agnostic smoke for the Project Command Center. It asserts only the
// hierarchy, semantics, links, keyboard reachability, and overflow that hold for
// ANY local project — never a persisted value, never a remote source, and it
// does not claim to cover the unavailable/error branches (those are proven
// deterministically in command-center-view-model.test.ts).

async function land(page: Page) {
  await page.goto("/");
  await page.waitForURL(/\/p\/[^/?#]+/, { timeout: 30_000 });
}

async function dismissSetup(page: Page) {
  const dismiss = page.getByRole("button", { name: "Dismiss" });
  if (await dismiss.isVisible().catch(() => false)) {
    await dismiss.click();
    await dismiss.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
  }
}

async function forceTheme(page: Page, preference: "light" | "dark") {
  await page.addInitScript((value) => {
    window.localStorage.setItem("theme-preference", value);
  }, preference);
}

async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

test("renders the six evidence layers in top-to-bottom order", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await land(page);
  await dismissSetup(page);

  const anchors = [
    page.getByText("Project overview", { exact: true }),
    page.getByRole("region", { name: "Project signals" }),
    page.getByRole("heading", { name: "Data health" }),
    page.getByRole("heading", { name: "Evidence before action" }),
    page.getByText("Data source", { exact: true }),
  ];
  for (const anchor of anchors) {
    await expect(anchor.first()).toBeVisible();
  }

  // Exactly four drill-down signal cells.
  await expect(
    page.getByRole("region", { name: "Project signals" }).getByRole("link"),
  ).toHaveCount(4);

  // Vertical order proves the layer sequence.
  const tops: number[] = [];
  for (const anchor of anchors) {
    const box = await anchor.first().boundingBox();
    expect(box).not.toBeNull();
    tops.push(box!.y);
  }
  for (let i = 1; i < tops.length; i += 1) {
    expect(tops[i]).toBeGreaterThan(tops[i - 1]);
  }
});

test("signal cells stay four and link to their destinations", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await land(page);
  await dismissSetup(page);

  const signals = page.getByRole("region", { name: "Project signals" });
  await expect(signals.getByRole("link")).toHaveCount(4);

  await signals.getByRole("link", { name: /Tracked keywords/ }).click();
  await page.waitForURL(/\/p\/[^/?#]+\/rank-tracking/);
});

test("refresh control and signal cells are keyboard reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await land(page);
  await dismissSetup(page);

  const refresh = page.getByRole("button", {
    name: "Refresh project overview",
  });
  await refresh.focus();
  await expect(refresh).toBeFocused();

  const firstSignal = page
    .getByRole("region", { name: "Project signals" })
    .getByRole("link")
    .first();
  await firstSignal.focus();
  await expect(firstSignal).toBeFocused();
});

test("refresh works under reduced motion without breaking layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await land(page);
  await dismissSetup(page);

  await page.getByRole("button", { name: "Refresh project overview" }).click();
  await expect(
    page.getByRole("region", { name: "Project signals" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

for (const theme of ["light", "dark"] as const) {
  for (const viewport of [
    { name: "mobile", width: 375, height: 812 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1440, height: 900 },
  ]) {
    test(`no overflow, four cells — ${theme} @ ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await forceTheme(page, theme);
      await land(page);
      await dismissSetup(page);

      await expect(
        page.getByRole("region", { name: "Project signals" }).getByRole("link"),
      ).toHaveCount(4);
      await expectNoHorizontalOverflow(page);
    });
  }
}
