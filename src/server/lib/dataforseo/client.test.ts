/* eslint-disable max-lines */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTUMN_SEO_DATA_BALANCE_FEATURE_ID,
  AUTUMN_SEO_DATA_CREDITS_PER_USD,
  AUTUMN_SEO_DATA_TOPUP_BALANCE_FEATURE_ID,
  SEO_DATA_COST_MARKUP,
} from "@/shared/billing";

interface TrackCallArg {
  customerId: string;
  featureId: string;
  value: number;
  properties?: { balanceFeatureId: string };
}

const {
  checkMock,
  trackMock,
  getOrCreateMock,
  isHostedServerAuthModeMock,
  isHostedAccessOpenMock,
  resolveCredentialsMock,
} = vi.hoisted(() => ({
  checkMock: vi.fn(),
  trackMock: vi.fn<(arg: TrackCallArg) => void>(),
  getOrCreateMock: vi.fn(),
  isHostedServerAuthModeMock: vi.fn(),
  isHostedAccessOpenMock: vi.fn(),
  resolveCredentialsMock: vi.fn(),
}));

vi.mock("cloudflare:workers", () => ({
  waitUntil: vi.fn(),
}));

vi.mock("@/server/billing/autumn", () => ({
  autumn: {
    check: checkMock,
    track: trackMock,
  },
}));

// Keep the real subscription module (its assertUsageCreditsAvailable calls the
// mocked autumn.check) and only stub the customer lookup, so the balance-assert
// logic stays exercised through these tests after it moved out of client.ts.
vi.mock("@/server/billing/subscription", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getOrCreateOrganizationCustomer: getOrCreateMock,
  };
});

vi.mock("@/server/lib/runtime-env", () => ({
  isHostedServerAuthMode: isHostedServerAuthModeMock,
  isHostedAccessOpen: isHostedAccessOpenMock,
}));

// Resolve credentials is exercised by its own real-SQLite suite; here it is
// stubbed so the metering/threading branches can be driven directly. The real
// credential-context (AsyncLocalStorage) stays unmocked so key threading is
// genuinely observed inside `execute`.
vi.mock("@/server/lib/dataforseo/resolve-credentials", () => ({
  resolveDataforseoCredentials: resolveCredentialsMock,
}));

vi.mock("@/server/lib/posthog", () => ({
  captureServerEvent: vi.fn(),
}));

// Mock every section module the client wraps so meterDataforseoCall's
// `execute()` resolves to a controllable fixture.
vi.mock("@/server/lib/dataforseo/labs", () => ({
  fetchRelatedKeywords: vi.fn(),
  fetchKeywordSuggestions: vi.fn(),
  fetchKeywordIdeas: vi.fn(),
  fetchDomainRankOverview: vi.fn(),
  fetchRankedKeywords: vi.fn(),
  fetchRelevantPages: vi.fn(),
  fetchKeywordOverview: vi.fn(),
  fetchSerpCompetitors: vi.fn(),
}));
vi.mock("@/server/lib/dataforseo/serp", () => ({
  fetchLiveSerp: vi.fn(),
  fetchRankCheckSerp: vi.fn(),
  postRankCheckTasks: vi.fn(),
  fetchLocalSerp: vi.fn(),
}));
vi.mock("@/server/lib/dataforseo/business", () => ({
  fetchBusinessListingsSearch: vi.fn(),
  fetchQuestionsAnswers: vi.fn(),
}));
vi.mock("@/server/lib/dataforseo/backlinks", () => ({
  fetchBacklinksSummary: vi.fn(),
  fetchBacklinksRows: vi.fn(),
  fetchReferringDomains: vi.fn(),
  fetchDomainPagesSummary: vi.fn(),
  fetchBacklinksHistory: vi.fn(),
}));
vi.mock("@/server/lib/dataforseo/lighthouse", () => ({
  fetchLighthouseResult: vi.fn(),
}));
vi.mock("@/server/lib/dataforseo/ai", () => ({
  fetchLlmMentionsSearch: vi.fn(),
  fetchLlmAggregatedMetrics: vi.fn(),
  fetchLlmTopPages: vi.fn(),
  fetchLlmCrossAggregatedMetrics: vi.fn(),
  fetchLlmResponse: vi.fn(),
}));

import {
  createDataforseoClient,
  mapDataforseoPathToCreditFeature,
} from "@/server/lib/dataforseo/client";
import { DataforseoChargedTaskError } from "@/server/lib/dataforseo/envelope";
import { getDataforseoKeyResolver } from "@/server/lib/dataforseo/credential-context";
import { fetchBacklinksSummary } from "@/server/lib/dataforseo/backlinks";

