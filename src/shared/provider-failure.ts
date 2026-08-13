/**
 * Recognising a finished run that failed because the SEO data provider refused
 * the request, rather than because the check itself went wrong.
 *
 * The signal has to be text: a finished run keeps only `errorMessage`, a
 * free-form column, and the reason lands in it either as an AppError code or as
 * the `DataForSEO HTTP <status> on <path>` line that `dataforseo/core.ts`
 * builds, depending on where the run died. Matching is therefore deliberately
 * fail-open — if the upstream wording changes, the caller loses a hint rather
 * than showing a wrong one.
 */

const PROVIDER_AUTH_FAILURE_PATTERNS = [
  // What actually lands in a run row. `AppError` extends `Error` with the
  // human message, and the workflow stores `error.message`, so these are the
  // literal texts a failed run carries — not the AppError codes.
  /No DataForSEO API key configured/,
  // A credential DataForSEO rejected (401), or one it accepts on an account it
  // will not serve (403). Both carry this shape, built in dataforseo/core.ts.
  /DataForSEO HTTP 40[13]\b/,
  // `AppError`'s constructor falls back to the code as its own message when a
  // thrower passes no message, so the bare codes stay worth matching even
  // though every current throw site supplies text.
  /DATAFORSEO_KEY_MISSING/,
  /DATAFORSEO_AUTH_FAILED/,
];

/**
 * True when a run's stored error means "the provider would not answer for this
 * account", which is the case where pointing at Search Console instead is
 * useful advice rather than noise.
 */
export function isProviderAuthFailureMessage(
  message: string | null | undefined,
): boolean {
  if (!message) return false;
  return PROVIDER_AUTH_FAILURE_PATTERNS.some((pattern) =>
    pattern.test(message),
  );
}
