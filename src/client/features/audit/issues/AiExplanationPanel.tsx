import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FormattedMessage, useIntl } from "react-intl";
import { Sparkles } from "lucide-react";
import { explainAuditIssue } from "@/serverFunctions/audit-issues";
import { useLocale } from "@/client/i18n/I18nProvider";
import type { MessageId } from "@/client/i18n/messages";

const PRIORITY_MESSAGE_IDS: Record<string, MessageId> = {
  now: "audit.issues.ai.priorityNow",
  soon: "audit.issues.ai.prioritySoon",
  later: "audit.issues.ai.priorityLater",
};

/**
 * Optional AI commentary on an issue, rendered *below* the cited fix steps and
 * styled to read as a secondary note rather than guidance of the same standing.
 *
 * It is generated on request rather than on open: each generation costs money,
 * and the deterministic panel above already answers the question. If the server
 * reports it as unavailable — no API key, no credits, a model failure, or a
 * response that broke the guardrails — this renders nothing at all, which is
 * why the issue detail never depends on it.
 */
export function AiExplanationPanel({
  auditId,
  projectId,
  ruleId,
}: {
  auditId: string;
  projectId: string;
  ruleId: string;
}) {
  const { locale } = useLocale();
  const intl = useIntl();
  const [dismissed, setDismissed] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      explainAuditIssue({ data: { projectId, auditId, ruleId, locale } }),
  });

  const result = mutation.data;

  // Unavailable and failed are the same to the reader: no commentary exists.
  // Saying "the AI is down" would give this layer a prominence it should not
  // have next to guidance that is already complete.
  if (dismissed || (result && !result.available) || mutation.isError) {
    return null;
  }

  if (!result) {
    return (
      <button
        type="button"
        className="btn btn-ghost btn-sm gap-1.5"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? (
          <span className="loading loading-spinner loading-xs" />
        ) : (
          <Sparkles className="size-3.5" />
        )}
        <FormattedMessage id="audit.issues.ai.explainCta" />
      </button>
    );
  }

  const { explanation } = result;
  const priorityMessageId = PRIORITY_MESSAGE_IDS[explanation.priority];
  const priorityLabel = priorityMessageId
    ? intl.formatMessage({ id: priorityMessageId })
    : explanation.priority;

  return (
    <section className="space-y-2 rounded-lg border border-dashed border-base-300 p-3">
      <header className="flex items-center gap-2">
        <Sparkles className="size-3.5 text-base-content/40" />
        <h4 className="text-xs font-medium uppercase tracking-wide text-base-content/50">
          <FormattedMessage id="audit.issues.ai.commentaryTitle" />
        </h4>
        <span className="badge badge-ghost badge-xs">{priorityLabel}</span>
        <button
          type="button"
          className="btn btn-ghost btn-xs ml-auto"
          onClick={() => setDismissed(true)}
        >
          <FormattedMessage id="audit.issues.ai.hide" />
        </button>
      </header>

      <p className="text-sm text-base-content/80">{explanation.whatItMeans}</p>
      <p className="text-sm text-base-content/80">{explanation.forThisSite}</p>

      {/* The distinction that matters: the steps above are quoted from Google,
          this paragraph is not. */}
      <p className="text-xs text-base-content/40">
        <FormattedMessage id="audit.issues.ai.disclaimer" />
      </p>
    </section>
  );
}
