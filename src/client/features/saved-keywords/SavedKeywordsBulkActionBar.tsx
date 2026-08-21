import { Copy, FileDown, Sheet, Tags, Trash2 } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  TableBulkActionBar,
  TableBulkActionButton,
  TableBulkExportMenu,
} from "@/client/components/table/TableBulkActionBar";

export function SavedKeywordsBulkActionBar({
  selectedCount,
  onCopy,
  onOpenTags,
  onExportCsv,
  onExportSheets,
  onDelete,
  onClear,
  exportingSelection,
}: {
  selectedCount: number;
  onCopy: () => void;
  onOpenTags: () => void;
  onExportCsv: () => void;
  onExportSheets: () => void;
  onDelete: () => void;
  onClear: () => void;
  exportingSelection: "csv" | "sheets" | null;
}) {
  const intl = useIntl();
  if (selectedCount === 0) return null;
  const exportBusy = exportingSelection != null;

  return (
    <TableBulkActionBar
      selectedCount={selectedCount}
      onClear={onClear}
      actions={
        <>
          <div className="flex items-center gap-0.5 px-1.5">
            <TableBulkActionButton
              icon={<Tags className="size-3.5" />}
              onClick={onOpenTags}
            >
              <FormattedMessage id="saved.table.bulk.tag" />
            </TableBulkActionButton>

            <TableBulkExportMenu
              busy={exportBusy}
              actions={[
                {
                  label: intl.formatMessage({
                    id: "saved.table.bulk.copyKeywords",
                  }),
                  icon: <Copy className="size-4" />,
                  onClick: onCopy,
                },
                {
                  label: intl.formatMessage({ id: "common.sheets.export" }),
                  icon: <Sheet className="size-4" />,
                  onClick: onExportSheets,
                },
                {
                  label: intl.formatMessage({
                    id: "saved.table.bulk.exportCsv",
                  }),
                  icon: <FileDown className="size-4" />,
                  onClick: onExportCsv,
                },
              ]}
            />
          </div>

          <div className="flex items-center border-l border-base-content/10 px-1.5">
            <TableBulkActionButton
              icon={<Trash2 className="size-3.5" />}
              onClick={onDelete}
              variant="danger"
            >
              <FormattedMessage id="saved.table.bulk.delete" />
            </TableBulkActionButton>
          </div>
        </>
      }
    />
  );
}
