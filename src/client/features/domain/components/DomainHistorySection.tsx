import { Clock, History, X } from "lucide-react";
import { Globe } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import { DataforseoKeyMissingState } from "@/client/features/access-gate/DataforseoKeyMissingState";
import type { DomainHistoryItem } from "@/client/features/domain/types";

type Props = {
  history: DomainHistoryItem[];
  historyLoaded: boolean;
  /** No DataForSEO key: the overview query never fired, so the empty panel must
   * not tell the user to enter the domain they already submitted. */
  seoKeyMissing: boolean;
  onRemoveHistoryItem: (timestamp: number) => void;
  onSelectHistoryItem: (item: DomainHistoryItem) => void;
};

export function DomainHistorySection({
  history,
  historyLoaded,
  seoKeyMissing,
  onRemoveHistoryItem,
  onSelectHistoryItem,
}: Props) {
  const intl = useIntl();
  if (seoKeyMissing) {
    return <DataforseoKeyMissingState />;
  }

  if (!historyLoaded) {
    return null;
  }

  if (history.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-base-300 bg-base-100/70 p-6 text-center text-base-content/55 space-y-2">
        <Globe className="size-9 mx-auto opacity-35" />
        <p className="text-base font-medium text-base-content/80">
          <FormattedMessage id="domainOverview.history.emptyPrompt" />
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-base-300 bg-base-100 p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="size-4 text-base-content/45" />
          <span className="text-sm text-base-content/60">
            <FormattedMessage
              id="domainOverview.history.recentCount"
              values={{ count: history.length }}
            />
          </span>
        </div>
      </div>

      <div className="grid gap-2">
        {history.map((item) => (
          <div
            key={item.timestamp}
            className="group flex items-center gap-2 rounded-lg border border-base-300 bg-base-100 p-2"
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-1 py-1 text-left transition-colors hover:bg-base-200"
              onClick={() => onSelectHistoryItem(item)}
            >
              <Clock className="size-4 text-base-content/40 shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-base-content truncate">
                  {item.domain}
                </p>
                <p className="text-sm text-base-content/60 truncate">
                  {item.subdomains ? (
                    <FormattedMessage id="domainOverview.search.includeSubdomains" />
                  ) : (
                    <FormattedMessage id="domainOverview.history.rootDomainOnly" />
                  )}
                </p>
              </div>
            </button>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-base-content/40">
                {intl.formatDate(item.timestamp, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-xs opacity-0 group-hover:opacity-100 p-1"
                onClick={() => onRemoveHistoryItem(item.timestamp)}
                aria-label={intl.formatMessage(
                  { id: "domainOverview.history.removeAriaLabel" },
                  { domain: item.domain },
                )}
              >
                <X className="size-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
