import type { Locale } from "@/client/i18n/config";
import type { GeoSection as GeoData } from "@/server/services/seo-check/deep-types";
import { CHECK_RESULT_COPY } from "./check-result-copy";
import { SignalRow } from "./SignalRow";

/**
 * The GEO / AI-search section of the Deep report.
 *
 * Kept visually distinct and led by a "directional" disclaimer: the score is
 * scored separately from the on-page number (deep.ts) so speculative AI signals
 * never dilute the main result, and the AI-crawler policy + llms.txt rows are
 * surfaced as neutral facts — reported, never moralized or scored.
 */
export function GeoSection({ geo, locale }: { geo: GeoData; locale: Locale }) {
  const copy = CHECK_RESULT_COPY[locale].geoSection;

  return (
    <section className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">{copy.heading}</h2>
        <span className="shrink-0 font-mono text-sm font-bold tabular-nums">
          <span className="text-xs font-normal text-base-content/60">
            {copy.scoreLabel}{" "}
          </span>
          {geo.score}
        </span>
      </div>

      <p className="text-xs leading-relaxed text-base-content/60">
        {copy.disclaimer}
      </p>

      <div className="space-y-2">
        {geo.signals.map((signal) => (
          <SignalRow key={signal.id} signal={signal} locale={locale} />
        ))}
      </div>

      <div className="space-y-1.5 border-t border-base-300 pt-3 font-mono text-xs text-base-content/60">
        <p className="uppercase tracking-widest text-base-content/60">
          {copy.policyHeading}
        </p>
        <p>
          {copy.googleExtendedLabel}:{" "}
          {geo.aiBots.googleExtended ? copy.botAllowed : copy.botBlocked}
        </p>
        <p>
          {copy.gptbotLabel}:{" "}
          {geo.aiBots.gptbot ? copy.botAllowed : copy.botBlocked}
        </p>
        <p>
          {copy.llmsTxtLabel}:{" "}
          {geo.llmsTxt ? copy.llmsTxtFound : copy.llmsTxtMissing}{" "}
          <span className="text-base-content/60">({copy.llmsTxtNote})</span>
        </p>
      </div>
    </section>
  );
}
