import { Outlet, createFileRoute } from "@tanstack/react-router";
import { useHostedAuthRouteGuard } from "@/client/features/auth/useHostedAuthRouteGuard";
import { getShellGateState } from "@/client/features/auth/shell-gate-state";
import { AuthenticatedAppLayout } from "@/client/layout/AppShell";
import { ShellPending } from "@/client/layout/ShellPending";
import { useOnboardingRedirect } from "@/client/features/onboarding/useOnboardingRedirect";
import { useSubscribeRedirect } from "@/client/features/billing/useSubscribeRedirect";

export const Route = createFileRoute("/_app")({
  component: AppRouteLayout,
});

function AppRouteLayout() {
  const authGate = useHostedAuthRouteGuard();
  useOnboardingRedirect();
  const subscribeGate = useSubscribeRedirect();

  // Same rule as the project layout: paint nothing only once a redirect is
  // committed, and keep showing progress while a gate is still resolving.
  // Returning `null` for both left every non-project page blank while the
  // session or the access lookup was in flight.
  const gateState = getShellGateState({
    canRenderAuthenticatedContent: authGate.canRenderAuthenticatedContent,
    isAuthRedirecting: authGate.isRedirecting,
    isSubscribeBlocking: subscribeGate.isBlocking,
    isSubscribeRedirecting: subscribeGate.isRedirecting,
  });

  if (gateState === "redirecting") {
    return null;
  }
  if (gateState === "pending") {
    return <ShellPending />;
  }

  return (
    <AuthenticatedAppLayout>
      <Outlet />
    </AuthenticatedAppLayout>
  );
}
