import { FormattedMessage } from "react-intl";
import type { MessageId } from "@/client/i18n/messages";

export function EmptyTableState({ labelId }: { labelId: MessageId }) {
  return (
    <div className="rounded-xl border border-dashed border-base-300 p-10 text-center text-sm text-base-content/55">
      <FormattedMessage id={labelId} />
    </div>
  );
}
