import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { RawIntlProvider, createIntl } from "react-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

// PostSignupOnboarding pulls in SearchConsoleOnboardingStep (step 3), which
// calls these serverFunctions modules. Each one transitively reaches @/db and
// its cloudflare:workers binding, unloadable outside a Worker — mocking them
// is what lets the real component tree load and render under plain Node.
vi.mock("@/serverFunctions/onboarding", () => ({
  getOnboardingAnswers: vi.fn(),
}));
vi.mock("@/serverFunctions/gsc", () => ({
  getGscConnection: vi.fn(),
  listGscSites: vi.fn(),
  setGscSite: vi.fn(),
  startSelfHostedGscLink: vi.fn(),
}));
vi.mock("@/serverFunctions/projects", () => ({
  getProjects: vi.fn(),
}));

import { PostSignupOnboarding } from "./PostSignupOnboarding";
import { CLIENT_WORK_FOR, type OnboardingAnswers } from "./onboardingModel";
import { en } from "@/client/i18n/messages/en";
import { vi as viMessages } from "@/client/i18n/messages/vi";

const CATALOGS = { en, vi: viMessages } as const;

/** Mirrors react-dom/server's own escaping, so `toContain` can compare
 * against catalog strings as authored instead of retyping each one with its
 * HTML entities (an apostrophe renders as `&#x27;`, not `'`). */
function escapeForHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function localized(locale: keyof typeof CATALOGS, id: keyof typeof en) {
  return escapeForHtml(CATALOGS[locale][id]);
}

const EMPTY_ANSWERS: OnboardingAnswers = {
  selectedInterests: [],
  interestOther: "",
  workFor: "",
  workForOther: "",
  clientWebsiteCount: "",
  source: "",
  sourceOther: "",
};

function renderStep(
  locale: keyof typeof CATALOGS,
  step: number,
  options: {
    answers?: OnboardingAnswers;
    queryData?: [readonly unknown[], unknown][];
  } = {},
) {
  const queryClient = new QueryClient();
  for (const [key, data] of options.queryData ?? []) {
    queryClient.setQueryData(key, data);
  }
  const errors: string[] = [];
  const intl = createIntl({
    locale,
    messages: CATALOGS[locale],
    onError: (error) => errors.push(error.code),
  });
  const html = renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(
        RawIntlProvider,
        { value: intl },
        createElement(PostSignupOnboarding, {
          firstName: "",
          step,
          answers: options.answers ?? EMPTY_ANSWERS,
          onAnswersChange: () => {},
          onNext: () => {},
          onBack: () => {},
          onSkip: () => {},
          onFinish: () => {},
          onUpgradeAcknowledged: () => {},
          isSaving: false,
          accountMenu: null,
        }),
      ),
    ),
  );
  return { html, errors };
}

