import type { FormEvent } from "react";
import { Search } from "lucide-react";
import { FormattedMessage, useIntl } from "react-intl";
import type { MessageId } from "@/client/i18n/messages";
import { isHostedClientAuthMode } from "@/lib/auth-mode";
import { applyBillingMarkupUsd } from "@/shared/billing";
import { BRAND_LOOKUP_MAX_INPUT_LENGTH } from "@/types/schemas/ai-search";

/**
 * Field-tagged validation error. `messageId` is data, not prose: the card
 * resolves it (with `values`, when the message needs one) through the active
 * `IntlShape` at render time, so the error text always matches the reader's
 * locale even though the check that produced it lives in the parent page.
 */
export type BrandLookupValidationError = {
  field: "query" | "competitors";
  messageId: MessageId;
  values?: Record<string, string | number>;
};

type Props = {
  query: string;
  onQueryChange: (next: string) => void;
  competitors: string;
  onCompetitorsChange: (next: string) => void;
  onSubmit: (event: FormEvent) => void;
  isLoading: boolean;
  validationError: BrandLookupValidationError | null;
};

/**
 * One brand lookup = 6 DataForSEO calls (aggregated_metrics + top_pages +
 * mentions_search × 2 platforms). Rounded up with headroom because
 * mentions_search is row-priced at the full 100-row sample per platform.
 */
const BRAND_LOOKUP_RAW_COST_USD = 0.85;

/**
 * Adding competitors triggers 2 extra cross_aggregated_metrics calls (one per
 * platform). Measured live (Jun 2026) at $0.101 each — $0.202 total for a
 * 4-group comparison — via `pnpm billing:brand-lookup --competitors=...`. A
 * fixed estimate, marked up once at module load exactly like the base.
 */
const BRAND_LOOKUP_COMPETITOR_RAW_COST_USD = 0.2;

// Hosted customers are billed the marked-up USD; self-hosted users pay
// DataForSEO directly at the raw rate.
const BRAND_LOOKUP_DISPLAYED_COST_USD = isHostedClientAuthMode()
  ? applyBillingMarkupUsd(BRAND_LOOKUP_RAW_COST_USD)
  : BRAND_LOOKUP_RAW_COST_USD;
const BRAND_LOOKUP_COMPETITOR_DISPLAYED_COST_USD = isHostedClientAuthMode()
  ? applyBillingMarkupUsd(BRAND_LOOKUP_COMPETITOR_RAW_COST_USD)
  : BRAND_LOOKUP_COMPETITOR_RAW_COST_USD;

export function BrandLookupSearchCard({
  query,
  onQueryChange,
  competitors,
  onCompetitorsChange,
  onSubmit,
  isLoading,
  validationError,
}: Props) {
  const intl = useIntl();
  const hasCompetitors = competitors.trim().length > 0;
  const queryError = validationError?.field === "query";
  const competitorsError = validationError?.field === "competitors";

  return (
    <div className="card border border-base-300 bg-base-100">
      <div className="card-body gap-4">
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label
              className={`input input-bordered flex flex-1 items-center gap-2 ${
                queryError ? "input-error" : ""
              }`}
            >
              <Search className="size-4 text-base-content/60" />
              <input
                type="text"
                placeholder={intl.formatMessage({
                  id: "aiBrandLookup.search.queryPlaceholder",
                })}
                value={query}
                maxLength={BRAND_LOOKUP_MAX_INPUT_LENGTH}
                onChange={(event) => onQueryChange(event.target.value)}
                aria-invalid={queryError || undefined}
                aria-describedby={
                  queryError ? "brand-lookup-input-error" : undefined
                }
                autoComplete="off"
                spellCheck={false}
                className="grow"
              />
            </label>

            <button
              type="submit"
              className="btn btn-primary px-6"
              disabled={isLoading}
            >
              {isLoading ? (
                <FormattedMessage id="aiBrandLookup.search.submitLoading" />
              ) : (
                <FormattedMessage id="aiBrandLookup.search.submit" />
              )}
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <input
              type="text"
              placeholder={intl.formatMessage({
                id: "aiBrandLookup.search.competitorsPlaceholder",
              })}
              value={competitors}
              onChange={(event) => onCompetitorsChange(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              className={`input input-bordered w-full ${
                competitorsError ? "input-error" : ""
              }`}
              aria-label={intl.formatMessage({
                id: "aiBrandLookup.search.competitorsAriaLabel",
              })}
              aria-invalid={competitorsError || undefined}
              aria-describedby={
                competitorsError ? "brand-lookup-input-error" : undefined
              }
            />
            <p className="text-xs text-base-content/60">
              <FormattedMessage id="aiBrandLookup.search.competitorsHelp" />
            </p>
          </div>
        </form>

        {validationError ? (
          <p id="brand-lookup-input-error" className="text-sm text-error">
            {intl.formatMessage(
              { id: validationError.messageId },
              validationError.values,
            )}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 text-xs text-base-content/60">
          <p className="tabular-nums">
            <FormattedMessage
              id="aiBrandLookup.search.costEstimate"
              values={{
                amount: (
                  <span className="font-medium text-base-content/80">
                    {intl.formatNumber(BRAND_LOOKUP_DISPLAYED_COST_USD, {
                      style: "currency",
                      currency: "USD",
                    })}
                  </span>
                ),
              }}
            />
            {hasCompetitors ? (
              <>
                {" "}
                <FormattedMessage
                  id="aiBrandLookup.search.costEstimateCompetitors"
                  values={{
                    amount: intl.formatNumber(
                      BRAND_LOOKUP_COMPETITOR_DISPLAYED_COST_USD,
                      { style: "currency", currency: "USD" },
                    ),
                  }}
                />
              </>
            ) : null}
          </p>
        </div>
      </div>
    </div>
  );
}
