import { createPortal } from "react-dom";
import { useIntl } from "react-intl";
import type { MessageId } from "@/client/i18n/messages";
import type { KeywordIntent } from "@/types/keywords";
import { FloatingTooltip, useFloatingTooltip } from "./FloatingTooltip";

const COLORS: Record<KeywordIntent, string> = {
  informational: "border-info/30 bg-info/15 text-info",
  commercial: "border-warning/35 bg-warning/20 text-warning",
  transactional: "border-success/30 bg-success/15 text-success",
  navigational: "border-primary/30 bg-primary/15 text-primary",
  unknown: "border-base-300 bg-base-200 text-base-content/60",
};

const SHORT_LABEL_IDS: Record<KeywordIntent, MessageId> = {
  informational: "keywordUi.intent.informational.short",
  commercial: "keywordUi.intent.commercial.short",
  transactional: "keywordUi.intent.transactional.short",
  navigational: "keywordUi.intent.navigational.short",
  unknown: "keywordUi.intent.unknown.short",
};

const DESCRIPTION_IDS: Record<
  KeywordIntent,
  { labelId: MessageId; descriptionId: MessageId }
> = {
  informational: {
    labelId: "keywordUi.intent.informational.label",
    descriptionId: "keywordUi.intent.informational.description",
  },
  commercial: {
    labelId: "keywordUi.intent.commercial.label",
    descriptionId: "keywordUi.intent.commercial.description",
  },
  transactional: {
    labelId: "keywordUi.intent.transactional.label",
    descriptionId: "keywordUi.intent.transactional.description",
  },
  navigational: {
    labelId: "keywordUi.intent.navigational.label",
    descriptionId: "keywordUi.intent.navigational.description",
  },
  unknown: {
    labelId: "keywordUi.intent.unknown.label",
    descriptionId: "keywordUi.intent.unknown.description",
  },
};

export function IntentBadge({ intent }: { intent: KeywordIntent }) {
  const intl = useIntl();
  const tooltip = useFloatingTooltip<HTMLSpanElement>({ delayMs: 0 });
  const { labelId, descriptionId } = DESCRIPTION_IDS[intent];
  const label = intl.formatMessage({ id: labelId });
  const description = intl.formatMessage({ id: descriptionId });

  return (
    <span
      ref={tooltip.triggerRef}
      className={`inline-flex h-6 min-w-11 cursor-help items-center justify-center rounded-full border px-2 text-xs font-semibold leading-none ${COLORS[intent]}`}
      tabIndex={0}
      aria-label={intl.formatMessage(
        { id: "keywordUi.intent.ariaLabel" },
        { label },
      )}
      aria-describedby={tooltip.isOpen ? tooltip.tooltipId : undefined}
      onMouseEnter={tooltip.open}
      onMouseLeave={tooltip.close}
      onFocus={tooltip.open}
      onBlur={tooltip.close}
      onKeyDown={(e) => {
        if (e.key === "Escape") tooltip.close();
      }}
    >
      {intl.formatMessage({ id: SHORT_LABEL_IDS[intent] })}
      {tooltip.isOpen && typeof document !== "undefined"
        ? createPortal(
            <FloatingTooltip id={tooltip.tooltipId} position={tooltip.position}>
              <span className="block font-semibold">{label}</span>
              <span className="mt-1 block">{description}</span>
            </FloatingTooltip>,
            document.body,
          )
        : null}
    </span>
  );
}
