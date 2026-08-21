import { Loader2 } from "lucide-react";
import { useIntl } from "react-intl";

export function SavedKeywordsStatus({
  totalCount,
  isFetching,
}: {
  totalCount: number;
  isFetching: boolean;
}) {
  const intl = useIntl();
  return (
    <div className="flex items-center gap-2 px-1 text-xs text-base-content/60">
      <span>
        {intl.formatMessage(
          { id: "saved.table.status.count" },
          { count: totalCount },
        )}
      </span>
      {isFetching ? <Loader2 className="size-3 animate-spin" /> : null}
    </div>
  );
}
