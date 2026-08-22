import { useState } from "react";
import {
  ChevronDown,
  Download,
  Gauge,
  MoreHorizontal,
  Sheet,
} from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import type { CsvValue } from "@/client/lib/csv";
import { exportTableToSheets } from "@/client/lib/exportToSheets";
import type { BacklinksSearchState } from "./backlinksPageTypes";
import { exportBacklinksTabCsv } from "./export";

export function BacklinksExportMenu({
  activeTab,
  exportTarget,
  headers,
  rows,
}: {
  activeTab: BacklinksSearchState["tab"];
  exportTarget: string;
  headers: string[];
  rows: CsvValue[][];
}) {
  const intl = useIntl();
  const [isExportingSheets, setIsExportingSheets] = useState(false);
  const canExport = rows.length > 0 && !isExportingSheets;

  const handleExportToSheets = async () => {
    if (!canExport) return;
    setIsExportingSheets(true);
    try {
      await exportTableToSheets({
        headers,
        rows,
        feature: `backlinks_${activeTab}`,
      });
    } finally {
      setIsExportingSheets(false);
    }
  };

  return (
    <div className="dropdown dropdown-end">
      <div
        tabIndex={0}
        role="button"
        className={`btn btn-sm btn-ghost gap-1 ${rows.length === 0 ? "btn-disabled" : ""}`}
        aria-label={intl.formatMessage({
          id: "backlinksTables.export.ariaLabel",
        })}
      >
        <Download className="size-4" />
        <FormattedMessage id="common.table.export" />
        <ChevronDown className="size-3 opacity-60" />
      </div>
      <ul
        tabIndex={0}
        role="menu"
        className="dropdown-content z-10 menu p-2 shadow-lg bg-base-100 border border-base-300 rounded-box w-56"
      >
        <li>
          <button
            type="button"
            onClick={() => void handleExportToSheets()}
            disabled={!canExport}
          >
            {isExportingSheets ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <Sheet className="size-4" />
            )}
            <FormattedMessage id="common.sheets.export" />
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() =>
              exportBacklinksTabCsv({
                tab: activeTab,
                target: exportTarget,
                headers,
                rows,
              })
            }
            disabled={rows.length === 0}
          >
            <Download className="size-4" />
            <FormattedMessage id="saved.table.bulk.exportCsv" />
          </button>
        </li>
      </ul>
    </div>
  );
}

export function BacklinksActionsMenu({
  isLoadingRatings,
  loadRatings,
  ratableDomains,
}: {
  isLoadingRatings: boolean;
  loadRatings: (domains: string[]) => void | Promise<void>;
  ratableDomains: string[];
}) {
  const intl = useIntl();
  const actionsLabel = intl.formatMessage({
    id: "backlinksTables.actions.ariaLabel",
  });
  return (
    <div className="dropdown dropdown-end">
      <div
        tabIndex={0}
        role="button"
        className="btn btn-sm btn-ghost btn-square"
        aria-label={actionsLabel}
        title={actionsLabel}
      >
        <MoreHorizontal className="size-4" />
      </div>
      <ul
        tabIndex={0}
        role="menu"
        className="dropdown-content z-10 menu p-2 shadow-lg bg-base-100 border border-base-300 rounded-box w-52"
      >
        <li>
          <button
            type="button"
            onClick={() => void loadRatings(ratableDomains)}
            disabled={isLoadingRatings}
            title={intl.formatMessage({
              id: "backlinksTables.actions.ahrefsDrTitle",
            })}
          >
            {isLoadingRatings ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <Gauge className="size-4" />
            )}
            <FormattedMessage id="backlinksTables.metric.ahrefsDr" />
          </button>
        </li>
      </ul>
    </div>
  );
}
