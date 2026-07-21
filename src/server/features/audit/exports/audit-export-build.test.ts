import { describe, expect, it } from "vitest";
import { buildIssuesExport, type ExportOccurrence } from "./audit-export-build";

function occurrence(
  overrides: Partial<ExportOccurrence> = {},
): ExportOccurrence {
  return {
    url: "https://example.com/a",
    ruleId: "meta-title",
    issueGroup: "content",
    severity: "high",
    status: "fail",
    ruleVersion: "2026-01-01",
    evidenceJson: null,
    ...overrides,
  };
}

const BASE = {
  auditId: "audit1",
  startUrl: "https://example.com/",
  snapshotSealedAt: "2026-07-01T00:00:00.000Z",
  exportedAt: "2026-07-21T00:00:00.000Z",
  filters: { severity: "high" },
};

describe("buildIssuesExport", () => {
  it("neutralizes a formula-injection cell in the CSV", () => {
    const built = buildIssuesExport({
      ...BASE,
      occurrences: [occurrence({ url: "=HYPERLINK(evil)" })],
    });
    const dataLine = built.csv.split("\n")[1];
    // The dangerous leading '=' is prefixed with a single quote.
    expect(dataLine).toContain("'=HYPERLINK(evil)");
    expect(dataLine).not.toMatch(/^"?=HYPERLINK/);
  });

  it("records rowCount, distinct rule versions and the filters in the manifest", () => {
    const built = buildIssuesExport({
      ...BASE,
      occurrences: [
        occurrence({ ruleVersion: "2026-01-01" }),
        occurrence({ url: "https://example.com/b", ruleVersion: "2026-02-01" }),
        occurrence({ url: "https://example.com/c", ruleVersion: "2026-01-01" }),
      ],
    });

    expect(built.manifestData).toMatchObject({
      auditId: "audit1",
      snapshotSealedAt: "2026-07-01T00:00:00.000Z",
      filters: { severity: "high" },
      ruleVersions: ["2026-01-01", "2026-02-01"],
      provenance: "crawl",
      rowCount: 3,
      truncated: false,
    });
  });

  it("marks the manifest truncated when told the export hit its ceiling", () => {
    const built = buildIssuesExport({
      ...BASE,
      occurrences: [occurrence()],
      truncated: true,
    });
    expect(built.manifestData.truncated).toBe(true);
  });

  it("parses evidence JSON into the JSON export and embeds the manifest", () => {
    const built = buildIssuesExport({
      ...BASE,
      occurrences: [
        occurrence({ evidenceJson: JSON.stringify({ found: "no title" }) }),
      ],
    });
    expect(JSON.parse(built.json)).toMatchObject({
      manifest: { rowCount: 1 },
      issues: [{ evidence: { found: "no title" } }],
    });
  });
});
