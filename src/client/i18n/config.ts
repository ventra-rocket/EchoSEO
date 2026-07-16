export const SUPPORTED_LOCALES = ["en", "vi"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

// Locale for the authenticated app is persisted client-side. That part of the
// tree renders inside the <ClientOnly> island in __root.tsx, so the active locale
// is resolved on the client from this cookie — no SSR/hydration locale threading
// needed there. Public indexable routes SSR their body and are English-only for
// now (a later slice derives their locale from the URL, not this cookie), so this
// cookie does not govern them.
export const LOCALE_COOKIE = "echoseo_locale";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    (SUPPORTED_LOCALES as readonly string[]).includes(value)
  );
}

/**
 * Coerce any input (cookie value, `navigator.language`, an Accept-Language tag)
 * to a supported locale, stripping a region suffix like `en-US` → `en`. Falls
 * back to the default locale when nothing matches.
 */
export function resolveLocale(value: unknown): Locale {
  if (isLocale(value)) return value;
  if (typeof value === "string") {
    const base = value.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

function readCookieValue(
  cookieString: string,
  name: string,
): string | undefined {
  for (const part of cookieString.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/**
 * Resolve the active locale on the client: the persisted cookie first, then the
 * browser language, then the default. Safe to call in a non-DOM environment
 * (returns the default) so it can seed React state without guards at the call
 * site.
 */
export function readClientLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const fromCookie = readCookieValue(document.cookie, LOCALE_COOKIE);
  if (fromCookie !== undefined) return resolveLocale(fromCookie);
  if (typeof navigator !== "undefined") {
    return resolveLocale(navigator.language);
  }
  return DEFAULT_LOCALE;
}

/** Persist the selected locale to a first-party cookie (no-op outside the DOM). */
export function persistLocale(locale: Locale): void {
  if (typeof document === "undefined") return;
  // Mark Secure on HTTPS (production) but not on http://localhost, where a
  // Secure cookie would silently fail to persist during local dev.
  const secure =
    typeof location !== "undefined" && location.protocol === "https:"
      ? ";secure"
      : "";
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${ONE_YEAR_SECONDS};samesite=lax${secure}`;
}
