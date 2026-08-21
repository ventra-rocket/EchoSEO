import type { IntlShape } from "react-intl";
import type { CsvValue } from "@/client/lib/csv";
import { KEYWORD_RESEARCH_HEADERS } from "@/client/features/keywords/state/keywordControllerActions";
import type { SavedKeywordRow } from "@/types/keywords";
import type { GetSavedKeywordsInput } from "@/types/schemas/keywords";

export const SAVED_KEYWORD_PAGE_SIZES = [50, 100, 250] as const;
export const SAVED_KEYWORD_EXPORT_HEADERS = [
  ...KEYWORD_RESEARCH_HEADERS,
  "Tags",
  "Fetched At",
];

export function savedKeywordExportRow(row: SavedKeywordRow): CsvValue[] {
  return [
    row.keyword,
    row.searchVolume ?? "",
    row.cpc ?? "",
    row.competition ?? "",
    row.keywordDifficulty ?? "",
    row.intent ?? "",
    row.tags.map((tag) => tag.name).join(", "),
    row.fetchedAt ?? "",
  ];
}

export function toSavedKeywordSort(
  value: string | undefined,
): GetSavedKeywordsInput["sort"] {
  if (
    value === "keyword" ||
    value === "searchVolume" ||
    value === "cpc" ||
    value === "competition" ||
    value === "keywordDifficulty" ||
    value === "fetchedAt"
  ) {
    return value;
  }
  return "createdAt";
}

// Non-hook utilities: take `intl` as a parameter rather than calling
// useIntl() themselves, matching formatCount/formatPosition
// (src/client/features/search-performance/SearchPerformanceColumns.tsx).
export function formatSavedKeywordNumber(
  intl: IntlShape,
  value: number | null | undefined,
) {
  if (value == null) return "-";
  return intl.formatNumber(value);
}

// `fetchedAt` is a real timestamp (server sets it via `new Date().toISOString()`),
// not calendar-only data, so it formats in the viewer's local time zone like any
// other instant — no UTC pin. Pinning it would risk showing tomorrow's date for
// a fetch that happened late in the day in a negative UTC offset.
export function formatSavedKeywordDate(
  intl: IntlShape,
  value: string | null | undefined,
) {
  if (!value) return "-";
  return intl.formatDate(value, { dateStyle: "medium" });
}
