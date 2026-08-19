// Decides what an authenticated layout may paint while its route guards are
// still making up their mind. The three outcomes below used to collapse into a
// single `return null`, which is why a cold project load — and any unmatched
// project sub-path — showed an empty viewport that was indistinguishable from
// an outage: the layout never rendered, so neither its spinner nor the 404 that
// belongs in its <Outlet/> ever reached the screen.
export function getShellGateState(args: {
  canRenderAuthenticatedContent: boolean;
  isAuthRedirecting: boolean;
  isSubscribeBlocking: boolean;
  isSubscribeRedirecting: boolean;
}) {
  // A guard has already committed to navigating away, so this tree is about to
  // be torn down. Checked first: painting a spinner the user sees for one frame
  // before being bounced reads as a failed load, not as progress.
  if (args.isAuthRedirecting || args.isSubscribeRedirecting) {
    return "redirecting" as const;
  }

  // Session or managed-access lookup still in flight. These can take seconds on
  // a cold load, which is exactly the window that must not look blank.
  if (!args.canRenderAuthenticatedContent || args.isSubscribeBlocking) {
    return "pending" as const;
  }

  return "ready" as const;
}
