import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useIntl } from "react-intl";
import {
  HISTORY_ITEM_LINK_CLASS,
  SearchHistorySection,
} from "@/client/features/ai-search/components/SearchHistorySection";
import type { BrandLookupSearchHistoryItem } from "@/client/hooks/useBrandLookupSearchHistory";

type Props = {
  projectId: string;
  history: BrandLookupSearchHistoryItem[];
  historyLoaded: boolean;
  onRemoveHistoryItem: (timestamp: number) => void;
};

export function BrandLookupHistorySection({ projectId, ...props }: Props) {
  const intl = useIntl();
  return (
    <SearchHistorySection
      {...props}
      emptyIcon={Sparkles}
      emptyMessageId="aiBrandLookup.history.emptyMessage"
      nounId="aiBrandLookup.history.noun"
      renderItemLink={(item, content) => (
        <Link
          from="/p/$projectId/brand-lookup"
          to="/p/$projectId/brand-lookup"
          params={{ projectId }}
          search={{
            q: item.query,
            c:
              item.competitors.length > 0
                ? item.competitors.join(",")
                : undefined,
          }}
          replace
          className={HISTORY_ITEM_LINK_CLASS}
        >
          {content}
        </Link>
      )}
      renderItem={(item) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-base-content">{item.query}</p>
          {item.competitors.length > 0 ? (
            <p className="truncate text-xs text-base-content/50">
              {intl.formatMessage(
                { id: "aiBrandLookup.history.competitorsPrefix" },
                { competitors: item.competitors.join(", ") },
              )}
            </p>
          ) : null}
        </div>
      )}
    />
  );
}
