import { useIntl } from "react-intl";
import { useAccessGate } from "@/client/features/access-gate/useAccessGate";
import { getAiSearchAccessSetupStatus } from "@/serverFunctions/aiSearchAccess";

export function useAiSearchAccess(projectId: string) {
  const intl = useIntl();
  return useAccessGate({
    queryKey: ["aiSearchAccessStatus", projectId],
    queryFn: () => getAiSearchAccessSetupStatus({ data: { projectId } }),
    statusErrorFallback: intl.formatMessage({
      id: "aiPromptExplorer.access.statusErrorFallback",
    }),
  });
}
