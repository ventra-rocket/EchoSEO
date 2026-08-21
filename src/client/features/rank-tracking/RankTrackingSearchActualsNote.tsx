import { Link } from "@tanstack/react-router";
import { FormattedMessage, useIntl } from "react-intl";
import type { RankTrackingSearchActuals } from "@/server/features/rank-tracking/services/RankTrackingSearchActualsService";

/**
 * Names the Search Console columns' source, window and limits next to the table
 * that shows them.
 *
 * Every branch here exists because the columns' absence or presence is itself a
 * claim — absent because no property is connected, absent because the connected
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
  const intl = useIntl();

  if (!actuals) return null;

  if (actuals.state === "not_connected") {
    return (
      <p className="text-xs text-base-content/55">
        <FormattedMessage
          id="rank.table.searchActuals.notConnected"
          values={{
            link: (chunks) => (
              <Link
                to="/p/$projectId/search-performance"
                params={{ projectId }}
                className="underline underline-offset-2"
              >
                {chunks}
              </Link>
            ),
          }}
        />
      </p>
    );
  }

  if (actuals.state === "property_mismatch") {
    return (
      <p className="text-xs text-base-content/55">
        <FormattedMessage
          id="rank.table.searchActuals.propertyMismatch"
          values={{
            property: actuals.property,
            domain,
            mono: (chunks) => <span className="font-mono">{chunks}</span>,
          }}
        />
      </p>
    );
  }

  return (
    <p className="text-xs text-base-content/55">
      <FormattedMessage
        id="rank.table.searchActuals.ready"
        values={{
          property: actuals.property,
          // Date-only values: anchored to UTC so the window's calendar dates
          // never shift a day for a reader west of Greenwich — the same class
          // of bug `formatStartedAt` had with a UTC audit timestamp.
          from: intl.formatDate(actuals.window.from, {
            dateStyle: "medium",
            timeZone: "UTC",
          }),
          to: intl.formatDate(actuals.window.to, {
            dateStyle: "medium",
            timeZone: "UTC",
          }),
          mono: (chunks) => <span className="font-mono">{chunks}</span>,
        }}
      />
      {!actuals.complete && (
        <FormattedMessage id="rank.table.searchActuals.readyTruncatedSuffix" />
      )}
    </p>
  );
}
