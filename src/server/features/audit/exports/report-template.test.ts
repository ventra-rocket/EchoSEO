import { describe, expect, it } from "vitest";
import { buildReportHtml } from "./report-template";
import type { ExportOccurrence } from "./audit-export-build";

function occurrence(
  overrides: Partial<ExportOccurrence> = {},
): ExportOccurrence {
  return {
    url: "https://example.com/",
    // A real materializable rule id, so the catalogue lookup is exercised
    // rather than the unknown-rule fallback.
    ruleId: "audit-unreachable-url",
    issueGroup: "server",
    severity: "critical",
    status: "fail",
    ruleVersion: "1",
    evidenceJson: null,
    ...overrides,
  };
}

const base = {
  auditId: "audit-1",
  startUrl: "https://example.com/",
  snapshotSealedAt: "2026-08-19T10:00:00.000Z",
  exportedAt: "2026-08-20T10:00:00.000Z",
  truncated: false,
  locale: "en" as const,
  filters: {} as Record<string, string>,
};

describe("buildReportHtml", () => {
  it("carries the remediation text and the Google citation for a finding", () => {
    // The report's whole claim to being a report rather than a row dump: each
    // finding says what is wrong, how to fix it, and who says so.
    const html = buildReportHtml({ ...base, occurrences: [occurrence()] });

    expect(html).toContain("URL responds to a crawl request");
    expect(html).toContain("How to fix");
    expect(html).toContain("developers.google.com");
    expect(html).toContain("https://example.com/");
  });

  it("groups one rule across many URLs into a single finding", () => {
    // 5,000 rows is what the ZIP is for. A finding is per rule, and it states
    // its own breadth.
    const html = buildReportHtml({
      ...base,
      occurrences: [
        occurrence({ url: "https://example.com/a" }),
        occurrence({ url: "https://example.com/b" }),
        occurrence({ url: "https://example.com/c" }),
      ],
    });

    expect(html.match(/URL responds to a crawl request/g)).toHaveLength(2);
    expect(html).toContain("3 affected URLs");
  });

  it("lists a bounded sample and says how many it left out", () => {
    const html = buildReportHtml({
      ...base,
      occurrences: Array.from({ length: 12 }, (_, i) =>
        occurrence({ url: `https://example.com/p${i}` }),
      ),
    });

    expect(html).toContain("https://example.com/p7");
    expect(html).not.toContain("https://example.com/p8");
    expect(html).toContain("4 more");
  });

  it("orders findings worst first", () => {
    const html = buildReportHtml({
      ...base,
      occurrences: [
        occurrence({ ruleId: "structure-word-count", severity: "low" }),
        occurrence({ ruleId: "audit-unreachable-url", severity: "critical" }),
      ],
    });

    expect(html.indexOf("audit-unreachable-url")).toBeLessThan(
      html.indexOf("structure-word-count"),
    );
  });

  it("writes a Vietnamese report with its diacritics intact", () => {
    // The acceptance criterion for #51 is that Vietnamese survives into the
    // file. This pins the HTML the renderer is handed; the PDF bytes are
    // verified separately, on the file.
    const html = buildReportHtml({
      ...base,
      locale: "vi",
      occurrences: [occurrence()],
    });

    expect(html).toContain('<html lang="vi">');
    expect(html).toContain('<meta charset="utf-8" />');
    expect(html).toContain("Kiểm định SEO kỹ thuật");
    expect(html).toContain("Tóm tắt điều hành");
    expect(html).toContain("Phát hiện kỹ thuật");
  });

  it("prints Vietnamese guidance without an English-fallback notice", () => {
    // Every rule catalogue is translated now, so a Vietnamese report has
    // nothing to disclaim. This used to assert the opposite: the cross-page
    // rules had no overrides and the document admitted it. Keeping the old
    // assertion would have pinned the defect in place.
    const html = buildReportHtml({
      ...base,
      locale: "vi",
      occurrences: [occurrence()],
    });

    expect(html).toContain("URL phản hồi khi được crawl");
    expect(html).not.toContain("chưa có bản dịch tiếng Việt");
  });

  // The English-fallback notice itself is deliberately left untested. It fires
  // only for a rule that exists in a catalogue but has no `locales.vi`, and the
  // localization gate in seo-rules/__tests__ now fails the build for exactly
  // that state — so the only way to reach this branch is the window between a
  // developer adding a rule and adding its translation. Fabricating a catalogue
  // entry here to exercise it would test the fixture, not the report.

  it("states no counts it did not measure when there are no issues", () => {
    const html = buildReportHtml({ ...base, occurrences: [] });

    expect(html).toContain("no issues");
    expect(html).not.toContain("affected URL");
  });

  it("names the absent chapters instead of estimating them", () => {
    // Performance, competitors and Search Console data are not collected by
    // this job. Inventing them is the failure mode this guards.
    const html = buildReportHtml({ ...base, occurrences: [occurrence()] });

    expect(html).toContain("What this report does not cover");
    expect(html).toContain("Core Web Vitals");
  });

  it("escapes a hostile URL rather than letting it close a tag", () => {
    const html = buildReportHtml({
      ...base,
      occurrences: [
        occurrence({ url: "https://example.com/<script>alert(1)</script>" }),
      ],
    });

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("prints an honest blank for a crawl with no sealed date", () => {
    const html = buildReportHtml({
      ...base,
      snapshotSealedAt: null,
      occurrences: [occurrence()],
    });

    expect(html).toContain("not recorded");
    expect(html).not.toContain("Invalid Date");
  });

  it("says the counts are partial when the export was truncated", () => {
    const html = buildReportHtml({
      ...base,
      truncated: true,
      occurrences: [occurrence()],
    });

    expect(html).toContain("not of the whole site");
  });

  it("counts distinct URLs in the summary, not issue occurrences", () => {
    // An occurrence is unique per (audit, rule, url), so one page failing three
    // rules must not read as three affected URLs — the roll-up would exceed the
    // pages crawled while sitting under a header that says "Affected URLs".
    const html = buildReportHtml({
      ...base,
      occurrences: [
        occurrence({ url: "https://example.com/a", ruleId: "meta-title" }),
        occurrence({
          url: "https://example.com/a",
          ruleId: "meta-description",
        }),
        occurrence({ url: "https://example.com/a", ruleId: "structure-h1" }),
      ],
    });

    const summary = html.slice(0, html.indexOf("Technical findings"));
    expect(summary).toContain(">1<");
    expect(summary).not.toContain(">3<");
  });

  it("says the report covers a filtered view when filters were applied", () => {
    // The artifact travels to a client on its own, where "Technical SEO audit"
    // over a critical-only subset reads as a whole-site verdict.
    const html = buildReportHtml({
      ...base,
      filters: { severity: "critical" },
      occurrences: [occurrence()],
    });

    expect(html).toContain("filtered view");
    expect(html).toContain("severity = critical");
  });

  it("claims nothing about filters when the export covers everything", () => {
    const html = buildReportHtml({ ...base, occurrences: [occurrence()] });

    expect(html).not.toContain("filtered view");
  });

  it("translates the citation's own words but never Google's quote", () => {
    const html = buildReportHtml({
      ...base,
      locale: "vi",
      occurrences: [occurrence()],
    });

    expect(html).toContain("đã đối chiếu");
    // The quote is the cited data and stays verbatim.
    expect(html).toContain("already indexed URLs that are unreachable");
  });
});
