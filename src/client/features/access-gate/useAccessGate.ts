import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useIntl } from "react-intl";
import { getLocalizedErrorMessage } from "@/client/lib/error-messages";

type AccessGateStatus = {
  enabled: boolean;
  errorMessage: string | null;
};

export type UseAccessGateResult = {
  enabled: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  errorMessage: string | null;
  statusErrorMessage: string | null;
  onRetry: () => void;
};

export function useAccessGate(config: {
  queryKey: readonly unknown[];
  queryFn: () => Promise<AccessGateStatus>;
  statusErrorFallback: string;
}): UseAccessGateResult {
  const { data, error, isPending, isRefetching, refetch } = useQuery({
    queryKey: config.queryKey,
    queryFn: config.queryFn,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
  });

  // A shared hook is a shared defect: every surface that gates on a provider
  // (backlinks, domain, keywords, ai-search) rendered this sentence, and the
  // legacy resolver returns English from a hardcoded map no matter what locale
  // the reader is in. Measured on a Vietnamese backlinks page whose heading,
  // subtitle and Retry button were already translated while the error body
  // below them was not. The directory-shaped gate never caught it because only
  // one file in this directory was listed, and this one is a `.ts` hook.
  const intl = useIntl();
  const statusErrorMessage = error
    ? getLocalizedErrorMessage(intl, error, config.statusErrorFallback)
    : null;
  const onRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return {
    enabled: data?.enabled ?? false,
    isLoading: isPending,
    isRefetching,
    errorMessage: data?.errorMessage ?? null,
    statusErrorMessage,
    onRetry,
  };
}
