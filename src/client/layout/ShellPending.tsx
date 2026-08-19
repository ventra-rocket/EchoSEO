/**
 * The wait state for an app shell route.
 *
 * Both shells need it in two places — as the router's `pendingComponent` while
 * `beforeLoad` runs, and again from the component once the auth/access gates own
 * the wait — so it lives here instead of being redefined per route. Returning
 * nothing in either place is what painted a blank screen for up to 20 s (#77).
 */
export function ShellPending() {
  return (
    <div className="flex h-full items-center justify-center py-20">
      <span className="loading loading-spinner loading-md" />
    </div>
  );
}
