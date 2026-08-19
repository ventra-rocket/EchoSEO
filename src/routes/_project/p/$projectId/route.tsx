import {
  Outlet,
  createFileRoute,
  redirect,
  useLocation,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { setLastProjectId } from "@/client/lib/active-project";
import { useHostedAuthRouteGuard } from "@/client/features/auth/useHostedAuthRouteGuard";
import { getShellGateState } from "@/client/features/auth/shell-gate-state";
import { FreePlanBanner } from "@/client/features/billing/FreePlanBanner";
import { useSubscribeRedirect } from "@/client/features/billing/useSubscribeRedirect";
import { useOnboardingRedirect } from "@/client/features/onboarding/useOnboardingRedirect";
import { getErrorCode } from "@/client/lib/error-messages";
import { AuthenticatedAppLayout } from "@/client/layout/AppShell";
import { ShellPending } from "@/client/layout/ShellPending";
import {
  getCurrentAuthRedirectFromHref,
  getSignInSearch,
} from "@/lib/auth-redirect";
import { getProjectAccess } from "@/serverFunctions/projects";

export const Route = createFileRoute("/_project/p/$projectId")({
  beforeLoad: async ({ location, params }) => {
    try {
      await getProjectAccess({ data: { projectId: params.projectId } });
    } catch (error) {
      if (getErrorCode(error) === "UNAUTHENTICATED") {
        throw redirect({
          to: "/sign-in",
          search: getSignInSearch(
            getCurrentAuthRedirectFromHref(location.href),
          ),
          replace: true,
        });
      }

      throw redirect({ to: "/", replace: true });
    }
  },
  pendingComponent: ShellPending,
  component: ProjectLayout,
});

function ProjectLayout() {
  const { projectId } = Route.useParams();
  const authGate = useHostedAuthRouteGuard();
  useOnboardingRedirect();
  const subscribeGate = useSubscribeRedirect();

  // Remember this as the last-visited project for the landing redirect.
  // Settings is excluded: editing another project's settings is
  // administration, not a context switch, so it shouldn't change which
  // project the app opens next time.
  const isSettingsPage = useLocation({
    select: (l) => l.pathname.endsWith("/settings"),
  });
  useEffect(() => {
    if (isSettingsPage) return;
    setLastProjectId(projectId);
  }, [projectId, isSettingsPage]);

  const gateState = getShellGateState({
    canRenderAuthenticatedContent: authGate.canRenderAuthenticatedContent,
    isAuthRedirecting: authGate.isRedirecting,
    isSubscribeBlocking: subscribeGate.isBlocking,
    isSubscribeRedirecting: subscribeGate.isRedirecting,
  });

  // `pendingComponent` only covers this route's own beforeLoad. Once the
  // component mounts, these gates own the wait, so they have to keep showing
  // progress — and the shell has to render at all for an unmatched child to
  // reach the 404 the router puts in this layout's <Outlet/>.
  if (gateState === "redirecting") {
    return null;
  }
  if (gateState === "pending") {
    return <ShellPending />;
  }

  return (
    <AuthenticatedAppLayout
      projectId={projectId}
      banner={authGate.isHostedMode ? <FreePlanBanner /> : undefined}
    >
      <Outlet />
    </AuthenticatedAppLayout>
  );
}
