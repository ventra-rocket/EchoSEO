import { createFileRoute } from "@tanstack/react-router";
import { autumnHandler } from "autumn-js/fetch";
import { env } from "cloudflare:workers";
import { isHostedAuthMode } from "@/lib/auth-mode";
import { resolveHostedContext } from "@/middleware/ensure-user/hosted";
import { isAutumnConfigured } from "@/server/lib/runtime-env";

const handler = autumnHandler({
  identify: async (request) => {
    const context = await resolveHostedContext(request.headers);

    return {
      customerId: context.organizationId,
    };
  },
});

async function handleAutumnRequest(request: Request) {
  // Autumn is only wired in hosted mode, and only when its secret key is set.
  // Under open-access (no AUTUMN_SECRET_KEY) the handler would call the Autumn
  // API and 500 on every mount of <AutumnProvider> (billing + rank-tracking).
  // Treat an unconfigured Autumn as "not available" — the same 404 the
  // non-hosted build returns — so the client degrades instead of hammering 500s.
  if (!isHostedAuthMode(env.AUTH_MODE) || !(await isAutumnConfigured())) {
    return new Response("Not found", {
      status: 404,
    });
  }

  return handler(request);
}

export const Route = createFileRoute("/api/autumn/$")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        return handleAutumnRequest(request);
      },
      POST: async ({ request }: { request: Request }) => {
        return handleAutumnRequest(request);
      },
    },
  },
});
