import { expect, test, type Page } from "@playwright/test";
import { LITE_REPORT_FIXTURE } from "./fixtures/lite-report-fixture";

/**
 * The landing's own behavior around a check: client-side URL validation, and
 * where the result lands once a check succeeds.
 *
 * A real Turnstile challenge cannot be solved by an automated browser, so the
 * widget API is stubbed before any page script runs — `loadTurnstileScript`
 * short-circuits when `window.turnstile` already exists — and the check API is
 * fulfilled with the same fixture report the dev-fixtures route renders
 * (built by the real `buildLiteReport`). What these tests exercise for real is
 * everything this feature owns: the validation gate, the submit queue, and the
 * result placement/focus contract.
 */

const LANDING = "/free-seo-check";
const CHECK_API = "**/api/free-seo-check";

async function stubChallengeAndApi(page: Page) {
  await page.addInitScript(() => {
    // Same surface TurnstileWidget's global declaration expects; assigned via
    // Object.assign so no window type is asserted away.
    const turnstile = {
      render: (
        _el: HTMLElement,
        opts: { callback: (token: string) => void },
      ): string => {
        setTimeout(() => opts.callback("e2e-turnstile-token"), 25);
        return "e2e-widget";
      },
      remove: (): void => {},
    };
    Object.assign(window, { turnstile });
  });
  await page.route("**/api/free-seo-check/config", (route) =>
    route.fulfill({ json: { turnstileSiteKey: "e2e-site-key" } }),
  );
  await page.route(CHECK_API, (route) =>
    route.fulfill({
      json: { report: LITE_REPORT_FIXTURE, cached: false, deepAvailable: true },
    }),
  );
}

/**
 * Navigates and waits for hydration before interacting. The landing SSRs its
 * form, so `fill` can land on the server HTML and then be wiped when React
 * hydrates the controlled input back to empty state. The config fetch only
 * happens from a mount effect, so its response is a reliable hydration signal.
 */
async function gotoHydrated(page: Page) {
  const hydrated = page.waitForResponse((response) =>
    response.url().includes("/api/free-seo-check/config"),
  );
  await page.goto(LANDING);
  await hydrated;
}

test.describe("client-side URL validation", () => {
  test("an unfetchable URL never reaches the API or spends the challenge", async ({
    page,
  }) => {
    await stubChallengeAndApi(page);
    const checkRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/free-seo-check")) {
        checkRequests.push(request.url());
      }
    });

    await gotoHydrated(page);
    const input = page.getByPlaceholder("example.com");
    await input.fill("not-a-valid-site");
    await page.getByRole("button", { name: "Check my site" }).click();

    // The actionable inline error, tied to the field it is about.
    const error = page.locator("#fsc-url-error");
    await expect(error).toBeVisible();
    await expect(error).toContainText("Enter a valid domain");
    await expect(input).toBeFocused();
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAttribute("aria-describedby", "fsc-url-error");

    // Not the old behavior: no API call burned the token, and no generic
    // "couldn't reach that site" answer for a URL that was never fetchable.
    expect(
      checkRequests.filter((url) => !url.includes("/config")),
    ).toHaveLength(0);
    await expect(page.getByText("We couldn't reach that site")).toBeHidden();

    // Editing the input clears the error.
    await input.fill("example.com");
    await expect(error).toBeHidden();
    await expect(input).not.toHaveAttribute("aria-invalid", "true");
  });
});

test.describe("the result placement contract", () => {
  test("a successful check puts the report under the form and moves focus to it", async ({
    page,
  }) => {
    await stubChallengeAndApi(page);
    const checkPosts: string[] = [];
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        request.url().endsWith("/api/free-seo-check")
      ) {
        checkPosts.push(request.url());
      }
    });

    await gotoHydrated(page);
    // The landing's marketing content carries the initial page.
    await expect(page.getByText("Frequently asked questions")).toBeVisible();

    await page.getByPlaceholder("example.com").fill("example.com/pricing");
    await page.getByRole("button", { name: "Check my site" }).click();

    // The localized H2 the section is labelled by, focused after the scan.
    const heading = page.getByRole("heading", {
      name: "Your SEO Report",
      level: 2,
    });
    await expect(heading).toBeVisible();
    await expect(heading).toBeFocused();

    // Exactly one check request per submit.
    expect(checkPosts).toHaveLength(1);

    // The report replaces the sample and editorial content instead of sitting
    // 2,000px below them — no second look-alike report, no FAQ in between.
    await expect(page.getByText("What your report shows")).toBeHidden();
    await expect(page.getByText("Frequently asked questions")).toBeHidden();

    // The real report content is on screen, inside the labelled section.
    const section = page.locator(
      "section[aria-labelledby='fsc-report-heading']",
    );
    await expect(section.getByText("out of 100")).toBeVisible();
  });
});

test.describe("keyboard access", () => {
  test("the skip link is the first tab stop and lands on main", async ({
    page,
  }) => {
    await page.goto(LANDING);
    await page.keyboard.press("Tab");

    const skipLink = page.getByRole("link", { name: "Skip to main content" });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(page.locator("#fsc-main")).toBeFocused();
  });
});
