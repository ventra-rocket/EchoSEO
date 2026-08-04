import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { OrganizationSeoCredentialRepository } from "@/server/features/seo-credentials/OrganizationSeoCredentialRepository";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";

export const getSeoApiKeyStatus = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler(async ({ context }) => {
    // Configured when the org brought its own DataForSEO key OR a global
    // operator key is present. The org row is only checked for existence here —
    // the encrypted key is never decrypted or returned by this status endpoint.
    const orgKey = await OrganizationSeoCredentialRepository.getEncrypted(
      context.organizationId,
    );
    const configured =
      orgKey != null || Boolean(env.DATAFORSEO_API_KEY?.trim());
    return { configured };
  });
