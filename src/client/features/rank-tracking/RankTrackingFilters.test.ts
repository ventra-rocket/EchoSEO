import { describe, expect, it } from "vitest";
import type { RankTrackingRow } from "@/types/schemas/rank-tracking";
import {
  applyDomainListFilters,
  applyFilters,
  countActiveDomainListFilters,
  getDomainListFilterOptions,
  matchesMetricRangeFilter,
  matchesPositionFilter,
} from "./rankTrackingFiltering";
import {
  EMPTY_DOMAIN_LIST_FILTERS,
  EMPTY_FILTERS,
  type DomainListFilters,
  type Filters,
} from "./rankTrackingFilterTypes";

type DomainSummary = {
  id: string;
  domain: string;
  devices: "both" | "desktop" | "mobile";
  locationCode: number;
};

function makeRow(
  keyword: string,
  desktopPosition: number | null,
  mobilePosition: number | null,
  metrics: Partial<
    Pick<RankTrackingRow, "searchVolume" | "keywordDifficulty" | "cpc">
  > = {},
): RankTrackingRow {
  return {
    trackingKeywordId: keyword,
    keyword,
    searchVolume: metrics.searchVolume ?? null,
    keywordDifficulty: metrics.keywordDifficulty ?? null,
    cpc: metrics.cpc ?? null,
    desktop: {
      position: desktopPosition,
      previousPosition: null,
      rankingUrl: null,
      serpFeatures: [],
    },
    mobile: {
      position: mobilePosition,
      previousPosition: null,
      rankingUrl: null,
      serpFeatures: [],
    },
  };
}

function withFilters(overrides: Partial<Filters>): Filters {
  return { ...EMPTY_FILTERS, ...overrides };
}

function makeSummary(
  id: string,
  domain: string,
  devices: DomainSummary["devices"],
  locationCode: number,
): DomainSummary {
  return { id, domain, devices, locationCode };
}

function withDomainFilters(
  overrides: Partial<DomainListFilters>,
): DomainListFilters {
  return { ...EMPTY_DOMAIN_LIST_FILTERS, ...overrides };
}

describe("matchesPositionFilter", () => {
  it("matches only unranked positions when max is zero", () => {
    expect(matchesPositionFilter(null, "", "0")).toBe(true);
    expect(matchesPositionFilter(1, "", "0")).toBe(false);
    expect(matchesPositionFilter(20, "10", "0")).toBe(false);
  });

  it("keeps regular rank ranges unchanged", () => {
    expect(matchesPositionFilter(4, "1", "10")).toBe(true);
    expect(matchesPositionFilter(11, "1", "10")).toBe(false);
    expect(matchesPositionFilter(null, "1", "10")).toBe(false);
  });
});

describe("matchesMetricRangeFilter", () => {
  it("treats a max of zero as a literal bound, not as unranked", () => {
    // The position filter overloads max=0 to mean "no ranking"; a metric has no
    // such sentinel, and zero volume is a real answer.
    expect(matchesMetricRangeFilter(0, "", "0")).toBe(true);
    expect(matchesMetricRangeFilter(1, "", "0")).toBe(false);
    expect(matchesMetricRangeFilter(null, "", "0")).toBe(false);
  });

  it("passes everything through when no bound is set", () => {
    expect(matchesMetricRangeFilter(null, "", "")).toBe(true);
    expect(matchesMetricRangeFilter(1200, "", "")).toBe(true);
  });

  it("applies one-sided and two-sided bounds inclusively", () => {
    expect(matchesMetricRangeFilter(1200, "1200", "")).toBe(true);
    expect(matchesMetricRangeFilter(1200, "", "1200")).toBe(true);
    expect(matchesMetricRangeFilter(1199, "1200", "")).toBe(false);
    expect(matchesMetricRangeFilter(1.75, "0.5", "2")).toBe(true);
    expect(matchesMetricRangeFilter(2.5, "0.5", "2")).toBe(false);
  });

  it("excludes rows with no metric once a bound is set", () => {
    // A keyword whose metrics were never fetched cannot satisfy a range.
    expect(matchesMetricRangeFilter(null, "1", "")).toBe(false);
  });
});

