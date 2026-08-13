import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getAuthMode } from "@/lib/auth-mode";
import { OrganizationSeoCredentialRepository } from "@/server/features/seo-credentials/OrganizationSeoCredentialRepository";
import { hasUsableDataforseoCredentials } from "@/server/lib/dataforseo/credential-access-policy";
import { isHostedAccessOpen } from "@/server/lib/runtime-env";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";

export const getSeoApiKeyStatus = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler(async ({ context }) => {
    // The encrypted org key is never decrypted or returned here. A raw global
    // key counts only where the same runtime policy would authorize its spend.
    const [orgKey, hostedAccessOpen] = await Promise.all([
      OrganizationSeoCredentialRepository.getEncrypted(context.organizationId),
      isHostedAccessOpen(),
    ]);
    const configured = await hasUsableDataforseoCredentials({
      hasOrganizationKey: orgKey != null,
      globalApiKey: env.DATAFORSEO_API_KEY,
      runtime: {
        hosted: getAuthMode(env.AUTH_MODE) === "hosted",
        openAccess: hostedAccessOpen,
      },
    });
    return { configured };
  });
