import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useIntl } from "react-intl";
import { refreshTrackingKeywordMetrics } from "@/serverFunctions/rank-tracking";

export function useMetricsRefresh(projectId: string, configId: string) {
  // A hook, not a plain function — calls useIntl() itself rather than taking
  // an IntlShape parameter, matching useLaunchController/useLaunchMutations
  // (src/client/features/audit/launch/useLaunchController.ts), which only
  // thread intl as a parameter into plain non-hook helpers that cannot call
  // useIntl() on their own.
  const intl = useIntl();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      refreshTrackingKeywordMetrics({
        data: { projectId, configId },
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({
        queryKey: ["rankTrackingResults", projectId, configId],
      });
      toast.success(
        intl.formatMessage(
          { id: "rank.config.metricsRefresh.successToast" },
          { count: result.updated },
        ),
      );
    },
    onError: () => {
      toast.error(
        intl.formatMessage({ id: "rank.config.metricsRefresh.errorToast" }),
      );
    },
  });
  return { refresh: mutation.mutate, isRefreshing: mutation.isPending };
}
