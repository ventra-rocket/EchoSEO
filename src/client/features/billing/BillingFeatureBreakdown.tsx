import { useQuery } from "@tanstack/react-query";
import { FormattedMessage, useIntl } from "react-intl";
import type { MessageId } from "@/client/i18n/messages";
import {
  AUTUMN_SEO_DATA_BALANCE_FEATURE_ID,
  AUTUMN_SEO_DATA_TOPUP_BALANCE_FEATURE_ID,
  autumnSeoDataCreditsToUsd,
} from "@/shared/billing";
import { mapDataforseoPathToCreditFeature } from "@/shared/billing-credit-features";
import {
  getBillingUsageEvents,
  type BillingUsageEvent,
} from "@/serverFunctions/billing";

const BILLING_USAGE_FEATURE_IDS: string[] = [
  AUTUMN_SEO_DATA_BALANCE_FEATURE_ID,
  AUTUMN_SEO_DATA_TOPUP_BALANCE_FEATURE_ID,
];

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// One id per key `src/shared/billing-credit-features.ts`'s CREDIT_FEATURE_LABELS
// map can produce (including "ai_search", which isn't part of the CreditFeature
// union but can still arrive as a raw legacy `creditFeature` property), plus
// the "Other" fallback for anything unmapped. That shared map stays English —
// it's server/analytics-facing — this catalog is what actually renders here.
const CREDIT_FEATURE_LABEL_IDS: Record<string, MessageId> = {
  keyword_research: "billingPlans.creditFeature.keywordResearch",
  domain_overview: "billingPlans.creditFeature.domainOverview",
  backlinks: "billingPlans.creditFeature.backlinks",
  site_audit: "billingPlans.creditFeature.siteAudit",
  rank_tracking: "billingPlans.creditFeature.rankTracking",
  ai_citations: "billingPlans.creditFeature.aiCitations",
  ai_prompt_responses: "billingPlans.creditFeature.aiPromptResponses",
  ai_search: "billingPlans.creditFeature.aiSearch",
  local_seo: "billingPlans.creditFeature.localSeo",
  onboarding: "billingPlans.creditFeature.onboarding",
  issue_explainer: "billingPlans.creditFeature.issueExplainer",
};

const OTHER_CREDIT_FEATURE_LABEL_ID: MessageId =
  "billingPlans.creditFeature.other";

type BillingUsageEventProperties = {
  creditFeature?: unknown;
  credit_feature?: unknown;
  path?: unknown;
  paths?: unknown;
};

type BillingFeatureBreakdownRow = {
  labelId: MessageId;
  usd: number;
};

type BillingUsageRange = {
  start: number;
  end: number;
};

function getLast30DayUsageRange(): BillingUsageRange {
  const end = Date.now();
  return {
    start: end - THIRTY_DAYS_MS,
    end,
  };
}

function getPathSegmentsFromProperties(
  properties: BillingUsageEventProperties,
): string[] | null {
  const paths = properties.paths ?? properties.path;
  if (Array.isArray(paths)) {
    const stringPaths = paths.filter(
      (value): value is string => typeof value === "string",
    );
    if (
      stringPaths.length > 1 &&
      stringPaths.every((segment) => !segment.includes("/"))
    ) {
      return stringPaths;
    }

    const path = stringPaths[0];
    if (!path) return null;

    const parsedPath = parseJsonEncodedPath(path);
    return parsedPath ?? path.split("/").filter(Boolean);
  }

  if (typeof paths !== "string") return null;

  const parsedPath = parseJsonEncodedPath(paths);
  return parsedPath ?? paths.split("/").filter(Boolean);
}

function parseJsonEncodedPath(path: string): string[] | null {
  if (!path.startsWith("[")) return null;

  try {
    const parsed: unknown = JSON.parse(path);
    if (!Array.isArray(parsed)) return null;
    const stringPaths = parsed.filter(
      (value): value is string => typeof value === "string",
    );
    if (
      stringPaths.length > 1 &&
      stringPaths.every((segment) => !segment.includes("/"))
    ) {
      return stringPaths;
    }

    const firstPath = stringPaths[0];
    return firstPath ? firstPath.split("/").filter(Boolean) : null;
  } catch {
    return null;
  }
}

function getCreditFeatureFromUsageEvent(
  event: BillingUsageEvent,
): string | null {
  // `event.properties` is already `Record<string, JsonValue>` per
  // BillingUsageEvent (getBillingUsageEvents zod-validates it server-side),
  // so this is a type refinement, not a runtime shape guess.
  const properties = event.properties as BillingUsageEventProperties;
  const explicitFeature = properties.creditFeature ?? properties.credit_feature;
  if (typeof explicitFeature === "string" && explicitFeature.length > 0) {
    return explicitFeature;
  }

  const path = getPathSegmentsFromProperties(properties);
  return path ? mapDataforseoPathToCreditFeature(path) : null;
}

export function getBillingFeatureBreakdownRows(
  events: BillingUsageEvent[],
): BillingFeatureBreakdownRow[] {
  const creditsByLabelId = new Map<MessageId, number>();

  for (const event of events) {
    const feature = getCreditFeatureFromUsageEvent(event);
    const labelId = feature
      ? (CREDIT_FEATURE_LABEL_IDS[feature] ?? OTHER_CREDIT_FEATURE_LABEL_ID)
      : OTHER_CREDIT_FEATURE_LABEL_ID;
    creditsByLabelId.set(
      labelId,
      (creditsByLabelId.get(labelId) ?? 0) + event.value,
    );
  }

  return [...creditsByLabelId.entries()]
    .map(([labelId, credits]) => ({
      labelId,
      usd: autumnSeoDataCreditsToUsd(credits),
    }))
    .filter((row) => row.usd > 0)
    .toSorted((a, b) => b.usd - a.usd);
}

export function BillingFeatureBreakdown() {
  const intl = useIntl();
  const eventsQuery = useQuery({
    queryKey: ["billing", "usage-events", BILLING_USAGE_FEATURE_IDS, "30d"],
    queryFn: () => getBillingUsageEvents({ data: getLast30DayUsageRange() }),
    staleTime: 60_000,
  });

  const rows = getBillingFeatureBreakdownRows(eventsQuery.data ?? []);
  const total = rows.reduce((sum, row) => sum + row.usd, 0);

  return (
    <div className="rounded-lg border border-base-300 bg-base-100 p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-semibold">
          <FormattedMessage id="billingPlans.usage.byFeatureTitle" />
        </span>
        <span className="text-xs text-base-content/50">
          <FormattedMessage id="billingPlans.usage.last30Days" />
        </span>
      </div>

      {eventsQuery.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-4 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-base-content/40">
          <FormattedMessage id="billingPlans.usage.noneRecorded" />
        </div>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row) => (
            <li key={row.labelId} className="space-y-1">
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span>
                  <FormattedMessage id={row.labelId} />
                </span>
                <span className="tabular-nums text-base-content/70">
                  {intl.formatNumber(row.usd, {
                    style: "currency",
                    currency: "USD",
                  })}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-200">
                <div
                  className="h-full rounded-full bg-[#7c3aed]"
                  style={{ width: `${(row.usd / total) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
