/**
 * Pure builders for an audit issue export: the CSV, the JSON, and the provenance
 * manifest that travel together inside one ZIP. Kept free of any I/O so it unit
 * tests directly and the Workflow only has to zip + store what it returns.
 *
 * Every scanned cell goes through the shared CSV escaper, so a page whose URL or
 * evidence begins with a spreadsheet formula character cannot inject a formula
 * into a downstream viewer.
 */
import { buildCsv, type CsvValue } from "@/shared/csv-export";

/** The issue columns an export carries — a lean projection of an occurrence. */
export interface ExportOccurrence {
  url: string;
  ruleId: string;
  issueGroup: string;
  severity: string;
  status: string;
  ruleVersion: string;
  evidenceJson: string | null;
}

interface ExportManifest {
  auditId: string;
  startUrl: string;
  /** When the crawl these issues came from was sealed; null if unknown. */
  snapshotSealedAt: string | null;
  exportedAt: string;
  /** The issue filters applied when the export was requested. */
  filters: Record<string, string>;
  /** Distinct rule revisions that judged these issues, so the export is dated. */
  ruleVersions: string[];
  /** These issues are crawl-derived; a provider/GSC figure never enters here. */
  provenance: "crawl";
  rowCount: number;
  /** True when the audit had more issues than the export row ceiling allowed. */
  truncated: boolean;
}

const CSV_HEADERS = [
  "URL",
  "Rule",
  "Issue Group",
  "Severity",
  "Status",
  "Rule Version",
  "Evidence",
];

interface BuiltIssuesExport {
  csv: string;
  json: string;
  manifest: string;
  manifestData: ExportManifest;
}

export function buildIssuesExport(input: {
  occurrences: ExportOccurrence[];
  auditId: string;
  startUrl: string;
  snapshotSealedAt: string | null;
  exportedAt: string;
  filters: Record<string, string>;
  truncated?: boolean;
}): BuiltIssuesExport {
  const ruleVersions = [
    ...new Set(input.occurrences.map((occurrence) => occurrence.ruleVersion)),
  ].toSorted();

  const manifestData: ExportManifest = {
    auditId: input.auditId,
    startUrl: input.startUrl,
    snapshotSealedAt: input.snapshotSealedAt,
    exportedAt: input.exportedAt,
    filters: input.filters,
    ruleVersions,
    provenance: "crawl",
    rowCount: input.occurrences.length,
    truncated: input.truncated ?? false,
  };

  const csvRows: CsvValue[][] = input.occurrences.map((occurrence) => [
    occurrence.url,
    occurrence.ruleId,
    occurrence.issueGroup,
    occurrence.severity,
    occurrence.status,
    occurrence.ruleVersion,
    // The raw evidence JSON as a single quoted cell. It begins with `{`/`[`, not
    // a formula character, so the escaper leaves it intact while still guarding
    // the URL and other cells.
    occurrence.evidenceJson ?? "",
  ]);

  const json = JSON.stringify(
    {
      manifest: manifestData,
      issues: input.occurrences.map((occurrence) => ({
        url: occurrence.url,
        rule: occurrence.ruleId,
        issueGroup: occurrence.issueGroup,
        severity: occurrence.severity,
        status: occurrence.status,
        ruleVersion: occurrence.ruleVersion,
        evidence: parseEvidence(occurrence.evidenceJson),
      })),
    },
    null,
    2,
  );

  return {
    csv: buildCsv(CSV_HEADERS, csvRows),
    json,
    manifest: JSON.stringify(manifestData, null, 2),
    manifestData,
  };
}

/**
 * Evidence is stored as a JSON string. Return the parsed object for the JSON
 * export, or the raw string if it does not parse — never throw, since one bad
 * row must not fail a whole export.
 */
function parseEvidence(evidenceJson: string | null): unknown {
  if (!evidenceJson) return null;
  try {
    return JSON.parse(evidenceJson);
  } catch {
    return evidenceJson;
  }
}
