import { describe, expect, it } from "vitest";
import { appendTabWithEviction, parseStoredState } from "./useSearchTabs";
import type { SearchTab } from "./types";

const LIMIT = 20;

function searchTab(index: number): SearchTab {
  return {
    id: `tab-${index}`,
    label: `example-${index}.com`,
    createdAt: index,
    viewedAt: null,
    input: {
      type: "backlinks",
      target: `example-${index}.com`,
      scope: "domain",
    },
  };
}

function persisted(tab: SearchTab) {
  return {
    id: tab.id,
    label: tab.label,
    createdAt: tab.createdAt,
    viewedAt: tab.viewedAt,
    input: tab.input,
  };
}

describe("appendTabWithEviction", () => {
  it("appends without evicting below the limit", () => {
    const tabs = Array.from({ length: LIMIT - 1 }, (_, index) =>
      searchTab(index),
    );

    const next = appendTabWithEviction(tabs, searchTab(LIMIT - 1));

    expect(next).toHaveLength(LIMIT);
    expect(next[0]?.id).toBe("tab-0");
    expect(next.at(-1)?.id).toBe(`tab-${LIMIT - 1}`);
  });

  it("evicts the oldest tab at capacity instead of refusing the new one", () => {
    const tabs = Array.from({ length: LIMIT }, (_, index) => searchTab(index));

    const next = appendTabWithEviction(tabs, searchTab(LIMIT));

    expect(next).toHaveLength(LIMIT);
    expect(next[0]?.id).toBe("tab-1");
    expect(next.at(-1)?.id).toBe(`tab-${LIMIT}`);
  });

  it("evicts enough to fit when the stored list is already over capacity", () => {
    const tabs = Array.from({ length: LIMIT + 5 }, (_, index) =>
      searchTab(index),
    );

    const next = appendTabWithEviction(tabs, searchTab(999));

    expect(next).toHaveLength(LIMIT);
    expect(next.at(-1)?.id).toBe("tab-999");
  });

  it("appends to an empty list", () => {
    expect(appendTabWithEviction([], searchTab(0))).toHaveLength(1);
  });
});

describe("parseStoredState", () => {
  it("keeps the newest tabs when storage holds more than the limit", () => {
    const tabs = Array.from({ length: LIMIT + 3 }, (_, index) =>
      persisted(searchTab(index)),
    );

    const state = parseStoredState({ activeTabId: null, tabs });

    // Newest-wins, matching openTab's eviction — the old head-slice dropped
    // the tabs the user had just opened.
    expect(state.tabs).toHaveLength(LIMIT);
    expect(state.tabs[0]?.id).toBe("tab-3");
    expect(state.tabs.at(-1)?.id).toBe(`tab-${LIMIT + 2}`);
  });

  it("drops an activeTabId that survived neither the limit nor validation", () => {
    const tabs = Array.from({ length: LIMIT + 1 }, (_, index) =>
      persisted(searchTab(index)),
    );

    const state = parseStoredState({ activeTabId: "tab-0", tabs });

    expect(state.tabs.some((tab) => tab.id === "tab-0")).toBe(false);
    expect(state.activeTabId).toBeNull();
  });

  it("keeps an activeTabId that is still present", () => {
    const state = parseStoredState({
      activeTabId: "tab-1",
      tabs: [persisted(searchTab(0)), persisted(searchTab(1))],
    });

    expect(state.activeTabId).toBe("tab-1");
  });

  it("returns the empty state for malformed storage", () => {
    expect(parseStoredState(null).tabs).toEqual([]);
    expect(parseStoredState({ tabs: "nope" }).tabs).toEqual([]);
  });

  it("skips tabs whose input fails validation", () => {
    const state = parseStoredState({
      activeTabId: null,
      tabs: [
        persisted(searchTab(0)),
        { id: "bad", label: "bad", createdAt: 1, viewedAt: null, input: {} },
        {
          id: "bad-loc",
          label: "bad-loc",
          createdAt: 1,
          viewedAt: null,
          // locationCode is required for domain tabs — our routes always
          // resolve it to DEFAULT_LOCATION_CODE before a tab is opened.
          input: { type: "domain", domain: "example.com", subdomains: true },
        },
      ],
    });

    expect(state.tabs.map((tab) => tab.id)).toEqual(["tab-0"]);
  });
});
