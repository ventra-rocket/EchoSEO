import { ChevronDown, Copy, Download, Sheet } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import type { ExportPayload, LighthouseIssue } from "./types";

// Split out of LighthouseIssuesParts.tsx to stay under the 400-line
// max-lines ceiling: this menu alone is the largest chunk of that file's
// markup, and it is exactly one component with one job (the export dropdown
// wired to LighthouseIssuesToolbar).
export function ExportMenu({
  allIssues,
  selectedCategoryLabel,
  exportCurrentCategory,
  isBusy,
  onCopy,
  onExport,
  onExportCsv,
  onExportSheets,
  visibleIssues,
}: {
  allIssues: LighthouseIssue[];
  /** Already-localized label for the selected category tab (e.g.
   * "Performance" / "Hiệu suất"), shared with the tab itself — see
   * `categoryLabel` in utils.tsx. */
  selectedCategoryLabel: string;
  exportCurrentCategory: ExportPayload;
  isBusy: boolean;
  onCopy: (data: ExportPayload, toastMessage: string) => void;
  onExport: (data: ExportPayload) => void;
  onExportCsv: (issues: LighthouseIssue[], variant: "all" | "current") => void;
  onExportSheets: (
    issues: LighthouseIssue[],
    variant: "all" | "current",
  ) => void;
  visibleIssues: LighthouseIssue[];
}) {
  const intl = useIntl();
  const categoryValues = { category: selectedCategoryLabel };

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-sm gap-1">
        <Download className="size-4" />
        <FormattedMessage id="lighthouseIssues.export.menuButton" />
        <ChevronDown className="size-3 opacity-60" />
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content z-10 menu p-2 shadow-lg bg-base-100 border border-base-300 rounded-box w-72"
      >
        <li className="menu-title">
          <span>
            <FormattedMessage id="lighthouseIssues.export.sheetsSectionTitle" />
          </span>
        </li>
        <li>
          <button
            disabled={!visibleIssues.length}
            onClick={() => onExportSheets(visibleIssues, "current")}
          >
            <Sheet className="size-4" />
            <FormattedMessage
              id="lighthouseIssues.export.sheetsCurrentCategory"
              values={categoryValues}
            />
          </button>
        </li>
        <li>
          <button
            disabled={!allIssues.length}
            onClick={() => onExportSheets(allIssues, "all")}
          >
            <Sheet className="size-4" />
            <FormattedMessage id="lighthouseIssues.export.sheetsAllActionable" />
          </button>
        </li>
        <li className="menu-title">
          <span>
            <FormattedMessage id="lighthouseIssues.export.copySectionTitle" />
          </span>
        </li>
        <li>
          <button
            disabled={isBusy}
            onClick={() =>
              onCopy(
                exportCurrentCategory,
                intl.formatMessage(
                  {
                    id: "lighthouseIssues.export.copiedCurrentCategoryToast",
                  },
                  categoryValues,
                ),
              )
            }
          >
            <Copy className="size-4" />
            <FormattedMessage
              id="lighthouseIssues.export.copyCurrentCategory"
              values={categoryValues}
            />
          </button>
        </li>
        <li>
          <button
            disabled={isBusy}
            onClick={() =>
              onCopy(
                { mode: "issues" },
                intl.formatMessage({
                  id: "lighthouseIssues.export.copiedAllActionableToast",
                }),
              )
            }
          >
            <Copy className="size-4" />
            <FormattedMessage id="lighthouseIssues.export.copyAllActionable" />
          </button>
        </li>
        <li>
          <button
            disabled={isBusy}
            onClick={() =>
              onCopy(
                { mode: "full" },
                intl.formatMessage({
                  id: "lighthouseIssues.export.copiedSavedPayloadToast",
                }),
              )
            }
          >
            <Copy className="size-4" />
            <FormattedMessage id="lighthouseIssues.export.copySavedPayload" />
          </button>
        </li>
        <li className="menu-title">
          <span>
            <FormattedMessage id="lighthouseIssues.export.jsonSectionTitle" />
          </span>
        </li>
        <li>
          <button
            disabled={isBusy}
            onClick={() => onExport(exportCurrentCategory)}
          >
            <FormattedMessage
              id="lighthouseIssues.export.downloadCurrentCategory"
              values={categoryValues}
            />
          </button>
        </li>
        <li>
          <button
            disabled={isBusy}
            onClick={() => onExport({ mode: "issues" })}
          >
            <FormattedMessage id="lighthouseIssues.export.downloadAllActionable" />
          </button>
        </li>
        <li>
          <button disabled={isBusy} onClick={() => onExport({ mode: "full" })}>
            <FormattedMessage id="lighthouseIssues.export.downloadSavedPayload" />
          </button>
        </li>
        <li className="menu-title">
          <span>
            <FormattedMessage id="lighthouseIssues.export.csvSectionTitle" />
          </span>
        </li>
        <li>
          <button
            disabled={!visibleIssues.length}
            onClick={() => onExportCsv(visibleIssues, "current")}
          >
            <FormattedMessage
              id="lighthouseIssues.export.downloadCurrentCategory"
              values={categoryValues}
            />
          </button>
        </li>
        <li>
          <button
            disabled={!allIssues.length}
            onClick={() => onExportCsv(allIssues, "all")}
          >
            <FormattedMessage id="lighthouseIssues.export.downloadAllActionable" />
          </button>
        </li>
      </ul>
    </div>
  );
}
