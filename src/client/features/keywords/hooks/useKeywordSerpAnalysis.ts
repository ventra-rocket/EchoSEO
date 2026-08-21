import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useIntl } from "react-intl";
import { useSeoApiKeyStatus } from "@/client/features/access-gate/useSeoApiKeyStatus";
import { getLocalizedErrorMessage } from "@/client/lib/error-messages";
import { getLanguageCode } from "@/client/features/keywords/utils";
import { getSerpAnalysis } from "@/serverFunctions/keywords";

export function useKeywordSerpAnalysis(
  projectId: string,
  locationCode: number,
) {
  const intl = useIntl();
  const [serpKeyword, setSerpKeyword] = useState<string | null>(null);
  const [serpPage, setSerpPage] = useState(0);
  const SERP_PAGE_SIZE = 10;
  const seoApiKeyStatus = useSeoApiKeyStatus();

  const serpQuery = useQuery({
    queryKey: ["serpAnalysis", projectId, serpKeyword, locationCode],
    queryFn: () =>
      getSerpAnalysis({
        data: {
          projectId,
          keyword: serpKeyword!,
          locationCode,
          languageCode: getLanguageCode(locationCode),
        },
      }),
    enabled: !!serpKeyword && seoApiKeyStatus.data?.configured === true,
  });

  const serpResults = serpQuery.data?.items ?? [];
  const activeSerpKeyword =
    serpKeyword ?? serpQuery.data?.requestedKeyword ?? null;
  const serpLoading = serpQuery.isLoading;
  const serpError = serpQuery.isError
    ? getLocalizedErrorMessage(
        intl,
        serpQuery.error,
        intl.formatMessage({ id: "keywordUi.serp.errorDefault" }),
      )
    : null;

  return {
    serpKeyword,
    setSerpKeyword,
    serpPage,
    setSerpPage,
    SERP_PAGE_SIZE,
    serpQuery,
    serpResults,
    activeSerpKeyword,
    serpLoading,
    serpError,
  };
}
