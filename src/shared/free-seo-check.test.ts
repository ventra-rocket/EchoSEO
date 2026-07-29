import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FREE_SEO_CHECK_CONFIRM_ROUTE,
  FREE_SEO_CHECK_REPORT_ROUTE_PREFIX,
  FREE_SEO_CHECK_VI_LANDING_PATH,
  isPublicSsrPath,
  LITE_REPORT_FIXTURE_ROUTE,
} from "./free-seo-check";
import {
  LEGAL_PRIVACY_PATH,
  LEGAL_PRIVACY_PATH_VI,
  LEGAL_TERMS_PATH,
  LEGAL_TERMS_PATH_VI,
} from "./legal";

describe("isPublicSsrPath", () => {
  it("matches both language landings and the double-opt-in confirm page", () => {
    expect(isPublicSsrPath("/free-seo-check")).toBe(true);
    expect(isPublicSsrPath(FREE_SEO_CHECK_VI_LANDING_PATH)).toBe(true);
    expect(isPublicSsrPath(FREE_SEO_CHECK_CONFIRM_ROUTE)).toBe(true);
  });

  it("matches the legal pages in both languages", () => {
    // These are reachable by someone with no account and no session, so they
    // must render server-side rather than behind the authenticated island. The
    // Vietnamese URLs are separate hreflang targets and need the same treatment.
    expect(isPublicSsrPath(LEGAL_TERMS_PATH)).toBe(true);
    expect(isPublicSsrPath(LEGAL_PRIVACY_PATH)).toBe(true);
    expect(isPublicSsrPath(LEGAL_TERMS_PATH_VI)).toBe(true);
    expect(isPublicSsrPath(LEGAL_PRIVACY_PATH_VI)).toBe(true);
  });

  it("matches the test-only result fixture route", () => {
    // It renders the result state, so it needs the same SSR treatment a real
    // result gets — otherwise the fixture would exercise a different code path
    // than the thing it exists to stand in for.
    expect(isPublicSsrPath(LITE_REPORT_FIXTURE_ROUTE)).toBe(true);
  });

  it("matches any report page under the bearer-link prefix", () => {
    expect(
      isPublicSsrPath(`${FREE_SEO_CHECK_REPORT_ROUTE_PREFIX}abc-123`),
    ).toBe(true);
  });

  it("does not match the authenticated app", () => {
    // The whole point of the switch: dashboard routes must stay client-only, or
    // their providers SSR and the module-level queryClient/authClient singletons
    // start rendering one visitor's state into another's HTML.
    expect(isPublicSsrPath("/")).toBe(false);
    expect(isPublicSsrPath("/p/some-project/keywords")).toBe(false);
    expect(isPublicSsrPath("/settings")).toBe(false);
  });

  it("does not match a path that merely starts with the landing string", () => {
    // Guards against a future `/free-seo-checkout` style route being pulled into
    // SSR by a sloppy prefix test. The landing match is exact.
    expect(isPublicSsrPath("/free-seo-check-anything")).toBe(false);
  });

  it("only treats `/r/` as a prefix — not the bare `/r` or lookalike routes", () => {
    // The report prefix carries a trailing slash on purpose: `/reset-password`
    // begins with `/r` but must stay client-only, and `/r` with no slash is not a
    // report page.
    expect(isPublicSsrPath("/reset-password")).toBe(false);
    expect(isPublicSsrPath("/r")).toBe(false);
  });
});

/**
 * The SSR switch is only safe while the public routes stay free of the two
 * module-level singletons the authenticated island contains. If a public route
 * ever imports the tanstack-db queryClient or the auth client, SSR-ing it can
 * leak one visitor's cached data into another visitor's response. This is the
 * executable form of that invariant — cheaper than remembering it.
 *
 * It checks DIRECT imports only, not the transitive graph: a public file that
 * imports a shared component which in turn imports the auth client would slip
 * through. Full module-graph analysis is not worth the machinery here — the
 * public surface is small and self-contained, and this catches the accident that
 * actually happens (someone reaching for `useQuery` in a public route).
 */
describe("public SSR surface stays free of request-shared singletons", () => {
  const REPO_ROOT = join(__dirname, "..", "..");
  const FORBIDDEN = [
    "@/client/tanstack-db",
    "@/lib/auth-client",
    "tanstack-db",
    "auth-client",
  ];
  const PUBLIC_FILES = [
    "src/routes/free-seo-check.tsx",
    "src/routes/vi.kiem-tra-seo.tsx",
    "src/routes/free-seo-check_.confirm.tsx",
    "src/routes/r.$id.tsx",
    "src/routes/terms-and-conditions.tsx",
    "src/routes/privacy.tsx",
    "src/routes/vi.dieu-khoan.tsx",
    "src/routes/vi.quyen-rieng-tu.tsx",
    "src/routes/dev-fixtures.lite-report.tsx",
    ...readdirSync(join(REPO_ROOT, "src/client/features/free-seo-check"), {
      recursive: true,
    })
      .map((entry) => entry.toString())
      .filter((name) => name.endsWith(".ts") || name.endsWith(".tsx"))
      .map((name) => `src/client/features/free-seo-check/${name}`),
    ...readdirSync(join(REPO_ROOT, "src/client/features/legal"), {
      recursive: true,
    })
      .map((entry) => entry.toString())
      .filter((name) => name.endsWith(".ts") || name.endsWith(".tsx"))
      .map((name) => `src/client/features/legal/${name}`),
  ];

  it.each(PUBLIC_FILES)("%s imports no request-shared singleton", (relPath) => {
    const source = readFileSync(join(REPO_ROOT, relPath), "utf8");
    const importLines = source
      .split("\n")
      .filter((line) => line.includes("import") || line.includes("from"));
    for (const forbidden of FORBIDDEN) {
      expect(importLines.join("\n")).not.toContain(forbidden);
    }
  });
});
