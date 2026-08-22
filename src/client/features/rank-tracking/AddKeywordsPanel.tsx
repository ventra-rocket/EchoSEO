import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { FormattedMessage, useIntl } from "react-intl";
import { addTrackingKeywords } from "@/serverFunctions/rank-tracking";
import { getLocalizedErrorMessage } from "@/client/lib/error-messages";
import { Loader2 } from "lucide-react";

export function AddKeywordsPanel({
  configId,
  projectId,
  onSuccess,
  onCancel,
}: {
  configId: string;
  projectId: string;
  onSuccess: (result: { added: number; checkTriggered: boolean }) => void;
  onCancel: () => void;
}) {
  const intl = useIntl();
  const [keywordInput, setKeywordInput] = useState("");
  const mutation = useMutation({
    mutationFn: (kws: string[]) =>
      addTrackingKeywords({ data: { projectId, configId, keywords: kws } }),
    // `variables` is the keyword list this call was made with, so comparing
    // its length against `result.added` tells us how many the server dropped
    // (already-tracked duplicates or over the MAX_KEYWORDS_PER_CONFIG limit)
    // without needing the server to report which reason applied.
    onSuccess: (result, keywords) => {
      setKeywordInput("");
      if (result.added < keywords.length) {
        toast.info(
          intl.formatMessage(
            { id: "rank.config.addKeywords.skippedToast" },
            { skipped: keywords.length - result.added },
          ),
        );
      }
      onSuccess(result);
    },
    onError: (error) => {
      toast.error(
        getLocalizedErrorMessage(
          intl,
          error,
          intl.formatMessage({ id: "rank.config.addKeywords.errorDefault" }),
        ),
      );
    },
  });
  const isPending = mutation.isPending;
  return (
    <div className="flex gap-2 items-end">
      <textarea
        className="textarea textarea-bordered textarea-sm flex-1"
        rows={3}
        placeholder={intl.formatMessage({
          id: "rank.config.addKeywords.placeholder",
        })}
        value={keywordInput}
        onChange={(e) => setKeywordInput(e.target.value)}
      />
      <div className="flex flex-col gap-1">
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            const lines = keywordInput
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean);
            if (lines.length > 0) mutation.mutate(lines);
          }}
          disabled={isPending || !keywordInput.trim()}
        >
          {isPending && <Loader2 className="size-3 animate-spin" />}
          <FormattedMessage id="rank.config.addKeywords.add" />
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>
          <FormattedMessage id="rank.config.action.cancel" />
        </button>
      </div>
    </div>
  );
}
