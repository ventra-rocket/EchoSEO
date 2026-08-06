import { useQuery } from "@tanstack/react-query";
import { useSeoApiKeyStatus } from "@/client/features/access-gate/useSeoApiKeyStatus";
import { getDomainOverview } from "@/serverFunctions/domain";

type Input = {
  projectId: string;
  domain: string;
  includeSubdomains: boolean;
  locationCode: number;
  languageCode: string;
};

export function useDomainOverviewQuery(input: Input) {
  const trimmedDomain = input.domain.trim();
  const seoApiKeyStatus = useSeoApiKeyStatus();

  return useQuery({
    enabled: trimmedDomain !== "" && seoApiKeyStatus.data?.configured === true,
    queryKey: [
      "domain-overview",
      input.projectId,
      trimmedDomain,
      input.includeSubdomains,
      input.locationCode,
      input.languageCode,
    ],
    queryFn: () =>
      getDomainOverview({
        data: {
          projectId: input.projectId,
          domain: trimmedDomain,
          includeSubdomains: input.includeSubdomains,
          locationCode: input.locationCode,
          languageCode: input.languageCode,
        },
      }),
    staleTime: 5 * 60_000,
  });
}