describe("applyFilters", () => {
  const rows = [
    makeRow("ranked both", 3, 6),
    makeRow("desktop unranked", null, 5),
    makeRow("mobile unranked", 7, null),
    makeRow("unranked both", null, null),
  ];

  it("filters desktop unranked rows with desktop max zero", () => {
    expect(
      applyFilters(rows, withFilters({ maxDesktopPos: "0" })).map(
        (row) => row.keyword,
      ),
    ).toEqual(["desktop unranked", "unranked both"]);
  });

  it("filters mobile unranked rows with mobile max zero", () => {
    expect(
      applyFilters(rows, withFilters({ maxMobilePos: "0" })).map(
        (row) => row.keyword,
      ),
    ).toEqual(["mobile unranked", "unranked both"]);
  });

  it("requires both devices to be unranked when both max values are zero", () => {
    expect(
      applyFilters(
        rows,
        withFilters({ maxDesktopPos: "0", maxMobilePos: "0" }),
      ).map((row) => row.keyword),
    ).toEqual(["unranked both"]);
  });

  const metricRows = [
    makeRow("high volume", 1, 1, {
      searchVolume: 5000,
      keywordDifficulty: 70,
      cpc: 4.5,
    }),
    makeRow("low volume", 2, 2, {
      searchVolume: 40,
      keywordDifficulty: 10,
      cpc: 0.25,
    }),
    makeRow("no metrics", 3, 3),
  ];

  it("narrows by volume, difficulty, and cpc together", () => {
    expect(
      applyFilters(
        metricRows,
        withFilters({ minVolume: "100", maxKd: "80", minCpc: "1" }),
      ).map((row) => row.keyword),
    ).toEqual(["high volume"]);
  });

  it("drops rows whose metrics were never fetched", () => {
    expect(
      applyFilters(metricRows, withFilters({ minVolume: "1" })).map(
        (row) => row.keyword,
      ),
    ).toEqual(["high volume", "low volume"]);
  });

  it("leaves every row when no metric bound is set", () => {
    expect(applyFilters(metricRows, EMPTY_FILTERS)).toHaveLength(3);
  });
});

describe("applyDomainListFilters", () => {
  const summaries = [
    makeSummary("alpha-us-mobile", "alpha.example.com", "mobile", 2840),
    makeSummary("alpha-fr-desktop", "alpha.example.com", "desktop", 2250),
    makeSummary("alpha-fr-mobile", "alpha.example.com", "mobile", 2250),
    makeSummary("bravo-fr-both", "bravo.example.com", "both", 2250),
    makeSummary("charlie-uk-desktop", "charlie.example.com", "desktop", 2826),
  ];

  it("narrows by text query and restores all when cleared", () => {
    expect(
      applyDomainListFilters(
        summaries,
        withDomainFilters({ query: "ALPHA" }),
      ).map((summary) => summary.id),
    ).toEqual(["alpha-us-mobile", "alpha-fr-desktop", "alpha-fr-mobile"]);

    expect(
      applyDomainListFilters(summaries, EMPTY_DOMAIN_LIST_FILTERS).map(
        (summary) => summary.id,
      ),
    ).toEqual(summaries.map((summary) => summary.id));
  });

  it("filters by device", () => {
    expect(
      applyDomainListFilters(
        summaries,
        withDomainFilters({ device: "mobile" }),
      ).map((summary) => summary.id),
    ).toEqual(["alpha-us-mobile", "alpha-fr-mobile"]);
  });

  it("filters by country", () => {
    expect(
      applyDomainListFilters(
        summaries,
        withDomainFilters({ locationCode: "2250" }),
      ).map((summary) => summary.id),
    ).toEqual(["alpha-fr-desktop", "alpha-fr-mobile", "bravo-fr-both"]);
  });

  it("combines domain, device, and country filters with AND semantics", () => {
    expect(
      applyDomainListFilters(
        summaries,
        withDomainFilters({
          query: "alpha",
          device: "mobile",
          locationCode: "2250",
        }),
      ).map((summary) => summary.id),
    ).toEqual(["alpha-fr-mobile"]);
  });

  it("returns an empty list when filters match nothing", () => {
    expect(
      applyDomainListFilters(
        summaries,
        withDomainFilters({ query: "missing", device: "mobile" }),
      ),
    ).toEqual([]);
  });
});

describe("getDomainListFilterOptions", () => {
  it("derives distinct device and country options from available summaries", () => {
    const options = getDomainListFilterOptions([
      makeSummary("a", "a.com", "mobile", 2250),
      makeSummary("b", "b.com", "desktop", 2250),
      makeSummary("c", "c.com", "mobile", 2826),
    ]);

    expect(options.devices).toEqual([
      { value: "desktop", label: "Desktop" },
      { value: "mobile", label: "Mobile" },
    ]);
    expect(options.locations).toEqual([
      { value: "2250", label: "FR" },
      { value: "2826", label: "UK" },
    ]);
  });
});

describe("countActiveDomainListFilters", () => {
  it("counts non-empty domain list filters", () => {
    expect(countActiveDomainListFilters(EMPTY_DOMAIN_LIST_FILTERS)).toBe(0);
    expect(
      countActiveDomainListFilters(
        withDomainFilters({
          query: "alpha",
          device: "desktop",
          locationCode: "2840",
        }),
      ),
    ).toBe(3);
  });
});
