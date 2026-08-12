import { Link } from "@tanstack/react-router";

/**
 * The free answer a keyless user already has, named where they hit the wall.
 *
 * Search Performance renders Search Console queries with an average-position
 * column and a striking-distance table, and it needs no provider key. Nothing
 * in rank tracking pointed at it, so an empty table or a provider refusal read
 * as a dead end rather than as one nav item away from the answer.
 *
 * Colour is inherited on purpose: this renders both on the plain empty state
 * and inside an error alert, and each parent already sets a readable pair.
 */
export function RankTrackingSearchPerformanceHint({
  projectId,
}: {
  projectId: string;
}) {
  return (
    <p className="text-sm">
      No provider key? Search Console already shows how your site ranks —{" "}
      <Link
        to="/p/$projectId/search-performance"
        params={{ projectId }}
        className="font-medium underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        open Search Performance
      </Link>
      .
    </p>
  );
}
