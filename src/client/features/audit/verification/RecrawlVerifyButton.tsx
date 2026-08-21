import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { FormattedMessage, useIntl } from "react-intl";
import { getAuditAccess, startAudit } from "@/serverFunctions/audit";
import type { AuditResultsData } from "@/client/features/audit/results/types";
import { getStandardErrorMessage } from "@/client/lib/error-messages";

/**
 * Re-crawls this audit's target to verify fixes, recording the current audit as
 * the baseline the new crawl is judged against. It repeats the original crawl's
 * scope (a smaller re-crawl would leave more issues "inconclusive"). Only shown
 * to workspace roles that may run audits; the server re-checks that authority
 * and the baseline.
 */
export function RecrawlVerifyButton({
  projectId,
  baselineAuditId,
  startUrl,
  config,
  onStarted,
}: {
  projectId: string;
  baselineAuditId: string;
  startUrl: string;
  config: AuditResultsData["audit"]["config"];
  onStarted: (auditId: string) => void;
}) {
  const intl = useIntl();
  const accessQuery = useQuery({
    queryKey: ["audit-access", projectId],
    queryFn: () => getAuditAccess({ data: { projectId } }),
  });

  const recrawl = useMutation({
    mutationFn: async () => {
      const result = await startAudit({
        data: {
          projectId,
          startUrl,
          maxPages: config.maxPages,
          lighthouseStrategy: config.lighthouseStrategy,
          baselineAuditId,
        },
      });
      return result.auditId;
    },
    onSuccess: (auditId) => {
      toast.success(
        intl.formatMessage({ id: "audit.verification.recrawlStarted" }),
      );
      onStarted(auditId);
    },
    onError: (error) => {
      toast.error(
        getStandardErrorMessage(
          error,
          intl.formatMessage({ id: "audit.verification.recrawlError" }),
        ),
      );
    },
  });

  if (!accessQuery.data?.canLaunch) return null;

  return (
    <button
      type="button"
      className="btn btn-sm btn-outline gap-2"
      disabled={recrawl.isPending}
      onClick={() => recrawl.mutate()}
    >
      {recrawl.isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <RefreshCw className="size-4" />
      )}
      <FormattedMessage id="audit.verification.recrawlButton" />
    </button>
  );
}
