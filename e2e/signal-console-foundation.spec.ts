import { expect, test, type Page } from "@playwright/test";

// Structural smoke for the Signal Console presentation foundation. It asserts
// contracts that must hold for the whole authenticated shell regardless of what
// project data exists, so later shell/Command Center changes never need to edit
// this file: the active daisyUI theme resolves from the persisted preference,
// IBM Plex is the computed body font, the page never overflows horizontally, and
// the `.signal-*` motion utilities go inert under reduced motion. No golden
// screenshot and no assertion on transient project values.

type ThemeName = "openseo" | "openseo-dark";

const THEMES: Array<{ preference: "light" | "dark"; theme: ThemeName }> = [
  { preference: "light", theme: "openseo" },
  { preference: "dark", theme: "openseo-dark" },
];

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

// Land on the authenticated app. `/` redirects to the remembered/first project,
// so waiting on `/p/:id` is stable whether or not a feature route exists yet.
async function gotoApp(page: Page) {
  await page.goto("/");
  await page.waitForURL(/\/p\/[^/]+/, { timeout: 30_000 });
  await expect(page.locator("body")).not.toBeEmpty();
}

async function forceThemePreference(page: Page, preference: "light" | "dark") {
  await page.addInitScript((value) => {
    window.localStorage.setItem("theme-preference", value);
  }, preference);
}

for (const { preference, theme } of THEMES) {
  for (const viewport of VIEWPORTS) {
    test(`${theme} @ ${viewport.name} (${viewport.width}px): theme, font, no horizontal overflow`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await forceThemePreference(page, preference);
      await gotoApp(page);

      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);

      const fontFamily = await page.evaluate(
        () => getComputedStyle(document.body).fontFamily,
      );
      expect(fontFamily).toContain("IBM Plex Sans");

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });
  }
}

test("reduced motion suppresses the signal-spin animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await forceThemePreference(page, "dark");
  await gotoApp(page);

  // Probe the CSS contract directly with a throwaway element so the assertion
  // does not depend on any transient app markup (the refresh spinner only
  // exists while a fetch is in flight).
  const animationName = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.className = "signal-spin";
    document.body.appendChild(probe);
    const name = getComputedStyle(probe).animationName;
    probe.remove();
    return name;
  });
  expect(animationName).toBe("none");
});

test("without reduced motion the signal-spin animation is active", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await forceThemePreference(page, "light");
  await gotoApp(page);

  const animationName = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.className = "signal-spin";
    document.body.appendChild(probe);
    const name = getComputedStyle(probe).animationName;
    probe.remove();
    return name;
  });
  expect(animationName).toBe("signal-spin");
});
