import type { IntlShape } from "react-intl";
import type { MessageId } from "@/client/i18n/messages";
import type { BacklinksTab } from "@/types/schemas/backlinks";

export const TAB_DESCRIPTIONS: Record<BacklinksTab, MessageId> = {
  backlinks: "backlinksTables.tab.description.backlinks",
  domains: "backlinksTables.tab.description.domains",
  pages: "backlinksTables.tab.description.pages",
};

// Non-hook utilities: take `intl` as a parameter rather than calling
// useIntl() themselves, matching formatSavedKeywordNumber
// (src/client/features/saved-keywords/savedKeywordsUtils.ts).
export function formatNumber(
  intl: IntlShape,
  value: number | null | undefined,
) {
  if (value == null) return "-";
  return intl.formatNumber(Math.round(value));
}

export function formatDecimal(
  intl: IntlShape,
  value: number | null | undefined,
) {
  if (value == null) return "-";
  const fractionDigits = value >= 100 ? 0 : 1;
  return intl.formatNumber(value, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatCompactDate(
  intl: IntlShape,
  value: string | null | undefined,
) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return intl.formatDate(value, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function extractUrlPath(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return url;
  }
}

export function truncateMiddle(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  const sideLength = Math.floor((maxLength - 1) / 2);
  return `${value.slice(0, sideLength)}...${value.slice(-sideLength)}`;
}
