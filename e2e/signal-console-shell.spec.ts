import { expect, test, type Page } from "@playwright/test";

// Behaviour contract for the Signal Console authenticated shell: responsive
// geometry (mobile drawer / tablet rail / desktop full sidebar), the modal
// drawer's focus lifecycle, the skip-link vs. setup-modal focus hand-off, and
// the PostHog masking boundary on tenant-derived text. Runs against the
// local-noauth fixture server, where DataForSEO is unconfigured so the setup
// modal auto-opens — every test dismisses it before driving the shell.

async function land(page: Page) {
  await page.goto("/");
  await page.waitForURL(/\/p\/[^/?#]+/, { timeout: 30_000 });
}

// Dismiss the DataForSEO setup modal if this environment surfaces it (only when
// no DataForSEO key is configured). With a key present it never opens, so this
// is an immediate no-op rather than a long wait.
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

test.describe("responsive geometry", () => {
  test("mobile (375px): hamburger opens the drawer, no persistent rail", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await land(page);
    await dismissSetup(page);

    await expect(
      page.getByRole("button", { name: "Toggle sidebar" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Expand navigation" }),
    ).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("tablet (768px): a single icon rail with an expand control", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await land(page);
    await dismissSetup(page);

    await expect(
      page.getByRole("button", { name: "Expand navigation" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Toggle sidebar" }),
    ).toHaveCount(0);
    // Exactly one accessible "Site Audit" nav link exists at this width — the
    // rail's — because the full sidebar is display:none and out of the a11y tree.
    await expect(
      page
        .getByRole("navigation", { name: "Primary navigation" })
        .getByRole("link", { name: "Site Audit" }),
    ).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
  });

  test("desktop (1440px): a persistent full sidebar, no drawer triggers", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await land(page);
    await dismissSetup(page);

    await expect(
      page.getByRole("button", { name: "Toggle sidebar" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Expand navigation" }),
    ).toHaveCount(0);
    await expect(
      page
        .getByRole("navigation", { name: "Primary navigation" })
        .getByRole("link", { name: "Site Audit" }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  for (const theme of ["light", "dark"] as const) {
    for (const viewport of [
      { name: "mobile", width: 375, height: 812 },
      { name: "tablet", width: 768, height: 1024 },
      { name: "desktop", width: 1440, height: 900 },
    ]) {
      test(`no horizontal overflow — ${theme} @ ${viewport.name}`, async ({
        page,
      }) => {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await forceTheme(page, theme);
        await land(page);
        await dismissSetup(page);
        await expectNoHorizontalOverflow(page);
      });
    }
  }
});

test.describe("navigation drawer focus lifecycle", () => {
  test("opens with focus contained, Escape closes and restores the trigger", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await land(page);
    await dismissSetup(page);

    const trigger = page.getByRole("button", { name: "Toggle sidebar" });
    await trigger.click();

    const drawer = page.getByRole("dialog", { name: "Navigation menu" });
    await expect(drawer).toBeVisible();

    // Initial focus landed inside the dialog.
    await expect
      .poll(() =>
        page.evaluate(() => {
          const dialog = document.querySelector('[role="dialog"]');
          return dialog?.contains(document.activeElement) ?? false;
        }),
      )
      .toBe(true);

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("backdrop and nav-link both close the drawer", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await land(page);
    await dismissSetup(page);

    const trigger = page.getByRole("button", { name: "Toggle sidebar" });
    const drawer = page.getByRole("dialog", { name: "Navigation menu" });

    await trigger.click();
    await expect(drawer).toBeVisible();
    // Click the backdrop on the right strip that the 288px drawer does not
    // cover — clicking its centre would land on the drawer at this width.
    await page
      .getByTestId("nav-drawer-backdrop")
      .click({ position: { x: 340, y: 400 } });
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await expect(drawer).toBeVisible();
    await drawer.getByRole("link", { name: "Site Audit" }).click();
    await page.waitForURL(/\/p\/[^/?#]+\/audit/);
    await expect(drawer).toBeHidden();
  });

  test("tablet rail expand opens the same drawer", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await land(page);
    await dismissSetup(page);

    const expand = page.getByRole("button", { name: "Expand navigation" });
    await expand.click();
    const drawer = page.getByRole("dialog", { name: "Navigation menu" });
    await expect(drawer).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(expand).toBeFocused();
  });

  test("resizing to desktop with the drawer open closes it and keeps the app interactive", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await land(page);
    await dismissSetup(page);

    await page.getByRole("button", { name: "Toggle sidebar" }).click();
    const drawer = page.getByRole("dialog", { name: "Navigation menu" });
    await expect(drawer).toBeVisible();

    // Cross the desktop breakpoint while open: the drawer must close so the
    // shell does not stay `inert` behind a now-hidden dialog.
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(drawer).toBeHidden();

    // A topbar control is clickable again — this would time out if the shell
    // were still inert.
    await page
      .getByRole("button", { name: "Refresh project overview" })
      .click();
    await expect(
      page.getByRole("region", { name: "Project signals" }),
    ).toBeVisible();
  });
});

test("skip link is the first tab stop only when no modal owns focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await land(page);
  await dismissSetup(page);

  const trigger = page.getByRole("button", { name: "Toggle sidebar" });
  const drawer = page.getByRole("dialog", { name: "Navigation menu" });

  // While a modal (the nav drawer) owns focus, the skip link sits in the inert
  // background and cannot be the first tab stop.
  await trigger.click();
  await expect(drawer).toBeVisible();
  const skipLinkInertWhileModalOpen = await page.evaluate(
    () =>
      document
        .querySelector('a[href="#app-main-content"]')
        ?.closest("[inert]") != null,
  );
  expect(skipLinkInertWhileModalOpen).toBe(true);
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();

  // With no modal owning focus, the skip link is the first tab stop. Assert it
  // deterministically as the first focusable element in DOM order — no positive
  // tabindex reorders sequential focus, so a keyboard user's first Tab lands on
  // it.
  const skipLinkIsFirstFocusable = await page.evaluate(() => {
    const focusable = Array.from(
      document.querySelectorAll<HTMLElement>(
        'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => {
      const style = getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden";
    });
    return focusable[0]?.getAttribute("href") === "#app-main-content";
  });
  expect(skipLinkIsFirstFocusable).toBe(true);

  // Activating it moves focus to the shell scroll container.
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await skipLink.focus();
  await skipLink.press("Enter");
  await expect(page.locator("#app-main-content")).toBeFocused();
});

test("tenant-derived project text keeps PostHog masking", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await land(page);
  await dismissSetup(page);

  const switcher = page.getByRole("button", { name: "Switch project" });
  await expect(switcher).toBeVisible();
  await expect(switcher.locator("[data-ph-mask]").first()).toBeVisible();
});
