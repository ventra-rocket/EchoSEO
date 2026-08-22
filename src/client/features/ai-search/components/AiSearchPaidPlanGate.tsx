import { Link } from "@tanstack/react-router";
import { Sparkles, type LucideIcon } from "lucide-react";
import { FormattedMessage } from "react-intl";
import { SUBSCRIBE_ROUTE } from "@/shared/billing";
import type { MessageId } from "@/client/i18n/messages";

// feature/description/bullet copy is caller-owned (each AI-search page has
// its own catalog), so this shared gate takes message ids rather than
// pre-formatted strings — see aiPromptExplorer.paidGate.* / aiBrandLookup
// equivalents for the two current callers.
type Props = {
  featureId: MessageId;
  descriptionId: MessageId;
  bullets: Array<{ icon: LucideIcon; titleId: MessageId; bodyId: MessageId }>;
};

export function AiSearchPaidPlanGate({
  featureId,
  descriptionId,
  bullets,
}: Props) {
  return (
    <div className="mx-auto max-w-3xl overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-sm">
      <div className="flex flex-col gap-5 px-6 py-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" />
            <FormattedMessage id="aiPromptExplorer.paidGate.badge" />
          </span>
          <h2 className="text-xl font-semibold tracking-tight">
            <FormattedMessage
              id="aiPromptExplorer.paidGate.title"
              values={{ feature: <FormattedMessage id={featureId} /> }}
            />
          </h2>
          <p className="text-sm text-base-content/70">
            <FormattedMessage id={descriptionId} />
          </p>
        </div>
        <Link
          to={SUBSCRIBE_ROUTE}
          search={{ upgrade: true }}
          className="btn btn-primary shrink-0"
        >
          <FormattedMessage id="aiPromptExplorer.paidGate.upgrade" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 border-t border-base-300 px-6 py-6 sm:grid-cols-3">
        {bullets.map(({ icon: Icon, titleId, bodyId }) => (
          <div key={titleId} className="space-y-2">
            <div className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-4" />
            </div>
            <h3 className="text-sm font-semibold">
              <FormattedMessage id={titleId} />
            </h3>
            <p className="text-xs leading-relaxed text-base-content/65">
              <FormattedMessage id={bodyId} />
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
