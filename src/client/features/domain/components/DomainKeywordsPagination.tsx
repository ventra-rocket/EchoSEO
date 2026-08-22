import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useIntl } from "react-intl";
import { DOMAIN_KEYWORDS_PAGE_SIZES } from "@/types/schemas/domain";

type Props = {
  page: number;
  pageSize: number;
  totalCount: number | null;
  hasNextPage: boolean;
  isLoading: boolean;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (nextPageSize: number) => void;
};

export function DomainKeywordsPagination({
  page,
  pageSize,
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
  const start = (page - 1) * pageSize + 1;
  const rangeLabel =
    totalCount == null
      ? intl.formatMessage(
          { id: "domainTables.pagination.rangeNoTotal" },
          { start, end: start + pageSize - 1 },
        )
      : totalCount === 0
        ? intl.formatNumber(0)
        : intl.formatMessage(
            { id: "common.table.rangeWithTotal" },
            {
              start,
              end: Math.min(totalCount, start + pageSize - 1),
              total: totalCount,
            },
          );

  return (
    <div className="flex flex-col gap-3 border-t border-base-300 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-base-content/70 tabular-nums">
        <span>{rangeLabel}</span>
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
            {DOMAIN_KEYWORDS_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-sm tabular-nums text-base-content/70">
            {totalPages != null
              ? intl.formatMessage(
                  { id: "common.table.pageOf" },
                  { page, totalPages },
                )
              : intl.formatMessage({ id: "common.table.page" }, { page })}
          </span>
          <div className="flex items-center gap-1">
            <PageLink
              page={page - 1}
              disabled={!canGoPrev || isLoading}
              onPageChange={onPageChange}
              label={intl.formatMessage({ id: "common.table.previousPage" })}
            >
              <ChevronLeft className="size-4" />
            </PageLink>
            <PageLink
              page={page + 1}
              disabled={!canGoNext || isLoading}
              onPageChange={onPageChange}
              label={intl.formatMessage({ id: "common.table.nextPage" })}
            >
              <ChevronRight className="size-4" />
            </PageLink>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageLink({
  page,
  disabled,
  label,
  children,
  onPageChange,
}: {
  page: number;
  disabled: boolean;
  label: string;
  children: ReactNode;
  onPageChange: (nextPage: number) => void;
}) {
  return (
    <Link
      from="/p/$projectId/domain"
      to="/p/$projectId/domain"
      search={(prev) => ({
        ...prev,
        page: page === 1 ? undefined : page,
      })}
      aria-label={label}
      aria-disabled={disabled}
      className={`btn btn-ghost btn-sm btn-square ${disabled ? "btn-disabled" : ""}`}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return;
        }
        event.preventDefault();
        onPageChange(page);
      }}
    >
      {children}
    </Link>
  );
}