describe("PostSignupOnboarding translations", () => {
  it.each(["en", "vi"] as const)(
    "renders every step without an unknown message id (%s)",
    (locale) => {
      for (let step = 0; step <= 4; step++) {
        const { errors } = renderStep(locale, step);
        expect(errors).toEqual([]);
      }
    },
  );

  it.each(["en", "vi"] as const)(
    "localizes the interests step, including a capability id it shares with the MCP step (%s)",
    (locale) => {
      const { html } = renderStep(locale, 0);
      expect(html).toContain(
        localized(locale, "onboarding.step.interests.title"),
      );
      expect(html).toContain(localized(locale, "onboarding.option.other"));
      expect(html).toContain(
        localized(locale, "onboarding.option.keywordResearch"),
      );
    },
  );

  it.each(["en", "vi"] as const)(
    "shows the interests cap through the active locale's number formatting (%s)",
    (locale) => {
      const { html } = renderStep(locale, 0);
      // "Pick up to {max, number}." with max=3 — same source as the
      // maxSelections=3 prop, so the copy and the actual limit cannot drift.
      const expected = CATALOGS[locale][
        "onboarding.step.interests.description"
      ].replace("{max, number}", "3");
      expect(html).toContain(expected);
    },
  );

  it("keeps every interest/work-for/source option's canonical English value working as the toggle key while its label localizes to vi", () => {
    const { html } = renderStep("vi", 1);
    // The stored value ("My employer's website") never appears literally in
    // English inside a vi render; only its Vietnamese label does.
    expect(html).not.toContain(escapeForHtml("My employer's website"));
    expect(html).toContain(localized("vi", "onboarding.option.employer"));
  });

  it("shows the client-website-count follow-up only once workFor is exactly CLIENT_WORK_FOR", () => {
    const withoutClients = renderStep("vi", 1, {
      answers: { ...EMPTY_ANSWERS, workFor: "My own side project" },
    });
    expect(withoutClients.errors).toEqual([]);
    expect(withoutClients.html).not.toContain(
      localized("vi", "onboarding.step.workFor.clientCountLabel"),
    );

    const withClients = renderStep("vi", 1, {
      answers: { ...EMPTY_ANSWERS, workFor: CLIENT_WORK_FOR },
    });
    expect(withClients.errors).toEqual([]);
    expect(withClients.html).toContain(
      localized("vi", "onboarding.step.workFor.clientCountLabel"),
    );
    expect(withClients.html).toContain(
      localized("vi", "onboarding.option.websiteCount1to3"),
    );
    expect(withClients.html).toContain(
      localized("vi", "onboarding.option.websiteCount25plus"),
    );
  });

  it.each(["en", "vi"] as const)("localizes the source step (%s)", (locale) => {
    const { html } = renderStep(locale, 2);
    expect(html).toContain(localized(locale, "onboarding.step.source.title"));
    expect(html).toContain(localized(locale, "onboarding.option.sourceGithub"));
  });

  it.each(["en", "vi"] as const)(
    "localizes the MCP recommendation step, reusing the interests step's ids (%s)",
    (locale) => {
      const { html } = renderStep(locale, 4);
      expect(html).toContain(localized(locale, "onboarding.mcp.title"));
      expect(html).toContain(
        localized(locale, "onboarding.mcp.capability.linkProspecting"),
      );
      expect(html).toContain(localized(locale, "onboarding.mcp.setup"));
      expect(html).toContain(
        localized(locale, "onboarding.option.keywordResearch"),
      );
      expect(html).toContain(
        localized(locale, "onboarding.option.competitorResearch"),
      );
    },
  );

  it.each([
    { locale: "en" as const, progress: "Step 2 of 5" },
    { locale: "vi" as const, progress: "Bước 2/5" },
  ])(
    "formats the step progress through the active locale's number formatting ($locale)",
    ({ locale, progress }) => {
      const { html } = renderStep(locale, 1);
      expect(html).toContain(progress);
    },
  );

  it("renders the Search Console step inline as part of the full flow (step 3), interpolating the connected property", () => {
    const projectId = "project-1";
    const { html, errors } = renderStep("vi", 3, {
      queryData: [
        [["projects"], [{ id: projectId }]],
        [
          ["gscConnection", projectId],
          {
            connected: true,
            currentUserHasGrant: true,
            googleOAuthConfigured: true,
            siteUrl: "sc-domain:example.com",
            connectedByEmail: "owner@example.com",
            connectedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      ],
    });
    expect(errors).toEqual([]);
    expect(html).toContain(localized("vi", "onboarding.gscStep.title"));
    expect(html).toContain("sc-domain:example.com");
  });

  it("shows the reused gsc.connectWithGoogle button once no Google grant exists yet", () => {
    const projectId = "project-1";
    const { html, errors } = renderStep("vi", 3, {
      queryData: [
        [["projects"], [{ id: projectId }]],
        [
          ["gscConnection", projectId],
          {
            connected: false,
            currentUserHasGrant: false,
            googleOAuthConfigured: true,
            siteUrl: null,
            connectedByEmail: null,
            connectedAt: null,
          },
        ],
      ],
    });
    expect(errors).toEqual([]);
    expect(html).toContain(localized("vi", "gsc.connectWithGoogle"));
  });

  it("falls back to the loading state before the project list resolves (step 3, no seeded query data)", () => {
    const { html, errors } = renderStep("en", 3);
    expect(errors).toEqual([]);
    expect(html).toContain(localized("en", "gsc.card.checking"));
  });

  describe("the post-checkout interstitial (?checkout=success, step 3)", () => {
    afterEach(() => vi.unstubAllGlobals());

    it.each(["en", "vi"] as const)(
      "renders once, instead of the Search Console step (%s)",
      (locale) => {
        vi.stubGlobal("window", { location: { search: "?checkout=success" } });

        const { html, errors } = renderStep(locale, 3);
        expect(errors).toEqual([]);
        expect(html).toContain(localized(locale, "onboarding.upgrade.title"));
        expect(html).toContain(
          localized(locale, "onboarding.upgrade.cardBody"),
        );
        expect(html).not.toContain(
          localized(locale, "onboarding.gscStep.title"),
        );
      },
    );

    it("does not show without the checkout query param", () => {
      vi.stubGlobal("window", { location: { search: "" } });

      const { html } = renderStep("en", 3);
      expect(html).not.toContain(localized("en", "onboarding.upgrade.title"));
      expect(html).toContain(localized("en", "onboarding.gscStep.title"));
    });
  });
});
