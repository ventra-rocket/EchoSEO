import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { getAuthMode } from "@/lib/auth-mode";
import { resolveBacklinksProviderAccess } from "@/server/features/backlinks/services/backlinks-provider-access";
import { requireProjectContext } from "@/serverFunctions/middleware";
import { backlinksProjectSchema } from "@/types/schemas/backlinks";

type BacklinksAccessStatus = {
  enabled: boolean;
  errorMessage: string | null;
};

export const getBacklinksAccessSetupStatus = createServerFn({ method: "GET" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) => backlinksProjectSchema.parse(data))
  .handler(async (): Promise<BacklinksAccessStatus> => {
    const { enabled, message } = await resolveBacklinksProviderAccess(
      getAuthMode(env.AUTH_MODE),
    );
    return { enabled, errorMessage: message };
  });
