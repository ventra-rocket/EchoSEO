import { ArrowDown, ArrowUp } from "lucide-react";
import { useIntl } from "react-intl";
import { HeaderHelpLabel } from "@/client/features/keywords/components";
import type { SortOrder } from "@/client/features/domain/types";

type Props = {
  label: string;
  helpText?: string;
  isActive: boolean;
  order: SortOrder;
  onClick: () => void;
};

export function SortableHeader({
  label,
  helpText,
  isActive,
  order,
  onClick,
}: Props) {
  const intl = useIntl();
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 font-medium hover:text-base-content"
      onClick={onClick}
      aria-label={intl.formatMessage({ id: "common.table.sortBy" }, { label })}
      aria-pressed={isActive}
    >
      {helpText ? (
        <HeaderHelpLabel label={label} helpText={helpText} />
      ) : (
        <span>{label}</span>
      )}
      {isActive ? (
        order === "asc" ? (
          <ArrowUp className="size-3" />
        ) : (
          <ArrowDown className="size-3" />
        )
      ) : null}
    </button>
  );
}
