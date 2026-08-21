import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import { Check, ExternalLink, X } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import { Modal } from "@/client/components/Modal";
import {
  closeExportToSheetsModal,
  openGoogleSheetsTab,
  useExportToSheetsModalState,
} from "@/client/lib/exportToSheets";

export function ExportToSheetsModal() {
  const intl = useIntl();
  const state = useExportToSheetsModalState();
  // Close any stale modal when the user navigates away mid-flow. Deps must
  // be `[pathname]` only — adding `isOpen` would close the modal the instant
  // it opens (the effect would fire on the open->true transition).
  const pathname = useLocation({ select: (l) => l.pathname });
  useEffect(() => {
    closeExportToSheetsModal();
  }, [pathname]);

  if (!state.isOpen) return null;

  const { rowCount } = state;

  const handleOpenSheet = () => {
    openGoogleSheetsTab();
    closeExportToSheetsModal();
  };

  return (
    <Modal
      maxWidth="max-w-md"
      onClose={closeExportToSheetsModal}
      labelledBy="export-to-sheets-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-success/15 text-success">
            <Check className="size-4" />
          </span>
          <h3 id="export-to-sheets-title" className="text-base font-semibold">
            <FormattedMessage id="common.sheets.copied" values={{ rowCount }} />
          </h3>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-square"
          onClick={closeExportToSheetsModal}
          aria-label={intl.formatMessage({ id: "common.action.close" })}
        >
          <X className="size-4" />
        </button>
      </div>

      <p className="text-sm text-base-content/75">
        <FormattedMessage id="common.sheets.instructions" />
      </p>

      <div className="flex justify-end">
        <button
          type="button"
          className="btn btn-primary btn-sm gap-1.5"
          onClick={handleOpenSheet}
        >
          <FormattedMessage id="common.sheets.open" />
          <ExternalLink className="size-3.5" />
        </button>
      </div>
    </Modal>
  );
}
