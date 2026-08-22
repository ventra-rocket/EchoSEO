import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useIntl } from "react-intl";
import { getLocalizedErrorMessage } from "@/client/lib/error-messages";
import { captureClientEvent } from "@/client/lib/posthog";
import { triggerRankCheck } from "@/serverFunctions/rank-tracking";

export function useRankCheckTrigger({
  configId,
  isRunning,
  projectId,
  onSuccess,
}: {
  configId: string;
  isRunning: boolean;
  projectId: string;
  onSuccess: () => void;
}) {
  // A hook, not a plain function — calls useIntl() itself rather than taking
  // an IntlShape parameter, matching useLaunchController/useLaunchMutations
  // (src/client/features/audit/launch/useLaunchController.ts), which only
  // thread intl as a parameter into plain non-hook helpers that cannot call
  // useIntl() on their own.
  const intl = useIntl();
  const queryClient = useQueryClient();

  const triggerMutation = useMutation({
    mutationFn: (opts: { keywordIds?: string[] }) =>
      triggerRankCheck({
        data: {
          projectId,
          configId,
          keywordIds: opts.keywordIds,
        },
      }),
    onSuccess: (result) => {
      onSuccess();
      void queryClient.invalidateQueries({
        queryKey: ["rankTrackingLatestRun", projectId, configId],
      });
      if (!result.ok) {
        toast.info(
          intl.formatMessage({ id: "rank.config.checkTrigger.alreadyRunning" }),
        );
        return;
      }

      captureClientEvent("rank_tracking:check_trigger");
      toast.success(
        intl.formatMessage({ id: "rank.config.checkTrigger.started" }),
      );
    },
    onError: (error) => {
      toast.error(
        getLocalizedErrorMessage(
          intl,
          error,
          intl.formatMessage({ id: "rank.config.checkTrigger.errorDefault" }),
        ),
      );
    },
  });

  const startCheck = (opts: { keywordIds?: string[] }) => {
    if (triggerMutation.isPending || isRunning) return;
    triggerMutation.mutate(opts);
  };

  return {
    startCheck,
    /** True while the trigger request is in-flight */
    isPending: triggerMutation.isPending,
    /** True when any check activity is happening (running, starting, or pending) */
    isBusy: isRunning || triggerMutation.isPending,
  };
}
