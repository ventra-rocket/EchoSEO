import { createFileRoute, Outlet } from "@tanstack/react-router";
import { FormattedMessage } from "react-intl";

export const Route = createFileRoute("/_project/p/$projectId/rank-tracking")({
  component: RankTrackingLayout,
});

function RankTrackingLayout() {
  return (
    <div className="px-4 py-4 pb-24 overflow-auto md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <div>
          {/* Reuses the nav label rather than a second copy of the same two
              words: a separate id would let the sidebar and the page heading
              drift apart in one locale and not the other. */}
          <h1 className="text-2xl font-semibold">
            <FormattedMessage id="nav.rankTracking" />
          </h1>
          <p className="text-sm text-base-content/70">
            <FormattedMessage id="rank.page.subtitle" />
          </p>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
