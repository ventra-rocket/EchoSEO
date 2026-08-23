import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BillingCustomerContext } from "@/server/billing/subscription";

const mocks = vi.hoisted(() => ({
  listSavedKeywordsByProject: vi.fn(),
  upsertKeywordMetric: vi.fn(),
  keywordOverview: vi.fn(),
  createSeoDataProvider: vi.fn(),
}));

vi.mock(
  "@/server/features/keywords/repositories/KeywordResearchRepository",
  () => ({ KeywordResearchRepository: mocks }),
);
vi.mock("@/server/lib/seo-data", () => ({
  createSeoDataProvider: mocks.createSeoDataProvider,
}));

import { refreshSavedKeywordMetrics } from "./refresh-metrics";

// US: served by DataForSEO Labs, so the Labs branch is the one under test.
const US_LOCATION = 2840;

// Forwarded wholesale to `createSeoDataProvider`, which meters against all three
// fields, so the fixture is a real context rather than a narrowed stand-in.
const billingCustomer: BillingCustomerContext = {
  organizationId: "org_1",
  userId: "user_1",
  userEmail: "owner@example.com",
};

function savedRows(count: number) {
  return {
    rows: Array.from({ length: count }, (_, i) => ({
      row: {
        keyword: `keyword ${i}`,
        locationCode: US_LOCATION,
        languageCode: "en",
      },
    })),
    totalCount: count,
    tags: [],
  };
}

describe("refreshSavedKeywordMetrics", () => {
  beforeEach(() => {
    mocks.createSeoDataProvider.mockReturnValue({
      labs: { keywordOverview: mocks.keywordOverview },
      keywords: { adsSearchVolume: vi.fn() },
    });
    mocks.keywordOverview.mockImplementation(
      (request: { keywords: string[] }) =>
        Promise.resolve(
          request.keywords.map((keyword) => ({
            keyword,
            keyword_info: { search_volume: 10, cpc: 1, competition: 0.5 },
            keyword_properties: { keyword_difficulty: 20 },
            search_intent_info: { main_intent: "informational" },
          })),
        ),
    );
  });

  it("caps concurrent D1 upserts even when a group is far larger", async () => {
    // One provider batch (700 cap) holding 250 rows. Fanning the whole batch
    // out through a single Promise.all puts 250 statements in flight at once,
    // past D1's per-invocation concurrency ceiling. Each mocked upsert suspends
    // at its first await, so every call in a chunk is counted as in-flight
    // before any of them settles — no timers, fully deterministic.
    mocks.listSavedKeywordsByProject.mockResolvedValue(savedRows(250));

    let inFlight = 0;
    let maxInFlight = 0;
    mocks.upsertKeywordMetric.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight -= 1;
    });

    const result = await refreshSavedKeywordMetrics(
      { projectId: "project_1" },
      billingCustomer,
    );

    expect(mocks.upsertKeywordMetric).toHaveBeenCalledTimes(250);
    expect(maxInFlight).toBeLessThanOrEqual(100);
    expect(result.updated).toBe(250);
  });

  it("still writes every keyword's metrics", async () => {
    mocks.listSavedKeywordsByProject.mockResolvedValue(savedRows(3));
    mocks.upsertKeywordMetric.mockResolvedValue(undefined);

    await refreshSavedKeywordMetrics(
      { projectId: "project_1" },
      billingCustomer,
    );

    expect(mocks.upsertKeywordMetric).toHaveBeenCalledTimes(3);
    expect(mocks.upsertKeywordMetric).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project_1",
        keyword: "keyword 0",
        locationCode: US_LOCATION,
        languageCode: "en",
        searchVolume: 10,
        cpc: 1,
        competition: 0.5,
        keywordDifficulty: 20,
        intent: "informational",
      }),
    );
  });
});
