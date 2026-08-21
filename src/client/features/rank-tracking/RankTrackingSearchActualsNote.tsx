import { Link } from "@tanstack/react-router";
import type { RankTrackingSearchActuals } from "@/server/features/rank-tracking/services/RankTrackingSearchActualsService";

/**
 * Names the Search Console columns' source, window and limits next to the table
 * that shows them.
 *
 * Every branch here exists because the columns' absence or presence is itself a
 * claim: absent because no property is connected, absent because the connected
 * property covers a different site, or present but read from a truncated query
 * set. Left unexplained, a reader fills the gap with the most flattering
 * assumption — that the numbers cover their site and their whole keyword set.
 */
export function RankTrackingSearchActualsNote({
  actuals,
  projectId,
  domain,
}: {
  actuals: RankTrackingSearchActuals | undefined;
  projectId: string;
  domain: string;
}) {
  if (!actuals) return null;

  if (actuals.state === "not_connected") {
    return (
      <p className="text-xs text-base-content/55">
        Connect Search Console to see the clicks, impressions and average
        position Google recorded for these keywords — free, no provider key.{" "}
        <Link
          to="/p/$projectId/search-performance"
          params={{ projectId }}
          className="underline underline-offset-2"
        >
          Open Search Performance
        </Link>
        .
      </p>
    );
  }

  if (actuals.state === "property_mismatch") {
    return (
      <p className="text-xs text-base-content/55">
        Search Console property{" "}
        <span className="font-mono">{actuals.property}</span> does not cover{" "}
        <span className="font-mono">{domain}</span>, so no Search Console
        columns are shown for these keywords.
      </p>
    );
  }

  return (
    <p className="text-xs text-base-content/55">
      Search Console columns: Google&apos;s own data for{" "}
      <span className="font-mono">{actuals.property}</span>,{" "}
      {actuals.window.from} → {actuals.window.to}. Average position over the
      window, not the live SERP rank in the position column.
      {!actuals.complete && (
        <>
          {" "}
          This property has more queries than one read covers, so a keyword
          without numbers is unmeasured here rather than at zero.
        </>
      )}
    </p>
  );
}
