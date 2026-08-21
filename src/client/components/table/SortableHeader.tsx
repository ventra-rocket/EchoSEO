import { ArrowDown, ArrowUp } from "lucide-react";
import { useIntl } from "react-intl";
import { HeaderHelpLabel } from "@/client/features/keywords/components";

type SortableColumn = {
  getIsSorted: () => false | "asc" | "desc";
  getToggleSortingHandler: () => ((event: unknown) => void) | undefined;
};

export function SortableHeader({
  column,
  label,
  helpText,
  align,
}: {
  column: SortableColumn;
  label: string;
  helpText?: string;
  align?: "left" | "right";
}) {
  const intl = useIntl();
  const sorted = column.getIsSorted();
  const content = (
    <button
      type="button"
      className="inline-flex items-center gap-1 font-medium transition-colors hover:text-base-content"
      onClick={column.getToggleSortingHandler()}
      // Every sortable column in the audit and Search Performance tables goes
      // through here, so an English string at this one line made both surfaces
      // read "Sort by Tiêu đề" to a Vietnamese screen-reader user while the
      // visible header was translated. A shared component gets this wrong for
      // every feature at once, which is also why it is worth fixing once.
      aria-label={intl.formatMessage({ id: "common.table.sortBy" }, { label })}
      aria-pressed={!!sorted}
    >
      {helpText ? <HeaderHelpLabel label={label} helpText={helpText} /> : label}
      {sorted === "asc" ? (
        <ArrowUp className="size-3 shrink-0" />
      ) : sorted === "desc" ? (
        <ArrowDown className="size-3 shrink-0" />
      ) : null}
    </button>
  );

  if (align === "right") {
    return <span className="flex w-full justify-end">{content}</span>;
  }

  return content;
}
