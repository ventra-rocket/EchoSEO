/**
 * The regression this phase exists to prevent: `discover-urls` used to return the
 * discovered URL list, and a 41,505-URL sitemap serialised past the 1 MiB step
 * output cap. The step failed six times, `mark-failed` ran, and the audit reported
 * zero pages crawled while the UI blamed the site's firewall.
 *
 * So the assertion is about SIZE, not just shape: whatever the site's sitemap
 * holds, what crosses the step boundary must stay a handful of bytes.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  discoverUrlsMock,
  putDiscoveredUrlsMock,
  setPhaseMock,
  updateProgressMock,
} = vi.hoisted(() => ({
  discoverUrlsMock: vi.fn(),
  putDiscoveredUrlsMock: vi.fn(),
  setPhaseMock: vi.fn(),
  updateProgressMock: vi.fn(),
}));

vi.mock("@/server/lib/audit/discovery", () => ({
  discoverUrls: discoverUrlsMock,
}));
vi.mock("@/server/lib/audit/discovered-urls-store", () => ({
  putDiscoveredUrls: putDiscoveredUrlsMock,
}));
vi.mock("@/server/lib/audit/progress-kv", () => ({
  AuditProgressKV: { setPhase: setPhaseMock },
}));
vi.mock("@/server/features/audit/repositories/AuditRepository", () => ({
  AuditRepository: { updateAuditProgress: updateProgressMock },
}));

// Dynamic import: the mocks above must be installed before the module binds them.
const { runDiscoveryPhase } = await import("./siteAuditWorkflowDiscovery");

/** Records what each step returned, which is the thing under test. */
function recordingStep() {
  const outputs: unknown[] = [];
  return {
    outputs,
    async do<T>(_name: string, callback: () => Promise<T> | T): Promise<T> {
      const output = await callback();
      outputs.push(output);
      return output;
    },
  };
}

function sitemapOf(count: number) {
  return {
    urls: Array.from(
      { length: count },
      (_, i) => `https://kello.example.com/watches/brand/model-${i}`,
    ),
    robots: { isAllowed: () => true, sitemapUrls: [], crawlDelaySeconds: null },
    stats: { docsFetched: 2, docsFailed: 0, docsTimedOut: 0 },
  };
}

describe("runDiscoveryPhase", () => {
  beforeEach(() => {
    discoverUrlsMock.mockReset();
    putDiscoveredUrlsMock.mockReset();
    putDiscoveredUrlsMock.mockResolvedValue({ key: "k", count: 0 });
    setPhaseMock.mockReset();
    setPhaseMock.mockResolvedValue(undefined);
    updateProgressMock.mockReset();
    updateProgressMock.mockResolvedValue(undefined);
  });

  it("keeps the step output tiny even for a sitemap that used to break it", async () => {
    discoverUrlsMock.mockResolvedValue(sitemapOf(41_505));
    const step = recordingStep();

    const result = await runDiscoveryPhase(step, {
      auditId: "a1",
      workflowInstanceId: "w1",
      origin: "https://kello.example.com",
      maxPages: 5_000,
    });

    expect(result).toEqual({ discoveredCount: 41_505 });
    // 1 MiB is the cap that killed the audit; this stays four orders under it.
    expect(JSON.stringify(step.outputs[0]).length).toBeLessThan(200);
  });

  it("hands the whole set to storage, not the truncated crawl seed", async () => {
    // Truncating here would flag every page past the cut as "missing from
    // sitemap", so the crawl budget must not shrink the evidence.
    discoverUrlsMock.mockResolvedValue(sitemapOf(12_000));

    await runDiscoveryPhase(recordingStep(), {
      auditId: "a1",
      workflowInstanceId: "w1",
      origin: "https://kello.example.com",
      maxPages: 500,
    });

    expect(putDiscoveredUrlsMock).toHaveBeenCalledTimes(1);
    expect(putDiscoveredUrlsMock.mock.calls[0]?.[1]).toHaveLength(12_000);
  });

  it("replaces the requested ceiling with the measured total", async () => {
    discoverUrlsMock.mockResolvedValue(sitemapOf(11));

    await runDiscoveryPhase(recordingStep(), {
      auditId: "a1",
      workflowInstanceId: "w1",
      origin: "https://small.example.com",
      maxPages: 5_000,
    });

    // 11 sitemap URLs + the start URL, not the 5,000 that was requested.
    expect(updateProgressMock).toHaveBeenCalledWith("a1", "w1", {
      pagesTotal: 12,
      currentPhase: "crawling",
    });
  });

  it("announces discovery before fetching, then reports what it read", async () => {
    discoverUrlsMock.mockResolvedValue(sitemapOf(41_505));

    await runDiscoveryPhase(recordingStep(), {
      auditId: "a1",
      workflowInstanceId: "w1",
      origin: "https://kello.example.com",
      maxPages: 5_000,
    });

    // The first call is what fills the silence while sitemaps are being fetched.
    expect(setPhaseMock.mock.calls[0]?.[1]).toEqual({ stage: "discovering" });
    expect(setPhaseMock.mock.calls[1]?.[1]).toEqual({
      stage: "discovering",
      sitemapDocsFetched: 2,
      sitemapDocsFailed: 0,
      discoveredUrls: 41_505,
    });
  });
});
