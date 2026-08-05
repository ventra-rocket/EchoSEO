import { useQuery } from "@tanstack/react-query";
import { getSeoApiKeyStatus } from "@/serverFunctions/config";

// Shared reader for the org's DataForSEO key status. Reuses AppShell's
// ["seoApiKeyStatus"] query key so both observers dedupe to a single fetch.
// DataForSEO-backed query hooks compose `enabled: ...configured === true` so a
// metered call never fires (and never 500s / spends) before a key is connected;
// the existing MissingSeoSetupModal/banner surfaces the setup CTA.
export function useSeoApiKeyStatus() {
  return useQuery({
    queryKey: ["seoApiKeyStatus"],
    queryFn: () => getSeoApiKeyStatus(),
    staleTime: 5 * 60_000,
  });
}
