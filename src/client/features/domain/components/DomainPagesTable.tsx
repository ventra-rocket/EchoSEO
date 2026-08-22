import { memo, useMemo } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { useIntl } from "react-intl";
import {
  AppDataTable,
  useAppTable,
} from "@/client/components/table/AppDataTable";
import { ExternalUrlCell } from "@/client/components/table/url";
import { SortableHeader } from "@/client/features/domain/components/SortableHeader";
import { useDomainRenderDebug } from "@/client/features/domain/domainDebug";
import { toPageSortMode } from "@/client/features/domain/utils";
import type {
  DomainSortMode,
  PageRow,
  SortOrder,
} from "@/client/features/domain/types";

type Props = {
  domain: string;
  rows: PageRow[];
  sortMode: DomainSortMode;
  currentSortOrder: SortOrder;
  onSortClick: (sort: DomainSortMode) => void;
};

const pageColumnHelper = createColumnHelper<PageRow>();

function DomainPagesTableComponent({
  domain,
  rows,
  sortMode,
  currentSortOrder,
  onSortClick,
}: Props) {
  const intl = useIntl();
  const renderStarted = performance.now();
  const columns = useMemo<ColumnDef<PageRow>[]>(
    () => [
      pageColumnHelper.display({
        id: "page",
        header: () =>
          intl.formatMessage({ id: "domainTables.pages.column.page" }),
        cell: ({ row }) => (
          <ExternalUrlCell
            value={row.original.relativePath ?? row.original.page}
            label={row.original.relativePath ?? row.original.page}
            baseDomain={domain}
            className="link link-primary inline-flex items-center gap-1"
          />
        ),
        meta: {
          cellClassName: "max-w-[420px] truncate",
        },
      }),
      pageColumnHelper.accessor("organicTraffic", {
        header: () => (
          <SortableHeader
            label={intl.formatMessage({
              id: "domainTables.pages.column.organicTraffic",
            })}
            isActive={toPageSortMode(sortMode) === "traffic"}
            order={currentSortOrder}
            onClick={() => onSortClick("traffic")}
          />
        ),
        cell: ({ getValue }) => {
          const value = getValue();
          return value == null ? "-" : intl.formatNumber(Math.round(value));
        },
      }),
      pageColumnHelper.accessor("keywords", {
        header: () => (
          <SortableHeader
            label={intl.formatMessage({
              id: "domainTables.pages.column.keywords",
            })}
            isActive={toPageSortMode(sortMode) === "keywords"}
            order={currentSortOrder}
            onClick={() => onSortClick("volume")}
          />
        ),
        cell: ({ getValue }) => {
          const value = getValue();
          return value == null ? "-" : intl.formatNumber(value);
        },
      }),
    ],
    [currentSortOrder, domain, intl, onSortClick, sortMode],
  );
  const table = useAppTable({
    data: rows.slice(0, 100),
    columns,
  });
  useDomainRenderDebug("DomainPagesTable", {
    rows: rows.length,
    durationMs: Math.round(performance.now() - renderStarted),
    sortMode,
    currentSortOrder,
  });

  return (
    <AppDataTable
      table={table}
      className="table table-zebra table-sm"
      empty={
        <div className="py-6 text-center text-base-content/60">
          {intl.formatMessage({ id: "domainTables.pages.empty" })}
        </div>
      }
    />
  );
}

export const DomainPagesTable = memo(DomainPagesTableComponent);
