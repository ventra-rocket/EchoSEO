import {
  type CreditFeature,
  mapDataforseoPathToCreditFeature,
} from "@/shared/billing-credit-features";
import {
  assertUsageCreditsAvailable,
  getOrCreateOrganizationCustomer,
  trackUsageCreditSpend,
} from "@/server/billing/subscription";
import type { BillingCustomerContext } from "@/server/billing/subscription";
import {
  fetchBusinessListingsSearch,
  fetchQuestionsAnswers,
} from "@/server/lib/dataforseo/business";
import {
  fetchBacklinksHistory,
  fetchBacklinksRows,
  fetchBacklinksSummary,
  fetchDomainPagesSummary,
  fetchReferringDomains,
} from "@/server/lib/dataforseo/backlinks";
import {
  fetchDomainRankOverview,
  fetchKeywordIdeas,
  fetchKeywordOverview,
  fetchKeywordSuggestions,
  fetchRankedKeywords,
  fetchRelatedKeywords,
  fetchRelevantPages,
  fetchSerpCompetitors,
} from "@/server/lib/dataforseo/labs";
import {
  fetchAdsKeywordIdeas,
  fetchAdsSearchVolume,
} from "@/server/lib/dataforseo/google-ads";
import {
  fetchLiveSerp,
  fetchLocalSerp,
  fetchRankCheckSerp,
  fetchRankCheckTaskResult,
  postRankCheckTasks,
} from "@/server/lib/dataforseo/serp";
import { fetchLighthouseResult } from "@/server/lib/dataforseo/lighthouse";
import {
  fetchLlmAggregatedMetrics,
  fetchLlmCrossAggregatedMetrics,
  fetchLlmMentionsSearch,
  fetchLlmResponse,
  fetchLlmTopPages,
} from "@/server/lib/dataforseo/ai";
import {
  DataforseoChargedTaskError,
  type DataforseoApiCallCost,
  type DataforseoApiResponse,
} from "@/server/lib/dataforseo/envelope";
import { runWithDataforseoKey } from "@/server/lib/dataforseo/credential-context";
import {
  resolveDataforseoCredentials,
  type ResolvedDataforseoCredentials,
} from "@/server/lib/dataforseo/resolve-credentials";
import { resolveDataforseoCredentialAccess } from "@/server/lib/dataforseo/credential-access-policy";
import { AppError } from "@/server/lib/errors";

export { mapDataforseoPathToCreditFeature };

export function createDataforseoClient(customer: BillingCustomerContext) {
  // Resolve the organization's DataForSEO credentials at most once per client
  // instance (lazily, on the first metered call). A client that makes several
  // section calls therefore decrypts the BYO key and reads the row a single
  // time; the source (`org` | `global` | `none`) drives both key threading and
  // the Autumn-bypass decision below.
  let credentialsPromise: Promise<ResolvedDataforseoCredentials> | undefined;
  const getCredentials = () =>
    (credentialsPromise ??= resolveDataforseoCredentials(
      customer.organizationId,
    ));

  /**
   * Wraps a section fetcher with billing metering. Each entry on the client is
   * `meter(fetcher, defaultFeature?)`, returning a function with the fetcher's
   * own input type that resolves to its unwrapped `.data`.
   *
   * `defaultFeature` is the fallback credit feature; a caller can override it
   * per call by passing `creditFeature` in the input (e.g. an MCP tool
   * attributing spend to its own feature). The extra field is ignored by the
   * fetchers, which read named fields rather than spreading the input.
   */
  const meter =
    <I, T>(
      fetcher: (input: I) => Promise<DataforseoApiResponse<T>>,
      defaultFeature?: CreditFeature,
    ) =>
    (input: I & { creditFeature?: CreditFeature }): Promise<T> =>
      meterDataforseoCall(
        customer,
        getCredentials,
        () => fetcher(input),
        input.creditFeature ?? defaultFeature,
      );

  // task_get collection is free (task_post was already charged), but it must
  // still pass through the same credential policy and BYO key context as every
  // paid request. Otherwise an async workflow can escape the client boundary
  // and fall back to the operator global key.
  const unmetered =
    <I, T>(fetcher: (input: I) => Promise<T>) =>
    (input: I): Promise<T> =>
      runUnmeteredDataforseoCall(getCredentials, () => fetcher(input));

  return {
    business: {
      businessListings: meter(fetchBusinessListingsSearch, "local_seo"),
      questionsAnswers: meter(fetchQuestionsAnswers, "local_seo"),
    },
    backlinks: {
      summary: meter(fetchBacklinksSummary),
      rows: meter(fetchBacklinksRows),
      referringDomains: meter(fetchReferringDomains),
      domainPages: meter(fetchDomainPagesSummary),
      history: meter(fetchBacklinksHistory),
    },
    keywords: {
      related: meter(fetchRelatedKeywords),
      suggestions: meter(fetchKeywordSuggestions),
      ideas: meter(fetchKeywordIdeas),
      // Google Ads endpoints for countries Labs doesn't support.
      adsIdeas: meter(fetchAdsKeywordIdeas),
      adsSearchVolume: meter(fetchAdsSearchVolume),
    },
    domain: {
      rankOverview: meter(fetchDomainRankOverview),
      rankedKeywords: meter(fetchRankedKeywords),
      relevantPages: meter(fetchRelevantPages),
    },
    serp: {
      live: meter(fetchLiveSerp),
      rankCheck: meter(fetchRankCheckSerp, "rank_tracking"),
      // Posts up to 100 queued rank check tasks; one metered charge covers the
      // whole batch (DataForSEO bills task_post at post time, collection is
      // free).
      rankCheckTaskPost: meter(postRankCheckTasks, "rank_tracking"),
      rankCheckTaskGet: unmetered(fetchRankCheckTaskResult),
      local: meter(fetchLocalSerp, "local_seo"),
    },
    labs: {
      // Callers (e.g. the keyword-metrics MCP tool) can attribute the spend to
      // their own feature by passing `creditFeature` in the input; defaults to
      // rank_tracking when omitted.
      keywordOverview: meter(fetchKeywordOverview, "rank_tracking"),
      serpCompetitors: meter(fetchSerpCompetitors),
    },
    lighthouse: {
      live: meter(fetchLighthouseResult),
    },
    aiSearch: {
      mentionsSearch: meter(fetchLlmMentionsSearch),
      aggregatedMetrics: meter(fetchLlmAggregatedMetrics),
      topPages: meter(fetchLlmTopPages),
      crossAggregatedMetrics: meter(fetchLlmCrossAggregatedMetrics),
      llmResponse: meter(fetchLlmResponse),
    },
  } as const;
}

