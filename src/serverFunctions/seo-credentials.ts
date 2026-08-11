/**
 * Server functions for the per-organization "bring your own key" DataForSEO
 * credential. `getDataforseoKeyStatus` is a read that never returns the key;
 * `saveDataforseoKey` and `deleteDataforseoKey` are owner/admin-gated mutations.
 * All authorization, live validation and encryption live in `DataforseoKeyService`
 * so these stay thin wrappers that only resolve the request env once.
 */
import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAuthMode } from "@/lib/auth-mode";
import { DataforseoKeyService } from "@/server/features/seo-credentials/DataforseoKeyService";
import { isHostedAccessOpen } from "@/server/lib/runtime-env";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";

const saveDataforseoKeyInputSchema = z.object({
  apiKey: z.string().min(1).max(1024),
});

export const getDataforseoKeyStatus = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler(async ({ context }) =>
    DataforseoKeyService.getStatus({
      userId: context.userId,
      organizationId: context.organizationId,
      authMode: getAuthMode(env.AUTH_MODE),
      globalApiKey: env.DATAFORSEO_API_KEY,
      hostedAccessOpen: await isHostedAccessOpen(),
    }),
  );

export const saveDataforseoKey = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .inputValidator((data: unknown) => saveDataforseoKeyInputSchema.parse(data))
  .handler(({ data, context }) =>
    DataforseoKeyService.save({
      apiKey: data.apiKey,
      userId: context.userId,
      organizationId: context.organizationId,
      authMode: getAuthMode(env.AUTH_MODE),
    }),
  );

export const deleteDataforseoKey = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .handler(({ context }) =>
    DataforseoKeyService.remove({
      userId: context.userId,
      organizationId: context.organizationId,
      authMode: getAuthMode(env.AUTH_MODE),
    }),
  );
