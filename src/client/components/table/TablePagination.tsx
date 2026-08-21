import { ChevronLeft, ChevronRight } from "lucide-react";
import { type IntlShape, useIntl } from "react-intl";

type Props = {
  page: number;
  pageSize: number;
  pageSizes: readonly number[];
  totalCount: number | null;
  hasNextPage: boolean;
  isLoading: boolean;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (nextPageSize: number) => void;
};

function formatRange(
  intl: IntlShape,
  page: number,
  pageSize: number,
  totalCount: number | null,
) {
  const start = (page - 1) * pageSize + 1;
  if (totalCount == null) {
    return `${intl.formatNumber(start)}–${intl.formatNumber(
      start + pageSize - 1,
    )}`;
  }
  if (totalCount === 0) return intl.formatNumber(0);
  const end = Math.min(totalCount, start + pageSize - 1);
  return intl.formatMessage(
    { id: "common.table.rangeWithTotal" },
    {
      start,
      end,
      total: totalCount,
    },
  );
}

export function TablePagination({
  page,
  pageSize,
  pageSizes,
  totalCount,
  hasNextPage,
  isLoading,
  onPageChange,
  onPageSizeChange,
}: Props) {
  const intl = useIntl();
  const totalPages =
    totalCount != null ? Math.max(1, Math.ceil(totalCount / pageSize)) : null;
  const canGoPrev = page > 1;
  const canGoNext = totalPages != null ? page < totalPages : hasNextPage;

  return (
    <div className="flex flex-col gap-3 border-t border-base-300 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-base-content/70 tabular-nums">
        <span>{formatRange(intl, page, pageSize, totalCount)}</span>
        {isLoading ? (
          <span className="loading loading-spinner loading-xs" />
        ) : null}
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-base-content/70">
          <span className="whitespace-nowrap">
            {intl.formatMessage({ id: "common.table.rowsPerPage" })}
          </span>
          <select
            className="select select-bordered select-sm w-20"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {intl.formatNumber(size)}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-sm tabular-nums text-base-content/70">
            {totalPages == null
              ? intl.formatMessage({ id: "common.table.page" }, { page })
              : intl.formatMessage(
                  { id: "common.table.pageOf" },
                  { page, totalPages },
                )}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={intl.formatMessage({
                id: "common.table.previousPage",
              })}
              className="btn btn-ghost btn-sm btn-square"
              disabled={!canGoPrev || isLoading}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label={intl.formatMessage({
                id: "common.table.nextPage",
              })}
              className="btn btn-ghost btn-sm btn-square"
              disabled={!canGoNext || isLoading}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
