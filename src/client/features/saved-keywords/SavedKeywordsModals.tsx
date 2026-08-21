import { AlertCircle, Loader2 } from "lucide-react";
import { FormattedMessage } from "react-intl";
import { Modal } from "@/client/components/Modal";

export function RemoveSavedKeywordsError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function DeleteSavedKeywordsModal({
  selectedCount,
  isPending,
  onClose,
  onConfirm,
}: {
  selectedCount: number;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal onClose={onClose} labelledBy="delete-keywords-title">
      <h3 id="delete-keywords-title" className="text-lg font-semibold">
        <FormattedMessage id="saved.deleteModal.title" />
      </h3>
      <p className="text-sm text-base-content/70">
        <FormattedMessage
          id="saved.deleteModal.body"
          values={{ count: selectedCount }}
        />
      </p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onClose}
        >
          <FormattedMessage id="saved.deleteModal.cancel" />
        </button>
        <button
          type="button"
          className="btn btn-error btn-sm gap-1"
          onClick={onConfirm}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="size-3 animate-spin" /> : null}
          <FormattedMessage
            id="saved.deleteModal.confirm"
            values={{ count: selectedCount }}
          />
        </button>
      </div>
    </Modal>
  );
}