const billingCustomer = {
  organizationId: "org_123",
  userId: "user_123",
  userEmail: "alice@example.com",
};

const backlinksInput = {
  target: "example.com",
};

function setupHostedMode() {
  isHostedServerAuthModeMock.mockResolvedValue(true);
  getOrCreateMock.mockResolvedValue({ id: "org_123" });
}

function mockBalances(monthly: number, topup: number) {
  checkMock.mockImplementation(async (args: { featureId: string }) => {
    if (args.featureId === AUTUMN_SEO_DATA_BALANCE_FEATURE_ID) {
      return { allowed: true, balance: { remaining: monthly } };
    }
    if (args.featureId === AUTUMN_SEO_DATA_TOPUP_BALANCE_FEATURE_ID) {
      return { allowed: true, balance: { remaining: topup } };
    }
    return { allowed: false, balance: null };
  });
}

function mockDataforseoResult(costUsd: number) {
  vi.mocked(fetchBacklinksSummary).mockResolvedValue({
    data: { rank: 42 },
    billing: { costUsd, path: ["backlinks", "summary"] },
  });
}

describe("meterDataforseoCall with split balances", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to the global operator key with billing on: the scenario these
    // metering/split-balance assertions were written for.
    resolveCredentialsMock.mockResolvedValue({
      apiKey: "global-key",
      source: "global",
    });
    isHostedAccessOpenMock.mockResolvedValue(false);
  });

  it("skips billing in non-hosted mode", async () => {
    isHostedServerAuthModeMock.mockResolvedValue(false);
    mockDataforseoResult(0.05);

    const client = createDataforseoClient(billingCustomer);
    const result = await client.backlinks.summary(backlinksInput);

    expect(result).toEqual({ rank: 42 });
    expect(checkMock).not.toHaveBeenCalled();
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("checks both monthly and topup balances in parallel", async () => {
    setupHostedMode();
    mockBalances(5000, 3000);
    mockDataforseoResult(0.05);

    const client = createDataforseoClient(billingCustomer);
    await client.backlinks.summary(backlinksInput);

    expect(checkMock).toHaveBeenCalledTimes(2);
    expect(checkMock).toHaveBeenCalledWith({
      customerId: "org_123",
      featureId: AUTUMN_SEO_DATA_BALANCE_FEATURE_ID,
    });
    expect(checkMock).toHaveBeenCalledWith({
      customerId: "org_123",
      featureId: AUTUMN_SEO_DATA_TOPUP_BALANCE_FEATURE_ID,
    });
  });

  const RAW_COST = 0.05;
  const EXPECTED_CREDITS = Math.ceil(
    RAW_COST * SEO_DATA_COST_MARKUP * AUTUMN_SEO_DATA_CREDITS_PER_USD,
  );

  it("deducts entirely from monthly when monthly has enough", async () => {
    setupHostedMode();
    mockBalances(5000, 3000);
    mockDataforseoResult(RAW_COST);

    const client = createDataforseoClient(billingCustomer);
    await client.backlinks.summary(backlinksInput);

    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "org_123",
        featureId: AUTUMN_SEO_DATA_BALANCE_FEATURE_ID,
        value: EXPECTED_CREDITS,
      }),
    );
  });

  it("deducts entirely from topup when monthly is empty", async () => {
    setupHostedMode();
    mockBalances(0, 5000);
    mockDataforseoResult(RAW_COST);

    const client = createDataforseoClient(billingCustomer);
    await client.backlinks.summary(backlinksInput);

    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "org_123",
        featureId: AUTUMN_SEO_DATA_TOPUP_BALANCE_FEATURE_ID,
        value: EXPECTED_CREDITS,
      }),
    );
  });

  it("splits deduction across monthly and topup when monthly is partially sufficient", async () => {
    setupHostedMode();
    const monthlyAvailable = 30;
    mockBalances(monthlyAvailable, 5000);
    mockDataforseoResult(RAW_COST);

    const client = createDataforseoClient(billingCustomer);
    await client.backlinks.summary(backlinksInput);

    expect(trackMock).toHaveBeenCalledTimes(2);
    expect(trackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "org_123",
        featureId: AUTUMN_SEO_DATA_BALANCE_FEATURE_ID,
        value: monthlyAvailable,
      }),
    );
    expect(trackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "org_123",
        featureId: AUTUMN_SEO_DATA_TOPUP_BALANCE_FEATURE_ID,
        value: EXPECTED_CREDITS - monthlyAvailable,
      }),
    );
  });

  it("throws INSUFFICIENT_CREDITS when both balances are exactly zero", async () => {
    setupHostedMode();
    mockBalances(0, 0);
    mockDataforseoResult(0.05);

    const client = createDataforseoClient(billingCustomer);
    await expect(
      client.backlinks.summary(backlinksInput),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_CREDITS" });

    expect(trackMock).not.toHaveBeenCalled();
  });

  it("meters charged DataForSEO task errors before rethrowing", async () => {
    setupHostedMode();
    mockBalances(5000, 3000);
    vi.mocked(fetchBacklinksSummary).mockRejectedValue(
      new DataforseoChargedTaskError("DataForSEO task failed", {
        costUsd: RAW_COST,
        path: ["v3", "backlinks", "summary", "live"],
      }),
    );

    const client = createDataforseoClient(billingCustomer);
    await expect(client.backlinks.summary(backlinksInput)).rejects.toThrow(
      "DataForSEO task failed",
    );

    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "org_123",
        featureId: AUTUMN_SEO_DATA_BALANCE_FEATURE_ID,
        value: EXPECTED_CREDITS,
      }),
    );
  });

  it("includes balanceFeatureId in track properties", async () => {
    setupHostedMode();
    mockBalances(30, 5000);
    mockDataforseoResult(0.05);

    const client = createDataforseoClient(billingCustomer);
    await client.backlinks.summary(backlinksInput);

    const monthlyCall = trackMock.mock.calls.find(
      ([arg]) => arg.featureId === AUTUMN_SEO_DATA_BALANCE_FEATURE_ID,
    );
    const topupCall = trackMock.mock.calls.find(
      ([arg]) => arg.featureId === AUTUMN_SEO_DATA_TOPUP_BALANCE_FEATURE_ID,
    );

    expect(monthlyCall![0].properties?.balanceFeatureId).toBe(
      AUTUMN_SEO_DATA_BALANCE_FEATURE_ID,
    );
    expect(topupCall![0].properties?.balanceFeatureId).toBe(
      AUTUMN_SEO_DATA_TOPUP_BALANCE_FEATURE_ID,
    );
  });
});

