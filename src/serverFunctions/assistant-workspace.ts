import { createServerFn } from "@tanstack/react-start";
import {
  getOptionalEnvValue,
  isHostedServerAuthMode,
} from "@/server/lib/runtime-env";
import { z } from "zod";
import { requireProjectContext } from "@/serverFunctions/middleware";

export const getAssistantWorkspaceIdentity = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .inputValidator((data: unknown) =>
    z.object({ projectId: z.string().min(1) }).parse(data),
  )
  .handler(async ({ context }) => {
    // Hosted billing for this new surface has not been designed yet. Keep it
    // unavailable there rather than creating unmanaged OpenRouter spend. The
    // client resolves *why* it's unavailable itself, via the same
    // isHostedClientAuthMode() deploy-time contract CommandCenterSignalCards
    // already relies on — no need to ship English reason text from here.
    const hosted = await isHostedServerAuthMode();
    return {
      userId: context.userId,
      available:
        !hosted && Boolean(await getOptionalEnvValue("OPENROUTER_API_KEY")),
    };
  });