async function meterDataforseoCall<T>(
  customer: BillingCustomerContext,
  getCredentials: () => Promise<ResolvedDataforseoCredentials>,
  execute: () => Promise<DataforseoApiResponse<T>>,
  creditFeature?: CreditFeature,
): Promise<T> {
  const { credentialAccess, run } = await prepareDataforseoCall(
    getCredentials,
    execute,
  );

  // Only `global-metered` may spend the operator key in hosted mode. BYO and
  // self-host calls execute directly; hosted-open/global was rejected above.
  if (credentialAccess !== "global-metered") {
    const result = await run();
    return result.data;
  }

  const billingCustomer = await getOrCreateOrganizationCustomer(customer);

  const { monthlyRemaining } = await assertUsageCreditsAvailable(
    billingCustomer.id,
  );

  let result: DataforseoApiResponse<T>;
  try {
    result = await run();
  } catch (error) {
    if (error instanceof DataforseoChargedTaskError) {
      await trackDataforseoCost({
        customer,
        customerId: billingCustomer.id,
        billing: error.billing,
        monthlyRemaining,
        creditFeature,
      });
    }
    throw error;
  }

  await trackDataforseoCost({
    customer,
    customerId: billingCustomer.id,
    billing: result.billing,
    monthlyRemaining,
    creditFeature,
  });

  return result.data;
}

async function runUnmeteredDataforseoCall<T>(
  getCredentials: () => Promise<ResolvedDataforseoCredentials>,
  execute: () => Promise<T>,
): Promise<T> {
  const { run } = await prepareDataforseoCall(getCredentials, execute);
  return run();
}

async function prepareDataforseoCall<T>(
  getCredentials: () => Promise<ResolvedDataforseoCredentials>,
  execute: () => Promise<T>,
) {
  const credentials = await getCredentials();
  const credentialAccess = await resolveDataforseoCredentialAccess(credentials);

  // Missing credentials and the deliberately blocked hosted-open/global path
  // share the setup CTA. Do not reveal that an operator key exists: from this
  // organization's perspective no spend-authorized key is configured.
  if (credentialAccess === "unavailable") {
    throw new AppError(
      "DATAFORSEO_KEY_MISSING",
      "No DataForSEO API key configured for this organization",
    );
  }

  // Thread the organization's own key into the SDK fetch. Global credentials
  // deliberately set no ambient resolver, so core.ts reads the configured env
  // key in self-host and metered hosted modes.
  const run =
    credentials.source === "org"
      ? () =>
          runWithDataforseoKey(
            () => Promise.resolve(credentials.apiKey),
            execute,
          )
      : execute;

  return { credentialAccess, run };
}

async function trackDataforseoCost(args: {
  customer: BillingCustomerContext;
  customerId: string;
  billing: DataforseoApiCallCost;
  monthlyRemaining: number;
  creditFeature?: CreditFeature;
}) {
  await trackUsageCreditSpend({
    customer: args.customer,
    customerId: args.customerId,
    creditFeature:
      args.creditFeature ?? mapDataforseoPathToCreditFeature(args.billing.path),
    costUsd: args.billing.costUsd,
    monthlyRemaining: args.monthlyRemaining,
    properties: {
      provider: "dataforseo",
      paths: [args.billing.path.join("/")],
      fromCache: false,
    },
  });
}
