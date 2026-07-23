import { describe, expect, it } from "vitest";
import {
  computeVerificationOutcome,
  type BaselineOccurrence,
} from "./verification-outcome";

function onPage(ruleId: string, url: string): BaselineOccurrence {
  return { ruleId, url, issueGroup: "content", severity: "warn" };
}

function cwv(ruleId: string, url: string): BaselineOccurrence {
  return { ruleId, url, issueGroup: "performance", severity: "warn" };
}

function key(ruleId: string, url: string): string {
  return `${ruleId}\n${url}`;
}

describe("computeVerificationOutcome", () => {
  it("counts an issue still found in the re-crawl as still present", () => {
    const out = computeVerificationOutcome({
      baselineOccurrences: [onPage("meta-title", "https://x.test/a")],
      currentKeys: new Set([key("meta-title", "https://x.test/a")]),
      observedUrls: new Set(["https://x.test/a"]),
      measuredUrls: new Set(),
    });
    expect(out.counts.stillPresent).toBe(1);
    expect(out.counts.resolved).toBe(0);
    expect(out.counts.inconclusive).toBe(0);
  });

  it("counts a gone on-page issue as resolved when its URL was observed", () => {
    const out = computeVerificationOutcome({
      baselineOccurrences: [onPage("meta-title", "https://x.test/a")],
      currentKeys: new Set(),
      observedUrls: new Set(["https://x.test/a"]),
      measuredUrls: new Set(),
    });
    expect(out.counts.resolved).toBe(1);
    expect(out.counts.inconclusive).toBe(0);
  });

  // The load-bearing case: without the re-evaluation gate this is a false
  // "resolved". A status-0 (failed) re-crawl fetch is excluded from observedUrls
  // by the caller, so a URL that was not truly re-evaluated lands here.
  it("counts a gone on-page issue as inconclusive when its URL was NOT observed", () => {
    const out = computeVerificationOutcome({
      baselineOccurrences: [onPage("meta-title", "https://x.test/a")],
      currentKeys: new Set(),
      observedUrls: new Set(["https://x.test/other"]),
      measuredUrls: new Set(),
    });
    expect(out.counts.inconclusive).toBe(1);
    expect(out.counts.resolved).toBe(0);
    expect(out.inconclusive[0]?.url).toBe("https://x.test/a");
  });

  it("resolves a gone CWV issue only when its URL was actually re-measured", () => {
    const out = computeVerificationOutcome({
      baselineOccurrences: [cwv("cwv-lcp", "https://x.test/a")],
      currentKeys: new Set(),
      observedUrls: new Set(["https://x.test/a"]),
      measuredUrls: new Set(["https://x.test/a"]),
    });
    expect(out.counts.resolved).toBe(1);
    expect(out.counts.inconclusive).toBe(0);
  });

  // H2: a page fetched but not re-measured (sampling skipped it or PSI failed)
  // must not read as a resolved Core Web Vitals fix.
  it("counts a gone CWV issue as inconclusive when its URL was fetched but not re-measured", () => {
    const out = computeVerificationOutcome({
      baselineOccurrences: [cwv("cwv-lcp", "https://x.test/a")],
      currentKeys: new Set(),
      observedUrls: new Set(["https://x.test/a"]),
      measuredUrls: new Set(),
    });
    expect(out.counts.inconclusive).toBe(1);
    expect(out.counts.resolved).toBe(0);
  });

  it("counts a new re-crawl issue not in the baseline as a regression", () => {
    const out = computeVerificationOutcome({
      baselineOccurrences: [onPage("meta-title", "https://x.test/a")],
      currentKeys: new Set([
        key("meta-title", "https://x.test/a"),
        key("meta-description", "https://x.test/b"),
      ]),
      observedUrls: new Set(["https://x.test/a", "https://x.test/b"]),
      measuredUrls: new Set(),
    });
    expect(out.counts.stillPresent).toBe(1);
    expect(out.counts.regressions).toBe(1);
  });

  it("partitions every baseline issue into exactly one bucket", () => {
    const out = computeVerificationOutcome({
      baselineOccurrences: [
        onPage("meta-title", "https://x.test/a"), // still present
        onPage("meta-description", "https://x.test/b"), // resolved
        onPage("structure-h1", "https://x.test/c"), // inconclusive
      ],
      currentKeys: new Set([key("meta-title", "https://x.test/a")]),
      observedUrls: new Set(["https://x.test/a", "https://x.test/b"]),
      measuredUrls: new Set(),
    });
    const { resolved, stillPresent, inconclusive } = out.counts;
    expect(resolved).toBe(1);
    expect(stillPresent).toBe(1);
    expect(inconclusive).toBe(1);
    expect(resolved + stillPresent + inconclusive).toBe(3);
  });

  it("caps the inconclusive sample list while counts stay complete", () => {
    const baselineOccurrences: BaselineOccurrence[] = [];
    // 250 on-page issues whose URLs were NOT observed → all inconclusive.
    for (let i = 0; i < 250; i += 1) {
      baselineOccurrences.push(onPage("meta-title", `https://x.test/p${i}`));
    }
    const out = computeVerificationOutcome({
      baselineOccurrences,
      currentKeys: new Set(),
      observedUrls: new Set(),
      measuredUrls: new Set(),
    });
    expect(out.counts.inconclusive).toBe(250);
    expect(out.inconclusive).toHaveLength(200);
    expect(out.truncated).toBe(true);
  });
});
