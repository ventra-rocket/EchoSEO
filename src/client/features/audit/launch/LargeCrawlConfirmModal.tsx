import { Loader2 } from "lucide-react";
import { FormattedMessage, FormattedNumber } from "react-intl";
import { Modal } from "@/client/components/Modal";

/**
 * Confirms a large crawl in the app instead of through `window.confirm`, which
 * rendered as a raw "app.echoseo…vn says" browser alert, could not be styled or
 * dismissed with the rest of the UI, and blocked the page while open.
 */
export function LargeCrawlConfirmModal({
  maxPages,
  startUrl,
  isStarting,
  onConfirm,
  onCancel,
}: {
  maxPages: number;
  startUrl: string;
  isStarting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      maxWidth="max-w-md"
      onClose={isStarting ? undefined : onCancel}
      labelledBy="large-crawl-confirm-title"
    >
      <div>
        <h3 id="large-crawl-confirm-title" className="text-lg font-semibold">
          <FormattedMessage
            id="audit.chrome.launch.confirmTitle"
            values={{ maxPages: <FormattedNumber value={maxPages} /> }}
          />
        </h3>
        <p className="mt-1 text-sm text-base-content/60">
          <FormattedMessage
            id="audit.chrome.launch.confirmBody"
            values={{ startUrl }}
          />
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onCancel}
          disabled={isStarting}
        >
          <FormattedMessage id="audit.chrome.launch.cancel" />
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onConfirm}
          disabled={isStarting}
        >
          {isStarting ? (
            <>
              <Loader2 className="size-4 animate-spin" />{" "}
              <FormattedMessage id="audit.chrome.launch.submitStarting" />
            </>
          ) : (
            <FormattedMessage id="audit.chrome.launch.confirmStart" />
          )}
        </button>
      </div>
    </Modal>
  );
}
