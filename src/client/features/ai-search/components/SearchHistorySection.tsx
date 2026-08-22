import type { ComponentType, ReactNode } from "react";
import { Clock, History, X } from "lucide-react";
import { useIntl, FormattedMessage } from "react-intl";
import type { MessageId } from "@/client/i18n/messages";

type Props<TItem extends { timestamp: number }> = {
  history: TItem[];
  historyLoaded: boolean;
  onRemoveHistoryItem: (timestamp: number) => void;
  /**
   * Renders the clickable area of a history row. The caller is responsible
   * for wrapping `content` in a <Link> (or other clickable element) so that
   * cmd+click and right-click → "open in new tab" behave natively.
   */
  renderItemLink: (item: TItem, content: ReactNode) => ReactNode;
  /** Icon component rendered in the empty state (e.g. Sparkles, MessageSquare). */
  emptyIcon: ComponentType<{ className?: string }>;
  /** Empty-state headline copy, from the caller's own catalog. */
  emptyMessageId: MessageId;
  /**
   * Singular noun id resolved and interpolated into the "{n} recent {noun}"
   * header (e.g. "prompt", "lookup") — pluralization of the whole sentence
   * is owned by aiPromptExplorer.history.recentCount, not by this word alone.
   */
  nounId: MessageId;
  /** Item body — primary (and optional secondary) text shown in each row. */
  renderItem: (item: TItem) => ReactNode;
};

export function SearchHistorySection<TItem extends { timestamp: number }>({
  history,
  historyLoaded,
  onRemoveHistoryItem,
  renderItemLink,
  emptyIcon: EmptyIcon,
  emptyMessageId,
  nounId,
  renderItem,
}: Props<TItem>) {
  const intl = useIntl();

  if (!historyLoaded) {
    return null;
  }

  if (history.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-base-300 bg-base-100/70 p-6 text-center text-base-content/55 space-y-2">
        <EmptyIcon className="size-9 mx-auto opacity-35" />
        <p className="text-base font-medium text-base-content/80">
          <FormattedMessage id={emptyMessageId} />
        </p>
      </section>
    );
  }

  const noun = intl.formatMessage({ id: nounId });

  return (
    <section className="rounded-2xl border border-base-300 bg-base-100 p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="size-4 text-base-content/45" />
          <span className="text-sm text-base-content/60">
            {intl.formatMessage(
              { id: "aiPromptExplorer.history.recentCount" },
              { count: history.length, noun },
            )}
          </span>
        </div>
      </div>

      <div className="grid gap-2">
        {history.map((item) => (
          <div
            key={item.timestamp}
            className="group flex items-center gap-2 rounded-lg border border-base-300 bg-base-100 p-2"
          >
            {renderItemLink(
              item,
              <>
                <Clock className="size-4 text-base-content/40 shrink-0" />
                <div className="min-w-0">{renderItem(item)}</div>
              </>,
            )}
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
                aria-label={intl.formatMessage({
                  id: "aiPromptExplorer.history.removeAria",
                })}
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

export const HISTORY_ITEM_LINK_CLASS =
  "flex min-w-0 flex-1 items-center gap-3 rounded-md px-1 py-1 text-left transition-colors hover:bg-base-200";