describe("per-organization key threading and open-access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveCredentialsMock.mockResolvedValue({
      apiKey: "global-key",
      source: "global",
    });
    isHostedAccessOpenMock.mockResolvedValue(false);
    getOrCreateMock.mockResolvedValue({ id: "org_123" });
  });

  // Runs the mocked fetcher and returns whatever ambient key the code inside the
  // metered call (i.e. what `createAuthenticatedFetch` would read) observes.
  function captureAmbientKey() {
    const observed: { key: string | null | undefined } = { key: "unread" };
    vi.mocked(fetchBacklinksSummary).mockImplementation(async () => {
      const resolver = getDataforseoKeyResolver();
      observed.key = resolver ? await resolver() : null;
      return {
        data: { rank: 7 },
        billing: { costUsd: 0.05, path: ["backlinks", "summary"] },
      };
    });
    return observed;
  }

  it("threads the org's own key into the metered call and skips Autumn", async () => {
    isHostedServerAuthModeMock.mockResolvedValue(true);
    resolveCredentialsMock.mockResolvedValue({
      apiKey: "org-key-A",
      source: "org",
    });
    const observed = captureAmbientKey();

    const client = createDataforseoClient(billingCustomer);
    const result = await client.backlinks.summary(backlinksInput);

    expect(result).toEqual({ rank: 7 });
    // The code running inside `execute` sees the org's own decrypted key.
    expect(observed.key).toBe("org-key-A");
    // A self-paid key never touches the billing provider, even in hosted mode.
    expect(getOrCreateMock).not.toHaveBeenCalled();
    expect(checkMock).not.toHaveBeenCalled();
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("sets no ambient resolver for the global key and still meters", async () => {
    setupHostedMode();
    mockBalances(5000, 3000);
    const observed = captureAmbientKey();

    const client = createDataforseoClient(billingCustomer);
    await client.backlinks.summary(backlinksInput);

    // No resolver in scope -> core.ts falls back to the global env key.
    expect(observed.key).toBeNull();
    expect(trackMock).toHaveBeenCalled();
  });

  it("bypasses Autumn under open-access even with the global key", async () => {
    isHostedServerAuthModeMock.mockResolvedValue(true);
    isHostedAccessOpenMock.mockResolvedValue(true);
    mockDataforseoResult(0.05);

    const client = createDataforseoClient(billingCustomer);
    const result = await client.backlinks.summary(backlinksInput);

    expect(result).toEqual({ rank: 42 });
    expect(getOrCreateMock).not.toHaveBeenCalled();
    expect(checkMock).not.toHaveBeenCalled();
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("resolves credentials once per client instance across calls", async () => {
    isHostedServerAuthModeMock.mockResolvedValue(true);
    resolveCredentialsMock.mockResolvedValue({
      apiKey: "org-key-A",
      source: "org",
    });
    mockDataforseoResult(0.05);

    const client = createDataforseoClient(billingCustomer);
    await client.backlinks.summary(backlinksInput);
    await client.backlinks.summary(backlinksInput);

    expect(resolveCredentialsMock).toHaveBeenCalledTimes(1);
  });

  it("keeps two organizations' keys from leaking across concurrent calls", async () => {
    isHostedServerAuthModeMock.mockResolvedValue(true);
    resolveCredentialsMock.mockImplementation(async (orgId: string) => ({
      apiKey: orgId === "org_A" ? "key-A" : "key-B",
      source: "org" as const,
    }));

    const observed: Record<string, string | null | undefined> = {};
    vi.mocked(fetchBacklinksSummary).mockImplementation(async (input) => {
      // Interleave the two contexts so a leaked resolver would surface.
      await new Promise((resolve) =>
        setTimeout(resolve, input.target === "a.com" ? 10 : 5),
      );
      const resolver = getDataforseoKeyResolver();
      observed[input.target] = resolver ? await resolver() : null;
      return {
        data: { rank: 1 },
        billing: { costUsd: 0, path: ["backlinks", "summary"] },
      };
    });

    const clientA = createDataforseoClient({
      ...billingCustomer,
      organizationId: "org_A",
    });
    const clientB = createDataforseoClient({
      ...billingCustomer,
      organizationId: "org_B",
    });

    await Promise.all([
      clientA.backlinks.summary({ target: "a.com" }),
      clientB.backlinks.summary({ target: "b.com" }),
    ]);

    expect(observed["a.com"]).toBe("key-A");
    expect(observed["b.com"]).toBe("key-B");
  });
});

describe("mapDataforseoPathToCreditFeature", () => {
  it("maps real keyword research paths", () => {
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "dataforseo_labs",
        "google",
        "related_keywords",
        "live",
      ]),
    ).toBe("keyword_research");
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "dataforseo_labs",
        "google",
        "keyword_suggestions",
        "live",
      ]),
    ).toBe("keyword_research");
  });

  it("maps real serp paths", () => {
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "serp",
        "google",
        "organic",
        "live",
        "regular",
      ]),
    ).toBe("keyword_research");
  });

  it("maps real domain paths", () => {
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "dataforseo_labs",
        "google",
        "domain_rank_overview",
        "live",
      ]),
    ).toBe("domain_overview");
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "dataforseo_labs",
        "google",
        "ranked_keywords",
        "live",
      ]),
    ).toBe("domain_overview");
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "dataforseo_labs",
        "google",
        "relevant_pages",
        "live",
      ]),
    ).toBe("domain_overview");
  });

  it("maps real backlinks paths", () => {
    expect(
      mapDataforseoPathToCreditFeature(["v3", "backlinks", "summary", "live"]),
    ).toBe("backlinks");
    expect(mapDataforseoPathToCreditFeature(["backlinks", "summary"])).toBe(
      "backlinks",
    );
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "backlinks",
        "referring_domains",
        "live",
      ]),
    ).toBe("backlinks");
  });

  it("maps real lighthouse/on_page paths to site_audit", () => {
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "on_page",
        "lighthouse",
        "live",
        "json",
      ]),
    ).toBe("site_audit");
  });

  it("maps ai_optimization llm_mentions paths to ai_citations", () => {
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "ai_optimization",
        "llm_mentions",
        "search",
        "live",
      ]),
    ).toBe("ai_citations");
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "ai_optimization",
        "llm_mentions",
        "aggregated_metrics",
        "live",
      ]),
    ).toBe("ai_citations");
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "ai_optimization",
        "llm_mentions",
        "top_pages",
        "live",
      ]),
    ).toBe("ai_citations");
  });

  it("maps ai_optimization provider llm_responses paths to ai_prompt_responses", () => {
    for (const provider of ["chat_gpt", "claude", "gemini", "perplexity"]) {
      expect(
        mapDataforseoPathToCreditFeature([
          "v3",
          "ai_optimization",
          provider,
          "llm_responses",
          "live",
        ]),
      ).toBe("ai_prompt_responses");
    }
  });

  it("maps local and supporting paths to the intended credit features", () => {
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "business_data",
        "business_listings",
        "search",
        "live",
      ]),
    ).toBe("local_seo");
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "serp",
        "google",
        "local_finder",
        "live",
        "advanced",
      ]),
    ).toBe("local_seo");
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "serp",
        "google",
        "maps",
        "live",
        "advanced",
      ]),
    ).toBe("local_seo");
    expect(
      mapDataforseoPathToCreditFeature([
        "v3",
        "keywords_data",
        "google_ads",
        "search_volume",
        "live",
      ]),
    ).toBe("keyword_research");
  });
});
