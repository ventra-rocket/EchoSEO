/**
 * Renders a `Measurement` in the reader's language.
 *
 * Measurements are persisted language-neutral — a kind and a number — so one
 * stored report can be read in either language. This is the read boundary
 * where that becomes words, the same seam `localizeRuleText` uses for rule
 * text. A server that pre-baked "54 chars" would pin a report to the language
 * of whoever requested it first.
 */
import type { Measurement } from "@/server/lib/seo-rules/types";
import type { Locale } from "@/client/i18n/config";
import { CHECK_RESULT_COPY } from "./check-result-copy";

export function formatMeasurement(
  measurement: Measurement,
  locale: Locale,
): string {
  const copy = CHECK_RESULT_COPY[locale].measurement;
  switch (measurement.kind) {
    case "chars":
      return copy.chars(measurement.value);
    case "count":
      return copy.count(measurement.value);
    case "ratio":
      return copy.ratio(measurement.value, measurement.of);
    case "text":
      // Already literal — a status code, a robots directive, a URL. There is
      // nothing here to translate, and translating it would corrupt it.
      return measurement.value;
  }
}
