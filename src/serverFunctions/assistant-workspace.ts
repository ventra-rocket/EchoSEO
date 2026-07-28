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
  .handler(async ({ context }) => ({
    userId: context.userId,
    // Hosted billing for this new surface has not been designed yet. Keep it
    // unavailable there rather than creating unmanaged OpenRouter spend.
    available:
      !(await isHostedServerAuthMode()) &&
      Boolean(await getOptionalEnvValue("OPENROUTER_API_KEY")),
    unavailableReason: (await isHostedServerAuthMode())
      ? "Hosted AI workspace is not available yet."
      : "Add an OPENROUTER_API_KEY to enable the private AI workspace.",
  }));
