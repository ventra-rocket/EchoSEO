import type { IntlShape } from "react-intl";

// The top-up range Autumn accepts. Named because the validator below and the
// hint the user reads must agree; they were two pairs of literals before, which
// is how a form starts rejecting an amount it told the reader was allowed.
const TOP_UP_MIN_USD = 10;
const TOP_UP_MAX_USD = 99;

export function parseTopUpAmount(value: string) {
  const trimmed = value.trim();

  if (!/^\d+$/.test(trimmed)) {
    return {
      isValid: false,
      parsed: 20,
    };
  }

  const parsed = Number(trimmed);
  const isValid =
    Number.isInteger(parsed) &&
    parsed >= TOP_UP_MIN_USD &&
    parsed <= TOP_UP_MAX_USD;

  return {
    isValid,
    parsed: isValid ? parsed : 20,
  };
}

// The base subscription price. Both billing.tsx and subscribe.tsx display it
// (one number, formatted per-locale at each site — see OnboardingChatParts.tsx
// for the identical pattern used elsewhere in the app).
export const BASE_PLAN_PRICE_USD = 10;

/**
 * Locale-correct prefix/suffix around a bare numeric input for USD amounts —
 * e.g. "$" before the digits in en, " US$" after them in vi. Derived from
 * `Intl.NumberFormat` for the active locale, the same source `intl.formatNumber`
 * uses, so the top-up input decorates itself consistently with every other
 * currency amount in the app instead of a hardcoded "$" that would render
 * "$10" in Vietnamese too.
 */
export function getUsdCurrencyAffixes(locale: string): {
  prefix: string;
  suffix: string;
} {
  const parts = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
  }).formatToParts(0);

  let prefix = "";
  let suffix = "";
  let sawDigits = false;
  for (const part of parts) {
    if (
      part.type === "integer" ||
      part.type === "group" ||
      part.type === "decimal" ||
      part.type === "fraction"
    ) {
      sawDigits = true;
      continue;
    }
    if (sawDigits) {
      suffix += part.value;
    } else {
      prefix += part.value;
    }
  }
  return { prefix, suffix };
}

/**
 * Every currency amount the billing route renders, formatted once through the
 * active `IntlShape`. Grouped here rather than inline in the route so the page
 * component stays readable, and so a new amount cannot be added with a bare
 * `"$"` without passing this function first: `$10` must read `10 US$` for a
 * Vietnamese reader, which a concatenated symbol silently gets wrong.
 *
 * The whole-dollar amounts (plan price, top-up bounds) drop their fraction
 * digits, matching the identical "$10/month" fact in OnboardingChatParts.tsx.
 */
export function formatBillingAmounts(
  intl: IntlShape,
  amounts: {
    totalRemaining: number;
    monthlyRemaining: number;
    topUpRemaining: number;
  },
) {
  const usd = { style: "currency", currency: "USD" } as const;
  const wholeUsd = {
    ...usd,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  } as const;
  const { prefix, suffix } = getUsdCurrencyAffixes(intl.locale);

  return {
    priceDisplay: intl.formatNumber(BASE_PLAN_PRICE_USD, wholeUsd),
    totalRemainingDisplay: intl.formatNumber(amounts.totalRemaining, usd),
    monthlyRemainingDisplay: intl.formatNumber(amounts.monthlyRemaining, usd),
    topUpRemainingDisplay: intl.formatNumber(amounts.topUpRemaining, usd),
    topUpPrefix: prefix,
    topUpSuffix: suffix,
    topUpMinDisplay: intl.formatNumber(TOP_UP_MIN_USD, wholeUsd),
    topUpMaxDisplay: intl.formatNumber(TOP_UP_MAX_USD, wholeUsd),
  };
}
