/**
 * The one place an export format's media facts live.
 *
 * Three separate places used to hardcode `.zip`: the R2 key, the stored content
 * type, and the download response's header and filename. Adding a second format
 * with them apart is how a PDF ends up served as `application/zip` — so they
 * derive from this table instead.
 *
 * Shared rather than server-only because the format selector names the same
 * formats, and a client label drifting from the artifact it asks for is the
 * same class of bug.
 */
export const AUDIT_EXPORT_FORMATS = ["zip", "pdf", "doc"] as const;

export type AuditExportFormat = (typeof AUDIT_EXPORT_FORMATS)[number];

export const AUDIT_EXPORT_MEDIA: Record<
  AuditExportFormat,
  { extension: string; contentType: string; label: string }
> = {
  zip: {
    extension: "zip",
    contentType: "application/zip",
    label: "Issue data (CSV + JSON)",
  },
  pdf: {
    extension: "pdf",
    contentType: "application/pdf",
    label: "Report (PDF)",
  },
  /**
   * HTML served as `.doc`, not real OOXML. Word and Google Docs both open it and
   * keep the tables editable, which is the point — one template for both
   * outputs. Some Word versions warn that the extension does not match the
   * contents; the trade-off is recorded in the plan and accepted deliberately.
   */
  doc: {
    extension: "doc",
    contentType: "application/msword",
    label: "Report (editable)",
  },
};

/** The filename a download offers, e.g. `audit-<id>-report.pdf`. */
export function auditExportFilename(
  auditId: string,
  format: AuditExportFormat,
): string {
  const stem = format === "zip" ? "issues" : "report";
  return `audit-${auditId}-${stem}.${AUDIT_EXPORT_MEDIA[format].extension}`;
}

/**
 * The languages a rendered report can be written in. Matches the rule
 * catalogue's locales — a report cannot be produced in a language the
 * remediation text does not exist in.
 */
export const REPORT_LOCALES = ["en", "vi"] as const;

export type ReportLocale = (typeof REPORT_LOCALES)[number];

export const REPORT_LOCALE_LABEL: Record<ReportLocale, string> = {
  en: "English",
  vi: "Tiếng Việt",
};
