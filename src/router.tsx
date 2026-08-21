import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { DefaultCatchBoundary } from "./client/components/DefaultCatchBoundary";
import { LocalizedNotFound } from "./client/components/NotFound";

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    defaultPreload: "intent",
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: LocalizedNotFound,
    scrollRestoration: true,
  });

  return router;
}
